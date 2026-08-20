/**
 * Parse Excel 日本接送产品 → japan-excel-all-prices.json
 * Columns: 产品, option, 成本, 平日售价hkd
 * Sell = 平日售价 if present else cost/0.7 rounded
 */
import { writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const __dir = dirname(fileURLToPath(import.meta.url));

// use python openpyxl for reliability
const py = `
import openpyxl, json, re, os
f=os.path.expanduser("~/Downloads/NOL 待上架产品 (12).xlsx")
wb=openpyxl.load_workbook(f, data_only=True)
ws=wb["日本接送产品"]
rows=[]
cur=None
for i,row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
    name=row[0]
    opt=row[1]
    cost=row[2]
    sell=row[3]
    if name and str(name).strip():
        # strip notes after newline
        nm=str(name).split("\\n")[0].strip()
        nm=re.sub(r"[✔✓].*$","",nm).strip()
        cur={"name":nm, "row":i, "opts":[]}
        rows.append(cur)
    if not cur: continue
    if not opt: continue
    o=str(opt).strip()
    # map 7/10 go/rtn
    seat=7 if "7" in o else (10 if "10" in o else None)
    # go/rtn: 去程 go, 返程 rtn — excel often labels all as 去程 for both dirs in pairs of 4
    c=float(cost) if cost not in (None,"") else None
    s=float(sell) if sell not in (None,"") else None
    target=None
    if s is not None:
        target=int(round(s)) if abs(s-round(s))<1e-6 else round(s,2)
        source="sell_hkd"
    elif c is not None:
        target=int(round(c/0.7))
        source="cost/0.7"
    else:
        source="none"
    cur["opts"].append({"opt":o, "seat":seat, "cost":c, "sell":s, "target":target, "source":source, "excelRow":i})

# normalize each product to up to 4 targets [7go,10go,7rtn,10rtn]
out=[]
for p in rows:
    targets=[]
    for o in p["opts"]:
        if o["target"] is not None:
            targets.append(o["target"])
    # pad/truncate to 4 if looks like 4 options
    p["targets"]=targets
    p["e7"]=next((o["target"] for o in p["opts"] if o["seat"]==7 and o["target"] is not None), None)
    p["e10"]=next((o["target"] for o in p["opts"] if o["seat"]==10 and o["target"] is not None), None)
    out.append(p)

print(json.dumps({"count":len(out), "products":out}, ensure_ascii=False, indent=2))
`;

const json = execSync(`python3 - <<'PY'\n${py}\nPY`, { encoding: 'utf8', maxBuffer: 20 * 1024 * 1024 });
const data = JSON.parse(json);
writeFileSync(join(__dir, 'japan-excel-all-prices.json'), JSON.stringify(data, null, 2));
console.log('products', data.count);
data.products.slice(0, 15).forEach((p) =>
  console.log(p.name, 'e7=', p.e7, 'e10=', p.e10, 'nOpts=', p.opts.length, p.opts[0]?.source),
);
console.log('... total', data.count);
console.log('wrote japan-excel-all-prices.json');
