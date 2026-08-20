#!/usr/bin/env python3
"""NOL World TNA scraper — Beijing/Shanghai single tickets research.

Acceptance:
- raw/ + logs/requests.jsonl for every HTTP call
- field provenance in field_sources_json (inferred marked)
- no fabricated BJ/SH products
"""

from __future__ import annotations

import argparse
import datetime as dt
import json
import logging
import random
import re
import sys
import uuid
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional, Set

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from src import config  # noqa: E402
from src.api_client import NolTnaClient  # noqa: E402
from src.excel_export import default_output_path, export_excel  # noqa: E402
from src.filters import category_names, classify_ticket, detect_city, extract_cities  # noqa: E402
from src.transform import exclusion_row, process_product, product_to_row  # noqa: E402

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("nol_tna")


def extract_html_title(html: str) -> str:
    m = re.search(r"<title[^>]*>(.*?)</title>", html, flags=re.I | re.S)
    if not m:
        return ""
    title = re.sub(r"\s+", " ", m.group(1)).strip()
    # NOL often: "{name} | NOL World" or similar
    for sep in [" | NOL", " | Nol", " - NOL", " | Tours"]:
        if sep.lower() in title.lower():
            idx = title.lower().find(sep.lower())
            title = title[:idx].strip()
            break
    return title


def titles_match(api_name: str, html_title: str) -> bool:
    a = re.sub(r"\s+", " ", (api_name or "")).strip().lower()
    b = re.sub(r"\s+", " ", (html_title or "")).strip().lower()
    if not a or not b:
        return False
    if a == b:
        return True
    # allow containment either way (HTML may truncate or add suffix)
    if a in b or b in a:
        return True
    # soft: first 40 chars
    return a[:40] == b[:40]


def build_zero_result_explanation(snapshot: Dict[str, Any], city_counter: Counter) -> str:
    country_names = [c.get("name") for c in snapshot.get("countries") or []]
    city_names = []
    for c in snapshot.get("countries") or []:
        for city in c.get("cities") or []:
            city_names.append(f"{city.get('name')}({city.get('count')})")
    top_cities = ", ".join(f"{k}:{v}" for k, v in city_counter.most_common(15))
    return (
        "北京/上海单门票结果为 0（未编造任何产品）。"
        "检索路径：GET https://world.nol.com/api/tna-product/products"
        "（startDate/endDate/language=EN|ZH_CN/page/size=30/currency/withReview=true），"
        "另用 categoryCodes=TG003(Passes) 对照；"
        "城市：geotags.TRIPLE_CITY/ISO1 + 标题严格关键词 \\bbeijing\\b|\\bshanghai\\b|北京|上海。"
        f"API filters.countries={country_names}；城市样例={', '.join(city_names[:20])}。"
        "UI geotagKeys 仅 Seoul/Busan/Jeju（ISO2::uuid），无 BJ/SH。"
        f"扫描城市频次 Top：{top_cities}。"
        "证据见 exclusions + raw/list/* + logs/requests.jsonl。"
    )


def collect_filter_snapshot(client: NolTnaClient) -> Dict[str, Any]:
    data, raw_path = client.list_products(page=1, size=5, language="EN")
    filters = data.get("filters") or {}
    countries = []
    for c in filters.get("countries") or []:
        countries.append(
            {
                "name": c.get("name"),
                "cities": [
                    {"name": x.get("value"), "count": x.get("count"), "key": x.get("key")}
                    for x in (c.get("cities") or [])
                ],
            }
        )
    categories = []
    for c in filters.get("categories") or []:
        categories.append(
            {
                "name": c.get("value") or c.get("name"),
                "key": c.get("key"),
                "count": c.get("count"),
                "children": [
                    {"name": ch.get("value"), "key": ch.get("key"), "count": ch.get("count")}
                    for ch in (c.get("children") or [])
                ],
            }
        )
    return {
        "page": data.get("page"),
        "countries": countries,
        "categories": categories,
        "raw_path": str(raw_path.relative_to(client.run_dir)),
    }


