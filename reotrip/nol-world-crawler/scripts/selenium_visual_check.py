#!/usr/bin/env python3
"""Selenium visual verification: does NOL TNA have Beijing/Shanghai products?"""

from __future__ import annotations

import json
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.support.ui import WebDriverWait
from webdriver_manager.chrome import ChromeDriverManager

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "selenium_visual"
OUT.mkdir(parents=True, exist_ok=True)

BASE = "https://world.nol.com"
URLS = {
    "all_en": f"{BASE}/en/tna/categories/all/products",
    "all_zh": f"{BASE}/zh-CN/tna/categories/all/products",
    "pass": f"{BASE}/en/tna/categories/pass/products",
    "tour": f"{BASE}/en/tna/categories/tour/products",
    "activities": f"{BASE}/en/tna/categories/activities/products",
    "transport": f"{BASE}/en/tna/categories/transportation/products",  # may 404, try alt
}


def make_driver(headless: bool = False) -> webdriver.Chrome:
    opts = Options()
    opts.binary_location = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    if headless:
        opts.add_argument("--headless=new")
    opts.add_argument("--window-size=1440,1100")
    opts.add_argument("--disable-blink-features=AutomationControlled")
    opts.add_argument("--lang=en-US")
    opts.add_argument(
        "--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36"
    )
    # Prefer visible browser
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=opts)
    driver.set_page_load_timeout(60)
    return driver


def shot(driver, name: str) -> Path:
    path = OUT / f"{name}.png"
    driver.save_screenshot(str(path))
    print(f"[shot] {path}")
    return path


def page_text(driver) -> str:
    try:
        return driver.find_element(By.TAG_NAME, "body").text
    except Exception:
        return ""


def count_keywords(text: str) -> dict:
    t = text or ""
    keys = {
        "Beijing": len(re.findall(r"\bBeijing\b", t, re.I)),
        "Shanghai": len(re.findall(r"\bShanghai\b", t, re.I)),
        "北京": t.count("北京"),
        "上海": t.count("上海"),
        "Seoul": len(re.findall(r"\bSeoul\b", t, re.I)),
        "Incheon": len(re.findall(r"\bIncheon\b", t, re.I)),
        "Busan": len(re.findall(r"\bBusan\b", t, re.I)),
        "Korea": len(re.findall(r"\bKorea\b", t, re.I)),
        "transfer": len(re.findall(r"\btransfer\b", t, re.I)),
        "pickup": len(re.findall(r"\bpickup\b|\bpick-up\b", t, re.I)),
        "Airport": len(re.findall(r"\bAirport\b", t, re.I)),
    }
    return keys


def try_click_text(driver, texts, timeout=3) -> bool:
    for t in texts:
        try:
            els = driver.find_elements(By.XPATH, f"//*[contains(normalize-space(.), '{t}')]")
            for el in els:
                if el.is_displayed() and el.is_enabled():
                    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", el)
                    time.sleep(0.3)
                    try:
                        el.click()
                    except Exception:
                        driver.execute_script("arguments[0].click();", el)
                    time.sleep(1.2)
                    return True
        except Exception:
            continue
    return False


def try_search(driver, query: str) -> bool:
    """Try common search box patterns."""
    selectors = [
        "input[type='search']",
        "input[placeholder*='Search' i]",
        "input[placeholder*='search' i]",
        "input[placeholder*='搜索']",
        "input[name='keyword']",
        "input[name='q']",
        "header input[type='text']",
    ]
    for sel in selectors:
        try:
            els = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                if not el.is_displayed():
                    continue
                el.clear()
                el.send_keys(query)
                time.sleep(0.4)
                el.send_keys(Keys.ENTER)
                time.sleep(2.5)
                return True
        except Exception:
            continue
    # try click search icon then type
    try_click_text(driver, ["Search", "搜索"])
    time.sleep(0.8)
    for sel in selectors:
        try:
            els = driver.find_elements(By.CSS_SELECTOR, sel)
            for el in els:
                if el.is_displayed():
                    el.clear()
                    el.send_keys(query)
                    el.send_keys(Keys.ENTER)
                    time.sleep(2.5)
                    return True
        except Exception:
            continue
    return False


def open_and_record(driver, url: str, name: str, wait=4.0) -> dict:
    print(f"\n>>> open {url}")
    driver.get(url)
    time.sleep(wait)
    # scroll a bit to load products
    driver.execute_script("window.scrollTo(0, 600);")
    time.sleep(1.0)
    driver.execute_script("window.scrollTo(0, 0);")
    time.sleep(0.5)
    img = shot(driver, name)
    text = page_text(driver)
    return {
        "name": name,
        "url": url,
        "title": driver.title,
        "final_url": driver.current_url,
        "screenshot": str(img.relative_to(ROOT)),
        "keyword_counts": count_keywords(text),
        "body_preview": re.sub(r"\s+", " ", text)[:800],
    }


