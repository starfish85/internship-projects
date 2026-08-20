"""City detection and ticket-vs-tour classification."""

from __future__ import annotations

import re
from typing import Any, Dict, List, Optional, Tuple

from . import config

_EXCLUDE_RES = [re.compile(p, re.I) for p in config.EXCLUDE_PATTERNS]
_TICKET_RES = [re.compile(p, re.I) for p in config.TICKET_INCLUDE_HINTS]


def _flatten_geotags(product: Dict[str, Any]) -> List[Dict[str, Any]]:
    tags: List[Dict[str, Any]] = []
    for chain in product.get("geotags") or []:
        if isinstance(chain, list):
            tags.extend(chain)
        elif isinstance(chain, dict):
            tags.append(chain)
    # detail API also puts geotags on places
    for place in product.get("places") or []:
        for g in place.get("geotags") or []:
            tags.append(g)
    return tags


def extract_cities(product: Dict[str, Any]) -> List[str]:
    cities = []
    for g in _flatten_geotags(product):
        if g.get("type") in {"TRIPLE_CITY", "ISO2"} and g.get("name"):
            name = str(g["name"]).strip()
            if name and name not in cities:
                cities.append(name)
    return cities


def extract_countries(product: Dict[str, Any]) -> List[str]:
    countries = []
    for g in _flatten_geotags(product):
        if g.get("type") in {"ISO1"} and g.get("name"):
            name = str(g["name"]).strip()
            if name and name not in countries:
                countries.append(name)
    return countries


def _text_blob(product: Dict[str, Any]) -> Tuple[List[str], str]:
    cities = extract_cities(product)
    name = (product.get("name") or "") + " " + (product.get("description") or "")
    addresses: List[str] = []
    for place in product.get("places") or []:
        loc = place.get("location") or {}
        if loc.get("address"):
            addresses.append(str(loc["address"]))
        if place.get("name"):
            addresses.append(str(place["name"]))
    blob = " ".join(cities + addresses + [name])
    return cities, blob


def _match_target_city_in_text(text: str) -> Tuple[Optional[str], str]:
    """Match Beijing/Shanghai with strict patterns (word-boundary EN + CJK)."""
    if not text:
        return None, ""
    lower = text.lower()
    for city, rules in config.CITY_KEYWORDS.items():
        for pat in rules.get("en_regex") or []:
            if re.search(pat, lower, flags=re.I):
                return city, f"keyword regex '{pat}' in title/address/geotag text"
        for cjk in rules.get("cjk") or []:
            if cjk in text:
                return city, f"keyword '{cjk}' in title/address/geotag text"
    return None, ""


def _has_korea_negative_marker(text: str) -> bool:
    return any(re.search(p, text, flags=re.I) for p in config.NON_TARGET_CITY_MARKERS)


def detect_city(product: Dict[str, Any]) -> Tuple[Optional[str], str, str]:
    """
    Returns (city, evidence, status)
    status: matched | uncertain | other
    city: Beijing | Shanghai | None
    """
    cities, blob = _text_blob(product)
    blob_l = blob.lower()

    # 1) region/city fields (highest priority)
    for c in cities:
        cl = c.strip().lower()
        if cl in {"beijing", "peking"} or c.strip() == "北京":
            return "Beijing", f"geotag/city field: {c}", "matched"
        if cl == "shanghai" or c.strip() == "上海":
            return "Shanghai", f"geotag/city field: {c}", "matched"
        # explicit China city names in geotag
        for city, rules in config.CITY_KEYWORDS.items():
            for pat in rules.get("en_regex") or []:
                if re.search(pat, cl, flags=re.I):
                    return city, f"geotag/city field: {c}", "matched"
            for cjk in rules.get("cjk") or []:
                if cjk in c:
                    return city, f"geotag/city field: {c}", "matched"

    # 2) title / address keywords (strict)
    hit_city, evidence = _match_target_city_in_text(blob)
    if hit_city:
        # If geotags/title strongly point to Korea, do not hard-match BJ/SH
        if cities and not any(
            re.search(r"beijing|shanghai|北京|上海", x, re.I) for x in cities
        ):
            # cities present and none is BJ/SH → other (audit as non-target)
            return None, f"keyword hit {hit_city} but geotag cities={cities}", "other"
        if _has_korea_negative_marker(blob) and not any(
            re.search(r"beijing|shanghai|北京|上海", c, re.I) for c in cities
        ):
            return None, f"keyword hit {hit_city} but Korea marker present; cities={cities}", "other"
        return hit_city, evidence, "matched"

    # 3) no city geotag at all → uncertain bucket (caller may put 待人工确认)
    if not cities:
        return None, "no city geotag and no BJ/SH keyword", "uncertain"

    return None, f"cities={cities}; no BJ/SH match", "other"


