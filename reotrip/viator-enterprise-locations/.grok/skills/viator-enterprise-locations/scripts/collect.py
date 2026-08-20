#!/usr/bin/env python3
"""
Slow collection against the user's already-open Chrome.

Never: new Chrome, CDP/9222, page reload, fetch() of supplier APIs,
captcha solving, parallel tabs.

Usage (from project root):
  python3 .grok/skills/viator-enterprise-locations/scripts/collect.py status
  python3 .../collect.py harvest-list --dom-only
  python3 .../collect.py harvest-list
  python3 .../collect.py resume
"""

from __future__ import annotations

import argparse
import random
import sys
import time
from pathlib import Path

from chrome_osa import (
    BlockedError,
    assert_not_blocked,
    activate_tab,
    detect,
    find_tab,
    focus_list_for_scroll,
    harvest_detail,
    harvest_list,
    list_tabs,
)
from os_input import chrome_page_down
from paths import project_root, snapshot_path
from store import (
    append_log,
    empty_checkpoint,
    empty_snapshot,
    latest_unfinished,
    load_json,
    merge_products,
    new_run_id,
    now,
    save_json,
)

LIST_URL = "supplier.viator.com/products"
TARGET_COUNT = 130
# After 2026-08-20 DataDome trip: 8–15s was too fast; list API page 2 already tripped captcha.
PAGE_WAIT = (22.0, 40.0)
SETTLE = (1.6, 2.8)
EVERY_N_PAGES_PAUSE = (45.0, 75.0)


def sleep_range(lo: float, hi: float, why: str) -> None:
    sec = random.uniform(lo, hi)
    print(f"wait {sec:.1f}s ({why})", flush=True)
    time.sleep(sec)


def open_run(root: Path, resume: bool) -> tuple[Path, dict, dict]:
    if resume:
        found = latest_unfinished(root)
        if not found:
            raise SystemExit("No unfinished run to resume.")
        folder, snap, ck = found
        print(f"resume {snap['run_id']} phase={ck.get('phase')}")
        return folder, snap, ck
    run_id = new_run_id()
    folder = root / "data" / "raw" / run_id
    folder.mkdir(parents=True, exist_ok=True)
    snap = empty_snapshot(run_id)
    ck = empty_checkpoint(run_id, "viator_list")
    save_json(folder / "snapshot.json", snap)
    save_json(folder / "checkpoint.json", ck)
    append_log(folder, "created run; attach existing Chrome only")
    print(f"new run {run_id}")
    return folder, snap, ck


def persist(folder: Path, snap: dict, ck: dict) -> None:
    save_json(folder / "snapshot.json", snap)
    save_json(folder / "checkpoint.json", ck)


def mark_blocked(folder: Path, snap: dict, ck: dict, err: BlockedError) -> None:
    snap["status"] = "blocked"
    ck["blocked_reason"] = str(err)
    persist(folder, snap, ck)
    append_log(folder, f"BLOCKED {err}")
    print("STOPPED: captcha or login wall. Solve it in the existing Chrome tab, then: collect.py resume")
    print(f"checkpoint: {folder / 'checkpoint.json'}")


def cmd_status(_: argparse.Namespace) -> int:
    tabs = list_tabs()
    if not tabs:
        print("No Google Chrome windows.")
        return 1
    print(f"{len(tabs)} Chrome tabs:")
    for t in tabs:
        print(f"  W{t.window}T{t.tab}  {t.title[:40]!s}  {t.url}")
    try:
        tab = find_tab(LIST_URL)
    except RuntimeError as e:
        print(e)
        return 1
    print(f"\nlist tab: W{tab.window}T{tab.tab}")
    info = detect(tab)
    print(json_pretty(info))
    if info.get("blocked"):
        print("\nPage is blocked. Do not harvest. User must pass the challenge in this tab.")
        return 2
    return 0


def json_pretty(obj: object) -> str:
    import json as _json

    return _json.dumps(obj, ensure_ascii=False, indent=2)