def main():
    results = []
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    headless = False
    try:
        driver = make_driver(headless=False)
        print("Launched Chrome VISIBLE (headed)")
    except Exception as e:
        print(f"Headed failed: {e}; fallback headless")
        driver = make_driver(headless=True)
        headless = True

    wait = WebDriverWait(driver, 20)
    try:
        # 1) EN all products
        results.append(open_and_record(driver, URLS["all_en"], "01_list_all_en"))

        # 2) try open region/filter UI
        for label in ["Region", "City", "Location", "Filter", "Filters", "地区", "城市"]:
            if try_click_text(driver, [label]):
                time.sleep(1.5)
                results.append(
                    {
                        **{
                            "name": f"02_filter_click_{label}",
                            "url": driver.current_url,
                            "title": driver.title,
                            "final_url": driver.current_url,
                            "screenshot": str(shot(driver, f"02_filter_{label}").relative_to(ROOT)),
                            "keyword_counts": count_keywords(page_text(driver)),
                            "body_preview": re.sub(r"\s+", " ", page_text(driver))[:800],
                        }
                    }
                )
                # try click Beijing/Shanghai if options appear
                found_city = try_click_text(driver, ["Beijing", "Shanghai", "北京", "上海"])
                time.sleep(1.5)
                results.append(
                    {
                        "name": "03_try_select_bj_sh",
                        "url": driver.current_url,
                        "title": driver.title,
                        "final_url": driver.current_url,
                        "clicked_city_option": found_city,
                        "screenshot": str(shot(driver, "03_try_select_bj_sh").relative_to(ROOT)),
                        "keyword_counts": count_keywords(page_text(driver)),
                        "body_preview": re.sub(r"\s+", " ", page_text(driver))[:800],
                    }
                )
                break

        # 3) search Beijing
        driver.get(URLS["all_en"])
        time.sleep(3)
        searched = try_search(driver, "Beijing")
        time.sleep(2)
        results.append(
            {
                "name": "04_search_Beijing",
                "searched": searched,
                "url": driver.current_url,
                "title": driver.title,
                "final_url": driver.current_url,
                "screenshot": str(shot(driver, "04_search_Beijing").relative_to(ROOT)),
                "keyword_counts": count_keywords(page_text(driver)),
                "body_preview": re.sub(r"\s+", " ", page_text(driver))[:800],
            }
        )

        # 4) search Shanghai
        driver.get(URLS["all_en"])
        time.sleep(3)
        searched = try_search(driver, "Shanghai")
        time.sleep(2)
        results.append(
            {
                "name": "05_search_Shanghai",
                "searched": searched,
                "url": driver.current_url,
                "title": driver.title,
                "final_url": driver.current_url,
                "screenshot": str(shot(driver, "05_search_Shanghai").relative_to(ROOT)),
                "keyword_counts": count_keywords(page_text(driver)),
                "body_preview": re.sub(r"\s+", " ", page_text(driver))[:800],
            }
        )

        # 5) search 北京 / 上海 on zh
        results.append(open_and_record(driver, URLS["all_zh"], "06_list_all_zh"))
        searched = try_search(driver, "北京")
        time.sleep(2)
        results.append(
            {
                "name": "07_search_北京",
                "searched": searched,
                "url": driver.current_url,
                "title": driver.title,
                "final_url": driver.current_url,
                "screenshot": str(shot(driver, "07_search_北京").relative_to(ROOT)),
                "keyword_counts": count_keywords(page_text(driver)),
                "body_preview": re.sub(r"\s+", " ", page_text(driver))[:800],
            }
        )
        driver.get(URLS["all_zh"])
        time.sleep(3)
        searched = try_search(driver, "上海")
        time.sleep(2)
        results.append(
            {
                "name": "08_search_上海",
                "searched": searched,
                "url": driver.current_url,
                "title": driver.title,
                "final_url": driver.current_url,
                "screenshot": str(shot(driver, "08_search_上海").relative_to(ROOT)),
                "keyword_counts": count_keywords(page_text(driver)),
                "body_preview": re.sub(r"\s+", " ", page_text(driver))[:800],
            }
        )

        # 6) categories
        for key, fname in [
            ("pass", "09_cat_pass"),
            ("tour", "10_cat_tour"),
            ("activities", "11_cat_activities"),
        ]:
            results.append(open_and_record(driver, URLS[key], fname))

        # transport paths
        for url, fname in [
            (f"{BASE}/en/tna/categories/transportation/products", "12_cat_transportation"),
            (f"{BASE}/en/tna/categories/transport/products", "13_cat_transport"),
            (f"{BASE}/en/tna/categories/all/products?sort=RECOMMEND", "14_all_again"),
        ]:
            try:
                results.append(open_and_record(driver, url, fname, wait=3.5))
            except Exception as e:
                results.append({"name": fname, "url": url, "error": str(e)})

        # 7) scroll product list deeply and capture product cards text
        driver.get(URLS["all_en"])
        time.sleep(3)
        for i in range(6):
            driver.execute_script("window.scrollBy(0, 900);")
            time.sleep(1.0)
        shot(driver, "15_scrolled_list_bottomish")
        text = page_text(driver)
        results.append(
            {
                "name": "15_scrolled_list",
                "url": driver.current_url,
                "title": driver.title,
                "final_url": driver.current_url,
                "screenshot": "output/selenium_visual/15_scrolled_list_bottomish.png",
                "keyword_counts": count_keywords(text),
                "body_preview": re.sub(r"\s+", " ", text)[:1200],
            }
        )

        # 8) open first few product links to show Korea destinations
        links = driver.find_elements(By.CSS_SELECTOR, "a[href*='/tna/products/']")
        hrefs = []
        for a in links:
            h = a.get_attribute("href") or ""
            if "/tna/products/" in h and h not in hrefs:
                hrefs.append(h)
            if len(hrefs) >= 3:
                break
        for i, href in enumerate(hrefs, 1):
            try:
                driver.get(href)
                time.sleep(3)
                results.append(
                    {
                        "name": f"16_detail_{i}",
                        "url": href,
                        "title": driver.title,
                        "final_url": driver.current_url,
                        "screenshot": str(shot(driver, f"16_detail_{i}").relative_to(ROOT)),
                        "keyword_counts": count_keywords(page_text(driver)),
                        "body_preview": re.sub(r"\s+", " ", page_text(driver))[:600],
                    }
                )
            except Exception as e:
                results.append({"name": f"16_detail_{i}", "url": href, "error": str(e)})

    finally:
        driver.quit()

    # summarize
    bj_hits = sum(r.get("keyword_counts", {}).get("Beijing", 0) + r.get("keyword_counts", {}).get("北京", 0) for r in results)
    sh_hits = sum(r.get("keyword_counts", {}).get("Shanghai", 0) + r.get("keyword_counts", {}).get("上海", 0) for r in results)
    seoul_hits = sum(r.get("keyword_counts", {}).get("Seoul", 0) for r in results)

    report = {
        "run_at": stamp,
        "headless": headless,
        "summary": {
            "Beijing_or_北京_hits_across_pages": bj_hits,
            "Shanghai_or_上海_hits_across_pages": sh_hits,
            "Seoul_hits_across_pages": seoul_hits,
            "conclusion": (
                "可视化页面未发现可筛选/可售的北京或上海 TNA 产品；列表与分类页以韩国目的地为主。"
                if bj_hits + sh_hits == 0
                else "页面文本出现过北京/上海字样，需结合截图人工核对是否为产品供给。"
            ),
        },
        "steps": results,
    }
    report_path = OUT / "visual_report.json"
    report_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    # markdown report with image links
    md = [
        "# NOL World TNA 可视化核验（Selenium）",
        "",
        f"- 时间(UTC): {stamp}",
        f"- 模式: {'headless' if headless else 'headed 可见浏览器'}",
        f"- Beijing/北京 文本命中合计: **{bj_hits}**",
        f"- Shanghai/上海 文本命中合计: **{sh_hits}**",
        f"- Seoul 文本命中合计: **{seoul_hits}**",
        f"- 结论: {report['summary']['conclusion']}",
        "",
        "## 步骤截图",
        "",
    ]
    for r in results:
        md.append(f"### {r.get('name')}")
        md.append(f"- URL: `{r.get('final_url') or r.get('url')}`")
        if r.get("title"):
            md.append(f"- Title: {r.get('title')}")
        if r.get("keyword_counts"):
            md.append(f"- 关键词计数: `{json.dumps(r['keyword_counts'], ensure_ascii=False)}`")
        if r.get("screenshot"):
            md.append(f"- 截图: ![]({Path(r['screenshot']).name})")
        if r.get("body_preview"):
            md.append(f"- 页面文本摘要: {r['body_preview'][:300]}...")
        if r.get("error"):
            md.append(f"- ERROR: {r['error']}")
        md.append("")
    (OUT / "visual_report.md").write_text("\n".join(md), encoding="utf-8")
    print("\nREPORT", report_path)
    print("MD", OUT / "visual_report.md")
    print("SUMMARY", report["summary"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