def run_crawl(
    client: NolTnaClient,
    *,
    currency: str,
    languages: List[str],
    fetch_detail_api: bool,
    fetch_detail_html_count: int,
    max_pages: Optional[int],
    verify_sample_size: int,
) -> Dict[str, Any]:
    products: List[Dict[str, Any]] = []
    exclusions: List[Dict[str, Any]] = []
    uncertain: List[Dict[str, Any]] = []
    catalog: List[Dict[str, Any]] = []
    seen_ids: Set[str] = set()
    all_items: List[Dict[str, Any]] = []  # for verification sample
    total_seen = 0
    city_counter: Counter = Counter()
    cat_counter: Counter = Counter()

    for lang in languages:
        logger.info("=== List crawl language=%s ===", lang)
        for item in client.iter_all_products(language=lang, size=30, max_pages=max_pages):
            pid = item.get("id")
            if not pid:
                continue
            # Keep first-seen language as primary for catalog/exclusions
            if pid in seen_ids:
                continue
            seen_ids.add(pid)
            total_seen += 1
            all_items.append(item)

            l1, l2 = category_names(item)
            cat_counter[f"{l1}/{l2}"] += 1
            for c in extract_cities(item):
                city_counter[c] += 1

            # Catalog row (raw-traceable facts only + inferred type labeled)
            ptype, reason, _ = classify_ticket(item)
            price_obj = item.get("price") or {}
            price_val = price_obj.get("appliedCoupon")
            if price_val is None:
                price_val = price_obj.get("display")
            if price_val is None:
                price_val = price_obj.get("sales")
            lang_path = "zh-CN" if str(lang).upper().startswith("ZH") else "en"
            catalog.append(
                {
                    "product_id": pid,
                    "product_name": item.get("name") or "",
                    "detail_url": config.DETAIL_URL_TMPL.format(lang=lang_path, product_id=pid),
                    "city_api": ",".join(extract_cities(item)),
                    "category_l1": l1,
                    "category_l2": l2,
                    "price": price_val if price_val is not None else "",
                    "currency": currency,
                    "source_lang": lang,
                    "raw_list_path": item.get("_raw_list_path") or "",
                    "raw_detail_api_path": "",
                    "raw_detail_html_path": "",
                    "product_type_inferred": ptype,
                    "ticket_judgment_inferred": reason,
                }
            )

            result = process_product(
                item,
                currency=currency,
                source_lang=lang,
            )
            if result["decision"] == "keep":
                products.append(result["product_row"])
            elif result["decision"] == "uncertain_city":
                uncertain.append(result["uncertain_row"])
            else:
                exclusions.append(result["exclusion_row"])

    # Detail API for kept + uncertain + verification candidates
    detail_targets: List[str] = []
    for row in products + uncertain:
        if row.get("product_id"):
            detail_targets.append(row["product_id"])

    # Always fetch detail API for Pass category products (ticket-like inventory evidence)
    pass_ids = [
        c["product_id"]
        for c in catalog
        if (c.get("category_l1") or "").lower() in {"passes", "门票", "pass"}
        or "pass" in (c.get("product_type_inferred") or "")
    ]
    # Also sample random products for verification
    rng = random.Random(42)
    sample_pool = [c["product_id"] for c in catalog]
    rng.shuffle(sample_pool)
    verify_ids = sample_pool[: max(verify_sample_size, fetch_detail_html_count)]

    detail_id_set = list(dict.fromkeys(detail_targets + pass_ids[:80] + verify_ids))
    if not fetch_detail_api:
        detail_id_set = list(dict.fromkeys(verify_ids))

    id_to_item = {i["id"]: i for i in all_items if i.get("id")}
    detail_map: Dict[str, Dict[str, Any]] = {}
    html_map: Dict[str, str] = {}  # pid -> html path relative

    logger.info("Fetching detail API for %s products...", len(detail_id_set))
    for pid in detail_id_set:
        item = id_to_item.get(pid) or {}
        lang = item.get("_source_lang") or "EN"
        try:
            body, raw_path = client.get_product_detail(pid, language=lang)
            detail_map[pid] = body
            rel = str(raw_path.relative_to(client.run_dir))
            for c in catalog:
                if c["product_id"] == pid:
                    c["raw_detail_api_path"] = rel
            # refresh keep/uncertain rows with detail if any
        except Exception as exc:  # noqa: BLE001
            logger.warning("detail_api failed %s: %s", pid, exc)

    # HTML detail for verification sample
    html_targets = verify_ids[:fetch_detail_html_count]
    logger.info("Fetching detail HTML for %s verification products...", len(html_targets))
    verification_rows: List[Dict[str, Any]] = []
    for pid in html_targets:
        item = id_to_item.get(pid) or {}
        lang = item.get("_source_lang") or "EN"
        lang_path = "zh-CN" if str(lang).upper().startswith("ZH") else "en"
        api_name = item.get("name") or (detail_map.get(pid) or {}).get("name") or ""
        try:
            html, raw_path = client.get_detail_html(pid, lang_path=lang_path)
            rel = str(raw_path.relative_to(client.run_dir))
            html_map[pid] = rel
            for c in catalog:
                if c["product_id"] == pid:
                    c["raw_detail_html_path"] = rel
            html_title = extract_html_title(html)
            # also try og:title
            if not html_title:
                m = re.search(r'property="og:title"\s+content="([^"]+)"', html)
                if m:
                    html_title = m.group(1)
            match = titles_match(api_name, html_title)
            verification_rows.append(
                {
                    "product_id": pid,
                    "detail_url": config.DETAIL_URL_TMPL.format(lang=lang_path, product_id=pid),
                    "api_name": api_name,
                    "html_title": html_title,
                    "title_match": match,
                    "raw_list_path": item.get("_raw_list_path") or "",
                    "raw_detail_api_path": (detail_map.get(pid) or {}).get("_raw_detail_api_path") or "",
                    "raw_detail_html_path": rel,
                    "source_lang": lang,
                }
            )
            logger.info(
                "VERIFY %s match=%s api=%s html=%s",
                pid[:8],
                match,
                (api_name or "")[:40],
                (html_title or "")[:40],
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("detail_html failed %s: %s", pid, exc)
            verification_rows.append(
                {
                    "product_id": pid,
                    "detail_url": config.DETAIL_URL_TMPL.format(lang=lang_path, product_id=pid),
                    "api_name": api_name,
                    "html_title": "",
                    "title_match": False,
                    "error": str(exc),
                    "raw_list_path": item.get("_raw_list_path") or "",
                }
            )

    # Enrich kept/uncertain with detail if present
    def enrich(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        out = []
        for r in rows:
            pid = r.get("product_id")
            item = id_to_item.get(pid) or {}
            detail = detail_map.get(pid)
            html_path = html_map.get(pid, "")
            if detail or html_path:
                # rebuild row with detail
                rebuilt = process_product(
                    item,
                    currency=currency,
                    source_lang=item.get("_source_lang") or r.get("source_lang") or "EN",
                    detail=detail,
                    detail_html_path=html_path,
                )
                if rebuilt["decision"] == "keep" and rebuilt.get("product_row"):
                    out.append(rebuilt["product_row"])
                elif rebuilt["decision"] == "uncertain_city" and rebuilt.get("uncertain_row"):
                    out.append(rebuilt["uncertain_row"])
                else:
                    # city still not BJ/SH after detail — keep original classification path
                    out.append(r)
            else:
                out.append(r)
        return out

    products = enrich(products)
    uncertain = enrich(uncertain)

    # Sample field rows: 10 ticket-like from catalog with detail if possible
    sample_rows: List[Dict[str, Any]] = []
    for c in catalog:
        if c.get("product_type_inferred") not in {"pass", "ticket_only", "uncertain"}:
            continue
        pid = c["product_id"]
        item = id_to_item.get(pid)
        if not item:
            continue
        city, evidence, status = detect_city(detail_map.get(pid) or item)
        ptype, reason, _ = classify_ticket(detail_map.get(pid) or item)
        row = product_to_row(
            item,
            currency=currency,
            source_lang=item.get("_source_lang") or "EN",
            city=city or (extract_cities(item)[0] if extract_cities(item) else "NON_TARGET"),
            city_evidence=evidence + " [sample_preview_not_bj_sh_filter]",
            city_source="sample_preview",
            product_type=ptype if ptype != "excluded" else "uncertain",
            judgment_reason=reason,
            detail=detail_map.get(pid),
            detail_html_path=html_map.get(pid, ""),
        )
        sample_rows.append(row)
        if len(sample_rows) >= 10:
            break

    return {
        "products": products,
        "exclusions": exclusions,
        "uncertain": uncertain,
        "catalog": catalog,
        "verification": verification_rows,
        "sample_rows": sample_rows,
        "total_seen": total_seen,
        "city_counter": city_counter,
        "cat_counter": cat_counter,
        "seen_ids": seen_ids,
    }


def parse_args(argv: Optional[List[str]] = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(description="NOL World TNA BJ/SH ticket scraper")
    p.add_argument("--currency", default="USD")
    p.add_argument("--output-dir", default=str(ROOT / "output"))
    p.add_argument("--run-id", default=None, help="optional run id; default UTC timestamp")
    p.add_argument("--max-pages", type=int, default=None)
    p.add_argument("--interval", type=float, default=config.REQUEST_INTERVAL_SEC)
    p.add_argument("--langs", default="EN", help="comma-separated; EN recommended primary")
    p.add_argument("--fetch-detail-api", action="store_true", default=True)
    p.add_argument("--no-detail-api", action="store_true")
    p.add_argument("--html-sample", type=int, default=12, help="detail HTML pages to fetch for verification")
    p.add_argument("--verify-sample-size", type=int, default=12)
    p.add_argument("--also-zh", action="store_true", help="also crawl ZH_CN after EN")
    p.add_argument("--verbose", action="store_true")
    return p.parse_args(argv)


def main(argv: Optional[List[str]] = None) -> int:
    args = parse_args(argv)
    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    run_stamp = args.run_id or dt.datetime.utcnow().strftime("%Y%m%dT%H%M%SZ")
    run_dir = Path(args.output_dir) / "runs" / run_stamp
    run_dir.mkdir(parents=True, exist_ok=True)
    # also expose convenience symlinks at output/raw and output/logs -> latest run
    out_root = Path(args.output_dir)
    out_root.mkdir(parents=True, exist_ok=True)

    start_time = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    run_uuid = str(uuid.uuid4())

    client = NolTnaClient(run_dir=run_dir, currency=args.currency, interval_sec=args.interval)

    logger.info("Run dir: %s", run_dir)
    snapshot = collect_filter_snapshot(client)
    (run_dir / "api_filter_snapshot.json").write_text(
        json.dumps(snapshot, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    langs = [x.strip() for x in args.langs.split(",") if x.strip()]
    if args.also_zh and "ZH_CN" not in langs:
        langs.append("ZH_CN")

    fetch_detail = args.fetch_detail_api and not args.no_detail_api
    result = run_crawl(
        client,
        currency=args.currency,
        languages=langs,
        fetch_detail_api=fetch_detail,
        fetch_detail_html_count=args.html_sample,
        max_pages=args.max_pages,
        verify_sample_size=args.verify_sample_size,
    )

    products = result["products"]
    exclusions = result["exclusions"]
    uncertain = result["uncertain"]
    catalog = result["catalog"]
    verification = result["verification"]
    sample_rows = result["sample_rows"]
    total_seen = result["total_seen"]
    city_counter = result["city_counter"]
    cat_counter = result["cat_counter"]

    zero_expl = ""
    if not products:
        zero_expl = build_zero_result_explanation(snapshot, city_counter)

    end_time = dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z"
    match_count = sum(1 for v in verification if v.get("title_match"))
    meta = {
        "run_id": run_uuid,
        "run_dir": str(run_dir),
        "start_time": start_time,
        "end_time": end_time,
        "source_urls": " | ".join(
            [
                config.LIST_URL_EN,
                config.LIST_URL_ZH,
                f"{config.API_BASE}{config.LIST_PATH}",
            ]
        ),
        "filter_logic": (
            "list API paginate; keep only Beijing/Shanghai via geotag/strict keyword; "
            "single-ticket rules inferred; all HTTP saved under raw/ + logs/requests.jsonl"
        ),
        "total_seen": total_seen,
        "total_kept": len(products),
        "total_excluded": len(exclusions),
        "total_uncertain_city": len(uncertain),
        "total_catalog": len(catalog),
        "zero_result_explanation": zero_expl,
        "api_total_elements_snapshot": (snapshot.get("page") or {}).get("totalElements"),
        "top_cities_seen": json.dumps(dict(city_counter.most_common(30)), ensure_ascii=False),
        "top_categories_seen": json.dumps(dict(cat_counter.most_common(20)), ensure_ascii=False),
        "currency": args.currency,
        "langs": ",".join(langs),
        "http_request_count": client.request_count,
        "requests_log": "logs/requests.jsonl",
        "verification_title_match": f"{match_count}/{len(verification)}",
        "notes": (
            "product_type/attraction_name/price_from/detail_url template are inferred where marked. "
            "ticket_option_name empty: public API has no SKU matrix. "
            "Do not treat inferred fields as API facts."
        ),
    }

    # Write product id list for overlap checks
    ids_path = run_dir / "product_ids.json"
    ids_path.write_text(
        json.dumps(sorted(result["seen_ids"]), ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    (run_dir / "meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding="utf-8")
    (run_dir / "verification_sample.json").write_text(
        json.dumps(verification, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    xlsx_path = run_dir / f"nol_beijing_shanghai_tickets_{dt.datetime.utcnow().strftime('%Y%m%d')}.xlsx"
    export_excel(
        xlsx_path,
        products=products,
        exclusions=exclusions,
        meta=meta,
        sample_field_rows=sample_rows or None,
        uncertain_rows=uncertain,
        catalog_rows=catalog,
        verification_rows=verification,
    )

    # Convenience copies at output/
    latest_xlsx = out_root / xlsx_path.name
    latest_xlsx.write_bytes(xlsx_path.read_bytes())

    # Point output/raw and output/logs to this run (copy key artifacts via symlink-like dirs)
    # Use real directories with a pointer file for portability
    for name in ("raw", "logs"):
        target = out_root / name
        if target.is_symlink() or target.exists():
            if target.is_dir() and not target.is_symlink():
                # leave existing; write LATEST pointer
                pass
            else:
                try:
                    target.unlink()
                except OSError:
                    pass
        pointer = out_root / f"LATEST_RUN.txt"
        pointer.write_text(str(run_dir), encoding="utf-8")

    # Mirror raw/logs into output/raw and output/logs for acceptance path
    import shutil

    for name in ("raw", "logs"):
        dst = out_root / name
        src = run_dir / name
        if dst.exists():
            shutil.rmtree(dst)
        shutil.copytree(src, dst)

    # Also copy product_ids and meta
    shutil.copy2(ids_path, out_root / "product_ids.json")
    shutil.copy2(run_dir / "meta.json", out_root / "meta.json")
    shutil.copy2(run_dir / "verification_sample.json", out_root / "verification_sample.json")
    shutil.copy2(run_dir / "api_filter_snapshot.json", out_root / "api_filter_snapshot.json")

    logger.info("Excel: %s", xlsx_path)
    logger.info("Mirrored raw/ logs/ to %s", out_root)

    bj = sum(1 for p in products if p.get("city") == "Beijing")
    sh = sum(1 for p in products if p.get("city") == "Shanghai")
    print("\n========== 爬取验收摘要 ==========")
    print(f"run_dir: {run_dir}")
    print(f"Excel: {xlsx_path}")
    print(f"output/raw + output/logs 已同步")
    print(f"HTTP 请求数: {client.request_count}")
    print(f"catalog 产品数: {len(catalog)}")
    print(f"北京/上海 kept: {len(products)} (BJ={bj}, SH={sh})")
    print(f"exclusions: {len(exclusions)}")
    print(f"待人工确认: {len(uncertain)}")
    print(f"标题校验 sample: {match_count}/{len(verification)} match")
    for v in verification:
        print(
            f"  - {v.get('title_match')} | {v.get('detail_url')} | api={str(v.get('api_name'))[:40]} | html={str(v.get('html_title'))[:40]}"
        )
    if zero_expl:
        print(zero_expl)
    print("=================================\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
