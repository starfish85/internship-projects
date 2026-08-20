#!/usr/bin/env python3
"""Resolve the viator project root and dated data paths."""

from __future__ import annotations

import os
from pathlib import Path


def project_root(explicit: str | None = None) -> Path:
    if explicit:
        root = Path(explicit).expanduser().resolve()
        if not (root / "data").is_dir():
            raise SystemExit(f"Not a project root (missing data/): {root}")
        return root

    env = os.environ.get("VIATOR_PROJECT_ROOT")
    if env:
        return project_root(env)

    here = Path(__file__).resolve()
    # scripts -> skill -> skills -> .grok -> project
    if len(here.parents) >= 5:
        candidate = here.parents[4]
        if (candidate / "data").is_dir():
            return candidate

    cwd = Path.cwd().resolve()
    for p in [cwd, *cwd.parents]:
        if (p / "data" / "viator").is_dir():
            return p
        if (p / "data").is_dir() and (p / ".grok" / "skills" / "viator-enterprise-locations").is_dir():
            return p

    raise SystemExit("Cannot find project root. Run from the workspace or set VIATOR_PROJECT_ROOT.")


def run_dir(root: Path, run_id: str) -> Path:
    return root / "data" / "raw" / run_id


def snapshot_path(root: Path, run_id: str) -> Path:
    return run_dir(root, run_id) / "snapshot.json"


def viator_xlsx_path(root: Path, run_id: str) -> Path:
    return root / "data" / "viator" / f"viator_products_{run_id}.xlsx"


def tripadvisor_xlsx_path(root: Path, run_id: str) -> Path:
    return root / "data" / "tripadvisor" / f"tripadvisor_locations_{run_id}.xlsx"


def comparison_xlsx_path(root: Path, from_date: str, to_date: str) -> Path:
    return root / "data" / "comparisons" / f"compare_{from_date}_to_{to_date}.xlsx"
