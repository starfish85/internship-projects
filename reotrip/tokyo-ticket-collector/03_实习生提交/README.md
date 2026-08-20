# wb_tokyo_ticket_availability.py

## What it does
- Opens the Tokyo Studio Tour ticket flow in a visible Edge browser.
- Stops when the booking page shows queue / human verification and waits for you to continue.
- Collects visible availability and price data for each ticket class and writes CSV + JSON output.

## Prerequisites
- Python 3.12+
- `playwright`
- Microsoft Edge (preferred) or Chrome installed locally

Install dependency if needed:
```bash
python -m pip install playwright
```

## Run
```bash
python 03_实习生提交/wb_tokyo_ticket_availability.py
```

Without `--output-dir`, results go to a timestamped folder under `03_实习生提交/generated/runs/`.

Collect only Adult tickets for November 2026:
```bash
python 03_实习生提交/wb_tokyo_ticket_availability.py --only-ticket Adult --target-month 2026-11 --output-dir 03_实习生提交/output_november
```
In the live browser flow, `--target-month` also moves the calendar to that month before reading prices.

Read an already-open calendar page from the script-launched browser:
```bash
python 03_实习生提交/wb_tokyo_ticket_availability.py --from-open-page --only-ticket Adult --target-month 2026-11 --output-dir 03_实习生提交/output_november_current_page
```

Read a saved calendar text file:
```bash
python 03_实习生提交/wb_tokyo_ticket_availability.py --from-text-file current_visit_text.txt --only-ticket Adult --target-month 2026-11 --output-dir 03_实习生提交/output_november_current_page
```

## Output
The script writes these files under the chosen output folder:
- `ticket_availability.csv`
- `ticket_availability.json`

CSV columns now include `currency` so amounts are explicit.

## Manual verification pause
If the browser lands on the queue / verification screen, finish that step in the browser window. The script keeps waiting and then continues from the same browser session.

If the booking session expires and shows `Start Again`, the live browser flow clicks it, re-enters the ticket flow, and resumes from rows already written to `ticket_availability.csv`.

## November 2026 sample output
The latest local run wrote Adult November 2026 results to `03_实习生提交/output_november_current_page/`.
It contains 30 rows: 26 available dates and 4 closed dates.

## Notes
- The script only reads public pages and public booking screens.
- It does not log in, submit orders, or enter payment.
- If the visible browser page cannot be read, make sure it was opened by this script with CDP enabled, or use `--from-text-file` with a saved page text file.
