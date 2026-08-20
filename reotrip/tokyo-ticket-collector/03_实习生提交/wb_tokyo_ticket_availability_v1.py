#!/usr/bin/env python3
from __future__ import annotations

import argparse
import csv
import json
import re
import sys
import subprocess
import time
from html import unescape
from dataclasses import asdict, dataclass
from datetime import datetime
from pathlib import Path
from typing import Iterable
from urllib.request import Request, urlopen

try:
    from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
except Exception:  # pragma: no cover
    PlaywrightTimeoutError = TimeoutError


TOKYO_TICKETS_URL = "https://www.wbstudiotour.jp/en/tickets/"
TOKYO_PRICE_URL = "https://www.wbstudiotour.jp/en/ticket-information/price/"
BOOK_START_URL = (
    "https://book.wbstudiotour.com/"
    "?event_type_id=30&journey_id=10&site_id=3&language_id=1"
)

LOG_FILE: Path | None = None

MONTH_NAMES = {
    "january": 1,
    "february": 2,
    "march": 3,
    "april": 4,
    "may": 5,
    "june": 6,
    "july": 7,
    "august": 8,
    "september": 9,
    "october": 10,
    "november": 11,
    "december": 12,
}

MONTH_NUM_TO_NAME = {value: key.title() for key, value in MONTH_NAMES.items()}

INDIVIDUAL_TICKET_TYPES = ["Adult", "Junior", "Child", "Under 4"]


@dataclass
class TicketRow:
    date: str
    time_slot: str
    age_group: str
    price: str
    sale_status: str
    source_url: str
    collected_at: str
    remaining_inventory: str = ""


class SessionExpiredError(RuntimeError):
    pass


def log(message: str) -> None:
    line = f"[{datetime.now().isoformat(timespec='seconds')}] {message}"
    print(line, flush=True)
    if LOG_FILE:
        LOG_FILE.parent.mkdir(parents=True, exist_ok=True)
        with LOG_FILE.open("a", encoding="utf-8") as f:
            f.write(line + "\n")


def fetch_text(url: str) -> str:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as resp:
        return resp.read().decode("utf-8", errors="replace")


def norm(text: str) -> str:
    return re.sub(r"\s+", " ", text or "").strip()


def price_to_text(value: str | None) -> str:
    if not value:
        return ""
    return re.sub(r"[^\d,]", "", norm(value))
    return norm(value).replace("¥", "").replace("￥", "")


def find_edge_executable() -> str:
    candidates = [
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    ]
    for candidate in candidates:
        if Path(candidate).exists():
            return candidate
    raise FileNotFoundError("No Edge or Chrome executable was found.")


def launch_detached_browser(pw, profile_dir: Path, port: int = 9222):
    edge_path = find_edge_executable()
    browser_profile = profile_dir / f"edge-detached-{port}"
    browser_profile.mkdir(parents=True, exist_ok=True)

    args = [
        edge_path,
        f"--remote-debugging-port={port}",
        f"--user-data-dir={browser_profile}",
        "--no-first-run",
        "--new-window",
        TOKYO_TICKETS_URL,
    ]
    creationflags = 0
    if hasattr(subprocess, "CREATE_NEW_PROCESS_GROUP"):
        creationflags |= subprocess.CREATE_NEW_PROCESS_GROUP
    if hasattr(subprocess, "DETACHED_PROCESS"):
        creationflags |= subprocess.DETACHED_PROCESS
    subprocess.Popen(args, creationflags=creationflags)

    endpoint = f"http://127.0.0.1:{port}"
    deadline = time.time() + 30
    last_error = None
    while time.time() < deadline:
        try:
            urlopen(endpoint + "/json/version", timeout=2).read()
            browser = pw.chromium.connect_over_cdp(endpoint)
            context = browser.contexts[0]
            return browser, context
        except Exception as exc:
            last_error = exc
            time.sleep(1)
    raise TimeoutError(f"Could not connect to detached Edge on {endpoint}: {last_error}")


def parse_public_ticket_types() -> list[dict[str, str]]:
    raw = fetch_text(TOKYO_PRICE_URL)
    labels: list[dict[str, str]] = []

    for th_html in re.findall(r"<th[^>]*class=\"[^\"]*wt-th[^\"]*\"[^>]*>(.*?)</th>", raw, re.S | re.I):
        text = norm(unescape(re.sub(r"<[^>]+>", " ", th_html)))
        if not text:
            continue
        m = re.match(r"^(Adult|Junior|Child|Family|Carer|Student|Under 4s|Under 4)\b", text, re.I)
        if not m:
            continue
        label = m.group(1)
        if label.lower().startswith("under 4"):
            label = "Under 4"
        labels.append({"age_group": label, "label_text": text})

    seen = set()
    unique: list[dict[str, str]] = []
    for item in labels:
        key = item["age_group"].lower()
        if key in seen:
            continue
        seen.add(key)
        unique.append(item)
    return unique


def default_ticket_types() -> list[dict[str, str]]:
    parsed = parse_public_ticket_types()
    parsed_by_name = {item["age_group"].lower(): item for item in parsed}
    result: list[dict[str, str]] = []
    for name in INDIVIDUAL_TICKET_TYPES:
        result.append(parsed_by_name.get(name.lower(), {"age_group": name, "label_text": name}))
    return result


def wait_for_page_state(page, predicates: Iterable[tuple[str, str]], timeout_s: int = 900) -> str:
    deadline = time.time() + timeout_s
    last_text = ""
    while time.time() < deadline:
        try:
            last_text = page.locator("body").inner_text(timeout=5000)
        except PlaywrightTimeoutError:
            last_text = ""

        lowered = last_text.lower()
        for needle, label in predicates:
            if needle.lower() in lowered:
                return label
        page.wait_for_timeout(3000)
    raise TimeoutError(f"Timed out waiting for page state. Last text: {last_text[:300]}")


