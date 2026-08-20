#!/usr/bin/env python3
"""Compare product_id sets between two scrape runs."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def load_ids(path: Path) -> set[str]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(data, list):
        return set(str(x) for x in data)
    if isinstance(data, dict) and "ids" in data:
        return set(str(x) for x in data["ids"])
    raise ValueError(f"Unsupported product_ids format: {path}")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("run_a", type=Path, help="product_ids.json or run dir")
    p.add_argument("run_b", type=Path, help="product_ids.json or run dir")
    args = p.parse_args()

    def resolve(path: Path) -> Path:
        if path.is_dir():
            return path / "product_ids.json"
        return path

    a = load_ids(resolve(args.run_a))
    b = load_ids(resolve(args.run_b))
    inter = a & b
    union = a | b
    jaccard = len(inter) / len(union) if union else 0.0
    recall_a = len(inter) / len(a) if a else 0.0
    recall_b = len(inter) / len(b) if b else 0.0
    print(f"run_a: {len(a)}")
    print(f"run_b: {len(b)}")
    print(f"intersection: {len(inter)}")
    print(f"jaccard: {jaccard:.4f}")
    print(f"overlap_vs_a: {recall_a:.4f}")
    print(f"overlap_vs_b: {recall_b:.4f}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
