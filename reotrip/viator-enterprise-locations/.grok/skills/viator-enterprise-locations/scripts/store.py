#!/usr/bin/env python3
"""Read/write snapshot.json and checkpoint.json."""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from paths import project_root, run_dir, snapshot_path

TZ = timezone(timedelta(hours=8))


def now() -> datetime:
    return datetime.now(TZ)


def new_run_id() -> str:
    return now().strftime("%Y%m%d_%H%M")


def empty_snapshot(run_id: str) -> dict[str, Any]:
    return {
        "run_id": run_id,
        "started_at": now().isoformat(),
        "finished_at": None,
        "status": "running",
        "tripadvisor_host": "https://www.tripadvisor.co.uk",
        "viator_products": [],
        "enterprise_locations": [],
    }


def empty_checkpoint(run_id: str, phase: str = "viator_list") -> dict[str, Any]:
    return {
        "run_id": run_id,
        "phase": phase,
        "completed_product_codes": [],
        "completed_location_urls": [],
        "blocked_reason": None,
    }


def load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8"))


def save_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + ".tmp")
    tmp.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    tmp.replace(path)


def latest_unfinished(root: Path) -> tuple[Path, dict[str, Any], dict[str, Any]] | None:
    raw = root / "data" / "raw"
    if not raw.is_dir():
        return None
    found: list[tuple[str, Path]] = []
    for ck in raw.glob("*/checkpoint.json"):
        data = load_json(ck)
        if data.get("phase") and data.get("phase") != "done":
            found.append((data.get("run_id") or ck.parent.name, ck))
    if not found:
        return None
    found.sort(key=lambda x: x[0])
    ck_path = found[-1][1]
    ck = load_json(ck_path)
    snap = load_json(ck_path.parent / "snapshot.json")
    return ck_path.parent, snap, ck


def append_log(run_folder: Path, line: str) -> None:
    log = run_folder / "run_log.md"
    stamp = now().strftime("%H:%M:%S")
    prev = log.read_text(encoding="utf-8") if log.exists() else f"# {run_folder.name}\n"
    log.write_text(prev.rstrip() + f"\n- {stamp} {line}\n", encoding="utf-8")


def merge_products(snap: dict[str, Any], incoming: list[dict[str, Any]]) -> int:
    by_code = {p.get("product_code"): p for p in snap.get("viator_products") or [] if p.get("product_code")}
    added = 0
    for row in incoming:
        code = row.get("product_code")
        if not code:
            continue
        if code not in by_code:
            by_code[code] = {
                "product_code": code,
                "product_name": row.get("product_name"),
                "viator_status": "已上线",
                "viator_url": None,
                "viator_rating": None,
                "viator_review_count": None,
                "enterprise_name": None,
                "enterprise_location_text": None,
                "syndication_status": "未核验",
                "ta_product_url": None,
                "ta_product_name": None,
                "ta_product_code_found": None,
                "ta_product_rating": None,
                "ta_product_review_count": None,
                "ta_review_type": None,
                "notes": "",
            }
            added += 1
        else:
            if row.get("product_name") and not by_code[code].get("product_name"):
                by_code[code]["product_name"] = row["product_name"]
    snap["viator_products"] = list(by_code.values())
    return added