def click_tickets_entry(page) -> None:
    page.goto(TOKYO_TICKETS_URL, wait_until="domcontentloaded", timeout=90000)
    dismiss_cookie_overlay(page)
    link = page.locator("a[href*='book.wbstudiotour.com/?event_type_id=30']").first
    if link.count() > 0:
        href = link.get_attribute("href") or BOOK_START_URL
        try:
            link.click(timeout=8000)
        except Exception as exc:
            log(f"Could not click BUY TICKETS normally, navigating by href instead: {exc}")
            page.goto(href, wait_until="domcontentloaded", timeout=90000)
        return
    fallback = page.get_by_role("link", name=re.compile(r"buy tickets|ticket", re.I)).first
    fallback.click()


def dismiss_cookie_overlay(page) -> None:
    selectors = [
        "#onetrust-accept-btn-handler",
        "button#onetrust-accept-btn-handler",
        "button:has-text('Accept All Cookies')",
        "button:has-text('Accept All')",
        "button:has-text('Allow All')",
        "button:has-text('同意')",
        ".onetrust-close-btn-handler",
        "#close-pc-btn-handler",
    ]
    for selector in selectors:
        try:
            locator = page.locator(selector).first
            if locator.count() > 0 and locator.is_visible(timeout=1000):
                locator.click(timeout=3000)
                page.wait_for_timeout(1000)
                return
        except Exception:
            continue
    try:
        page.evaluate(
            """
            () => {
              document.querySelectorAll('#onetrust-consent-sdk, .onetrust-pc-dark-filter')
                .forEach((el) => el.remove());
            }
            """
        )
    except Exception:
        pass


def is_session_expired_text(text: str) -> bool:
    lowered = (text or "").lower()
    return (
        "session has expired" in lowered
        or "something went wrong" in lowered
        or "please try again later" in lowered
    )


def assert_session_active(page) -> None:
    try:
        body = page.locator("body").inner_text(timeout=3000)
    except Exception:
        return
    if is_session_expired_text(body):
        raise SessionExpiredError("Booking session expired.")


def click_start_again_if_present(page) -> bool:
    try:
        body = page.locator("body").inner_text(timeout=3000)
    except Exception:
        body = ""
    if not is_session_expired_text(body) and "start again" not in body.lower():
        return False

    selectors = [
        "button:has-text('Start Again')",
        "a:has-text('Start Again')",
        "text=Start Again",
    ]
    for selector in selectors:
        try:
            locator = page.locator(selector).first
            if locator.count() > 0 and locator.is_visible(timeout=1000):
                locator.click(timeout=5000)
                page.wait_for_load_state("domcontentloaded", timeout=30000)
                page.wait_for_timeout(2000)
                return True
        except Exception:
            continue

    clicked = page.evaluate(
        """
        () => {
          const candidate = Array.from(document.querySelectorAll('button, a, [role="button"]'))
            .find((el) => {
              const rect = el.getBoundingClientRect();
              const text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
              return rect.width > 0 && rect.height > 0 && text.includes('start again');
            });
          if (!candidate) return false;
          candidate.click();
          return true;
        }
        """
    )
    if clicked:
        page.wait_for_load_state("domcontentloaded", timeout=30000)
        page.wait_for_timeout(2000)
    return bool(clicked)


def maybe_pause_for_manual_verification(page, timeout_s: int = 900) -> None:
    deadline = time.time() + timeout_s
    announced = False
    while time.time() < deadline:
        try:
            body = page.locator("body").inner_text(timeout=5000)
        except PlaywrightTimeoutError:
            body = ""

        try:
            title = page.title(timeout=2000)
        except Exception:
            title = ""

        lowered = body.lower()
        title_lowered = title.lower()
        if (
            "queue" not in lowered
            and "manual verification" not in lowered
            and "queue" not in title_lowered
        ):
            return

        if not announced:
            log("Manual verification is required in the open browser.")
            log("Complete it in the browser. The script will continue automatically.")
            announced = True
        page.wait_for_timeout(5000)

    raise TimeoutError("Timed out waiting for manual verification to finish.")


def wait_for_booking_ready(page, timeout_s: int = 900) -> None:
    predicates = [
        ("individual tickets", "tickets"),
        ("select your visit date", "calendar"),
        ("adult", "tickets"),
    ]
    log("Waiting for ticket selection page...")
    wait_for_page_state(page, predicates, timeout_s=timeout_s)


def locate_ticket_row(page, ticket_name: str):
    candidates = [
        page.locator("section,div,li,article").filter(has_text=re.compile(re.escape(ticket_name), re.I)).first,
        page.locator("div").filter(has_text=re.compile(re.escape(ticket_name), re.I)).first,
    ]
    for locator in candidates:
        try:
            if locator.count() > 0:
                return locator
        except Exception:
            continue
    return None


