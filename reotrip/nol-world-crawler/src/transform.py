"""Map API payloads to output rows with field provenance."""

from __future__ import annotations

import datetime as dt
import json
from typing import Any, Dict, List, Optional

from . import config
from .filters import (
    category_names,
    classify_ticket,
    detect_city,
    extract_cities,
    free_cancellation_flag,
)


def _image_url(product: Dict[str, Any]) -> tuple[str, str]:
    thumb = product.get("thumbnail") or {}
    url = thumb.get("url") or {}
    if isinstance(url, dict) and (url.get("full") or url.get("original")):
        return (url.get("full") or url.get("original") or ""), "list/detail.thumbnail.url"
    images = product.get("images") or []
    if images:
        u = images[0].get("url") or {}
        if isinstance(u, dict) and (u.get("full") or u.get("original")):
            return (u.get("full") or u.get("original") or ""), "detail.images[0].url"
    return "", ""


def _price_fields(product: Dict[str, Any], currency: str) -> Dict[str, Any]:
    price = product.get("price") or {}
    display = price.get("display")
    sales = price.get("sales")
    applied = price.get("appliedCoupon")
    # Prefer explicit list display/applied fields from API
    if applied is not None:
        value, src = applied, "list.price.appliedCoupon"
    elif display is not None:
        value, src = display, "list.price.display"
    elif sales is not None:
        value, src = sales, "list/detail.price.sales"
    else:
        value, src = None, ""

    discount = price.get("totalDiscountRate")
    discount_src = "list.price.totalDiscountRate" if discount not in (None, 0) else ""
    if discount is None:
        discount = price.get("discountRate")
        discount_src = "list.price.discountRate" if discount not in (None, 0) else ""

    original = ""
    original_src = ""
    if applied is not None and sales is not None and applied < sales:
        original = sales
        original_src = "list.price.sales(when appliedCoupon < sales)"

    return {
        "price": value if value is not None else "",
        "currency": currency,
        "currency_source": "request_param.currency",
        "price_source": src or "missing",
        "price_from": True,
        "price_from_source": "inferred(list API shows from-price style)",
        "original_price": original,
        "original_price_source": original_src or "n/a",
        "discount_rate": discount if discount not in (None, 0) else "",
        "discount_rate_source": discount_src or "n/a",
        "price_display": f"{currency} {value}" if value is not None else "",
        "price_display_source": "inferred(concat currency+price)",
    }


def _review_fields(product: Dict[str, Any]) -> Dict[str, Any]:
    review = product.get("review") or {}
    if not review and isinstance(product.get("reviews"), dict):
        review = product["reviews"]
    rating = review.get("totalRating")
    count = review.get("totalCount")
    return {
        "rating": rating if rating not in (None, 0) else "",
        "rating_source": "list.review.totalRating" if rating not in (None, 0) else "n/a",
        "review_count": count if count not in (None, 0) else "",
        "review_count_source": "list.review.totalCount" if count not in (None, 0) else "n/a",
    }


def _attraction_name(product: Dict[str, Any]) -> tuple[str, str]:
    name = product.get("name") or ""
    if name.startswith("[") and "]" in name:
        return name.split("]", 1)[1].strip(), "inferred(strip [city] prefix from name)"
    return name.strip(), "list/detail.name"


def _raw_tags(product: Dict[str, Any]) -> tuple[str, str]:
    parts: List[str] = []
    for b in product.get("badges") or []:
        if isinstance(b, dict):
            parts.append(str(b.get("value") or b.get("key") or b))
        else:
            parts.append(str(b))
    for t in product.get("eventTags") or []:
        parts.append(str(t))
    for t in product.get("types") or []:
        if isinstance(t, dict):
            parts.append(str(t.get("value") or t.get("name") or t))
        else:
            parts.append(str(t))
    return " | ".join(parts), "list/detail.badges|eventTags|types"


def _validity(product: Dict[str, Any]) -> tuple[str, str]:
    dates = product.get("usableDates") or []
    if dates:
        return (
            f"usableDates sample: {', '.join(str(d) for d in dates[:5])}",
            "list/detail.usableDates",
        )
    if product.get("requireDateOfUse") is True:
        return "requires date of use", "detail.requireDateOfUse"
    if product.get("ignoreUsablePeriodStartDate") is True:
        return "flexible / ignore usable period start", "list/detail.ignoreUsablePeriodStartDate"
    return "", "n/a"


