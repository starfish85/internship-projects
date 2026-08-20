"""HTTP client for NOL World public TNA APIs with raw + request logging."""

from __future__ import annotations

import datetime as dt
import hashlib
import json
import logging
import time
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Tuple
from urllib.parse import urlencode

import requests
from tenacity import retry, stop_after_attempt, wait_exponential

from . import config

logger = logging.getLogger(__name__)


def _utc_now() -> str:
    return dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"


class NolTnaClient:
    def __init__(
        self,
        run_dir: Path,
        currency: str = config.DEFAULT_CURRENCY,
        interval_sec: float = config.REQUEST_INTERVAL_SEC,
        session: Optional[requests.Session] = None,
    ) -> None:
        self.currency = currency
        self.interval_sec = interval_sec
        self.run_dir = Path(run_dir)
        self.raw_dir = self.run_dir / "raw"
        self.logs_dir = self.run_dir / "logs"
        self.raw_dir.mkdir(parents=True, exist_ok=True)
        self.logs_dir.mkdir(parents=True, exist_ok=True)
        self.requests_log_path = self.logs_dir / "requests.jsonl"
        self.session = session or requests.Session()
        self.session.headers.update(
            {
                "User-Agent": config.USER_AGENT,
                "Accept": "application/json, text/plain, */*",
                "Referer": config.LIST_URL_EN,
                "Origin": config.BASE_URL,
            }
        )
        self._last_request_at = 0.0
        self.request_count = 0

    def _throttle(self) -> None:
        elapsed = time.monotonic() - self._last_request_at
        if elapsed < self.interval_sec:
            time.sleep(self.interval_sec - elapsed)
        self._last_request_at = time.monotonic()

    def _append_request_log(self, record: Dict[str, Any]) -> None:
        with self.requests_log_path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(record, ensure_ascii=False) + "\n")

    def _save_raw(self, relative_path: str, content: bytes, meta: Dict[str, Any]) -> Path:
        path = self.raw_dir / relative_path
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content)
        meta_path = path.with_suffix(path.suffix + ".meta.json")
        meta_path.write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
        return path

    @retry(
        stop=stop_after_attempt(config.MAX_RETRIES),
        wait=wait_exponential(multiplier=1, min=1, max=8),
        reraise=True,
    )
    def request(
        self,
        method: str,
        url: str,
        *,
        params: Optional[Any] = None,
        headers: Optional[Dict[str, str]] = None,
        raw_relative_path: str,
        purpose: str,
        accept: str = "application/json",
    ) -> Tuple[requests.Response, Path]:
        """Perform HTTP request, save raw body, append requests.jsonl. Returns (response, raw_path)."""
        self._throttle()
        req_headers = {"Accept": accept}
        if headers:
            req_headers.update(headers)

        started = time.monotonic()
        resp = self.session.request(
            method,
            url,
            params=params,
            headers=req_headers,
            timeout=45,
        )
        elapsed_ms = int((time.monotonic() - started) * 1000)
        self.request_count += 1

        # Final URL after params encoding
        final_url = resp.url
        content = resp.content
        sha = hashlib.sha256(content).hexdigest()
        raw_path = self._save_raw(
            raw_relative_path,
            content,
            {
                "url": final_url,
                "method": method,
                "status_code": resp.status_code,
                "purpose": purpose,
                "sha256": sha,
                "content_type": resp.headers.get("Content-Type"),
                "fetched_at": _utc_now(),
                "elapsed_ms": elapsed_ms,
                "params": params if not isinstance(params, list) else list(params),
            },
        )

        log_rec = {
            "ts": _utc_now(),
            "seq": self.request_count,
            "method": method,
            "url": final_url,
            "status_code": resp.status_code,
            "elapsed_ms": elapsed_ms,
            "purpose": purpose,
            "raw_path": str(raw_path.relative_to(self.run_dir)),
            "sha256": sha,
            "content_length": len(content),
            "response_headers": {
                k: resp.headers.get(k)
                for k in ("Content-Type", "Date", "Cache-Control", "x-cache", "via")
                if resp.headers.get(k)
            },
        }
        self._append_request_log(log_rec)

        if resp.status_code >= 400:
            logger.warning("HTTP %s %s purpose=%s", resp.status_code, final_url, purpose)
        resp.raise_for_status()
        return resp, raw_path

    @staticmethod
    def date_window(days: int = 30) -> tuple[str, str]:
        start = dt.date.today()
        end = start + dt.timedelta(days=days)
        return start.isoformat(), end.isoformat()

    def list_products(
        self,
        page: int = 1,
        size: int = config.DEFAULT_PAGE_SIZE,
        language: str = config.DEFAULT_LANG,
        category_codes: Optional[Iterable[str]] = None,
        geotag_keys: Optional[Iterable[str]] = None,
        sort_type: str = "RECOMMEND",
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], Path]:
        if not start_date or not end_date:
            start_date, end_date = self.date_window()

        params: List[tuple[str, str]] = [
            ("startDate", start_date),
            ("endDate", end_date),
            ("language", language),
            ("tnaProvideLanguageCodes", language),
            ("page", str(page)),
            ("size", str(size)),
            ("withReview", "true"),
            ("currency", self.currency),
            ("sortType", sort_type),
        ]
        if category_codes:
            for code in category_codes:
                params.append(("categoryCodes", str(code)))
        if geotag_keys:
            for key in geotag_keys:
                params.append(("geotagKeys", str(key)))

        lang_header = "zh-CN" if language.upper().startswith("ZH") else "en"
        cat_tag = "all"
        if category_codes:
            cat_tag = "-".join(str(c) for c in category_codes)
        # include size in filename to avoid snapshot(size=5) overwriting full page
        raw_rel = f"list/{language}/cat_{cat_tag}/page_{page:04d}_size{size}.json"
        url = f"{config.API_BASE}{config.LIST_PATH}"
        resp, raw_path = self.request(
            "GET",
            url,
            params=params,
            headers={"kint5-language": lang_header},
            raw_relative_path=raw_rel,
            purpose=f"list lang={language} page={page} cat={cat_tag}",
        )
        return resp.json(), raw_path

    def iter_all_products(
        self,
        language: str = config.DEFAULT_LANG,
        category_codes: Optional[Iterable[str]] = None,
        geotag_keys: Optional[Iterable[str]] = None,
        size: int = config.DEFAULT_PAGE_SIZE,
        max_pages: Optional[int] = None,
    ) -> Iterable[Dict[str, Any]]:
        page = 1
        total_pages = None
        start_date, end_date = self.date_window()
        codes = list(category_codes) if category_codes else None
        tags = list(geotag_keys) if geotag_keys else None

        while True:
            data, raw_path = self.list_products(
                page=page,
                size=size,
                language=language,
                category_codes=codes,
                geotag_keys=tags,
                start_date=start_date,
                end_date=end_date,
            )
            body = data.get("body") or []
            page_info = data.get("page") or {}
            total_pages = page_info.get("totalPages") or total_pages
            total_elements = page_info.get("totalElements")
            logger.info(
                "Fetched page %s/%s (%s items, totalElements=%s) raw=%s",
                page,
                total_pages,
                len(body),
                total_elements,
                raw_path.name,
            )
            for idx, item in enumerate(body):
                item = dict(item)
                item["_raw_list_path"] = str(raw_path.relative_to(self.run_dir))
                item["_raw_list_index"] = idx
                item["_page_info"] = page_info
                item["_source_lang"] = language
                item["_list_filters"] = data.get("filters") if page == 1 and idx == 0 else None
                yield item

            if not body:
                break
            if total_pages is not None and page >= int(total_pages):
                break
            if max_pages is not None and page >= max_pages:
                break
            page += 1

    def get_product_detail(
        self,
        product_id: str,
        language: str = config.DEFAULT_LANG,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
    ) -> Tuple[Dict[str, Any], Path]:
        if not start_date or not end_date:
            start_date, end_date = self.date_window()
        path = config.DETAIL_PATH.format(product_id=product_id)
        lang_header = "zh-CN" if language.upper().startswith("ZH") else "en"
        params = {
            "language": language,
            "startDate": start_date,
            "endDate": end_date,
        }
        url = f"{config.API_BASE}{path}"
        raw_rel = f"detail_api/{language}/{product_id}.json"
        resp, raw_path = self.request(
            "GET",
            url,
            params=params,
            headers={"kint5-language": lang_header},
            raw_relative_path=raw_rel,
            purpose=f"detail_api lang={language} id={product_id}",
        )
        data = resp.json()
        body = data.get("body") or data
        if isinstance(body, dict):
            body = dict(body)
            body["_raw_detail_api_path"] = str(raw_path.relative_to(self.run_dir))
        return body, raw_path

    def get_detail_html(self, product_id: str, lang_path: str = "en") -> Tuple[str, Path]:
        """Fetch public HTML detail page for title verification."""
        url = config.DETAIL_URL_TMPL.format(lang=lang_path, product_id=product_id)
        raw_rel = f"detail_html/{lang_path}/{product_id}.html"
        resp, raw_path = self.request(
            "GET",
            url,
            params=None,
            headers={
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
            raw_relative_path=raw_rel,
            purpose=f"detail_html lang={lang_path} id={product_id}",
            accept="text/html,application/xhtml+xml",
        )
        return resp.text, raw_path