def set_single_ticket_quantity(page, ticket_name: str) -> None:
    changed = page.evaluate(
        """
        (ticketName) => {
          const names = ['Adult', 'Junior', 'Child', 'Under 4'];
          const normalize = (value) => (value || '').replace(/\\s+/g, ' ').trim().toLowerCase();
          const visibleButton = (button) => {
            const rect = button.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          };
          const findCard = (name) => {
            const lower = name.toLowerCase();
            const candidates = Array.from(document.querySelectorAll('div, section, article, li'))
              .filter((el) => {
                const text = normalize(el.innerText || el.textContent);
                if (!text.includes(lower)) return false;
                const buttons = Array.from(el.querySelectorAll('button')).filter(visibleButton);
                if (buttons.length < 2) return false;
                const otherNames = names.filter((item) => item.toLowerCase() !== lower);
                return !otherNames.some((other) => text.includes(other.toLowerCase()));
              })
              .sort((a, b) => {
                const ar = a.getBoundingClientRect();
                const br = b.getBoundingClientRect();
                return (ar.width * ar.height) - (br.width * br.height);
              });
            return candidates[0] || null;
          };
          const buttonsFor = (card) => Array.from(card.querySelectorAll('button'))
            .filter(visibleButton)
            .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
          const enabled = (button) => !button.disabled && button.getAttribute('aria-disabled') !== 'true';

          for (const name of names) {
            const card = findCard(name);
            if (!card) continue;
            const buttons = buttonsFor(card);
            const minus = buttons[0];
            for (let i = 0; i < 10 && minus && enabled(minus); i += 1) {
              minus.click();
            }
          }

          const target = findCard(ticketName);
          if (!target) return false;
          const buttons = buttonsFor(target);
          const plus = buttons[buttons.length - 1];
          if (!plus || !enabled(plus)) return false;
          plus.click();
          return true;
        }
        """,
        ticket_name,
    )
    page.wait_for_timeout(800)
    if not changed:
        raise RuntimeError(f"Could not set ticket quantity for {ticket_name}")


def click_plus_for_ticket(page, ticket_name: str) -> None:
    set_single_ticket_quantity(page, ticket_name)


def click_continue(page) -> None:
    buttons = [
        page.get_by_role("button", name=re.compile(r"continue", re.I)).first,
        page.locator("button").filter(has_text=re.compile(r"continue", re.I)).first,
    ]
    for btn in buttons:
        try:
            if btn.count() > 0:
                btn.click()
                return
        except Exception:
            continue
    clicked = page.evaluate(
        """
        () => {
          const candidates = Array.from(document.querySelectorAll('button, a, div, span'))
            .filter((el) => {
              const text = (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().toLowerCase();
              const rect = el.getBoundingClientRect();
              return text === 'continue' && rect.width > 0 && rect.height > 0;
            })
            .sort((a, b) => {
              const ar = a.getBoundingClientRect();
              const br = b.getBoundingClientRect();
              return (br.width * br.height) - (ar.width * ar.height);
            });
          for (const el of candidates) {
            const disabled = el.disabled || el.getAttribute('aria-disabled') === 'true';
            if (!disabled) {
              el.click();
              return true;
            }
          }
          return false;
        }
        """
    )
    if clicked:
        return
    raise RuntimeError("Could not find Continue button")


def wait_for_calendar_or_manual_continue(page, timeout_s: int = 900) -> None:
    try:
        click_continue(page)
    except Exception as exc:
        log(f"Could not auto-click Continue: {exc}")
        log("If the browser is still on the ticket selection page, click Continue there.")

    deadline = time.time() + timeout_s
    announced = False
    while time.time() < deadline:
        try:
            body = page.locator("body").inner_text(timeout=5000)
        except PlaywrightTimeoutError:
            body = ""

        lowered = body.lower()
        if "select your visit date" in lowered or "best availability" in lowered:
            return

        if not announced:
            log("Waiting for the visit-date calendar page...")
            announced = True
        page.wait_for_timeout(5000)

    raise TimeoutError("Timed out waiting for the visit-date calendar page.")


def wait_for_calendar_prices(page, timeout_s: int = 120) -> None:
    log("Waiting for calendar prices to render...")
    deadline = time.time() + timeout_s
    while time.time() < deadline:
        try:
            body = page.locator("body").inner_text(timeout=5000)
        except PlaywrightTimeoutError:
            body = ""
        if re.search(r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}", body, re.I) and re.search(r"\n\d{4,5}\n", body):
            return
        page.wait_for_timeout(2000)
    raise TimeoutError("Timed out waiting for calendar prices to render.")


def parse_target_month(target_month: str | None) -> tuple[int, int] | None:
    if not target_month:
        return None
    m = re.fullmatch(r"(\d{4})-(\d{2})", target_month)
    if not m:
        raise ValueError("target_month must be YYYY-MM, e.g. 2026-11")
    year = int(m.group(1))
    month = int(m.group(2))
    if month < 1 or month > 12:
        raise ValueError("target_month month must be between 01 and 12")
    return year, month


def current_calendar_month_from_text(text: str) -> tuple[int, int] | None:
    m = re.search(
        r"\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b",
        text,
        re.I,
    )
    if not m:
        return None
    return int(m.group(2)), MONTH_NAMES[m.group(1).lower()]


def get_current_calendar_month(page) -> tuple[int, int] | None:
    selectors = [
        ".react-calendar__navigation__label",
        "button.react-calendar__navigation__label",
        "body",
    ]
    for selector in selectors:
        try:
            text = page.locator(selector).first.inner_text(timeout=3000)
        except Exception:
            continue
        current = current_calendar_month_from_text(text)
        if current:
            return current
    return None


