"""NOL World TNA scraper configuration."""

from __future__ import annotations

BASE_URL = "https://world.nol.com"
API_BASE = f"{BASE_URL}/api"

LIST_PATH = "/tna-product/products"
DETAIL_PATH = "/tna-product/products/{product_id}"

LIST_URL_EN = f"{BASE_URL}/en/tna/categories/all/products"
LIST_URL_ZH = f"{BASE_URL}/zh-CN/tna/categories/all/products"
DETAIL_URL_TMPL = f"{BASE_URL}/{{lang}}/tna/products/{{product_id}}"

# Public list page categories (for reference / filtering)
CATEGORY_CODES = {
    "all": None,
    "tour": "TG001",
    "activities": "TG002",
    "pass": "TG003",
    "transport": "TG004",
    "travel_service": "TG005",
}

# UI region geotag mapping only covers Korean hubs (no Beijing/Shanghai).
# Format used by the site: ISO2::{uuid}
REGION_GEOTAGS = {
    "Seoul": [
        "ISO2::f5d570e8-ac16-4a48-baf0-09c8b98ad89d",
        "ISO2::8628da2e-2ae3-4298-a13d-b287af37293a",
        "ISO2::aab3cfd5-f1a6-4fe8-8500-4974a9d4966d",
    ],
    "Busan": [
        "ISO2::ef7d483a-48c5-4c51-95b8-d12dc8affdcd",
        "ISO2::5a4204fb-0dd7-4123-b96f-4b0549436bfd",
        "ISO2::119d33c5-a020-4924-a9f9-1d9149a4ed47",
        "ISO2::8f5dce3b-9340-40fc-9fbc-12ce89285f63",
    ],
    "Jeju": [
        "ISO2::288a9ac9-76e1-4216-9fb5-7c80f562a6c5",
    ],
}

# City detection for target markets.
# English names use word-boundary regex; CJK matched as literal substrings.
# Do NOT use short tokens like "sh"/"bj" — they false-positive on Show/Shop/etc.
CITY_KEYWORDS = {
    "Beijing": {
        "en_regex": [r"\bbeijing\b", r"\bpeking\b"],
        "cjk": ["北京"],
    },
    "Shanghai": {
        "en_regex": [r"\bshanghai\b"],
        "cjk": ["上海"],
    },
}

# Cities that clearly indicate non-China Korea inventory (for negative evidence)
NON_TARGET_CITY_MARKERS = [
    r"\bseoul\b",
    r"\bbusan\b",
    r"\bincheon\b",
    r"\bjeju\b",
    r"\byongin\b",
    r"\bgoyang\b",
    r"\bmyeongdong\b",
    r"\bmyeong-dong\b",
    r"\bhongdae\b",
    r"\beverland\b",
    r"\bkorea\b",
    r"首尔",
    r"釜山",
    r"济州",
    r"仁川",
    r"韩国",
]

# Title/category exclusion patterns (case-insensitive)
EXCLUDE_PATTERNS = [
    r"\bprivate\s+car\b",
    r"\bcharter\b",
    r"\b包车\b",
    r"\bprivate\s+tour\b",
    r"\bwalking\s+tour\b",
    r"\bday\s+tour\b",
    r"\bmulti[- ]?day\s+tour\b",
    r"\bguided?\s+tour\b",
    r"\bguide\b",
    r"\b导游\b",
    r"\b一日游\b",
    r"\btour\b",
    r"\bexperience\b",
    r"\bclass\b",
    r"\bworkshop\b",
    r"\bcooking\b",
    r"\bspa\b",
    r"\b体验\b",
    r"\bairport\s+transfer\b",
    r"\bpickup\b",
    r"\bpick-up\b",
    r"\bdrop-?off\b",
    r"\b接送机\b",
    r"\be-?sim\b",
    r"\busim\b",
    r"\bsim\s*card\b",
    r"\bwifi\b",
    r"\btransportation\b",
    r"\bshuttle\s+bus\b",
    r"\bhotel\s+package\b",
    r"\bstay\b",
    r"\b含酒店\b",
    r"\brental\b",
    r"\bhanbok\b",
    r"\bpackage\b",  # packages often not pure tickets; re-scored below
]

# Soft include hints for single-entry tickets / passes
TICKET_INCLUDE_HINTS = [
    r"\bticket\b",
    r"\bpass\b",
    r"\badmission\b",
    r"\bentry\b",
    r"\bentrance\b",
    r"\bobservatory\b",
    r"\bmuseum\b",
    r"\bpark\b",
    r"\btheme\s*park\b",
    r"\b快速通关\b",
    r"\b通票\b",
    r"\b门票\b",
    r"\b入场\b",
    r"\b一日票\b",
]

# Category names that are more likely pure tickets
TICKET_L2_HINTS = {
    "parks & attractions",
    "landmarks & museums",
    "travel pass",
}

REQUEST_INTERVAL_SEC = 0.7
MAX_RETRIES = 3
DEFAULT_PAGE_SIZE = 30
DEFAULT_CURRENCY = "USD"
DEFAULT_LANG = "EN"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
    "AppleWebKit/537.36 (KHTML, like Gecko) "
    "Chrome/126.0.0.0 Safari/537.36"
)
