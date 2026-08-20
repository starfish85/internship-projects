#!/usr/bin/env python
"""Parse Trip.com train cards or use live browser automation to fetch train info."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
from dataclasses import asdict, dataclass, field
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from extract_request import extract_request, parse_today  # noqa: E402
from open_tripcom import build_tripcom_url  # noqa: E402


TRAIN_KEYWORDS = ("新干线", "Shinkansen", "Nozomi", "Hikari", "Kodama")
BUS_KEYWORDS = ("巴士", "Bus")
TIME_RE = re.compile(r"\b(\d{1,2}):(\d{2})\b")
PRICE_RE = re.compile(r"\b(USD|HKD)\s?(\d+(?:\.\d+)?)\b")
SEAT_PRICE_RE = re.compile(r"([^\n\r]+?)\s*(USD|HKD)\s?(\d+(?:\.\d+)?)")


@dataclass
class SeatOption:
    label: str
    price: str | None = None
    notes: list[str] = field(default_factory=list)


@dataclass
class TrainDetail:
    title: str
    departure_time: str | None
    arrival_time: str | None
    departure_station: str | None
    arrival_station: str | None
    duration: str | None
    price: str | None
    seat_options: list[SeatOption]
    raw: str


def load_text(path: Path | None, text: str | None) -> str:
    if path:
        return path.read_text(encoding="utf-8")
    if text is not None:
        return text
    raise SystemExit("provide --file or --text")


def split_cards(text: str) -> list[str]:
    lines = [line.rstrip() for line in text.splitlines()]
    cards: list[list[str]] = []
    current: list[str] = []
    for line in lines:
        if not line.strip():
            if current:
                cards.append(current)
                current = []
            continue
        if current and any(keyword in line for keyword in TRAIN_KEYWORDS):
            cards.append(current)
            current = [line]
            continue
        current.append(line)
    if current:
        cards.append(current)
    return ["\n".join(card) for card in cards]


def is_train_card(block: str) -> bool:
    lowered = block.lower()
    if any(keyword in block for keyword in BUS_KEYWORDS) or "bus" in lowered:
        return False
    return any(keyword in block or keyword.lower() in lowered for keyword in TRAIN_KEYWORDS)


def extract_times(block: str) -> list[str]:
    return [f"{hour.zfill(2)}:{minute}" for hour, minute in TIME_RE.findall(block)]


def extract_duration(block: str) -> str | None:
    match = re.search(r"(\d+小时\d+分|\d+h\d+m|\d+小时)", block)
    return match.group(1) if match else None


def extract_price(block: str) -> str | None:
    match = PRICE_RE.search(block)
    if not match:
        return None
    return f"{match.group(1)}{match.group(2)}"


def extract_station_after_time(block: str, time_value: str | None) -> str | None:
    if not time_value:
        return None
    lines = [line.strip() for line in block.splitlines() if line.strip()]
    for index, line in enumerate(lines):
        if time_value in line:
            for offset in (1, 2):
                target = index + offset
                if 0 <= target < len(lines):
                    candidate = lines[target]
                    if not TIME_RE.search(candidate) and not PRICE_RE.search(candidate):
                        return candidate
    return None


def extract_title(block: str) -> str:
    for line in block.splitlines():
        if any(keyword in line for keyword in TRAIN_KEYWORDS):
            return line.strip()
    return block.splitlines()[0].strip()


def extract_seat_options(block: str) -> list[SeatOption]:
    seat_lines: list[str] = []
    started = False
    for line in block.splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        if any(token in stripped for token in ["選擇座位等級", "选择座位等级", "Seat", "座席"]):
            started = True
            continue
        if started:
            seat_lines.append(stripped)

    options: list[SeatOption] = []
    current: SeatOption | None = None
    for line in seat_lines:
        price_match = PRICE_RE.search(line)
        if price_match:
            label = line[: price_match.start()].strip(" -|：:")
            if not label and current:
                current.price = f"{price_match.group(1)}{price_match.group(2)}"
                continue
            option = SeatOption(label=label or line.strip(), price=f"{price_match.group(1)}{price_match.group(2)}")
            options.append(option)
            current = option
            continue

        if any(keyword in line for keyword in ["普通車廂", "綠色車廂", "非指定座位", "指定席", "自由席", "Green Car", "Ordinary Car"]):
            option = SeatOption(label=line)
            options.append(option)
            current = option
            continue

        if current:
            if line not in current.notes:
                current.notes.append(line)

    # Deduplicate labels while preserving order
    deduped: list[SeatOption] = []
    seen = set()
    for option in options:
        key = (option.label, option.price)
        if key in seen:
            continue
        seen.add(key)
        deduped.append(option)
    return deduped


def parse_card(block: str) -> TrainDetail | None:
    if not is_train_card(block):
        return None
    times = extract_times(block)
    departure_time = times[0] if times else None
    arrival_time = times[1] if len(times) > 1 else None
    return TrainDetail(
        title=extract_title(block),
        departure_time=departure_time,
        arrival_time=arrival_time,
        departure_station=extract_station_after_time(block, departure_time),
        arrival_station=extract_station_after_time(block, arrival_time),
        duration=extract_duration(block),
        price=extract_price(block),
        seat_options=extract_seat_options(block),
        raw=block,
    )


def parse_cards(text: str) -> list[TrainDetail]:
    cards: list[TrainDetail] = []
    for block in split_cards(text):
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
    if "上午" in value or "早上" in value:
        return 8, 0
    if "中午" in value:
        return 12, 0
    if "下午" in value:
        return 15, 0
    if "晚上" in value:
        return 18, 0
    if "凌晨" in value:
        return 6, 0
    return None


def filter_by_time(cards: list[TrainDetail], preferred_time: str | None) -> list[TrainDetail]:
    target = parse_preferred_time(preferred_time)
    if not target:
        return cards
    target_minutes = target[0] * 60 + target[1]
    if any(keyword in (preferred_time or "") for keyword in ["上午", "早上", "中午", "下午", "晚上", "凌晨"]):
        windows = {
            "凌晨": (0, 359),
            "早上": (360, 719),
            "上午": (360, 719),
            "中午": (720, 839),
            "下午": (840, 1079),
            "晚上": (1080, 1439),
        }
        for key, (start, end) in windows.items():
            if key in preferred_time:
                return [card for card in cards if card.departure_time and start <= _to_minutes(card.departure_time) <= end]
    return [card for card in cards if card.departure_time and abs(_to_minutes(card.departure_time) - target_minutes) <= 90]


def _to_minutes(value: str) -> int:
    hour, minute = [int(part) for part in value.split(":")]
    return hour * 60 + minute


def format_card(card: TrainDetail) -> str:
    lines = [f"- {card.title}"]
    if card.departure_time or card.arrival_time:
        lines.append(f"  出发：{card.departure_time or '未知'}，{card.departure_station or '未知'}")
        lines.append(f"  到达：{card.arrival_time or '未知'}，{card.arrival_station or '未知'}")
    if card.duration:
        lines.append(f"  时长：{card.duration}")
    if card.price:
        lines.append(f"  车次价格：{card.price}")
    if card.seat_options:
        lines.append("  座席价格：")
        for seat in card.seat_options:
            price = seat.price or "未展示"
            lines.append(f"  - {seat.label}：{price}")
            for note in seat.notes:
                lines.append(f"    说明：{note}")
    else:
        lines.append("  座席价格：未从文本中识别到")
    return "\n".join(lines)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Parse detailed Trip.com train cards.")
    parser.add_argument("--file", type=Path, help="UTF-8 text file with copied expanded card text.")
    parser.add_argument("--text", help="Raw text to parse.")
    parser.add_argument("--preferred-time", help="Preferred time like 08:00 or 上午.")
    parser.add_argument("--live", action="store_true", help="Use a browser session to fetch live Trip.com results.")
    parser.add_argument("--currency", default="USD", choices=["USD", "HKD"], help="Live browser currency.")
    parser.add_argument("--headed", action="store_true", help="Open the browser window instead of running headless.")
    parser.add_argument("--max-results", type=int, default=5, help="Maximum live results to return.")
    parser.add_argument("--json", action="store_true", help="Print JSON.")
    return parser


def main() -> int:
    parser = build_parser()
    args = parser.parse_args()
    if args.live:
        if args.file:
            request_text = args.file.read_text(encoding="utf-8")
        elif args.text:
            request_text = args.text
        else:
            parser.error("provide request text or --file for live mode")

        request = extract_request(request_text, parse_today(None))
        if request.missing_fields:
            raise SystemExit(f"missing required fields: {', '.join(request.missing_fields)}")
        if not request.travel_date or not request.origin_query_name or not request.destination_query_name:
            raise SystemExit("could not extract a complete route/date request")

        url = build_tripcom_url(
            request.travel_date,
            request.origin_query_name,
            request.destination_query_name,
            args.currency,
        )
        node_script = SCRIPT_DIR / "tripcom_live_scraper.js"
        env = os.environ.copy()
        env["PLAYWRIGHT_ENTRY"] = env.get(
            "PLAYWRIGHT_ENTRY",
            "C:/Users/starfish/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.js",
        )
        env["EDGE_PATH"] = env.get(
            "EDGE_PATH",
            "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
        )
        env["NODE_PATH"] = env.get(
            "NODE_PATH",
            "C:/Users/starfish/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/node_modules",
        )
        cmd = [
            "C:/Users/starfish/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe",
            str(node_script),
            f"--url={url}",
            f"--currency={args.currency}",
            f"--preferred-time={request.preferred_time or ''}",
            f"--max-results={args.max_results}",
        ]
        if args.headed:
            cmd.append("--headed")
        completed = subprocess.run(cmd, check=True, capture_output=True, text=True, env=env)
        payload = json.loads(completed.stdout)
        if args.json:
            print(json.dumps(payload, ensure_ascii=False, indent=2))
            return 0
        print(f"搜索结果：{payload['responseSummary']['resultCount']} 个")
        for index, card in enumerate(payload.get("results", []), start=1):
            print(f"{index}. {card['title']}")
            print(f"   出发：{card.get('departure_time') or '未知'}，{card.get('departure_station') or '未知'}")
            print(f"   到达：{card.get('arrival_time') or '未知'}，{card.get('arrival_station') or '未知'}")
            if card.get("duration"):
                print(f"   时长：{card['duration']}")
            if card.get("price"):
                print(f"   价格：{card['price']}")
            if card.get("seat_options"):
                print("   座席价格：")
                for seat in card["seat_options"]:
                    print(f"   - {seat['label']}：{seat.get('price') or '未展示'}")
                    for note in seat.get("notes", []):
                        print(f"     说明：{note}")
        return 0

    text = load_text(args.file, args.text)
    cards = parse_cards(text)
    cards = filter_by_time(cards, args.preferred_time)

    if args.json:
        print(json.dumps([asdict(card) for card in cards], ensure_ascii=False, indent=2))
        return 0

    print(f"符合条件车次数：{len(cards)}")
    for index, card in enumerate(cards, start=1):
        print(f"{index}. {format_card(card)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
