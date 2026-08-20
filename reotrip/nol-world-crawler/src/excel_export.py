"""Excel export with products / exclusions / meta / field_dictionary sheets."""

from __future__ import annotations

import datetime as dt
from pathlib import Path
from typing import Any, Dict, List, Optional

import pandas as pd

PRODUCT_COLUMNS = [
    "product_id",
    "product_name_en",
    "product_name_zh",
    "city",
    "city_evidence",
    "category_l1",
    "category_l2",
    "product_type",
    "attraction_name",
    "ticket_option_name",
    "price",
    "currency",
    "price_from",
    "original_price",
    "discount_rate",
    "price_display",
    "rating",
    "review_count",
    "sales_or_booking_count",
    "free_cancellation",
    "instant_confirmation",
    "validity",
    "list_url",
    "detail_url",
    "image_url",
    "supplier_or_brand",
    "scraped_at",
    "source_lang",
    "raw_tags",
    "notes",
    "is_ticket_only",
    "judgment_reason",
    "raw_list_path",
    "raw_detail_api_path",
    "raw_detail_html_path",
    "field_sources_json",
]

EXCLUSION_COLUMNS = [
    "product_id",
    "product_name",
    "detail_url",
    "exclude_reason",
    "scraped_at",
    "category_l1",
    "category_l2",
    "cities",
    "raw_list_path",
    "source_lang",
]

CATALOG_COLUMNS = [
    "product_id",
    "product_name",
    "detail_url",
    "city_api",
    "category_l1",
    "category_l2",
    "price",
    "currency",
    "source_lang",
    "raw_list_path",
    "raw_detail_api_path",
    "raw_detail_html_path",
    "product_type_inferred",
    "ticket_judgment_inferred",
]

FIELD_DICTIONARY = [
    {
        "field": "product_id",
        "meaning": "平台产品 UUID",
        "example": "d3961fc4-....",
        "required": "yes",
        "source": "list API body[].id",
    },
    {
        "field": "product_name_en / product_name_zh",
        "meaning": "标题",
        "example": "[Seoul] N Seoul Tower Observatory Ticket",
        "required": "yes",
        "source": "list/detail API name",
    },
    {
        "field": "city",
        "meaning": "Beijing / Shanghai / 待人工确认",
        "example": "Beijing",
        "required": "yes(for kept)",
        "source": "geotags or inferred(keyword)",
    },
    {
        "field": "price / currency",
        "meaning": "展示价数值与币种分离",
        "example": "13.47 / USD",
        "required": "yes",
        "source": "list.price.* + request currency",
    },
    {
        "field": "detail_url",
        "meaning": "详情页 URL",
        "example": "https://world.nol.com/en/tna/products/{id}",
        "required": "yes",
        "source": "inferred(template+id) — 页面标题须与 raw name 一致",
    },
    {
        "field": "raw_*_path",
        "meaning": "本 run 下 raw 相对路径",
        "example": "raw/list/EN/cat_all/page_0001.json",
        "required": "yes",
        "source": "scraper filesystem",
    },
    {
        "field": "field_sources_json",
        "meaning": "各字段溯源；含 inferred 标注",
        "example": '{"product_type":"inferred(...)"}',
        "required": "yes",
        "source": "scraper",
    },
    {
        "field": "product_type / judgment_reason",
        "meaning": "是否单门票的规则判定",
        "example": "pass",
        "required": "no",
        "source": "inferred — 不得当作 API 原始字段",
    },
    {
        "field": "ticket_option_name",
        "meaning": "票种名",
        "example": "",
        "required": "no",
        "source": "n/a — 公开 API 无 SKU",
    },
    {
        "field": "attraction_name",
        "meaning": "景点名粗标准化",
        "example": "N Seoul Tower Observatory Ticket",
        "required": "no",
        "source": "inferred(from name) 除非与 name 完全一致",
    },
]


def export_excel(
    path: Path,
    products: List[Dict[str, Any]],
    exclusions: List[Dict[str, Any]],
    meta: Dict[str, Any],
    sample_field_rows: Optional[List[Dict[str, Any]]] = None,
    uncertain_rows: Optional[List[Dict[str, Any]]] = None,
    catalog_rows: Optional[List[Dict[str, Any]]] = None,
    verification_rows: Optional[List[Dict[str, Any]]] = None,
) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)

    products_df = pd.DataFrame(products, columns=PRODUCT_COLUMNS)
    exclusions_df = pd.DataFrame(exclusions, columns=EXCLUSION_COLUMNS)
    meta_df = pd.DataFrame([meta])
    dict_df = pd.DataFrame(FIELD_DICTIONARY)

    with pd.ExcelWriter(path, engine="openpyxl") as writer:
        products_df.to_excel(writer, sheet_name="products", index=False)
        exclusions_df.to_excel(writer, sheet_name="exclusions", index=False)
        meta_df.to_excel(writer, sheet_name="meta", index=False)
        dict_df.to_excel(writer, sheet_name="field_dictionary", index=False)
        if uncertain_rows is not None:
            uncertain_df = pd.DataFrame(uncertain_rows, columns=PRODUCT_COLUMNS)
            uncertain_df.to_excel(writer, sheet_name="待人工确认", index=False)
        if catalog_rows is not None:
            catalog_df = pd.DataFrame(catalog_rows, columns=CATALOG_COLUMNS)
            catalog_df.to_excel(writer, sheet_name="catalog_all", index=False)
        if verification_rows is not None:
            pd.DataFrame(verification_rows).to_excel(writer, sheet_name="verification_sample", index=False)
        if sample_field_rows:
            sample_df = pd.DataFrame(sample_field_rows, columns=PRODUCT_COLUMNS)
            sample_df.to_excel(writer, sheet_name="sample_fields_preview", index=False)

    return path


def default_output_path(output_dir: Path, prefix: str = "nol_beijing_shanghai_tickets") -> Path:
    stamp = dt.datetime.utcnow().strftime("%Y%m%d")
    return output_dir / f"{prefix}_{stamp}.xlsx"