def click_calendar_nav(page, direction: str) -> None:
    css = ".react-calendar__navigation__next-button" if direction == "next" else ".react-calendar__navigation__prev-button"
    button = page.locator(css).first
    try:
        if button.count() > 0 and button.is_enabled(timeout=2000):
            button.click(timeout=5000)
            return
    except Exception:
        pass

    clicked = page.evaluate(
        """
        (direction) => {
          const classNeedle = direction === 'next' ? 'next-button' : 'prev-button';
          const buttons = Array.from(document.querySelectorAll('button'))
            .filter((button) => {
              const rect = button.getBoundingClientRect();
              return rect.width > 0 && rect.height > 0 &&
                !button.disabled &&
                (button.className || '').toString().includes(classNeedle);
            });
          if (!buttons.length) return false;
          buttons[0].click();
          return true;
        }
        """,
        direction,
    )
    if not clicked:
        raise RuntimeError(f"Could not click calendar {direction} button")


def navigate_calendar_to_target_month(page, target_month: str | None, timeout_s: int = 120) -> None:
    target = parse_target_month(target_month)
    if not target:
        return

    target_year, target_month_num = target
    log(f"Navigating calendar to {MONTH_NUM_TO_NAME[target_month_num]} {target_year}...")
    deadline = time.time() + timeout_s
    previous_month = None

    while time.time() < deadline:
        current = get_current_calendar_month(page)
        if current is None:
            page.wait_for_timeout(1000)
            continue
        if current == target:
            wait_for_calendar_prices(page)
            return

        current_year, current_month_num = current
        diff = (target_year - current_year) * 12 + (target_month_num - current_month_num)
        direction = "next" if diff > 0 else "prev"
        click_calendar_nav(page, direction)

        deadline_wait = time.time() + 10
        while time.time() < deadline_wait:
            page.wait_for_timeout(500)
            new_month = get_current_calendar_month(page)
            if new_month and new_month != current and new_month != previous_month:
                previous_month = current
                break

    raise TimeoutError(f"Timed out navigating calendar to {target_month}")


def date_label_for_iso(date_iso: str) -> str:
    dt = datetime.strptime(date_iso, "%Y-%m-%d")
    return f"{MONTH_NUM_TO_NAME[dt.month]} {dt.day}, {dt.year}"


def get_available_calendar_dates(page, target_month: str | None) -> list[dict[str, str]]:
    assert_session_active(page)
    rows = page.evaluate(
        """
        () => Array.from(document.querySelectorAll('button.react-calendar__tile'))
          .map((button) => {
            const abbr = button.querySelector('abbr[aria-label]');
            if (!abbr) return null;
            const label = abbr.getAttribute('aria-label');
            const parsed = new Date(label);
            if (Number.isNaN(parsed.getTime())) return null;
            const iso = [
              parsed.getFullYear(),
              String(parsed.getMonth() + 1).padStart(2, '0'),
              String(parsed.getDate()).padStart(2, '0')
            ].join('-');
            const text = (button.innerText || button.textContent || '').replace(/\\s+/g, ' ').trim();
            const priceMatch = text.match(/\\b\\d{4,}\\b/);
            const rect = button.getBoundingClientRect();
            return {
              date: iso,
              label,
              price: priceMatch ? priceMatch[0] : '',
              available: Boolean(priceMatch) && !button.disabled && rect.width > 0 && rect.height > 0
            };
          })
          .filter(Boolean)
        """
    )
    if target_month:
        rows = [row for row in rows if row["date"].startswith(target_month)]
    seen: set[str] = set()
    unique: list[dict[str, str]] = []
    for row in rows:
        if row["date"] in seen:
            continue
        seen.add(row["date"])
        if row.get("available"):
            unique.append(row)
    return unique


def click_calendar_date(page, date_iso: str) -> None:
    assert_session_active(page)
    label = date_label_for_iso(date_iso)
    clicked = page.evaluate(
        """
        (label) => {
          const abbr = Array.from(document.querySelectorAll('abbr[aria-label]'))
            .find((node) => node.getAttribute('aria-label') === label);
          const button = abbr ? abbr.closest('button') : null;
          if (!button || button.disabled) return false;
          button.scrollIntoView({block: 'center', inline: 'center'});
          button.click();
          return true;
        }
        """,
        label,
    )
    if not clicked:
        raise RuntimeError(f"Could not click calendar date {date_iso}")


def get_visible_timeslots(page) -> list[str]:
    assert_session_active(page)
    slots = page.evaluate(
        """
        () => Array.from(document.querySelectorAll('button'))
          .filter((button) => {
            const rect = button.getBoundingClientRect();
            const text = (button.innerText || button.textContent || '').replace(/\\s+/g, ' ').trim();
            return rect.width > 0 && rect.height > 0 && !button.disabled && /^\\d{2}:\\d{2}$/.test(text);
          })
          .map((button) => (button.innerText || button.textContent || '').replace(/\\s+/g, ' ').trim())
        """
    )
    return sorted(set(slots))


def click_timeslot(page, time_slot: str) -> None:
    assert_session_active(page)
    clicked = page.evaluate(
        """
        (timeSlot) => {
          const button = Array.from(document.querySelectorAll('button'))
            .find((node) => {
              const rect = node.getBoundingClientRect();
              const text = (node.innerText || node.textContent || '').replace(/\\s+/g, ' ').trim();
              return rect.width > 0 && rect.height > 0 && !node.disabled && text === timeSlot;
            });
          if (!button) return false;
          button.scrollIntoView({block: 'center', inline: 'center'});
          button.click();
          return true;
        }
        """,
        time_slot,
    )
    if not clicked:
        raise RuntimeError(f"Could not click timeslot {time_slot}")