def cmd_harvest_list(args: argparse.Namespace) -> int:
    root = project_root(args.project)
    folder, snap, ck = open_run(root, resume=args.resume)
    try:
        tab = find_tab(LIST_URL)
        activate_tab(tab)
        sleep_range(*SETTLE, "tab front")
        info = assert_not_blocked(tab)
    except BlockedError as e:
        mark_blocked(folder, snap, ck, e)
        return 2
    except Exception as e:
        print(e)
        return 1

    print("detect", json_pretty({k: info.get(k) for k in ("href", "productCountText", "visibleItems", "blocked")}))
    if "status=ACTIVE" not in (info.get("href") or ""):
        print("NOTE: list URL is not ?status=ACTIVE. Continue anyway; do not change filters from the script.")

    pages = 0
    stagnant = 0
    while True:
        try:
            assert_not_blocked(tab)
            data = harvest_list(tab)
        except BlockedError as e:
            mark_blocked(folder, snap, ck, e)
            return 2

        added = merge_products(snap, data.get("products") or [])
        persist(folder, snap, ck)
        have = len(snap["viator_products"])
        print(
            f"list visible={data.get('visible')} banner={data.get('productCountText')!r} "
            f"unique={have} +{added}"
        )
        append_log(folder, f"harvest-list unique={have} added={added} visible={data.get('visible')}")

        if have >= TARGET_COUNT:
            ck["phase"] = "viator_details"
            persist(folder, snap, ck)
            print(f"list complete: {have} products")
            return 0

        if args.dom_only:
            ck["phase"] = "viator_list"
            persist(folder, snap, ck)
            print(f"dom-only stop: {have} products on screen (target {TARGET_COUNT})")
            return 0

        if added == 0:
            stagnant += 1
        else:
            stagnant = 0
        if stagnant >= 3:
            persist(folder, snap, ck)
            print(
                f"no new rows after {stagnant} PageDowns. Have {have}/{TARGET_COUNT}. "
                "Stop so we do not hammer the list. Scroll the list yourself, then --dom-only, or resume later."
            )
            return 0

        pages += 1
        try:
            activate_tab(tab)
            focus_list_for_scroll(tab)
            chrome_page_down()
        except BlockedError as e:
            mark_blocked(folder, snap, ck, e)
            return 2
        sleep_range(*PAGE_WAIT, "between list pages")
        if pages % 3 == 0:
            sleep_range(*EVERY_N_PAGES_PAUSE, "every 3 pages extra")
    return 0


def cmd_resume(args: argparse.Namespace) -> int:
    args.resume = True
    root = project_root(args.project)
    found = latest_unfinished(root)
    if not found:
        raise SystemExit("No unfinished run.")
    _folder, _snap, ck = found
    if ck.get("blocked_reason"):
        print("Last run was blocked. Checking whether the captcha is gone…")
        tab = find_tab(LIST_URL)
        info = detect(tab)
        if info.get("blocked"):
            print("Still blocked. Pass the challenge in Chrome, then run resume again.")
            print(json_pretty(info))
            return 2
        ck["blocked_reason"] = None
        save_json(found[0] / "checkpoint.json", ck)
        append_log(found[0], "captcha cleared; continuing")
    phase = ck.get("phase") or "viator_list"
    if phase == "viator_list":
        return cmd_harvest_list(args)
    print(f"phase {phase}: list harvest script does not auto-run details yet. Use Grok / resume for the next phase.")
    return 0


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Slow Viator harvest via existing Chrome")
    parser.add_argument("--project", default=None)
    sub = parser.add_subparsers(dest="cmd", required=True)

    sub.add_parser("status", help="List Chrome tabs and captcha state. No navigation.")

    p_list = sub.add_parser("harvest-list", help="Read Active products from the open list tab")
    p_list.add_argument("--dom-only", action="store_true", help="Do not PageDown; only read what is already on screen")
    p_list.add_argument("--resume", action="store_true")

    sub.add_parser("resume", help="Continue the latest unfinished run if captcha is gone")

    args = parser.parse_args(argv)
    if args.cmd == "status":
        return cmd_status(args)
    if args.cmd == "harvest-list":
        return cmd_harvest_list(args)
    if args.cmd == "resume":
        return cmd_resume(args)
    return 1


if __name__ == "__main__":
    try:
        sys.exit(main())
    except KeyboardInterrupt:
        print("interrupted")
        sys.exit(130)
