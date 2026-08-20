#!/usr/bin/env python3
"""Trusted OS-level input. Synthetic JS wheel is ignored by Viator's lazy list (isTrusted=false)."""

from __future__ import annotations

import subprocess
import time


def _osascript(source: str) -> None:
    r = subprocess.run(
        ["osascript"],
        input=source,
        capture_output=True,
        text=True,
        timeout=20,
    )
    if r.returncode != 0:
        err = (r.stderr or r.stdout or "").strip()
        raise RuntimeError(
            "System Events keystroke failed. Grant Accessibility to Terminal/Grok "
            f"and make sure Chrome is frontmost. {err}"
        )


def chrome_page_down() -> None:
    """One Page Down to the front Chrome window. Call after activate_tab + focus_list_for_scroll."""
    _osascript(
        """
tell application "Google Chrome" to activate
delay 0.35
tell application "System Events"
  key code 121
end tell
"""
    )
    time.sleep(0.4)
