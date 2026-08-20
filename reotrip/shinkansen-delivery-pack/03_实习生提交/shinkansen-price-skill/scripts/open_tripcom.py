#!/usr/bin/env python
"""Build or open a Trip.com Shinkansen search URL from extracted request text."""

from __future__ import annotations

import argparse
import sys
import webbrowser
from pathlib import Path
from urllib.parse import quote


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from extract_request import extract_request, parse_today  # noqa: E402
TRIPCOM_START_URL = (
    "https://hk.trip.com/trains/asia/list"
    "?locale=zh-HK&curr=USD&redirectedbyasiamiddleware=1&triptab=train"
    "&departurecountrycode=JP&arrivalcountrycode=JP&tripTab=train&biztype=JP"
    "&departdate=2026-07-13"
    "&departurecitycode=JP03271"
    "&arrivalcitycode=JP03869"
    "&departurecity=%E6%9D%B1%E4%BA%AC"
    "&arrivalcity=%E5%A4%A7%E9%98%AA"
)


CITY_TEMPLATE = {
    "Tokyo Station": {"display": "\u6771\u4eac", "code": "JP03271"},
    "Shin-Osaka": {"display": "\u5927\u962a", "code": "JP03869"},
}


def build_tripcom_url(travel_date: str, origin_query: str, destination_query: str, currency: str) -> str:
    origin = CITY_TEMPLATE.get(origin_query)
    destination = CITY_TEMPLATE.get(destination_query)
    if not origin or not destination:
        raise ValueError(
            f"unsupported route mapping: {origin_query} -> {destination_query}. "
            "Add the route to CITY_TEMPLATE first."
        )

    return (
        "https://hk.trip.com/trains/asia/list"
        f"?locale=zh-HK&curr={currency}&redirectedbyasiamiddleware=1&triptab=train"
        "&departurecountrycode=JP&arrivalcountrycode=JP&tripTab=train&biztype=JP"
        f"&departdate={travel_date}"
        f"&departurecitycode={origin['code']}"
        f"&arrivalcitycode={destination['code']}"
        f"&departurecity={quote(origin['display'])}"
        f"&arrivalcity={quote(destination['display'])}"
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Open a Trip.com search page from request text.")
    parser.add_argument("text", nargs="?", help="Request text to parse.")
    parser.add_argument("--file", type=Path, help="UTF-8 text file containing the request.")
    parser.add_argument("--today", help="Reference date for year inference, e.g. 2026-07-17.")
    parser.add_argument("--currency", default="USD", choices=["USD", "HKD"], help="Trip.com currency.")
    parser.add_argument("--open", action="store_true", help="Open the generated URL in the browser.")
    parser.add_argument(
        "--start-url-only",
        action="store_true",
        help="Print or open the fixed Trip.com start URL before request-specific automation is used.",
    )
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    if args.start_url_only:
        print(TRIPCOM_START_URL)
        if args.open:
            webbrowser.open(TRIPCOM_START_URL)
        return 0
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

    print("需求识别：")
    print(f"- 日期：{request.travel_date}")
    print(f"- 出发地：{request.origin or request.origin_query_name} -> {request.origin_query_name}")
    print(f"- 目的地：{request.destination or request.destination_query_name} -> {request.destination_query_name}")
    print(f"- 期望时间：{request.preferred_time or '无特别要求'}")
    print(f"- 乘客人数：{request.passengers.raw or '未识别'}")

    url = build_tripcom_url(
        request.travel_date,
        request.origin_query_name,
        request.destination_query_name,
        args.currency,
    )
    print(url)
    if args.open:
        webbrowser.open(url)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())