def extract_order_summary_price(body_text: str, age_group: str) -> str:
    lines = [norm(line) for line in body_text.splitlines() if norm(line)]
    target = age_group.lower()
    joined = " ".join(lines)
    plain_inline_match = re.search(
        rf"\b{re.escape(age_group)}\b(?:(?!Sub Total).){{0,200}}?\b(\d{{4,}})\b",
        joined,
        re.I,
    )
    if plain_inline_match:
        return price_to_text(plain_inline_match.group(1))
    inline_match = re.search(
        rf"\b{re.escape(age_group)}\b.{0,120}?[¥￥楼]\s*(\d[\d,]*)",
        joined,
        re.I,
    )
    if inline_match:
        return price_to_text(inline_match.group(1))
    for idx, line in enumerate(lines):
        if line.lower() == target or target in line.lower():
            for next_line in lines[idx + 1 : idx + 8]:
                if re.search(r"[¥￥楼]\s*\d[\d,]*", next_line) or re.fullmatch(r"\d[\d,]*", next_line):
                    return price_to_text(next_line)
    order_total_index = next((idx for idx, line in enumerate(lines) if line.lower() == "order total"), -1)
    if order_total_index >= 0:
        for next_line in lines[order_total_index + 1 : order_total_index + 4]:
            if re.search(r"[¥￥楼]\s*\d[\d,]*", next_line) or re.fullmatch(r"\d[\d,]*", next_line):
                return price_to_text(next_line)
    return ""


def wait_for_order_summary_price(page, age_group: str, time_slot: str, timeout_s: int = 3) -> str:
    page.wait_for_timeout(600)
    deadline = time.time() + timeout_s
    last_price = ""
    while time.time() < deadline:
        body_text = page.locator("body").inner_text(timeout=5000)
        if is_session_expired_text(body_text):
            raise SessionExpiredError("Booking session expired while reading price.")
        price = extract_order_summary_price(body_text, age_group)
        if price:
            return price
        last_price = price or last_price
        page.wait_for_timeout(500)
    return last_price


def row_key(row: TicketRow) -> tuple[str, str, str]:
    return (row.date, row.time_slot, row.age_group.lower())


def collect_timeslot_rows(
    page,
    age_group: str,
    target_month: str | None,
    collected_at: str,
    existing_rows: list[TicketRow] | None = None,
    on_row=None,
) -> list[TicketRow]:
    available_dates = get_available_calendar_dates(page, target_month)
    if not available_dates:
        return []

    rows: list[TicketRow] = []
    seen: set[tuple[str, str, str]] = {
        row_key(row)
        for row in (existing_rows or [])
        if row.age_group.lower() == age_group.lower()
        and (not target_month or row.date.startswith(target_month))
        and row.time_slot
        and row.price
    }
    for date_row in available_dates:
        assert_session_active(page)
        date_iso = date_row["date"]
        click_calendar_date(page, date_iso)
        page.wait_for_timeout(1000)
        assert_session_active(page)
        try:
            page.locator("text=Select Your Timeslot").first.wait_for(timeout=8000)
        except Exception:
            pass
        time_slots = get_visible_timeslots(page)
        if not time_slots:
            key = (date_iso, "", age_group)
            if key not in seen:
                seen.add(key)
                rows.append(
                    TicketRow(
                        date=date_iso,
                        time_slot="",
                        age_group=age_group,
                        price=date_row.get("price", ""),
                        sale_status="Available",
                        source_url=page.url,
                        collected_at=collected_at,
                    )
                )
            continue

        for time_slot in time_slots:
            key = (date_iso, time_slot, age_group.lower())
            if key in seen:
                continue
            click_timeslot(page, time_slot)
            price = wait_for_order_summary_price(page, age_group, time_slot)
            seen.add(key)
            row = TicketRow(
                date=date_iso,
                time_slot=time_slot,
                age_group=age_group,
                price=price,
                sale_status="Available",
                source_url=page.url,
                collected_at=collected_at,
                remaining_inventory="",
            )
            rows.append(row)
            if on_row:
                on_row(row)
        log(f"Collected {len(time_slots)} timeslots for {age_group} on {date_iso}.")
    return rows


def save_debug_artifacts(page, output_dir: Path, prefix: str) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    safe_prefix = re.sub(r"[^A-Za-z0-9_-]+", "_", prefix).strip("_") or "debug"
    screenshot_path = output_dir / f"{safe_prefix}_{stamp}.png"
    html_path = output_dir / f"{safe_prefix}_{stamp}.html"
    try:
        page.screenshot(path=str(screenshot_path), full_page=True)
        html_path.write_text(page.content(), encoding="utf-8")
        log(f"Saved debug screenshot: {screenshot_path}")
        log(f"Saved debug HTML: {html_path}")
    except Exception as exc:
        log(f"Could not save debug artifacts: {exc}")


def parse_calendar_text(
    body_text: str,
    age_group: str,
    source_url: str,
    collected_at: str,
) -> list[TicketRow]:
    rows: list[TicketRow] = []
    seen: set[tuple[str, str, str]] = set()

    lines = [norm(line) for line in body_text.splitlines() if norm(line)]
    month_headers: list[tuple[int, str, int]] = []
    for idx, line in enumerate(lines):
        m = re.match(
            r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$",
            line,
            re.I,
        )
        if m:
            month_headers.append((idx, m.group(1), int(m.group(2))))

    for header_index, (pos, month_name, year) in enumerate(month_headers):
        next_pos = month_headers[header_index + 1][0] if header_index + 1 < len(month_headers) else len(lines)
        section = lines[pos + 1 : next_pos]
        section = [
            item
            for item in section
            if item not in {"‹", "›", "-", "–", "—", "Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"}
            and not re.match(r"^\d{1,2}:\d{2} to complete", item)
        ]

        i = 0
        while i < len(section):
            item = section[i]
            if re.fullmatch(r"\d{1,2}", item):
                day = int(item)
                price = ""
                sale_status = "Closed"
                if i + 1 < len(section) and re.fullmatch(r"[¥￥]?\d{4,}(?:,\d{3})*", section[i + 1]):
                    price = price_to_text(section[i + 1])
                    sale_status = "Available"
                    i += 1

                date = f"{year:04d}-{MONTH_NAMES[month_name.lower()]:02d}-{day:02d}"
                key = (date, age_group, price)
                if key not in seen:
                    seen.add(key)
                    rows.append(
                        TicketRow(
                            date=date,
                            time_slot="",
                            age_group=age_group,
                            price=price,
                            sale_status=sale_status,
                            source_url=source_url,
                            collected_at=collected_at,
                            remaining_inventory="",
                        )
                    )
            i += 1

    return rows