def product_to_row(
    product: Dict[str, Any],
    *,
    currency: str,
    source_lang: str,
    city: Optional[str],
    city_evidence: str,
    city_source: str,
    product_type: str,
    judgment_reason: str,
    detail: Optional[Dict[str, Any]] = None,
    detail_html_path: str = "",
) -> Dict[str, Any]:
    src = detail or product
    pid = product.get("id") or src.get("id") or ""
    lang_path = "zh-CN" if source_lang.upper().startswith("ZH") else "en"
    l1, l2 = category_names(src if src.get("categories") else product)
    price = _price_fields(product if product.get("price") else src, currency)
    # if list missing price, try detail
    if price["price"] == "" and detail and detail.get("price"):
        price = _price_fields(detail, currency)
        # detail sales often in KRW regardless of request — still report as-is with source
        if price["price"] != "" and currency == "USD" and isinstance(price["price"], (int, float)) and price["price"] > 1000:
            # detail API sometimes returns KRW even when list used USD — mark carefully
            price["currency"] = "KRW"
            price["currency_source"] = "inferred(detail.price.sales magnitude looks KRW)"
            price["notes_price"] = "detail price appears KRW"
    review = _review_fields(product if product.get("review") is not None else src)

    supplier = ""
    supplier_src = "n/a"
    if detail and detail.get("supplierPartner"):
        sp = detail["supplierPartner"]
        supplier = sp.get("name") or sp.get("supplierPartnerCode") or ""
        supplier_src = "detail.supplierPartner.name"

    free_cancel = free_cancellation_flag(src)
    free_src = "list/detail.cancellationTypes" if free_cancel is not None else "n/a"
    instant = src.get("hasInstantConfirmation")
    if instant is None:
        instant = product.get("hasInstantConfirmation")
    instant_src = "list/detail.hasInstantConfirmation" if instant is not None else "n/a"

    name_raw = product.get("name") or src.get("name") or ""
    name_en = name_raw if not source_lang.upper().startswith("ZH") else ""
    name_zh = name_raw if source_lang.upper().startswith("ZH") else ""
    name_src = "list.name" if product.get("name") else "detail.name"

    attraction, attraction_src = _attraction_name(src)
    img, img_src = _image_url(src)
    if not img:
        img, img_src = _image_url(product)
    tags, tags_src = _raw_tags(src)
    validity, validity_src = _validity(src)

    # field_sources map for audit (JSON string)
    field_sources = {
        "product_id": "list/detail.id",
        "product_name_en": name_src if name_en else "n/a",
        "product_name_zh": name_src if name_zh else "n/a",
        "city": city_source,
        "city_evidence": city_source,
        "category_l1": "list/detail.categories[0].name",
        "category_l2": "list/detail.categories[0].child[0].name",
        "product_type": "inferred(rules on category+title+types)",
        "attraction_name": attraction_src,
        "ticket_option_name": "n/a(public API no SKU matrix)",
        "price": price["price_source"],
        "currency": price["currency_source"],
        "price_from": price["price_from_source"],
        "original_price": price["original_price_source"],
        "discount_rate": price["discount_rate_source"],
        "price_display": price["price_display_source"],
        "rating": review["rating_source"],
        "review_count": review["review_count_source"],
        "sales_or_booking_count": "n/a(not in public API)",
        "free_cancellation": free_src,
        "instant_confirmation": instant_src,
        "validity": validity_src,
        "list_url": "fixed",
        "detail_url": "inferred(template + product_id)",
        "image_url": img_src or "n/a",
        "supplier_or_brand": supplier_src,
        "raw_tags": tags_src,
        "judgment_reason": "inferred(classifier)",
    }

    row = {
        "product_id": pid,
        "product_name_en": name_en,
        "product_name_zh": name_zh,
        "city": city or "",
        "city_evidence": city_evidence,
        "category_l1": l1,
        "category_l2": l2,
        "product_type": product_type,
        "attraction_name": attraction,
        "ticket_option_name": "",
        "price": price["price"],
        "currency": price["currency"],
        "price_from": price["price_from"],
        "original_price": price["original_price"],
        "discount_rate": price["discount_rate"],
        "price_display": price["price_display"],
        "rating": review["rating"],
        "review_count": review["review_count"],
        "sales_or_booking_count": "",
        "free_cancellation": free_cancel if free_cancel is not None else "",
        "instant_confirmation": instant if instant is not None else "",
        "validity": validity,
        "list_url": config.LIST_URL_ZH if lang_path == "zh-CN" else config.LIST_URL_EN,
        "detail_url": config.DETAIL_URL_TMPL.format(lang=lang_path, product_id=pid),
        "image_url": img,
        "supplier_or_brand": supplier,
        "scraped_at": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "source_lang": "zh-CN" if lang_path == "zh-CN" else "en",
        "raw_tags": tags,
        "notes": judgment_reason,
        "is_ticket_only": (
            "yes"
            if product_type == "ticket_only"
            else ("pass" if product_type == "pass" else ("待确认" if product_type == "uncertain" else "no"))
        ),
        "judgment_reason": judgment_reason,
        "raw_list_path": product.get("_raw_list_path") or "",
        "raw_detail_api_path": (detail or {}).get("_raw_detail_api_path")
        or product.get("_raw_detail_api_path")
        or "",
        "raw_detail_html_path": detail_html_path or product.get("_raw_detail_html_path") or "",
        "field_sources_json": json.dumps(field_sources, ensure_ascii=False),
    }
    return row


