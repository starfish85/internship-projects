#!/usr/bin/env python
"""Extract Shinkansen ticket request fields from Chinese/Japanese travel text."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from datetime import date
from pathlib import Path


STATION_ALIASES = {
    "东京站": "Tokyo Station",
    "东京": "Tokyo Station",
    "tokyo station": "Tokyo Station",
    "tokyo": "Tokyo Station",
    "大阪": "Shin-Osaka",
    "大阪站": "Shin-Osaka",
    "新大阪": "Shin-Osaka",
    "新大阪站": "Shin-Osaka",
    "osaka": "Shin-Osaka",
    "shin-osaka": "Shin-Osaka",
    "shin osaka": "Shin-Osaka",
    "京都": "Kyoto",
    "京都站": "Kyoto",
    "kyoto": "Kyoto",
    "金泽": "Kanazawa",
    "金泽站": "Kanazawa",
    "kanazawa": "Kanazawa",
}


TIME_WORDS = {
    "凌晨": "凌晨",
    "早上": "早上",
    "上午": "上午",
    "中午": "中午",
    "下午": "下午",
    "晚上": "晚上",
}


@dataclass
class PassengerCount:
    adults: int | None = None
    children: int | None = None
    raw: str | None = None


@dataclass
class ExtractedRequest:
    travel_date: str | None
    origin: str | None
    origin_query_name: str | None
    destination: str | None
    destination_query_name: str | None
    preferred_time: str | None
    passengers: PassengerCount
    missing_fields: list[str]
    source_text: str


def normalize_digits(text: str) -> str:
    table = str.maketrans("０１２３４５６７８９", "0123456789")
    return text.translate(table)


def parse_today(value: str | None) -> date:
    if not value:
        return date.today()
    year, month, day = [int(part) for part in value.split("-")]
    return date(year, month, day)


def infer_year(month: int, day: int, today: date) -> int:
    candidate = date(today.year, month, day)
    return today.year if candidate >= today else today.year + 1


def extract_date(text: str, today: date) -> str | None:
    patterns = [
        r"(?P<year>20\d{2})\s*[年/-]\s*(?P<month>\d{1,2})\s*[月/-]\s*(?P<day>\d{1,2})\s*日?",
        r"(?P<month>\d{1,2})\s*月\s*(?P<day>\d{1,2})\s*日",
    ]
    for pattern in patterns:
        match = re.search(pattern, text)
        if not match:
            continue
        month = int(match.group("month"))
        day = int(match.group("day"))
        year_text = match.groupdict().get("year")
        year = int(year_text) if year_text else infer_year(month, day, today)
        return f"{year:04d}-{month:02d}-{day:02d}"
    return None


def find_station_alias(fragment: str) -> tuple[str, str] | tuple[None, None]:
    cleaned = fragment.strip(" ，,。.;；：:的从到去回").lower()
    sorted_aliases = sorted(STATION_ALIASES, key=len, reverse=True)
    for alias in sorted_aliases:
        if alias.lower() in cleaned:
            return alias, STATION_ALIASES[alias]
    return None, None


def extract_route(text: str) -> tuple[str | None, str | None, str | None, str | None]:
    route_patterns = [
        r"从(?P<origin>.+?)(?:到|去|回)(?P<destination>.+?)(?:，|,|。|；|;|$)",
        r"(?P<origin>东京站|东京|新大阪站|新大阪|大阪站|大阪|京都站|京都|金泽站|金泽|Tokyo Station|Tokyo|Shin-Osaka|Osaka|Kyoto|Kanazawa)\s*(?:到|去|回)\s*(?P<destination>东京站|东京|新大阪站|新大阪|大阪站|大阪|京都站|京都|金泽站|金泽|Tokyo Station|Tokyo|Shin-Osaka|Osaka|Kyoto|Kanazawa)",
    ]
    for pattern in route_patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE)
        if not match:
            continue
        origin_raw, origin_query = find_station_alias(match.group("origin"))
        dest_raw, dest_query = find_station_alias(match.group("destination"))
        if origin_query and dest_query:
            return origin_raw, origin_query, dest_raw, dest_query

    found = []
    for alias, query_name in STATION_ALIASES.items():
        if re.search(re.escape(alias), text, flags=re.IGNORECASE):
            found.append((alias, query_name))
    unique = []
    seen = set()
    for item in found:
        if item[1] not in seen:
            unique.append(item)
            seen.add(item[1])
    if len(unique) >= 2:
        return unique[0][0], unique[0][1], unique[1][0], unique[1][1]
    return None, None, None, None


def normalize_hour(hour: int, period: str | None) -> int:
    if period in {"下午", "晚上"} and 1 <= hour <= 11:
        return hour + 12
    if period == "中午" and hour < 11:
        return hour + 12
    if period == "凌晨" and hour == 12:
        return 0
    return hour


def extract_time(text: str) -> str | None:
    period = None
    for word in TIME_WORDS:
        if word in text:
            period = TIME_WORDS[word]
            break

    time_patterns = [
        r"(?:(凌晨|早上|上午|中午|下午|晚上)\s*)?(\d{1,2})\s*[:：]\s*(\d{1,2})(?:\s*(左右|前后))?",
        r"(?:(凌晨|早上|上午|中午|下午|晚上)\s*)?(\d{1,2})\s*[点时]\s*(\d{1,2})?\s*(?:分)?(?:\s*(左右|前后))?",
    ]
    for pattern in time_patterns:
        for match in re.finditer(pattern, text):
            local_period = match.group(1) or period
            hour = normalize_hour(int(match.group(2)), local_period)
            minute = int(match.group(3) or 0)
            suffix = " 左右" if match.group(4) else ""
            return f"{hour:02d}:{minute:02d}{suffix}"

    if period:
        return period
    if "时间没有特别要求" in text or "没有特别时间要求" in text or "无特别要求" in text:
        return "无特别要求"
    return None


def extract_passengers(text: str) -> PassengerCount:
    adults = None
    children = None

    adult_match = re.search(r"(\d+)\s*(?:位)?\s*(?:成人|大人|大)", text)
    child_match = re.search(r"(\d+)\s*(?:位)?\s*(?:儿童|小孩|小朋友|小)", text)

    if adult_match:
        adults = int(adult_match.group(1))
    if child_match:
        children = int(child_match.group(1))

    if adults is None:
        generic_match = re.search(r"客人\s*(\d+)\s*位", text)
        if generic_match:
            adults = int(generic_match.group(1))

    parts = []
    if adults is not None:
        parts.append(f"{adults} 位成人")
    if children is not None:
        parts.append(f"{children} 位儿童")
    return PassengerCount(adults=adults, children=children, raw="，".join(parts) if parts else None)


def extract_request(text: str, today: date) -> ExtractedRequest:
    normalized_text = normalize_digits(text.strip())
    origin, origin_query, destination, destination_query = extract_route(normalized_text)
    result = ExtractedRequest(
        travel_date=extract_date(normalized_text, today),
        origin=origin,
        origin_query_name=origin_query,
        destination=destination,
        destination_query_name=destination_query,
        preferred_time=extract_time(normalized_text),
        passengers=extract_passengers(normalized_text),
        missing_fields=[],
        source_text=normalized_text,
    )

    if not result.travel_date:
        result.missing_fields.append("travel_date")
    if not result.origin:
        result.missing_fields.append("origin")
    if not result.destination:
        result.missing_fields.append("destination")
    if not result.passengers.raw:
        result.missing_fields.append("passengers")
    return result


def format_summary(result: ExtractedRequest) -> str:
    return "\n".join(
        [
            "需求识别：",
            f"日期：{result.travel_date or '未识别'}",
            f"出发地：{result.origin or '未识别'}"
            + (f"（查询名：{result.origin_query_name}）" if result.origin_query_name else ""),
            f"目的地：{result.destination or '未识别'}"
            + (f"（查询名：{result.destination_query_name}）" if result.destination_query_name else ""),
            f"期望时间：{result.preferred_time or '无特别要求/未识别'}",
            f"乘客人数：{result.passengers.raw or '未识别'}",
            f"缺失字段：{', '.join(result.missing_fields) if result.missing_fields else '无'}",
        ]
    )


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Extract Shinkansen ticket request fields.")
    parser.add_argument("text", nargs="?", help="Request text to parse.")
    parser.add_argument("--file", type=Path, help="UTF-8 text file containing the request.")
    parser.add_argument("--today", help="Reference date for year inference, e.g. 2026-07-17.")
    parser.add_argument("--json", action="store_true", help="Print JSON instead of readable summary.")
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

    result = extract_request(text, parse_today(args.today))
    if args.json:
        print(json.dumps(asdict(result), ensure_ascii=False, indent=2))
    else:
        print(format_summary(result))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