def category_names(product: Dict[str, Any]) -> Tuple[str, str]:
    cats = product.get("categories") or []
    if not cats:
        # detail types
        types = product.get("types") or []
        if types:
            return str(types[0].get("value") or types[0].get("name") or ""), ""
        return "", ""
    l1 = cats[0].get("name") or ""
    children = cats[0].get("child") or []
    l2 = children[0].get("name") if children else ""
    # multi top-level
    if len(cats) > 1 and not l2:
        l1 = " / ".join(c.get("name") or "" for c in cats)
    return l1, l2


def classify_ticket(product: Dict[str, Any]) -> Tuple[str, str, bool]:
    """
    Returns (product_type, judgment_reason, should_exclude)
    product_type: ticket_only | pass | uncertain | excluded
    """
    name = product.get("name") or ""
    l1, l2 = category_names(product)
    types = product.get("types") or []
    type_values = " ".join(
        str(t.get("value") or "") + " " + str(t.get("name") or "") for t in types
    )
    blob = f"{name} {l1} {l2} {type_values}".lower()

    # hard excludes first (but allow pure ticket wording to override package)
    matched_excludes = []
    for cre in _EXCLUDE_RES:
        if cre.search(blob):
            matched_excludes.append(cre.pattern)

    l2_l = (l2 or "").lower()
    l1_l = (l1 or "").lower()
    is_pass_cat = l1_l in {"passes", "pass"} or "ticket_pass" in type_values.lower()
    is_ticket_l2 = l2_l in config.TICKET_L2_HINTS
    ticket_hint = any(r.search(blob) for r in _TICKET_RES)

    # Strong ticket L2 under Passes
    if is_pass_cat and is_ticket_l2:
        # still exclude transport-ish
        if re.search(r"esim|sim|wifi|airport\s+transfer|shuttle|pickup|rental|hanbok", blob, re.I):
            return "excluded", f"pass-category but non-ticket pattern: {matched_excludes or blob[:80]}", True
        return "pass", f"Passes L2={l2 or l1}; ticket-like attraction/pass", False

    # types TICKET_PASS without bad patterns
    if "ticket_pass" in type_values.lower() and not matched_excludes:
        return "pass", "types contains TICKET_PASS", False

    if matched_excludes:
        # package + ticket might still be uncertain if pure award ticket etc.
        if ticket_hint and not re.search(
            r"tour|guide|private|experience|spa|workshop|transfer|esim|sim|wifi|rental|hanbok|shuttle",
            blob,
            re.I,
        ):
            return "uncertain", f"ticket hint but also exclude patterns {matched_excludes}", False
        return "excluded", f"exclude pattern: {matched_excludes[0]}", True

    if is_pass_cat and ticket_hint:
        return "pass", "Passes category + ticket keywords", False

    if ticket_hint and l1_l not in {"tours", "tour", "transport", "travel service"}:
        return "ticket_only", "ticket keywords without tour/transport category", False

    if is_pass_cat:
        return "uncertain", "Passes category but weak ticket signals", False

    return "excluded", f"not single-ticket (category={l1}/{l2})", True


def free_cancellation_flag(product: Dict[str, Any]) -> Optional[bool]:
    types = product.get("cancellationTypes") or []
    if not types:
        return None
    joined = " ".join(str(t) for t in types).upper()
    if "NON_CANCELABLE" in joined or "NON_CANCELLABLE" in joined:
        return False
    if "CANCEL" in joined:
        return True
    return None
