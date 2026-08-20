#!/usr/bin/env python3
"""Judge transfer-order route + pickup-time risk from structured facts."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from zoneinfo import ZoneInfo

JST = ZoneInfo("Asia/Tokyo")
ROOT = Path(__file__).resolve().parents[1]
ALIASES_PATH = ROOT / "references" / "aliases.json"

BUFFERS = {
    "airport": {"pickup_after": {"intl": 45, "dom": 25}, "dropoff_before": {"intl": 180, "dom": 90}},
    "port": {"pickup_after": {"intl": 45, "dom": 45}, "dropoff_before": {"intl": 90, "dom": 90}},
    "station": {"pickup_after": {"intl": 15, "dom": 15}, "dropoff_before": {"intl": 25, "dom": 25}},
}

JP_AIRPORTS = {
    "NRT", "HND", "KIX", "ITM", "UKB", "NGO", "FUK", "CTS", "OKA", "SDJ",
    "HIJ", "KMJ", "KOJ",
}

DIR_PICKUP_WORDS = ("接机", "接機", "接港", "接站", "接驳", "接駁", "pickup", "到达接", "抵達接")
DIR_DROPOFF_WORDS = ("送机", "送機", "送港", "送站", "dropoff", "送机服务", "送機服務")
KIND_WORDS = {
    "airport": ("接送机", "接机", "送机", "接機", "送機", "机场", "機場", "空港", "airport"),
    "port": ("接送港", "接港", "送港", "港口", "码头", "碼頭", "邮轮", "郵輪", "客船", "cruise", "港"),
    "station": ("接送站", "接站", "送站", "车站", "車站", "火车站", "高铁", "新幹線", "新干线", "station"),
}


def load_aliases() -> dict[str, Any]:
    return json.loads(ALIASES_PATH.read_text(encoding="utf-8"))


def norm(s: Any) -> str:
    if s is None:
        return ""
    t = str(s)
    trans = str.maketrans(
        "０１２３４５６７８９ＡＢＣＤＥＦＧＨＩＪＫＬＭＮＯＰＱＲＳＴＵＶＷＸＹＺ"
        "ａｂｃｄｅｆｇｈｉｊｋｌｍｎｏｐｑｒｓｔｕｖｗｘｙｚⅢⅱⅱ",
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        "abcdefghijklmnopqrstuvwxyz3ii",
    )
    t = t.translate(trans)
    t = t.replace("III", "3").replace("ii", "3")
    t = re.sub(r"\s+", "", t)
    return t.lower()


def parse_dt(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    if isinstance(value, datetime):
        dt = value
    else:
        text = str(value).strip()
        text = text.replace("Z", "+00:00")
        try:
            dt = datetime.fromisoformat(text)
        except ValueError:
            for fmt in ("%Y-%m-%d %H:%M", "%Y-%m-%d %H:%M:%S", "%Y/%m/%d %H:%M", "%H:%M"):
                try:
                    dt = datetime.strptime(text, fmt)
                    break
                except ValueError:
                    dt = None
            if dt is None:
                return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=JST)
    return dt.astimezone(JST)


def parse_travel_date(value: Any) -> datetime | None:
    if value in (None, ""):
        return None
    text = str(value)[:10]
    try:
        return datetime.strptime(text, "%Y-%m-%d").replace(tzinfo=JST)
    except ValueError:
        return None


def combine_date_time(day: datetime | None, hhmm: Any) -> datetime | None:
    if day is None:
        return parse_dt(hhmm)
    t = parse_dt(hhmm)
    if t is None:
        return None
    if str(hhmm).strip() and re.fullmatch(r"\d{1,2}:\d{2}", str(hhmm).strip()):
        return day.replace(hour=t.hour, minute=t.minute, second=0, microsecond=0)
    if t.year > 1970:
        return t
    return day.replace(hour=t.hour, minute=t.minute, second=0, microsecond=0)


def match_hub(text: str, aliases: dict[str, Any], kinds: tuple[str, ...] | None = None) -> dict[str, Any] | None:
    blob = text or ""
    nblob = norm(blob)
    groups = []
    if kinds is None or "airport" in kinds:
        groups.append(("airport", aliases["airports"]))
    if kinds is None or "port" in kinds:
        groups.append(("port", aliases["ports"]))
    if kinds is None or "station" in kinds:
        groups.append(("station", aliases["stations"]))
    hits: list[tuple[int, dict[str, Any]]] = []
    for kind, items in groups:
        for item in items:
            for name in item["names"]:
                if norm(name) and norm(name) in nblob:
                    hits.append((len(norm(name)), {"kind": kind, **item}))
                    break
    if not hits:
        return None
    hits.sort(key=lambda x: x[0], reverse=True)
    return hits[0][1]


def guess_kind(order: dict[str, Any], hub_id: str) -> str:
    blob = " ".join(
        str(order.get(k) or "")
        for k in ("product_name", "package_name", "start_poi_name", "end_poi_name", "customer_note", "itinerary")
    )
    scores = {k: sum(1 for w in words if w.lower() in blob.lower()) for k, words in KIND_WORDS.items()}
    if re.search(r"\b[A-Z]{2,3}\s?\d{1,4}\b", hub_id or "", re.I):
        scores["airport"] += 2
    if re.search(r"(のぞみ|ひかり|こだま|みずほ|さくら|つばめ|NOZOMI|HIKARI|[GDC]\d{1,4})", hub_id or "", re.I):
        scores["station"] += 2
    if any(x in (hub_id or "") for x in ("丸", "飞鸟", "飛鳥", "Princess", "MSC", "Costa", "Asuka", "World")):
        scores["port"] += 2
    best = max(scores, key=scores.get)
    return best if scores[best] else "airport"


def guess_product_direction(order: dict[str, Any], product_hub: dict[str, Any] | None) -> str | None:
    blob = " ".join(str(order.get(k) or "") for k in ("product_name", "package_name"))
    low = blob.lower()
    if any(w.lower() in low for w in DIR_PICKUP_WORDS):
        return "pickup"
    if any(w.lower() in low for w in DIR_DROPOFF_WORDS):
        return "dropoff"
    start = " ".join([str(order.get("start_poi_name") or ""), str(order.get("start_poi_addr") or "")])
    end = " ".join([str(order.get("end_poi_name") or ""), str(order.get("end_poi_addr") or "")])
    if product_hub:
        names = [product_hub.get("code", "")] + list(product_hub.get("names") or [])
        start_hit = any(norm(n) and norm(n) in norm(start) for n in names)
        end_hit = any(norm(n) and norm(n) in norm(end) for n in names)
        if start_hit and not end_hit:
            return "pickup"
        if end_hit and not start_hit:
            return "dropoff"
    return None


def estimate_drive(order: dict[str, Any], hub: dict[str, Any], aliases: dict[str, Any]) -> int:
    table = aliases.get("drive_minutes") or {}
    blob = " ".join(
        str(order.get(k) or "")
        for k in ("start_poi_name", "end_poi_name", "start_poi_addr", "end_poi_addr", "product_name")
    )
    code = (hub.get("hub_code") or hub.get("code") or "").upper()
    if any(x in blob for x in ("横滨", "横浜", "Yokohama")) and code == "HND":
        return int(table.get("yokohama_to_HND", 40))
    if any(x in blob for x in ("横滨", "横浜", "Yokohama")) and code == "NRT":
        return int(table.get("yokohama_to_NRT", 80))
    if any(x in blob for x in ("大阪", "Osaka", "难波", "梅田")) and code == "KIX":
        return int(table.get("osaka_to_KIX", 70))
    if any(x in blob for x in ("大阪", "Osaka")) and code == "ITM":
        return int(table.get("osaka_to_ITM", 40))
    if any(x in blob for x in ("神户", "神戸", "Kobe")) and code == "KIX":
        return int(table.get("kobe_to_KIX", 70))
    key = f"city_to_{code}"
    if key in table:
        return int(table[key])
    return int(table.get("default", 50))


def is_domestic(hub: dict[str, Any]) -> bool:
    other = (hub.get("other_end_code") or "").upper()
    here = (hub.get("hub_code") or "").upper()
    if other in JP_AIRPORTS and here in JP_AIRPORTS:
        return True
    if hub.get("leg") == "domestic":
        return True
    return False


def extract_hub_id(order: dict[str, Any]) -> str:
    if order.get("hub_id"):
        return str(order["hub_id"]).strip()
    blob = " ".join(
        str(order.get(k) or "")
        for k in (
            "hub_id_raw",
            "customer_note",
            "itinerary",
            "booking_extra_info",
            "unit_extra_info",
            "remarks",
            "product_name",
            "package_name",
        )
    )
    m = re.search(r"(?:航班|航班号|flight)\s*[:：#]?\s*([A-Z]{2,3}\s?\d{1,4})", blob, re.I)
    if m:
        return re.sub(r"\s+", "", m.group(1).upper())
    m = re.search(r"(?:船名|邮轮|郵輪|cruise)\s*[:：]?\s*([^\n,，;；]{2,40})", blob, re.I)
    if m:
        return m.group(1).strip()
    m = re.search(r"(?:列车|列車|车次|車次|train)\s*[:：#]?\s*([^\n,，;；]{2,30})", blob, re.I)
    if m:
        return m.group(1).strip()
    m = re.search(r"\b([A-Z]{2,3}\s?\d{1,4})\b", blob)
    if m:
        return re.sub(r"\s+", "", m.group(1).upper())
    m = re.search(r"(のぞみ|ひかり|こだま|みずほ|さくら|つばめ)\s*\d{1,3}", blob, re.I)
    if m:
        return m.group(0)
    return ""


def city_of(item: dict[str, Any] | None) -> str:
    if not item:
        return ""
    if item.get("city"):
        return str(item["city"])
    code = str(item.get("code") or "")
    if code.startswith("TYO") or code in {"NRT", "HND"}:
        return "tokyo"
    if code.startswith("YOK"):
        return "yokohama"
    if code.startswith("UKB") or code in {"KIX", "ITM"}:
        return "kobe-osaka"
    return code


def judge_one(payload: dict[str, Any], aliases: dict[str, Any]) -> dict[str, Any]:
    order = payload.get("order") or {}
    hub = payload.get("hub") or {}
    issues: list[dict[str, str]] = []

    hub_id = str(hub.get("id") or extract_hub_id(order) or "").strip()
    kind = str(hub.get("kind") or guess_kind(order, hub_id))
    blob = " ".join(
        str(order.get(k) or "")
        for k in ("product_name", "package_name", "start_poi_name", "end_poi_name", "start_poi_addr", "end_poi_addr")
    )
    product_hub = match_hub(blob, aliases, kinds=(kind,))
    actual_hub = None
    if hub.get("hub_code") or hub.get("hub_name"):
        actual_hub = match_hub(
            " ".join([str(hub.get("hub_code") or ""), str(hub.get("hub_name") or "")]),
            aliases,
            kinds=(kind,),
        )
    product_dir = guess_product_direction(order, product_hub)
    actual_dir = hub.get("direction")
    if actual_dir not in {"arrival", "departure"}:
        actual_dir = None

    travel_day = parse_travel_date(order.get("travel_date"))
    pickup = combine_date_time(travel_day, order.get("time_slot"))
    scheduled = parse_dt(hub.get("scheduled_time"))

    if not hub_id:
        issues.append({"level": "NEED_INFO", "code": "NO_HUB_ID", "msg": "订单里找不到航班号/船名/列车号"})
    if hub_id and not scheduled:
        issues.append({"level": "NEED_INFO", "code": "NO_SCHEDULE", "msg": f"未查到 {hub_id} 在出行日的官方时刻"})

    if product_hub and actual_hub:
        same = False
        if product_hub.get("code") == actual_hub.get("code"):
            same = True
        elif city_of(product_hub) and city_of(product_hub) == city_of(actual_hub) and (
            product_hub["code"] in {city_of(product_hub).upper()[:3], "TYO", "YOK"}
            or actual_hub["code"] in {"TYO", "YOK"}
        ):
            # generic "东京港" vs specific Harumi is WARN, not FAIL
            if product_hub["code"] != actual_hub["code"] and (
                product_hub["code"] in {"TYO", "YOK", "UKB-PORT"} or actual_hub["code"] in {"TYO", "YOK"}
            ):
                issues.append(
                    {
                        "level": "WARN",
                        "code": "HUB_TOO_GENERIC",
                        "msg": f"产品只写到 {product_hub['code']}，实际停靠 {actual_hub['code']}，需确认码头/航站是否同一产品",
                    }
                )
                same = True
        if not same:
            issues.append(
                {
                    "level": "FAIL",
                    "code": "WRONG_HUB",
                    "msg": f"产品枢纽 {product_hub.get('code')} 与实际 {actual_hub.get('code')}（{hub.get('hub_name') or ''}）不一致，疑似订错产品",
                }
            )

    expected_dir = None
    if actual_dir == "arrival":
        expected_dir = "pickup"
    elif actual_dir == "departure":
        expected_dir = "dropoff"

    reversed_route = bool(product_dir and expected_dir and product_dir != expected_dir)
    if reversed_route:
        issues.append(
            {
                "level": "FAIL",
                "code": "REVERSED_ROUTE",
                "msg": f"枢纽是{'到达' if actual_dir == 'arrival' else '出发'}，订单却是{'接' if product_dir == 'pickup' else '送'}，疑似订反线路",
            }
        )

    if travel_day and scheduled:
        delta_days = (scheduled.date() - travel_day.date()).days
        if abs(delta_days) >= 1:
            # red-eye: departure previous night or arrival next calendar day is OK if within 18h
            if pickup:
                hours = abs((scheduled - pickup).total_seconds()) / 3600
                if hours > 18:
                    issues.append(
                        {
                            "level": "FAIL",
                            "code": "DATE_MISMATCH",
                            "msg": f"出行日 {travel_day.date()} 与枢纽时刻 {scheduled.isoformat()} 相差超过18小时",
                        }
                    )
            elif abs(delta_days) >= 1:
                issues.append(
                    {
                        "level": "WARN",
                        "code": "DATE_OFF",
                        "msg": f"出行日 {travel_day.date()} 与枢纽日 {scheduled.date()} 不一致，需核对红眼/跨日",
                    }
                )

    if pickup and scheduled and expected_dir and not reversed_route:
        domestic = is_domestic(hub)
        leg = "dom" if domestic else "intl"
        buf = BUFFERS.get(kind, BUFFERS["airport"])
        drive = int(hub.get("drive_minutes") or estimate_drive(order, {**hub, "hub_code": (actual_hub or product_hub or {}).get("code")}, aliases))
        slack = 15
        if expected_dir == "pickup":
            earliest = scheduled + timedelta(minutes=buf["pickup_after"][leg])
            if pickup < scheduled:
                issues.append(
                    {
                        "level": "FAIL",
                        "code": "PICKUP_BEFORE_ARRIVAL",
                        "msg": f"接的时间 {pickup.strftime('%H:%M')} 早于到达 {scheduled.strftime('%H:%M')}，客人还没到",
                    }
                )
            elif pickup < earliest:
                issues.append(
                    {
                        "level": "WARN",
                        "code": "PICKUP_TOO_EARLY",
                        "msg": f"接的时间 {pickup.strftime('%H:%M')} 早于建议出场 {earliest.strftime('%H:%M')}（到达+{buf['pickup_after'][leg]}分）",
                    }
                )
            if pickup > scheduled + timedelta(minutes=180):
                issues.append(
                    {
                        "level": "WARN",
                        "code": "PICKUP_TOO_LATE_WAIT",
                        "msg": f"接的时间比到达晚超过3小时，客人可能空等，确认是否另有安排",
                    }
                )
        else:
            latest_at_hub = scheduled - timedelta(minutes=buf["dropoff_before"][leg])
            latest_pickup = latest_at_hub - timedelta(minutes=drive + slack)
            if pickup >= scheduled:
                issues.append(
                    {
                        "level": "FAIL",
                        "code": "TOO_LATE_AFTER_DEPART",
                        "msg": f"出发时间 {pickup.strftime('%H:%M')} 不早于枢纽出发 {scheduled.strftime('%H:%M')}，必迟到",
                    }
                )
            elif pickup > latest_pickup:
                issues.append(
                    {
                        "level": "FAIL",
                        "code": "TOO_LATE",
                        "msg": (
                            f"出发 {pickup.strftime('%H:%M')} 过晚：需在 "
                            f"{latest_at_hub.strftime('%H:%M')} 前到枢纽"
                            f"（出发前{buf['dropoff_before'][leg]}分），"
                            f"车程约{drive}分，最晚上车约 {latest_pickup.strftime('%H:%M')}"
                        ),
                    }
                )

    levels = {i["level"] for i in issues}
    if "FAIL" in levels:
        verdict = "FAIL"
    elif "NEED_INFO" in levels:
        verdict = "NEED_INFO"
    elif "WARN" in levels:
        verdict = "WARN"
    else:
        verdict = "PASS"

    return {
        "verdict": verdict,
        "order_id": order.get("id") or order.get("channel_order_no"),
        "hub_id": hub_id,
        "kind": kind,
        "product_direction": product_dir,
        "actual_direction": actual_dir,
        "expected_direction": expected_dir,
        "product_hub": (product_hub or {}).get("code"),
        "actual_hub": (actual_hub or {}).get("code") or hub.get("hub_code"),
        "pickup_time": pickup.isoformat() if pickup else None,
        "scheduled_time": scheduled.isoformat() if scheduled else None,
        "issues": issues,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Judge transfer order route/time")
    parser.add_argument("input", nargs="?", help="JSON file or - for stdin")
    parser.add_argument("--pretty", action="store_true")
    args = parser.parse_args()
    raw = sys.stdin.read() if not args.input or args.input == "-" else Path(args.input).read_text(encoding="utf-8")
    data = json.loads(raw)
    aliases = load_aliases()
    items = data if isinstance(data, list) else data.get("orders") or [data]
    results = [judge_one(item, aliases) for item in items]
    summary = {
        "total": len(results),
        "FAIL": sum(1 for r in results if r["verdict"] == "FAIL"),
        "WARN": sum(1 for r in results if r["verdict"] == "WARN"),
        "NEED_INFO": sum(1 for r in results if r["verdict"] == "NEED_INFO"),
        "PASS": sum(1 for r in results if r["verdict"] == "PASS"),
        "results": results,
    }
    print(json.dumps(summary, ensure_ascii=False, indent=2 if args.pretty else None))
    return 0 if summary["FAIL"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