def extract_calendar_rows(
    page,
    age_group: str,
    collected_at: str,
    target_month: str | None = None,
    existing_rows: list[TicketRow] | None = None,
    on_row=None,
) -> list[TicketRow]:
    detailed_rows = collect_timeslot_rows(page, age_group, target_month, collected_at, existing_rows, on_row)
    if detailed_rows:
        return detailed_rows

    body_text = ""
    try:
        body_text = page.locator("body").inner_text(timeout=5000)
    except PlaywrightTimeoutError:
        pass

    text_rows = parse_calendar_text(body_text, age_group, page.url, collected_at)
    if text_rows:
        return text_rows

    raw_nodes = page.evaluate(
        """
        () => Array.from(document.querySelectorAll('button, a, [role="button"], td, div, span'))
          .map((el) => {
            const attrs = {};
            for (const name of ['data-date', 'data-time', 'data-event-date', 'data-slot', 'data-price', 'data-inventory', 'aria-label', 'title', 'role']) {
              const value = el.getAttribute(name);
              if (value) attrs[name] = value;
            }
            return {
              tag: el.tagName,
              text: (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim(),
              cls: (el.className || '').toString().replace(/\\s+/g, ' ').trim(),
              attrs,
            };
          })
          .filter((item) => item.text || Object.keys(item.attrs).length > 0)
        """
    )

    rows: list[TicketRow] = []
    seen: set[tuple[str, str, str, str]] = set()

    def add_row(date: str, time_slot: str, price: str, sale_status: str = "Available", remaining_inventory: str = ""):
        key = (date, time_slot, age_group, price)
        if key in seen:
            return
        seen.add(key)
        rows.append(
            TicketRow(
                date=date,
                time_slot=time_slot,
                age_group=age_group,
                price=price,
                sale_status=sale_status,
                source_url=page.url,
                collected_at=collected_at,
                remaining_inventory=remaining_inventory,
            )
        )

    month_headers: list[tuple[int, str, int]] = []
    lines = [norm(line) for line in body_text.splitlines() if norm(line)]
    for idx, line in enumerate(lines):
        m = re.match(r"^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$", line, re.I)
        if m:
            month_headers.append((idx, m.group(1), int(m.group(2))))

    if month_headers:
        for pos, month_name, year in month_headers:
            next_pos = next((p for p, _, _ in month_headers if p > pos), len(lines))
            section = lines[pos + 1 : next_pos]
            i = 0
            while i < len(section):
                line = section[i]
                day_match = re.match(r"^(\d{1,2})$", line)
                if day_match:
                    day = int(day_match.group(1))
                    price = ""
                    time_slot = ""
                    if i + 1 < len(section) and re.match(r"^[¥￥]?\d{4,}(?:,\d{3})*$", section[i + 1]):
                        price = price_to_text(section[i + 1])
                        i += 1
                    elif " " in line:
                        parts = line.split()
                        if len(parts) >= 2 and re.match(r"^\d[\d,]*$", parts[1]):
                            price = price_to_text(parts[1])
                    if price:
                        add_row(f"{year:04d}-{MONTH_NAMES[month_name.lower()]:02d}-{day:02d}", time_slot, price)
                i += 1

    time_rows = re.findall(r"(\d{1,2}:\d{2})", body_text)
    if time_rows:
        for time_slot in sorted(set(time_rows)):
            add_row("", time_slot, "")

    if rows:
        return rows

    for node in raw_nodes:
        text = norm(node.get("text", ""))
        attrs = node.get("attrs", {})
        if not text and not attrs:
            continue

        label = attrs.get("data-date") or attrs.get("data-event-date") or attrs.get("aria-label") or attrs.get("title") or text
        price = attrs.get("data-price") or ""
        if not price:
            m = re.search(r"(?:¥\s*)?(\d[\d,]*)(?:\.\d+)?", text)
            if m:
                price = m.group(1)
        if not price:
            continue

        if attrs.get("data-date"):
            date = attrs["data-date"]
            time_slot = attrs.get("data-time", "")
        else:
            day_match = re.match(r"^(\d{1,2})", text)
            if day_match and month_headers:
                day = int(day_match.group(1))
                _, month_name, year = month_headers[0]
                date = f"{year:04d}-{MONTH_NAMES[month_name.lower()]:02d}-{day:02d}"
                time_slot = attrs.get("data-time", "")
            else:
                date = label
                time_slot = attrs.get("data-time", "")
        add_row(date, time_slot, price, remaining_inventory=attrs.get("data-inventory", ""))

    return rows


