#!/usr/bin/env python3
"""Pack data/*.json into js/data.js so index.html works via file://."""
from pathlib import Path
import json

root = Path(__file__).resolve().parent.parent
data_dir = root / "data"
payload = {
    "steps": json.loads((data_dir / "steps.json").read_text(encoding="utf-8")),
    "products": json.loads((data_dir / "products.json").read_text(encoding="utf-8")),
    "learning": json.loads((data_dir / "learning.json").read_text(encoding="utf-8")),
    "fieldGuides": json.loads((data_dir / "field-guides.json").read_text(encoding="utf-8")),
    "tour": json.loads((data_dir / "tour.json").read_text(encoding="utf-8")),
}
out = root / "js" / "data.js"
out.write_text(
    "/* Auto-generated from data/*.json. Run: python3 scripts/build-data.py */\n"
    "window.APP_DATA = "
    + json.dumps(payload, ensure_ascii=False, indent=2)
    + ";\n",
    encoding="utf-8",
)
print("wrote", out)
