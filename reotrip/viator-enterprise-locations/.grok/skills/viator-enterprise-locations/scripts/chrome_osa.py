#!/usr/bin/env python3
"""Drive the already-open Google Chrome via AppleScript. No CDP, no new window."""

from __future__ import annotations

import json
import subprocess
from dataclasses import dataclass
from typing import Any


@dataclass
class ChromeTab:
    window: int
    tab: int
    url: str
    title: str


class BlockedError(RuntimeError):
    """Captcha, login wall, or other stop signal."""


def _osascript(source: str, timeout: int = 30) -> str:
    r = subprocess.run(
        ["osascript"],
        input=source,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip()
        raise RuntimeError(f"osascript failed: {err}")
    return (r.stdout or "").rstrip("\n")


def _escape_as(s: str) -> str:
    return s.replace("\\", "\\\\").replace('"', '\\"')


def list_tabs() -> list[ChromeTab]:
    out = _osascript(
        """
tell application "Google Chrome"
  set out to ""
  set wi to 0
  repeat with w in windows
    set wi to wi + 1
    set ti to 0
    repeat with t in tabs of w
      set ti to ti + 1
      set out to out & wi & tab & ti & tab & (URL of t) & tab & (title of t) & linefeed
    end repeat
  end repeat
  return out
end tell
"""
    )
    tabs: list[ChromeTab] = []
    for line in out.splitlines():
        parts = line.split("\t", 3)
        if len(parts) < 4:
            continue
        tabs.append(ChromeTab(int(parts[0]), int(parts[1]), parts[2], parts[3]))
    return tabs


def find_tab(substr: str) -> ChromeTab:
    hits = [t for t in list_tabs() if substr in t.url]
    if not hits:
        raise RuntimeError(f"No Chrome tab URL contains: {substr}")
    # Prefer a visible products list over a login or captcha-only tab if both exist.
    for t in hits:
        if "login" not in t.url.lower():
            return t
    return hits[0]


def activate_tab(tab: ChromeTab) -> None:
    _osascript(
        f"""
tell application "Google Chrome"
  set index of window {tab.window} to 1
  set active tab index of window {tab.window} to {tab.tab}
  activate
end tell
"""
    )


def js(tab: ChromeTab, script: str, timeout: int = 30) -> Any:
    """Run JS in the tab. Script must return a JSON-serializable value or a JSON string."""
    wrapped = (
        "(function(){try{const __r=(function(){"
        + script
        + "})();return (typeof __r==='string')?__r:JSON.stringify(__r);}catch(e){return JSON.stringify({error:String(e),stack:e.stack});}})()"
    )
    # AppleScript cannot hold raw newlines in a quoted string.
    oneline = wrapped.replace("\n", " ")
    src = f"""
tell application "Google Chrome"
  tell tab {tab.tab} of window {tab.window}
    execute javascript "{_escape_as(oneline)}"
  end tell
end tell
"""
    raw = _osascript(src, timeout=timeout)
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return raw


DETECT_JS = r"""
  const html = document.documentElement ? document.documentElement.innerHTML : '';
  const text = document.body ? document.body.innerText : '';
  const href = location.href || '';
  const iframeSrc = [...document.querySelectorAll('iframe')].map(i => i.src || '').join('\n');
  const reasons = [];
  if (/captcha-delivery|datadome/i.test(html + iframeSrc + href)) reasons.push('captcha_iframe');
  if (/确出出自您本人|我不是机器人|Please enable JS and disable any ad blocker/i.test(text + html)) reasons.push('captcha_copy');
  if (/unusual traffic|are you a robot|Access Denied/i.test(text + html)) reasons.push('denied');
  const iframes = [...document.querySelectorAll('iframe')].map(i => {
    const r = i.getBoundingClientRect();
    return {src:(i.src||'').slice(0,160), w:r.width, h:r.height, top:r.top};
  });
  const visibleCaptcha = iframes.some(i => /captcha-delivery/i.test(i.src) && i.w > 200 && i.h > 200 && i.top >= 0 && i.top < 2000);
  if (visibleCaptcha) reasons.push('captcha_visible');
  if (/supplier\.viator\.com\/login/i.test(href)) reasons.push('login_wall');
  const countEl = document.querySelector('[class*="productCount"]');
  const items = document.querySelectorAll('[data-automation^="product-list-item-"]');
  return {
    href,
    title: document.title,
    blocked: reasons.length > 0,
    reasons,
    visibleCaptcha,
    productCountText: countEl ? countEl.innerText : null,
    visibleItems: items.length,
    iframeCount: iframes.length
  };
"""


HARVEST_LIST_JS = r"""
  const items = [...document.querySelectorAll('[data-automation^="product-list-item-"]')];
  const products = items.map(el => {
    const code = (el.getAttribute('data-automation') || '').replace('product-list-item-','');
    const titleBtn = el.querySelector('[class*="productTitle"] button, [class*="productTitleLink"]');
    const name = titleBtn ? titleBtn.innerText.trim() : null;
    const statusEl = el.querySelector('[data-automation^="product-list-product-status-"]');
    return {
      product_code: code,
      product_name: name,
      viator_status: ((statusEl && statusEl.innerText) || 'Active').trim() || 'Active'
    };
  });
  const countEl = document.querySelector('[class*="productCount"]');
  return {
    href: location.href,
    title: document.title,
    productCountText: countEl ? countEl.innerText : null,
    visible: products.length,
    products
  };
"""


HARVEST_DETAIL_JS = r"""
  const text = document.body ? document.body.innerText : '';
  const grab = (label) => {
    const re = new RegExp(label + '\\s*\\n+\\s*([^\\n]+)', 'i');
    const m = text.match(re);
    return m ? m[1].trim() : null;
  };
  const ratingM = text.match(/\\b(\\d(?:\\.\\d)?)\\s*(?:\\/\\s*5)?\\b[^\\n]{0,40}?(\\d+)\\s*(?:operator\\s+)?reviews?/i);
  const codeM = text.match(/\\b(\\d{5,8}P\\d{2,6})\\b/);
  return {
    href: location.href,
    title: document.title,
    enterprise_name: grab('企業詳情名稱') || grab('企业详情名称') || grab('Tripadvisor 企業詳情名稱'),
    enterprise_location_text: grab('企業詳情位置') || grab('企业详情位置'),
    viator_rating: ratingM ? parseFloat(ratingM[1]) : null,
    viator_review_count: ratingM ? parseInt(ratingM[2], 10) : null,
    product_code: codeM ? codeM[1] : null,
    snippet: text.slice(0, 1200)
  };
"""


def detect(tab: ChromeTab) -> dict[str, Any]:
    info = js(tab, DETECT_JS)
    if not isinstance(info, dict):
        raise RuntimeError(f"detect returned non-object: {info!r}")
    if info.get("error"):
        raise RuntimeError(info["error"])
    return info


def assert_not_blocked(tab: ChromeTab) -> dict[str, Any]:
    info = detect(tab)
    if info.get("blocked"):
        raise BlockedError(
            "blocked:" + ",".join(info.get("reasons") or []) + f" url={info.get('href')}"
        )
    return info


def harvest_list(tab: ChromeTab) -> dict[str, Any]:
    data = js(tab, HARVEST_LIST_JS)
    if not isinstance(data, dict) or data.get("error"):
        raise RuntimeError(f"harvest_list failed: {data!r}")
    return data


def harvest_detail(tab: ChromeTab) -> dict[str, Any]:
    data = js(tab, HARVEST_DETAIL_JS)
    if not isinstance(data, dict) or data.get("error"):
        raise RuntimeError(f"harvest_detail failed: {data!r}")
    return data


def focus_list_for_scroll(tab: ChromeTab) -> None:
    """Focus page body so Page Down goes to the list, not the omnibox. Do not click product titles."""
    js(
        tab,
        """
      const body = document.body;
      if (body) { body.setAttribute('tabindex','-1'); body.focus(); }
      const list = document.querySelector('[class*="ProductList__productList"]');
      if (list) list.scrollIntoView({block:'nearest'});
      return {ok:true};
    """,
    )