def collect_from_open_page(output_dir: Path, age_group: str, target_month: str | None, port: int) -> list[TicketRow]:
    from playwright.sync_api import sync_playwright

    global LOG_FILE
    LOG_FILE = output_dir / "run.log"
    if LOG_FILE.exists():
        LOG_FILE.unlink()
    output_dir.mkdir(parents=True, exist_ok=True)

    with sync_playwright() as pw:
        browser = pw.chromium.connect_over_cdp(f"http://127.0.0.1:{port}")
        candidate_pages = []
        for context in browser.contexts:
            candidate_pages.extend(context.pages)

        selected_page = None
        for page in candidate_pages:
            try:
                text = page.locator("body").inner_text(timeout=3000)
            except Exception:
                text = ""
            if "Select Your Visit Date" in text or re.search(
                r"(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}",
                text,
                re.I,
            ):
                selected_page = page
                break

        if selected_page is None:
            urls = [page.url for page in candidate_pages]
            raise RuntimeError(f"No open visit-date calendar page found on CDP port {port}. Open pages: {urls}")

        collected_at = datetime.now().astimezone().isoformat(timespec="seconds")
        body_text = selected_page.locator("body").inner_text(timeout=10000)
        navigate_calendar_to_target_month(selected_page, target_month)
        body_text = selected_page.locator("body").inner_text(timeout=10000)
        (output_dir / "source_page_text.txt").write_text(body_text, encoding="utf-8")
        try:
            selected_page.screenshot(path=str(output_dir / "source_page.png"), full_page=True)
        except Exception as exc:
            log(f"Could not save source screenshot: {exc}")

        rows = extract_calendar_rows(selected_page, age_group, collected_at, target_month)
        rows = filter_rows_by_month(rows, target_month)
        write_outputs(rows, output_dir)
        log(f"Collected {len(rows)} rows from current open calendar page: {selected_page.url}")
        return rows


def collect_from_text_file(
    text_file: Path,
    output_dir: Path,
    age_group: str,
    target_month: str | None,
) -> list[TicketRow]:
    global LOG_FILE
    LOG_FILE = output_dir / "run.log"
    if LOG_FILE.exists():
        LOG_FILE.unlink()
    output_dir.mkdir(parents=True, exist_ok=True)

    body_text = text_file.read_text(encoding="utf-8", errors="replace")
    source_url = "https://book.wbstudiotour.com/visit?language_id=1"
    url_match = re.search(r"^URL:\s*(\S+)", body_text, re.M)
    if url_match:
        source_url = url_match.group(1)

    collected_at = datetime.now().astimezone().isoformat(timespec="seconds")
    rows = parse_calendar_text(body_text, age_group, source_url, collected_at)
    rows = filter_rows_by_month(rows, target_month)
    write_outputs(rows, output_dir)
    (output_dir / "source_page_text.txt").write_text(body_text, encoding="utf-8")
    log(f"Collected {len(rows)} rows from saved calendar text: {text_file}")
    return rows


def prepare_ticket_calendar(page, age_group: str, pause_for_manual: bool, target_month: str | None) -> None:
    click_tickets_entry(page)
    log(f"Arrived after ticket entry: {page.url}")
    page.wait_for_load_state("domcontentloaded")

    if pause_for_manual:
        maybe_pause_for_manual_verification(page)
        log(f"Manual verification check complete: {page.url}")

    wait_for_booking_ready(page)
    log("Ticket selection page is ready.")

    click_plus_for_ticket(page, age_group)
    log(f"Selected only {age_group}.")

    wait_for_calendar_or_manual_continue(page)
    log(f"Arrived after Continue: {page.url}")
    page.wait_for_load_state("domcontentloaded")
    wait_for_calendar_prices(page)
    navigate_calendar_to_target_month(page, target_month)


def run_scrape(
    output_dir: Path,
    pause_for_manual: bool,
    only_ticket: str | None = None,
    target_month: str | None = None,
    detached_browser: bool = False,
    cdp_port: int = 9222,
) -> list[TicketRow]:
    from playwright.sync_api import sync_playwright

    global LOG_FILE
    LOG_FILE = output_dir / "run.log"
    if LOG_FILE.exists():
        LOG_FILE.unlink()

    output_dir.mkdir(parents=True, exist_ok=True)
    profile_dir = output_dir / ".playwright-profile"
    profile_dir.mkdir(parents=True, exist_ok=True)

    ticket_types = default_ticket_types()
    if not ticket_types:
        ticket_types = [{"age_group": "Adult", "label_text": "Adult"}]
    if only_ticket:
        ticket_types = [ticket for ticket in ticket_types if ticket["age_group"].lower() == only_ticket.lower()]
        if not ticket_types:
            raise ValueError(f"Ticket type not found on public price page: {only_ticket}")

    collected: list[TicketRow] = read_existing_outputs(output_dir)
    if collected:
        log(f"Loaded {len(collected)} existing rows for resume.")

    with sync_playwright() as pw:
        connected_browser = None
        if detached_browser:
            log("Launching detached Edge browser. It will stay open if the script exits.")
            connected_browser, browser = launch_detached_browser(pw, profile_dir, port=cdp_port)
        else:
            browser = pw.chromium.launch_persistent_context(
                user_data_dir=str(profile_dir),
                executable_path=find_edge_executable(),
                headless=False,
                args=["--start-maximized"],
                locale="en-US",
                viewport=None,
            )
        page = browser.pages[0] if browser.pages else browser.new_page()

        try:
            for ticket in ticket_types:
                age_group = ticket["age_group"]
                log(f"Collecting {age_group}...")
                attempts = 0
                while attempts < 8:
                    attempts += 1
                    try:
                        prepare_ticket_calendar(page, age_group, pause_for_manual, target_month)

                        def persist_row(row: TicketRow) -> None:
                            if append_unique_row(collected, row):
                                write_outputs(filter_rows_by_month(collected, target_month), output_dir)

                        collected_at = datetime.now().astimezone().isoformat(timespec="seconds")
                        rows = extract_calendar_rows(
                            page,
                            age_group,
                            collected_at,
                            target_month,
                            existing_rows=collected,
                            on_row=persist_row,
                        )
                        if not rows:
                            log(f"No new availability rows detected for {age_group}.")
                        for row in rows:
                            append_unique_row(collected, row)
                        write_outputs(filter_rows_by_month(collected, target_month), output_dir)
                        break
                    except SessionExpiredError as exc:
                        log(f"Session expired while collecting {age_group}: {exc}")
                        if click_start_again_if_present(page):
                            log("Clicked Start Again. Re-entering ticket flow and resuming missing rows.")
                        else:
                            log("Start Again button was not found. Re-entering from ticket entry.")
                        continue
                else:
                    raise TimeoutError(f"Could not finish {age_group} after repeated session restarts.")
        except Exception:
            save_debug_artifacts(page, output_dir, "scrape_error")
            log("The browser will stay open for 10 minutes for inspection.")
            page.wait_for_timeout(600000)
            raise
        finally:
            if detached_browser:
                log("Detached Edge remains open. Close it manually when finished.")
            else:
                browser.close()

    return collected


