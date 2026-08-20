#!/usr/bin/env python
"""Plan the Trip.com date/time selection step from an extracted request."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from extract_request import extract_request, parse_today  # noqa: E402
from open_tripcom import build_tripcom_url  # noqa: E402


def resolve_picker_time(preferred_time: str | None) -> str | None:
    if not preferred_time:
        return None
    if ":" in preferred_time:
        return preferred_time.replace(" ", "")

    defaults = {
        "凌晨": "06:00",
        "早上": "08:00",
        "上午": "08:00",
        "中午": "12:00",
        "下午": "15:00",
        "晚上": "18:00",
    }
    return defaults.get(preferred_time)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Plan Trip.com date and time selection.")
    parser.add_argument("text", nargs="?", help="Request text to parse.")
    parser.add_argument("--file", type=Path, help="UTF-8 text file containing the request.")
    parser.add_argument("--today", help="Reference date for year inference, e.g. 2026-07-17.")
    parser.add_argument("--currency", default="USD", choices=["USD", "HKD"], help="Trip.com currency.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.file:
        text = args.file.read_text(encoding="utf-8")
    elif args.text:
        text = args.text
    else:
        parser.error("provide request text or --file")

    request = extract_request(text, parse_today(args.today))
    if request.missing_fields:
        raise SystemExit(f"missing required fields: {', '.join(request.missing_fields)}")
    if not request.travel_date or not request.origin_query_name or not request.destination_query_name:
        raise SystemExit("could not extract a complete route/date request")

    picker_time = resolve_picker_time(request.preferred_time)
    url = build_tripcom_url(
        request.travel_date,
        request.origin_query_name,
        request.destination_query_name,
        args.currency,
    )

    print("页面选择计划：")
    print(f"1. 出发地：{request.origin or request.origin_query_name} -> {request.origin_query_name}")
    print(f"2. 终点：{request.destination or request.destination_query_name} -> {request.destination_query_name}")
    print(f"3. 日期：{request.travel_date}")
    print(f"4. 时间：{picker_time or request.preferred_time or '保持默认'}")
    print("5. 使用的查询链接：")
    print(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