def exclusion_row(product: Dict[str, Any], reason: str, source_lang: str = "en") -> Dict[str, Any]:
    pid = product.get("id") or ""
    lang_path = "zh-CN" if source_lang.upper().startswith("ZH") else "en"
    return {
        "product_id": pid,
        "product_name": product.get("name") or "",
        "detail_url": config.DETAIL_URL_TMPL.format(lang=lang_path, product_id=pid) if pid else "",
        "exclude_reason": reason,
        "scraped_at": dt.datetime.utcnow().replace(microsecond=0).isoformat() + "Z",
        "category_l1": category_names(product)[0],
        "category_l2": category_names(product)[1],
        "cities": ",".join(extract_cities(product)),
        "raw_list_path": product.get("_raw_list_path") or "",
        "source_lang": source_lang,
    }


def process_product(
    product: Dict[str, Any],
    *,
    currency: str,
    source_lang: str,
    detail: Optional[Dict[str, Any]] = None,
    detail_html_path: str = "",
) -> Dict[str, Any]:
    city, evidence, city_status = detect_city(detail or product)
    # city_source
    if city_status == "matched":
        if evidence.startswith("geotag"):
            city_source = "list/detail.geotags(TRIPLE_CITY|ISO2)"
        else:
            city_source = "inferred(keyword on title/address; strict regex)"
    elif city_status == "uncertain":
        city_source = "inferred(no city geotag)"
    else:
        city_source = "list/detail.geotags(non-BJ/SH)"

    ptype, reason, should_exclude = classify_ticket(detail or product)

    if city_status == "uncertain":
        if ptype in {"ticket_only", "pass", "uncertain"}:
            row = product_to_row(
                product,
                currency=currency,
                source_lang=source_lang,
                city="待人工确认",
                city_evidence=evidence,
                city_source=city_source,
                product_type=ptype,
                judgment_reason=reason,
                detail=detail,
                detail_html_path=detail_html_path,
            )
            return {
                "decision": "uncertain_city",
                "uncertain_row": row,
                "city": None,
                "product_type": ptype,
            }
        return {
            "decision": "exclude",
            "exclusion_row": exclusion_row(
                product,
                f"city_uncertain_and_not_ticket ({evidence}; {reason})",
                source_lang,
            ),
            "city": None,
            "product_type": ptype,
        }

    if city_status != "matched":
        return {
            "decision": "exclude",
            "exclusion_row": exclusion_row(
                product,
                f"city_not_beijing_shanghai ({evidence})",
                source_lang,
            ),
            "city": city,
            "product_type": ptype,
        }

    if should_exclude and ptype == "excluded":
        return {
            "decision": "exclude",
            "exclusion_row": exclusion_row(
                product,
                f"city_ok={city}; not_single_ticket: {reason}",
                source_lang,
            ),
            "city": city,
            "product_type": ptype,
        }

    row = product_to_row(
        product,
        currency=currency,
        source_lang=source_lang,
        city=city,
        city_evidence=evidence,
        city_source=city_source,
        product_type=ptype if ptype != "excluded" else "uncertain",
        judgment_reason=reason,
        detail=detail,
        detail_html_path=detail_html_path,
    )
    return {
        "decision": "keep",
        "product_row": row,
        "city": city,
        "product_type": ptype,
    }