def write_outputs(rows: list[TicketRow], output_dir: Path) -> tuple[Path, Path]:
    csv_path = output_dir / "ticket_availability.csv"
    json_path = output_dir / "ticket_availability.json"

    headers = [
        "date",
        "time_slot",
        "age_group",
        "price",
        "sale_status",
        "source_url",
        "collected_at",
        "remaining_inventory",
    ]

    with csv_path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=headers)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))

    with json_path.open("w", encoding="utf-8") as f:
        json.dump([asdict(row) for row in rows], f, ensure_ascii=False, indent=2)

    return csv_path, json_path


def read_existing_outputs(output_dir: Path) -> list[TicketRow]:
    csv_path = output_dir / "ticket_availability.csv"
    if not csv_path.exists():
        return []
    rows: list[TicketRow] = []
    with csv_path.open("r", newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        for item in reader:
            rows.append(
                TicketRow(
                    date=item.get("date", ""),
                    time_slot=item.get("time_slot", ""),
                    age_group=item.get("age_group", ""),
                    price=item.get("price", ""),
                    sale_status=item.get("sale_status", ""),
                    source_url=item.get("source_url", ""),
                    collected_at=item.get("collected_at", ""),
                    remaining_inventory=item.get("remaining_inventory", ""),
                )
            )
    return rows


def append_unique_row(rows: list[TicketRow], row: TicketRow) -> bool:
    key = row_key(row)
    for idx, existing in enumerate(rows):
        if row_key(existing) == key:
            if row.price and not existing.price:
                rows[idx] = row
                return True
            return False
    if key in {row_key(existing) for existing in rows}:
        return False
    if row.time_slot:
        rows[:] = [
            existing
            for existing in rows
            if not (
                existing.date == row.date
                and existing.age_group.lower() == row.age_group.lower()
                and not existing.time_slot
            )
        ]
    rows.append(row)
    return True


def filter_rows_by_month(rows: list[TicketRow], target_month: str | None) -> list[TicketRow]:
    if not target_month:
        return rows
    return [row for row in rows if row.date.startswith(target_month)]


def main() -> int:
    parser = argparse.ArgumentParser(description="Tokyo Studio Tour ticket availability collector")
    parser.add_argument("--output-dir", default=str(Path(__file__).resolve().parent / "output"))
    parser.add_argument("--no-pause", action="store_true", help="Skip the manual verification pause prompt.")
    parser.add_argument("--target-month", help="Keep only rows whose date starts with YYYY-MM, e.g. 2026-11.")
    parser.add_argument("--only-ticket", help="Collect only one ticket class, e.g. Adult.")
    parser.add_argument("--detached-browser", action="store_true", help="Use a separately launched Edge window that stays open on script exit.")
    parser.add_argument("--from-open-page", action="store_true", help="Read the already-open visit-date calendar page via CDP.")
    parser.add_argument("--from-text-file", help="Read a saved visit-date calendar text file.")
    parser.add_argument("--cdp-port", type=int, default=9222, help="CDP debugging port for --from-open-page or --detached-browser.")
    args = parser.parse_args()

    output_dir = Path(args.output_dir).resolve()
    if args.from_text_file:
        rows = collect_from_text_file(
            Path(args.from_text_file).resolve(),
            output_dir,
            age_group=args.only_ticket or "Adult",
            target_month=args.target_month,
        )
        csv_path, json_path = output_dir / "ticket_availability.csv", output_dir / "ticket_availability.json"
        log(f"Wrote {csv_path}")
        log(f"Wrote {json_path}")
        return 0

    if args.from_open_page:
        rows = collect_from_open_page(
            output_dir,
            age_group=args.only_ticket or "Adult",
            target_month=args.target_month,
            port=args.cdp_port,
        )
        csv_path, json_path = output_dir / "ticket_availability.csv", output_dir / "ticket_availability.json"
        log(f"Wrote {csv_path}")
        log(f"Wrote {json_path}")
        return 0

    rows = run_scrape(
        output_dir,
        pause_for_manual=not args.no_pause,
        only_ticket=args.only_ticket,
        target_month=args.target_month,
        detached_browser=args.detached_browser,
        cdp_port=args.cdp_port,
    )
    rows = filter_rows_by_month(rows, args.target_month)
    csv_path, json_path = write_outputs(rows, output_dir)
    log(f"Wrote {csv_path}")
    log(f"Wrote {json_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
