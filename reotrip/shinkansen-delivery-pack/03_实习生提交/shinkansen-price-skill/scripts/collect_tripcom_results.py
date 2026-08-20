#!/usr/bin/env python
"""Collect and filter Trip.com train cards from copied page text or OCR text."""

from __future__ import annotations

import argparse
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


TIME_RE = re.compile(r"\b(\d{1,2}):(\d{2})\b")
PRICE_RE = re.compile(r"\b(USD|HKD)\s?(\d+(?:\.\d+)?)\b")


@dataclass
class TrainCard:
    title: str
    departure_time: str | None
    arrival_time: str | None
    departure_station: str | None
    arrival_station: str | None
    duration: str | None
    price: str | None
    raw: str


def load_text(path: Path | None, text: str | None) -> str:
    if path:
        return path.read_text(encoding="utf-8")
    if text is not None:
        return text
    raise SystemExit("provide --file or raw text")


def split_blocks(text: str) -> list[str]:
    lines = [line.rstrip() for line in text.splitlines()]
    blocks: list[list[str]] = []
    current: list[str] = []
    for line in lines:
        if not line.strip():
            if current:
                blocks.append(current)
                current = []
            continue
        if current and (line.strip().startswith("新干线") or line.strip().startswith("Shinkansen")):
            blocks.append(current)
            current = [line]
            continue
        current.append(line)
    if current:
        blocks.append(current)
    return ["\n".join(block) for block in blocks]


def is_train_block(block: str) -> bool:
    lowered = block.lower()
    if "巴士" in block or "bus" in lowered:
        return False
    return "新干线" in block or "shinkansen" in lowered or "nozomi" in lowered or "hikari" in lowered


def extract_time_tokens(block: str) -> list[str]:
    return [f"{hour.zfill(2)}:{minute}" for hour, minute in TIME_RE.findall(block)]


def extract_price(block: str) -> str | None:
    match = PRICE_RE.search(block)
    if not match:
        return None
    return f"{match.group(1)}{match.group(2)}"


def extract_duration(block: str) -> str | None:
    match = re.search(r"(\d+小时\d+分|\d+h\d+m|\d+小时)", block)
    return match.group(1) if match else None


def extract_station_after_time(block: str, time_value: str, offset: int = 1) -> str | None:
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        if time_value in line:
            target = index + offset
            if 0 <= target < len(lines):
                candidate = lines[target]
                if not TIME_RE.search(candidate) and not PRICE_RE.search(candidate):
                    return candidate
    return None


def parse_card(block: str) -> TrainCard | None:
    if not is_train_block(block):
        return None
    times = extract_time_tokens(block)
    departure_time = times[0] if times else None
    arrival_time = times[1] if len(times) > 1 else None
    title_line = next(
        (line.strip() for line in block.splitlines() if "新干线" in line or "Shinkansen" in line or "Nozomi" in line or "Hikari" in line),
        block.splitlines()[0].strip(),
    )
    return TrainCard(
        title=title_line,
        departure_time=departure_time,
        arrival_time=arrival_time,
        departure_station=extract_station_after_time(block, departure_time) if departure_time else None,
        arrival_station=extract_station_after_time(block, arrival_time) if arrival_time else None,
        duration=extract_duration(block),
        price=extract_price(block),
        raw=block,
    )


def parse_cards(text: str) -> list[TrainCard]:
    cards = []
    for block in split_blocks(text):
        card = parse_card(block)
        if card:
            cards.append(card)
    return cards


def parse_preferred_time(value: str | None) -> tuple[int, int] | None:
    if not value:
        return None
    match = re.search(r"(\d{1,2}):(\d{2})", value)
    if match:
        return int(match.group(1)), int(match.group(2))
    period_map = {
        "凌晨": (6, 0),
        "早上": (8, 0),
        "上午": (8, 0),
        "中午": (12, 0),
        "下午": (15, 0),
        "晚上": (18, 0),
    }
    for key, value_pair in period_map.items():
        if key in value:
            return value_pair
    return None


def minutes(value: tuple[int, int]) -> int:
    return value[0] * 60 + value[1]


def in_window(departure: str | None, target: tuple[int, int] | None, value: str | None) -> bool:
    if target is None or departure is None:
        return True
    hour, minute = [int(part) for part in departure.split(":")]
    dep = hour * 60 + minute
    target_minutes = minutes(target)
    if value and any(key in value for key in ["凌晨", "早上", "上午", "中午", "下午", "晚上"]):
        windows = {
            "凌晨": (0, 359),
            "早上": (360, 719),
            "上午": (360, 719),
            "中午": (720, 839),
            "下午": (840, 1079),
            "晚上": (1080, 1439),
        }
        for key, (start, end) in windows.items():
            if key in value:
                return start <= dep <= end
    return abs(dep - target_minutes) <= 90


def format_card(card: TrainCard) -> str:
    parts = [f"- {card.title}"]
    if card.departure_time or card.arrival_time:
        parts.append(
            f"  出发：{card.departure_time or '未知'}，{card.departure_station or '未知'}\n"
            f"  到达：{card.arrival_time or '未知'}，{card.arrival_station or '未知'}"
        )
    if card.duration:
        parts.append(f"  时长：{card.duration}")
    if card.price:
        parts.append(f"  价格：{card.price}")
    return "\n".join(parts)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Collect Trip.com train results from page text.")
    parser.add_argument("--file", type=Path, help="UTF-8 text file containing copied page text.")
    parser.add_argument("--text", help="Raw page text.")
    parser.add_argument("--preferred-time", help="Preferred time extracted from request, e.g. 08:00 or 上午.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()

    text = load_text(args.file, args.text)
    cards = parse_cards(text)
    target_time = parse_preferred_time(args.preferred_time)

    filtered = [card for card in cards if in_window(card.departure_time, target_time, args.preferred_time)]

    print("选择火车：是")
    print(f"识别到车次数：{len(cards)}")
    print(f"符合条件车次数：{len(filtered)}")
    for index, card in enumerate(filtered, start=1):
        print(f"{index}. {card.title}")
        if card.departure_time or card.arrival_time:
            print(f"   出发：{card.departure_time or '未知'}，{card.departure_station or '未知'}")
            print(f"   到达：{card.arrival_time or '未知'}，{card.arrival_station or '未知'}")
        if card.duration:
            print(f"   时长：{card.duration}")
        if card.price:
            print(f"   价格：{card.price}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
