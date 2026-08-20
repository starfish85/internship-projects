(() => {
  if (window.__shinkansenHelperInjected) return;
  window.__shinkansenHelperInjected = true;

  const ORIGIN_LABELS = [
    "\u51fa\u53d1\u5730", "\u51fa\u53d1\u7ad9", "\u8d77\u70b9", "\u59cb\u53d1\u7ad9",
    "origin", "from", "departure from"
  ];
  const DESTINATION_LABELS = [
    "\u76ee\u7684\u5730", "\u7ec8\u70b9", "\u5230\u8fbe\u5730", "\u7ec8\u70b9\u7ad9",
    "destination", "to", "arrive at"
  ];
  const DATE_LABELS = ["\u51fa\u53d1\u65e5\u671f", "departure date"];
  const EXCLUDED_LABELS = [
    "\u65e5\u671f", "date", "\u65f6\u95f4", "time", "\u4eba\u6570", "passenger",
    "\u641c\u7d22", "search", "\u4ef7\u683c", "price"
  ];
  const EDITABLE_SELECTOR = 'input:not([type="hidden"]):not([type="date"]):not([type="time"]), textarea, [contenteditable="true"]';
  const CONTROL_SELECTOR = `${EDITABLE_SELECTOR}, [role="combobox"], [aria-haspopup="listbox"], button`;
  const DROPDOWN_SELECTOR = '[role="listbox"], [role="menu"], [aria-label*="\u9009"], [class*="dropdown"], [class*="Dropdown"], [class*="suggest"], [class*="Suggest"], [class*="autocomplete"], [class*="Autocomplete"]';

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function normalize(text) {
    return String(text || "")
      .replace(/[\u3000\s]+/g, " ")
      .replace(/[：:]/g, ":")
      .trim()
      .toLowerCase();
  }

  function visible(el) {
    if (!el || !el.isConnected) return false;
    const style = window.getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0" && rect.width > 0 && rect.height > 0;
  }

  function editable(el) {
    return Boolean(el && (el.matches?.(EDITABLE_SELECTOR) || el.isContentEditable));
  }

  function ownText(el) {
    return normalize([
      el?.getAttribute?.("aria-label"),
      el?.getAttribute?.("placeholder"),
      el?.getAttribute?.("name"),
      el?.getAttribute?.("data-testid"),
      el?.getAttribute?.("data-test-id"),
      el?.value
    ].filter(Boolean).join(" "));
  }

  function contextText(el) {
    const parts = [ownText(el)];
    let parent = el?.parentElement;
    for (let i = 0; parent && i < 4; i += 1, parent = parent.parentElement) {
      const text = normalize(parent.textContent || "");
      if (text && text.length <= 220) parts.push(text);
    }
    return parts.join(" ");
  }

  function hasLabel(text, labels) {
    return labels.some((label) => text.includes(normalize(label)));
  }

  function nearbyLabelScore(control, labels) {
    const controlRect = control.getBoundingClientRect();
    let best = 0;
    const labelNodes = document.querySelectorAll("label, span, p, div");
    for (const node of labelNodes) {
      if (!visible(node)) continue;
      const text = normalize(node.textContent || "");
      if (!labels.some((label) => text === normalize(label))) continue;

      let sharedContainer = false;
      let parent = node.parentElement;
      for (let depth = 0; parent && depth < 4; depth += 1, parent = parent.parentElement) {
        if (parent.contains(control)) {
          sharedContainer = true;
          break;
        }
      }
      if (!sharedContainer) continue;

      const labelRect = node.getBoundingClientRect();
      const verticalDistance = Math.abs(controlRect.top - labelRect.bottom);
      const horizontalDistance = Math.abs(controlRect.left - labelRect.left);
      if (verticalDistance <= 180 && horizontalDistance <= 500) {
        best = Math.max(best, 260 - verticalDistance - horizontalDistance / 5);
      }
    }
    return best;
  }

  function center(rect) {
    return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  }

  function visibleControls() {
    return [...document.querySelectorAll(CONTROL_SELECTOR)]
      .filter(visible)
      .filter((el) => !el.closest("[data-shinkansen-helper]") && !el.disabled);
  }

  function labelledTrigger(labels) {
    const oppositeLabels = labels === ORIGIN_LABELS ? DESTINATION_LABELS : ORIGIN_LABELS;
    const labelNodes = [...document.querySelectorAll("label, span, p, div")]
      .filter(visible)
      .filter((node) => labels.some((label) => normalize(node.textContent || "") === normalize(label)));
    let best = null;
    let bestScore = -Infinity;

    for (const labelNode of labelNodes) {
      let candidate = labelNode;
      for (let depth = 0; candidate && depth < 5; depth += 1, candidate = candidate.parentElement) {
        const rect = candidate.getBoundingClientRect();
        const text = normalize(candidate.textContent || "");
        if (rect.width < 120 || rect.height < 40 || rect.width > 900 || rect.height > 260 || text.length > 120) continue;
        // A parent containing both route labels is the whole route widget, not
        // the requested field. Never take an interactive descendant from it.
        if (hasLabel(text, oppositeLabels)) continue;

        const labelPoint = center(labelNode.getBoundingClientRect());
        const interactive = [...candidate.querySelectorAll('input, textarea, button, [role="button"], [role="combobox"], [tabindex]')]
          .filter(visible)
          .map((node) => {
            const point = center(node.getBoundingClientRect());
            return {
              node,
              distance: Math.abs(point.x - labelPoint.x) + Math.abs(point.y - labelPoint.y)
            };
          })
          .sort((a, b) => a.distance - b.distance)[0]?.node;
        const score = (interactive ? 1000 : 0) - rect.width * rect.height / 1000 - depth * 10;
        if (score > bestScore) {
          best = interactive || candidate;
          bestScore = score;
        }
      }
    }
    return best;
  }

  function controlScore(control, labels) {
    const text = contextText(control);
    let score = 0;
    if (hasLabel(text, labels)) score += 20;
    if (hasLabel(ownText(control), labels)) score += 80;
    score += nearbyLabelScore(control, labels);
    if (control.matches('input, textarea, [role="combobox"]')) score += 15;
    if (hasLabel(text, EXCLUDED_LABELS)) score -= 80;
    const rect = control.getBoundingClientRect();
    if (rect.width < 60 || rect.height < 18) score -= 30;
    return score;
  }

  function routePair() {
    const controls = visibleControls();
    const explicitOrigin = controls
      .map((control) => ({ control, score: controlScore(control, ORIGIN_LABELS) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.control;
    const explicitDestination = controls
      .map((control) => ({ control, score: controlScore(control, DESTINATION_LABELS) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.control;

    if (explicitOrigin && explicitDestination && explicitOrigin !== explicitDestination) {
      const originRect = explicitOrigin.getBoundingClientRect();
      const destinationRect = explicitDestination.getBoundingClientRect();
      if (Math.abs(originRect.top - destinationRect.top) < 180) {
        return { origin: explicitOrigin, destination: explicitDestination };
      }
    }

    // Fallback for custom controls without labels: choose the first two controls
    // in the same visual row, then map left to origin and right to destination.
    const candidates = controls
      .filter((control) => !hasLabel(contextText(control), EXCLUDED_LABELS))
      .map((control) => ({ control, rect: control.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width >= 80 && rect.height >= 20);

    let best = null;
    for (const left of candidates) {
      for (const right of candidates) {
        if (left.control === right.control || right.rect.left <= left.rect.left) continue;
        if (Math.abs(left.rect.top - right.rect.top) > Math.max(100, left.rect.height * 2)) continue;
        const gap = right.rect.left - (left.rect.left + left.rect.width);
        if (gap < -20 || gap > 700) continue;
        const score = left.rect.width + right.rect.width - Math.abs(left.rect.top - right.rect.top) - Math.max(0, gap - 300) / 5;
        if (!best || score > best.score) best = { left: left.control, right: right.control, score };
      }
    }
    return best ? { origin: best.left, destination: best.right } : { origin: null, destination: null };
  }

  function fieldFor(kind) {
    const labels = kind === "origin" ? ORIGIN_LABELS : DESTINATION_LABELS;
    const originTrigger = labelledTrigger(ORIGIN_LABELS);
    const destinationTrigger = labelledTrigger(DESTINATION_LABELS);
    if (originTrigger && destinationTrigger && originTrigger !== destinationTrigger) {
      const originRect = originTrigger.getBoundingClientRect();
      const destinationRect = destinationTrigger.getBoundingClientRect();
      if (Math.abs(originRect.top - destinationRect.top) < 180) {
        // Klook's visible layout is authoritative: left is Origin,
        // right is Destination, regardless of internal DOM order.
        const left = originRect.left <= destinationRect.left ? originTrigger : destinationTrigger;
        const right = left === originTrigger ? destinationTrigger : originTrigger;
        return kind === "origin" ? left : right;
      }
    }

    const labelled = labelledTrigger(labels);
    if (labelled) return labelled;

    const pair = routePair();
    if (pair[kind]) return pair[kind];
    return visibleControls()
      .map((control) => ({ control, score: controlScore(control, labels) }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)[0]?.control || null;
  }

  function dateTrigger() {
    const labels = DATE_LABELS.map(normalize);
    const labelNodes = [...document.querySelectorAll("label, span, p, div")]
      .filter(visible)
      .filter((node) => labels.includes(normalize(node.textContent || "")));
    let best = null;
    let bestScore = -Infinity;

    for (const labelNode of labelNodes) {
      let candidate = labelNode;
      for (let depth = 0; candidate && depth < 5; depth += 1, candidate = candidate.parentElement) {
        const rect = candidate.getBoundingClientRect();
        const text = normalize(candidate.textContent || "");
        if (rect.width < 120 || rect.height < 40 || rect.width > 1000 || rect.height > 260 || text.length > 140) continue;

        // Pick the smallest container that owns the date label. Clicking this
        // container opens Klook's calendar; nearby page inputs must not be used.
        const score = 1000 - rect.width * rect.height / 1000 - depth * 50;
        if (score > bestScore) {
          best = candidate;
          bestScore = score;
        }
      }
    }
    return best;
  }

  function clickableAncestor(el) {
    return el?.closest?.('button, [role="option"], [role="button"], [role="combobox"], li, td') || el;
  }

  function stationQuery(query) {
    const root = normalize(query).replace(/\u7ad9$/, "");
    return { root, station: `${root}\u7ad9` };
  }

  function stationControlMatches(control, value) {
    if (!control || !value) return false;
    const { root, station } = stationQuery(value);
    const values = [
      contextText(control),
      control.value,
      control.getAttribute?.("aria-label"),
      control.getAttribute?.("data-value"),
    ].filter(Boolean).map(normalize);
    const text = values.join(" ");
    return text.includes(station) || (root.length >= 2 && text.includes(root) && !routeLike(text));
  }

  function routeLike(text) {
    return /(?:->|[-–—→]|至|到)/.test(text);
  }

  function dateParts(value) {
    const match = String(value || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    return {
      year: Number(match[1]),
      month: Number(match[2]),
      day: Number(match[3]),
      iso: value,
      monthDay: `${Number(match[2])}\u6708${Number(match[3])}\u65e5`,
      full: `${Number(match[1])}\u5e74${Number(match[2])}\u6708${Number(match[3])}\u65e5`
    };
  }

  function timeRangeParts(value) {
    const text = String(value || "").trim();
    const match = text.match(/(\d{1,2}):(\d{2})\s*[-~至到]\s*(\d{1,2}):(\d{2})/);
    if (match) {
      return {
        start: Number(match[1]) * 60 + Number(match[2]),
        end: Number(match[3]) * 60 + Number(match[4])
      };
    }

    const single = text.match(/^(\d{1,2})(?::(\d{2}))?\s*(?:\u70b9|\u65f6)?$/);
    if (!single) return null;
    const minutes = Number(single[1]) * 60 + Number(single[2] || 0);
    return {
      start: minutes,
      end: minutes
    };
  }

  function timeFilterSelected(node, label = "") {
    const candidates = [node];
    const clickable = node?.closest?.('button, [role="button"], [role="option"]');
    if (clickable && clickable !== node && normalize(clickable.textContent || "") === normalize(node.textContent || "")) {
      candidates.push(clickable);
    }

    const wantedText = normalize(label || node?.textContent || "");
    let parent = node?.parentElement;
    for (let depth = 0; parent && depth < 4; depth += 1, parent = parent.parentElement) {
      if (normalize(parent.textContent || "") !== wantedText) break;
      candidates.push(parent);
    }

    for (const current of candidates) {
      const ariaState = current.getAttribute?.("aria-checked") || current.getAttribute?.("aria-pressed");
      const dataState = current.getAttribute?.("data-state") || current.getAttribute?.("data-selected");
      if (/^(true|checked|selected)$/i.test(String(ariaState || dataState || ""))) return true;

      const classTokens = String(current.className || "")
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean);
      if (classTokens.some((token) => /^(?:is[-_])?(?:active|selected|checked)$/.test(token))) return true;

      const style = globalThis.getComputedStyle?.(current);
      const accentColors = [style?.borderColor, style?.color, style?.backgroundColor]
        .filter(Boolean)
        .join(" ");
      const numbers = accentColors.match(/rgba?\(\s*(\d+)\s*[ ,]\s*(\d+)\s*[ ,]\s*(\d+)/i);
      const hex = accentColors.match(/#([0-9a-f]{6})\b/i);
      const rgb = numbers
        ? numbers.slice(1, 4).map(Number)
        : hex
          ? [1, 3, 5].map((index) => parseInt(hex[1][index - 1] + hex[1][index], 16))
          : null;
      if (rgb && rgb[0] >= 220 && rgb[1] >= 35 && rgb[1] <= 170 && rgb[2] <= 90) return true;
    }
    return false;
  }

  function exactTimeFilterTarget(node, label) {
    const wantedText = normalize(label);
    const clickable = node.closest?.('button, [role="button"], [role="option"]');
    if (clickable && normalize(clickable.textContent || "") === wantedText) return clickable;

    let current = node;
    let best = node;
    for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
      if (!visible(current)) continue;
      if (normalize(current.textContent || "") !== wantedText) break;
      best = current;
    }
    return best;
  }

  function timeFilterSignature(node) {
    const parts = [];
    let current = node;
    for (let depth = 0; current && depth < 5; depth += 1, current = current.parentElement) {
      const style = globalThis.getComputedStyle?.(current);
      parts.push([
        current.className,
        current.getAttribute?.("aria-checked"),
        current.getAttribute?.("aria-pressed"),
        current.getAttribute?.("data-state"),
        current.getAttribute?.("data-selected"),
        style?.borderColor,
        style?.backgroundColor,
        style?.color,
        style?.boxShadow,
      ].map((value) => String(value || "")).join("/") );
    }
    return parts.join("|");
  }

  async function clickKlookTimeFilter(node, shouldSelect, label = "") {
    if (!node) return false;
    if (timeFilterSelected(node, label) === shouldSelect) return true;

    const clickable = node.matches?.('button, [role="button"], [role="option"]')
      ? node
      : node.closest?.('button, [role="button"], [role="option"]') || node;
    clickable.scrollIntoView?.({ block: "nearest", inline: "nearest" });
    const rect = clickable.getBoundingClientRect();
    const point = center(rect);
    const hit = document.elementFromPoint(point.x, point.y);
    const target = hit && clickable.contains(hit) ? hit : clickable;
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const EventClass = type.startsWith("pointer") ? PointerEvent : MouseEvent;
      target.dispatchEvent(new EventClass(type, { bubbles: true, cancelable: true, view: window }));
    }
    await sleep(350);
    if (timeFilterSelected(clickable, label) === shouldSelect) return true;
    const redrawn = findLiveTimeFilterTarget(timeFilterRoot(), label);
    if (redrawn && timeFilterSelected(redrawn, label) === shouldSelect) return true;

    // A few Klook builds attach the handler only to the actual button element.
    clickable.click?.();
    await sleep(350);
    const latest = await waitForLiveTimeFilterTarget(label);
    return Boolean(latest && timeFilterSelected(latest, label) === shouldSelect);
  }

  function timeFilterRoot() {
    const headingLabels = ["\u51fa\u53d1\u65f6\u95f4", "departure time"].map(normalize);
    const headings = [...document.querySelectorAll("h1, h2, h3, h4, label, span, p, div")]
      .filter(visible)
      .filter((node) => headingLabels.includes(normalize(node.textContent || "")));
    let best = null;
    let bestArea = Infinity;
    for (const heading of headings) {
      let parent = heading.parentElement;
      for (let depth = 0; parent && depth < 6; depth += 1, parent = parent.parentElement) {
        const rect = parent.getBoundingClientRect();
        const rangeCount = [...parent.querySelectorAll("button, [role=button], [tabindex], div, span")]
          .filter((node) => /^\d{2}:\d{2}-\d{2}:\d{2}$/.test(normalize(node.textContent || ""))).length;
        if (rangeCount >= 2 && rect.width >= 180 && rect.height >= 120) {
          const area = rect.width * rect.height;
          if (area < bestArea) {
            best = parent;
            bestArea = area;
          }
        }
      }
    }
    return best;
  }

  function findLiveTimeFilterTarget(root, label) {
    if (!root || !label) return null;
    const wantedText = normalize(label);
    let best = null;
    let bestArea = Infinity;
    const nodes = root.querySelectorAll("button, [role=button], [tabindex], div, span");
    for (const node of nodes) {
      if (!visible(node) || normalize(node.textContent || "") !== wantedText) continue;
      const target = exactTimeFilterTarget(node, label);
      if (!target || !visible(target) || normalize(target.textContent || "") !== wantedText) continue;
      const rect = target.getBoundingClientRect();
      const area = rect.width * rect.height;
      if (rect.width < 20 || rect.height < 16 || area >= bestArea) continue;
      best = target;
      bestArea = area;
    }
    return best;
  }

  async function waitForLiveTimeFilterTarget(label) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const target = findLiveTimeFilterTarget(timeFilterRoot(), label);
      if (target) return target;
      await sleep(180);
    }
    return null;
  }

  async function applyDepartureTime(value) {
    const unrestricted = /^(\u5168\u5929|\u4e0d\u9650|all\s*day|any\s*time|no\s*(specific\s*)?time)$/i.test(String(value || "").trim());
    const wanted = unrestricted ? { start: 0, end: 1439 } : timeRangeParts(value);
    if (!wanted) return { ok: false, reason: "departure time range is not recognized" };
    const root = timeFilterRoot();
    if (!root) return { ok: false, reason: "departure time filter not found" };

    const ranges = new Map();
    for (const node of root.querySelectorAll("button, [role=button], [tabindex], div, span")) {
      if (!visible(node)) continue;
      const text = normalize(node.textContent || "");
      const match = text.match(/^(\d{2}):(\d{2})-(\d{2}):(\d{2})$/);
      if (!match) continue;
      const range = {
        start: Number(match[1]) * 60 + Number(match[2]),
        end: Number(match[3]) * 60 + Number(match[4])
      };
      const label = `${match[1]}:${match[2]}-${match[3]}:${match[4]}`;
      const key = `${range.start}-${range.end}`;
      ranges.set(key, { ...range, label });
    }

    if (!ranges.size) return { ok: false, reason: `matching departure time filter not found: ${value}` };
    const selected = [];
    for (const [rangeKey, rangeInfo] of ranges) {
      const { start, end, label } = rangeInfo;
      const shouldSelect = unrestricted || (start <= wanted.end && end >= wanted.start);
      const target = await waitForLiveTimeFilterTarget(label);
      if (!target) return { ok: false, selectedRanges: selected, reason: `departure time filter not found after redraw: ${label}` };
      const applied = await clickKlookTimeFilter(target, shouldSelect, label);
      if (!applied) return { ok: false, selectedRanges: selected, reason: `departure time filter click failed: ${label}` };
      if (shouldSelect) selected.push(rangeKey);
      // Klook replaces the whole filter panel after each click. Let the new
      // panel settle before locating the next range.
      await sleep(550);
    }

    const verification = [];
    for (const [rangeKey, rangeInfo] of ranges) {
      const { start, end, label } = rangeInfo;
      const shouldSelect = unrestricted || (start <= wanted.end && end >= wanted.start);
      const target = await waitForLiveTimeFilterTarget(label);
      const actual = Boolean(target && timeFilterSelected(target, label));
      verification.push({ rangeKey, shouldSelect, actual });
    }
    const verified = verification.every(({ shouldSelect, actual }) => {
      return actual === shouldSelect;
    });
    return verified
      ? { ok: true, selectedRanges: selected }
      : { ok: false, selectedRanges: selected, reason: `departure time filters were not fully applied: ${value}` };
  }

  function colorParts(value) {
    const text = String(value || "");
    const rgb = text.match(/rgba?\(\s*(\d+)\s*[ ,]\s*(\d+)\s*[ ,]\s*(\d+)/i);
    if (rgb) return rgb.slice(1, 4).map(Number);
    const hex = text.match(/#([0-9a-f]{6})\b/i);
    if (!hex) return null;
    return [0, 2, 4].map((index) => parseInt(hex[1].slice(index, index + 2), 16));
  }

  function orangeLike(value) {
    const rgb = colorParts(value);
    return Boolean(rgb && rgb[0] >= 220 && rgb[1] >= 35 && rgb[1] <= 180 && rgb[2] <= 90);
  }

  function trainTimeWindow(value) {
    const text = String(value || "").trim();
    if (/^(全天|不限|all\s*day|any\s*time|no\s*(specific\s*)?time)$/i.test(text)) {
      return { start: 0, end: 1439, unrestricted: true };
    }

    const range = timeRangeParts(text);
    if (!range) return null;
    const hasExplicitRange = /\d{1,2}:\d{2}\s*[-~至到]\s*\d{1,2}:\d{2}/.test(text);
    return {
      start: range.start,
      end: hasExplicitRange ? range.end : Math.min(range.start + 60, 1439),
      unrestricted: false,
    };
  }

  function exactClockNodes(root) {
    const nodes = [];
    for (const node of root.querySelectorAll("div, span, p, time, strong")) {
      if (!visible(node)) continue;
      const text = normalize(node.textContent || "");
      if (/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text)) nodes.push(node);
    }
    return nodes;
  }

  function cardClockValues(card) {
    const values = [];
    const nodes = exactClockNodes(card);
    for (const node of nodes) {
      const rect = node.getBoundingClientRect();
      const value = normalize(node.textContent || "");
      if (!values.some((item) => item.value === value && Math.abs(item.rect.left - rect.left) < 4 && Math.abs(item.rect.top - rect.top) < 4)) {
        values.push({ value, rect });
      }
    }
    return values.sort((a, b) => a.rect.left - b.rect.left || a.rect.top - b.rect.top);
  }

  function trainArrow(card) {
    const cardRect = card.getBoundingClientRect();
    // Klook uses an orange square button for the train-row expand action.
    // Prefer the real button over nested icon and wrapper elements.
    const klookArrow = [...card.querySelectorAll('button, [role="button"], [tabindex], a')]
      .filter(visible)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = globalThis.getComputedStyle?.(node);
        const rightDistance = cardRect.right - rect.right;
        const nearRight = rect.left >= cardRect.left + cardRect.width * 0.72 && rightDistance <= 160;
        const compact = rect.width >= 34 && rect.width <= 150 && rect.height >= 34 && rect.height <= 150;
        return nearRight && compact && orangeLike(style?.backgroundColor)
          ? { node, rect, rightDistance }
          : null;
      })
      .filter(Boolean)
      .sort((a, b) => a.rightDistance - b.rightDistance || b.rect.width * b.rect.height - a.rect.width * a.rect.height)[0]?.node;
    if (klookArrow) return klookArrow;

    const candidates = [...card.querySelectorAll('button, [role="button"], [tabindex], a, div')]
      .filter(visible)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const style = globalThis.getComputedStyle?.(node);
        const label = normalize([
          node.textContent,
          node.getAttribute?.("aria-label"),
          node.getAttribute?.("title"),
          node.getAttribute?.("data-testid"),
        ].filter(Boolean).join(" "));
        const orange = orangeLike(style?.backgroundColor) || orangeLike(style?.borderColor) || orangeLike(style?.color);
        const rightDistance = cardRect.right - rect.right;
        const nearRight = rect.left >= cardRect.left + cardRect.width * 0.72 && rightDistance <= 140;
        const compact = rect.width >= 34 && rect.width <= 140 && rect.height >= 34 && rect.height <= 140;
        if (!compact || !nearRight) return null;

        let score = 0;
        if (orange) score += 1000;
        if (/展开|收起|expand|collapse|down|up|arrow|chevron/.test(label)) score += 300;
        score += Math.max(0, 180 - rightDistance);
        score -= Math.abs(rect.width - rect.height);
        return { node, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.node || null;
  }

  function trainArrowExpanded(node) {
    if (!node) return false;
    let current = node;
    for (let depth = 0; current && depth < 12; depth += 1, current = current.parentElement) {
      if (current.getAttribute?.("aria-expanded") === "true") return true;
      if (/^(open|expanded|selected)$/i.test(current.getAttribute?.("data-state") || "")) return true;
      const label = normalize([
        current.getAttribute?.("aria-label"),
        current.getAttribute?.("title"),
        current.textContent,
      ].filter(Boolean).join(" "));
      if (/收起|collapse|chevron.?up|arrow.?up/.test(label)) return true;

      const visibleText = normalize(current.innerText || "");
      const priceCount = (visibleText.match(/(?:US\$|HK\$|USD|HKD|JPY|¥|￥|\$)\s*[\d,]+(?:\.\d{1,2})?/ig) || []).length;
      if (priceCount >= 2 && /(自由座席|指定座席|绿色车厢|自由席|指定席|绿车|ordinary car|reserved seat|green car)/i.test(visibleText)) {
        return true;
      }

      const style = globalThis.getComputedStyle?.(current);
      const background = colorParts(style?.backgroundColor);
      const border = colorParts(style?.borderColor);
      const textColor = colorParts(style?.color);
      // Klook collapsed state: orange fill with a white down chevron.
      // Klook expanded state: white/transparent fill with an orange border/up chevron.
      if (orangeLike(style?.borderColor) && !orangeLike(style?.backgroundColor)) return true;
      if (orangeLike(style?.backgroundColor) && textColor && textColor[0] > 210 && textColor[1] > 210 && textColor[2] > 210) return false;
      if (border && background && orangeLike(style?.borderColor) && background[0] > 220 && background[1] > 220 && background[2] > 220) return true;
    }
    return false;
  }

  function trainCardForTime(timeNode, requireArrow = true) {
    let current = timeNode;
    let best = null;
    let bestArea = Infinity;
    for (let depth = 0; current && depth < 10; depth += 1, current = current.parentElement) {
      const rect = current.getBoundingClientRect();
      if (rect.width < 280 || rect.height < 110 || rect.width > 2200 || rect.height > 2600) continue;
      const clocks = cardClockValues(current);
      if (clocks.length < 2) continue;
      const arrow = trainArrow(current);
      if (requireArrow && !arrow) continue;
      const area = rect.width * rect.height;
      if (area < bestArea) {
        best = current;
        bestArea = area;
      }
    }
    return best;
  }

  function visibleTrainCards() {
    const cards = new Set();
    for (const node of exactClockNodes(document)) {
      const card = trainCardForTime(node);
      if (card) cards.add(card);
    }
    return [...cards];
  }

  function allTrainCards() {
    const cards = new Set();
    for (const node of exactClockNodes(document)) {
      const card = trainCardForTime(node, true) || trainCardForTime(node, false);
      if (card) cards.add(card);
    }
    return [...cards];
  }

  function minutesFromClock(value) {
    const match = String(value || "").match(/^(\d{2}):(\d{2})$/);
    return match ? Number(match[1]) * 60 + Number(match[2]) : -1;
  }

  function klookSessionExpired() {
    const text = normalize(document.body?.innerText || document.body?.textContent || "");
    return /(?:页面停留超时|搜索会话已过期|会话已过期|search session expired|session expired|page timed out)/i.test(text);
  }

  function klookRefreshButton() {
    const candidates = [...document.querySelectorAll('button, [role="button"], [type="button"]')]
      .filter(visible)
      .map((node) => {
        const text = normalize([
          node.textContent,
          node.getAttribute?.("aria-label"),
          node.getAttribute?.("title"),
        ].filter(Boolean).join(" "));
        if (!/(?:刷新|refresh|reload)/i.test(text)) return null;
        const rect = node.getBoundingClientRect();
        if (rect.width < 60 || rect.height < 30 || rect.width > 900 || rect.height > 180) return null;

        let score = 0;
        let current = node;
        for (let depth = 0; current && depth < 6; depth += 1, current = current.parentElement) {
          const parentText = normalize(current.innerText || current.textContent || "");
          if (/页面停留超时|搜索会话已过期|会话已过期|search session expired|session expired|page timed out/i.test(parentText)) {
            score += 1000 - depth * 80;
            break;
          }
        }
        if (text === normalize("刷新") || text === "refresh" || text === "reload") score += 100;
        score += Math.min(rect.width * rect.height / 100, 100);
        return { node, score };
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score);
    return candidates[0]?.node || null;
  }

  async function refreshKlookAfterTimeout() {
    const button = klookRefreshButton();
    if (!button) return false;
    button.scrollIntoView?.({ block: "center", inline: "center" });
    button.click?.();
    for (let attempt = 0; attempt < 30; attempt += 1) {
      await sleep(300);
      if (!klookSessionExpired()) return true;
    }
    return false;
  }

  function trainCardIdentity(card) {
    const clocks = cardClockValues(card).map((item) => item.value).slice(0, 2).join("-");
    const route = routeStationsFromCard(card);
    const routeName = textLines(card).find((line) => /(?:nozomi|hikari|kodama|mizuho|sakura|hakutaka|tsurugi|kagayaki|yamabiko|hayabusa|komachi|toki|asama|shirasagi)/i.test(line)) || "";
    return `${clocks}|${stationKey(route.departure)}|${stationKey(route.arrival)}|${normalize(routeName)}`;
  }

  function clickTrainArrow(node) {
    if (!node) return false;
    const clickable = node.matches?.('button, [role="button"], [tabindex], a')
      ? node
      : node.closest?.('button, [role="button"], [tabindex], a') || node;
    clickable.scrollIntoView?.({ block: "center", inline: "nearest" });
    const rect = clickable.getBoundingClientRect();
    const point = center(rect);
    const hit = document.elementFromPoint(point.x, point.y);
    const target = hit && clickable.contains(hit) ? hit : clickable;
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const EventClass = type.startsWith("pointer") ? PointerEvent : MouseEvent;
      target.dispatchEvent(new EventClass(type, { bubbles: true, cancelable: true, view: window }));
    }
    return Boolean(target);
  }

  async function waitForExpandedTrainCard(departure, destination, identity = "") {
    for (let attempt = 0; attempt < 14; attempt += 1) {
      if (klookSessionExpired()) return null;
      const liveCards = visibleTrainCards();
      const byTime = liveCards.filter((candidate) => cardClockValues(candidate)[0]?.value === departure);
      const byDestination = byTime.filter((candidate) => cardMatchesDestination(candidate, destination));
      const candidates = byDestination;
      const card = candidates.find((candidate) => {
        const clock = cardClockValues(candidate)[0]?.value;
        if (clock !== departure) return false;
        if (identity && trainCardIdentity(candidate) !== identity) return false;
        const arrow = trainArrow(candidate);
        const detail = trainDetailFromCard(candidate);
        return trainArrowExpanded(arrow) || Boolean(detail?.seats?.length);
      });
      if (card) return card;
      await sleep(250);
    }
    return null;
  }

  async function waitForVisibleTrainCards(destination = "") {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const cards = visibleTrainCards();
      // Klook renders times and the arrow before station labels.
      if (cards.length && (!destination || cards.some((card) => cardMatchesDestination(card, destination)))) return cards;
      await sleep(300);
    }
    return [];
  }

  async function expandMatchingTrainCards(value, destination) {
    const wanted = trainTimeWindow(value);
    if (!wanted) return { ok: false, reason: `train departure time is not recognized: ${value}` };

    let cards = await waitForVisibleTrainCards(destination);
    if (!cards.length) return { ok: false, reason: "train result cards not found" };

    const timeMatches = cards.filter((card) => {
      const departure = cardClockValues(card)[0]?.value;
      const minutes = minutesFromClock(departure);
      return minutes >= wanted.start && minutes <= wanted.end;
    });
    const destinationMatches = timeMatches.filter((card) => cardMatchesDestination(card, destination));
    const matches = destinationMatches;
    if (!matches.length) return { ok: false, reason: `matching train destination not found: ${destination}` };
    const expanded = [];
    let expansionWarning = "";
    let refreshAttempts = 0;
    const maxClicks = Math.max(matches.length * 3, 12);
    for (let attempt = 0; attempt < maxClicks; attempt += 1) {
      const liveTimeMatches = visibleTrainCards().filter((card) => {
        const departure = cardClockValues(card)[0]?.value;
        const minutes = minutesFromClock(departure);
        return minutes >= wanted.start && minutes <= wanted.end;
      });
      const liveDestinationMatches = liveTimeMatches.filter((card) => cardMatchesDestination(card, destination));
      const liveMatches = liveDestinationMatches;
      const candidate = liveMatches.find((card) => {
        const arrow = trainArrow(card);
        return arrow
          && !trainArrowExpanded(arrow)
          && !expanded.some((item) => item.identity === trainCardIdentity(card));
      });
      if (!candidate) break;

      const departure = cardClockValues(candidate)[0]?.value || "";
      const identity = trainCardIdentity(candidate);
      const arrow = trainArrow(candidate);
      if (!clickTrainArrow(arrow)) break;

      const refreshed = await waitForExpandedTrainCard(departure, destination, identity);
      const detail = refreshed && trainDetailFromCard(refreshed);
      if (refreshed && detail && !expanded.some((item) => item.identity === identity)) {
        expanded.push({ identity, departure, detail });
      } else if (!refreshed) {
        if (klookSessionExpired() && refreshAttempts < 3) {
          refreshAttempts += 1;
          if (await refreshKlookAfterTimeout()) {
            await waitForVisibleTrainCards();
            continue;
          }
        }
        expansionWarning = `expanded train card was not detected after clicking ${departure}`;
        break;
      }
    }

    return {
      ok: !expansionWarning,
      reason: expansionWarning,
      departureWindow: wanted.unrestricted ? "全天" : `${String(Math.floor(wanted.start / 60)).padStart(2, "0")}:${String(wanted.start % 60).padStart(2, "0")}-${String(Math.floor(wanted.end / 60)).padStart(2, "0")}:${String(wanted.end % 60).padStart(2, "0")}`,
      matchedCount: matches.length,
      expandedCount: expanded.length,
      expandedDepartures: expanded.map((item) => item.departure),
      expandedDetails: expanded.map((item) => item.detail),
    };
  }

  function klookSearchButton() {
    const candidates = [...document.querySelectorAll('button, [role="button"], [type="button"]')]
      .filter(visible)
      .map((node) => {
        const text = normalize([
          node.textContent,
          node.getAttribute?.("aria-label"),
          node.getAttribute?.("title"),
        ].filter(Boolean).join(" "));
        const rect = node.getBoundingClientRect();
        const exact = text === normalize("搜索") || text === "search";
        const suitableSize = rect.width >= 60 && rect.height >= 30 && rect.width <= 260 && rect.height <= 120;
        return exact && suitableSize ? { node, rect } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);
    return candidates[0]?.node || null;
  }

  async function waitForKlookSearchButton() {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const button = klookSearchButton();
      if (button) return button;
      await sleep(180);
    }
    return null;
  }

  async function clickKlookSearch(destination) {
    const wantedRoot = stationQuery(destination || "").root;
    for (let retry = 0; retry < 3; retry += 1) {
      const button = await waitForKlookSearchButton();
      if (!button) return { ok: false, reason: "Klook search button not found" };
      button.scrollIntoView?.({ block: "center", inline: "nearest" });
      button.click?.();
      await sleep(500);

      for (let attempt = 0; attempt < 16; attempt += 1) {
        await sleep(300);
        if (klookSessionExpired()) {
          if (retry < 2 && await refreshKlookAfterTimeout()) break;
          return { ok: false, reason: "Klook search session expired and could not be refreshed" };
        }
        const cards = allTrainCards();
        const routeVerified = wantedRoot && cards.some((card) => normalize(card.innerText || "").includes(wantedRoot));
        if (routeVerified) return { ok: true, destinationVerified: true };
        // Results are already present even when station text is rendered in a
        // separate element. Do not click Search repeatedly in that case.
        if (cards.length || visibleTrainCards().length) {
          return { ok: true, destinationVerified: false, reason: `search results loaded; destination text was not directly verified: ${destination}` };
        }
      }
    }
    return { ok: true, destinationVerified: false, reason: `search results did not show destination: ${destination}` };
  }

  function textLines(node) {
    return String(node?.innerText || node?.textContent || "")
      .split(/\r?\n/)
      .map((line) => normalize(line))
      .filter(Boolean);
  }

  function routeStationsFromCard(card) {
    const lines = textLines(card);
    const clockIndexes = lines
      .map((line, index) => /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(line) ? index : -1)
      .filter((index) => index >= 0);
    if (clockIndexes.length < 2) return { departure: "", arrival: "" };

    const ignored = /^(?:[01]\d|2[0-3]):[0-5]\d$|^(?:\d+\s*)?(?:小时|小時|分钟|分鐘)|^(?:全程|换乘|換乘|新干线|新幹線|nozomi|hikari|kodama|mizuho|sakura|低至|价格最低|價格最低)/i;
    const stationAfter = (start, end) => {
      for (let index = start + 1; index < (end ?? lines.length); index += 1) {
        if (!ignored.test(lines[index]) && lines[index].length <= 50) return lines[index];
      }
      return "";
    };
    return {
      departure: stationAfter(clockIndexes[0], clockIndexes[1]),
      arrival: stationAfter(clockIndexes[1]),
    };
  }

  function stationKey(value) {
    const text = normalize(value)
      .replace(/(?:station|站|駅)$/i, "")
      .replace(/[\s-]+/g, "");
    const aliases = {
      tokyo: "东京", tokyostation: "东京", 东京: "东京",
      kyoto: "京都", 京都: "京都",
      osaka: "大阪", 大阪: "大阪",
      shinosaka: "新大阪", "shin-osaka": "新大阪", 新大阪: "新大阪",
      kanazawa: "金泽", 金泽: "金泽",
    };
    return aliases[text] || text;
  }

  function stationMatches(actual, expected) {
    const actualKey = stationKey(actual);
    const expectedKey = stationKey(expected);
    return Boolean(actualKey && expectedKey && (actualKey === expectedKey || actualKey.includes(expectedKey) || expectedKey.includes(actualKey)));
  }

  function cardMatchesDestination(card, destination) {
    if (!destination) return true;
    const route = routeStationsFromCard(card);
    if (stationMatches(route.arrival, destination)) return true;
    // Klook can render the station outside the parsed clock-line scope.
    // Confirm the requested station from this same card, never from time alone.
    const { root, station } = stationQuery(destination);
    const cardText = normalize(card.innerText || card.textContent || "");
    return Boolean(
      station && cardText.includes(station)
      || root.length >= 2 && cardText.includes(root) && !routeLike(cardText)
    );
  }

  function seatOptionDetails(card) {
    const seatPattern = /(自由座席|指定座席|绿色车厢|普通车厢|自由席|指定席|绿车|ordinary car|reserved seat|non[- ]reserved|green car)/i;
    const pricePattern = /(?:(?:US|HK)\s*\$|US\$|HK\$|USD|HKD|JPY|CNY|RMB|¥|￥|\$)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:USD|HKD|JPY|CNY|RMB|日元|日圓)/ig;
    const priceTestPattern = /(?:(?:US|HK)\s*\$|US\$|HK\$|USD|HKD|JPY|CNY|RMB|¥|￥|\$)\s*[\d,]+(?:\.\d{1,2})?|[\d,]+(?:\.\d{1,2})?\s*(?:USD|HKD|JPY|CNY|RMB|日元|日圓)/i;
    const options = new Map();
    const canonicalSeatName = (title) => {
      const text = normalize(title);
      if (/(绿色车厢|绿车|green car)/i.test(text)) return "指定座席 - 绿色车厢";
      if (/(自由座席|自由席|non[- ]reserved)/i.test(text)) return "自由座席 - 普通车厢";
      if (/(指定座席|指定席|reserved seat)/i.test(text)) return "指定座席 - 普通车厢";
      return String(title || "").trim();
    };
    const addOption = (title, price, current) => {
      const name = canonicalSeatName(title);
      const lines = textLines(current);
      const availability = lines.filter((line) => /余票|有座|售罄|缺票|available|sold out|seat/i.test(line));
      const features = lines.filter((line) =>
        line !== title
        && !priceTestPattern.test(line)
        && !/立即预订|立即預訂|book now|reserve|查看更|查看更多|查看更多/i.test(line)
        && !/余票|有座|售罄|缺票|available|sold out|seat/i.test(line)
      ).slice(0, 8);
      const key = `${name}|${price}`;
      const existing = options.get(key);
      if (existing) {
        existing.availability = [...new Set([...existing.availability, ...availability])];
        existing.features = [...new Set([...existing.features, ...features])];
        return;
      }
      options.set(key, { name, price, availability, features });
    };
    const priceMatches = (text) => {
      pricePattern.lastIndex = 0;
      const matches = [...String(text || "").matchAll(pricePattern)]
        .map((match) => ({ value: match[0], index: match.index || 0 }));
      pricePattern.lastIndex = 0;
      return matches;
    };
    const priceAfterTitle = (text, title) => {
      const blockText = normalize(text);
      const matches = priceMatches(blockText);
      if (!matches.length) return "";
      const titleIndex = blockText.indexOf(title);
      return (matches.find((match) => titleIndex < 0 || match.index >= titleIndex)?.value || matches[0].value);
    };
    const nodes = [...card.querySelectorAll("h1, h2, h3, h4, h5, h6, strong, div, span, p, li, a, button, label")]
      .filter(visible)
      .filter((node) => {
        const text = normalize(node.textContent || "");
        return text.length > 0 && text.length <= 100 && seatPattern.test(text);
      });

    for (const titleNode of nodes) {
      const title = normalize(titleNode.textContent || "");
      seatPattern.lastIndex = 0;
      let current = titleNode;
      let found = false;
      for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
        const blockText = normalize(current.innerText || current.textContent || "");
        const prices = priceMatches(blockText).map((match) => match.value);
        const rect = current.getBoundingClientRect();
        if (!prices.length || blockText.length > 1400 || rect.width < 120 || rect.height < 80) continue;

        addOption(title, priceAfterTitle(blockText, title) || prices[0], current);
        found = true;
        break;
      }
      if (found) continue;

      current = titleNode;
      for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
        const blockText = normalize(current.innerText || current.textContent || "");
        const price = priceAfterTitle(blockText, title);
        const rect = current.getBoundingClientRect();
        if (!price || blockText.length > 2200 || rect.width < 120 || rect.height < 40) continue;
        addOption(title, price, current);
        break;
      }
    }

    // Some Klook layouts render the seat label and price as sibling nodes.
    // Match each small price node to the nearest seat label without changing
    // the route, date, time, or train selection logic.
    const priceNodes = [...card.querySelectorAll("div, span, p, strong, li, button")]
      .filter(visible)
      .filter((node) => {
        const matches = priceMatches(normalize(node.textContent || ""));
        return matches.length === 1 && normalize(node.textContent || "").length <= 120;
      });
    for (const priceNode of priceNodes) {
      const price = priceMatches(normalize(priceNode.textContent || ""))[0]?.value;
      if (!price) continue;
      const priceRect = priceNode.getBoundingClientRect();
      const nearest = nodes
        .map((node) => {
          const rect = node.getBoundingClientRect();
          return {
            node,
            distance: Math.abs(rect.top - priceRect.top) + Math.abs(rect.left - priceRect.left) / 3,
          };
        })
        .sort((a, b) => a.distance - b.distance)[0];
      if (nearest && nearest.distance < 500) {
        addOption(nearest.node.textContent || "", price, priceNode.parentElement || priceNode);
      }
    }

    // Final fallback for Klook cards whose expanded text contains real fares
    // but no stable seat-label wrapper. Keep the source price unchanged.
    if (!options.size) {
      const fallbackPrices = priceMatches(card.innerText || card.textContent || "")
        .map((match) => match.value);
      fallbackPrices.forEach((price, index) => {
        addOption(`Displayed fare ${index + 1}`, price, card);
      });
    }
    return [...options.values()];
  }

  function expandedTrainScope(card) {
    const seatPattern = /(自由座席|指定座席|绿色车厢|普通车厢|自由席|指定席|绿车|ordinary car|reserved seat|non[- ]reserved|green car)/i;
    let current = card;
    for (let depth = 0; current && depth < 10; depth += 1, current = current.parentElement) {
      const text = String(current.innerText || "");
      const priceCount = (text.match(/(?:US\$|HK\$|USD|HKD|JPY|¥|￥|\$)\s*[\d,]+(?:\.\d{1,2})?/ig) || []).length;
      seatPattern.lastIndex = 0;
      const rect = current.getBoundingClientRect();
      if (priceCount >= 2 && seatPattern.test(text) && rect.width >= 300 && rect.height >= 180 && rect.height <= 2600) {
        return current;
      }
    }

    const parent = card.parentElement;
    const siblingPanels = parent ? [...parent.children].filter((node) => {
      if (node === card || !visible(node)) return false;
      const text = String(node.innerText || "");
      const priceCount = (text.match(/(?:US\$|HK\$|USD|HKD|JPY|¥|￥|\$)\s*[\d,]+(?:\.\d{1,2})?/ig) || []).length;
      seatPattern.lastIndex = 0;
      return priceCount >= 1 && seatPattern.test(text);
    }) : [];
    if (siblingPanels.length) {
      const parentText = String(parent?.innerText || "");
      const parentPrices = (parentText.match(/(?:US\$|HK\$|USD|HKD|JPY|¥|￥|\$)\s*[\d,]+(?:\.\d{1,2})?/ig) || []).length;
      if (parentPrices >= 2) return parent;
      return siblingPanels[0];
    }

    // The three Klook fare cards can be rendered in a portal outside the
    // train-row subtree. Find the nearest visible container that owns all
    // three fare labels and prices so their categories are preserved.
    const cardRect = card.getBoundingClientRect();
    const related = [...document.querySelectorAll("article, section, ul, li, div")]
      .filter(visible)
      .map((node) => {
        const rect = node.getBoundingClientRect();
        const text = String(node.innerText || node.textContent || "");
        const priceCount = (text.match(/(?:US\$|HK\$|USD|HKD|JPY|CNY|RMB|¥|￥|\$)\s*[\d,]+(?:\.\d{1,2})?/ig) || []).length;
        seatPattern.lastIndex = 0;
        const verticalGap = rect.bottom < cardRect.top
          ? cardRect.top - rect.bottom
          : rect.top > cardRect.bottom ? rect.top - cardRect.bottom : 0;
        const horizontalGap = rect.right < cardRect.left
          ? cardRect.left - rect.right
          : rect.left > cardRect.right ? rect.left - cardRect.right : 0;
        return { node, rect, text, priceCount, verticalGap, horizontalGap, hasSeats: seatPattern.test(text) };
      })
      .filter((item) => item.hasSeats && item.priceCount >= 2 && item.text.length <= 9000)
      .filter((item) => item.rect.width >= 500 && item.rect.height >= 160 && item.rect.height <= 2200)
      .filter((item) => item.verticalGap <= 700 && item.horizontalGap <= 700)
      .sort((a, b) => {
        const score = (item) => item.verticalGap + item.horizontalGap + item.rect.width * item.rect.height / 100000;
        return score(a) - score(b);
      });
    return related[0]?.node || card;
  }

  function trainDetailFromCard(card) {
    const clocks = cardClockValues(card);
    if (clocks.length < 2) return null;
    const scope = expandedTrainScope(card);
    const cardLines = textLines(card);
    const scopeLines = textLines(scope);
    const lines = [...new Set([...cardLines, ...scopeLines])];
    const routeStations = routeStationsFromCard(card);
    const stationLines = [routeStations.departure, routeStations.arrival].filter(Boolean);
    const routeName = lines.find((line) => /(?:新干线|新幹線|nozomi|hikari|kodama|mizuho|sakura|hakutaka|tsurugi|kagayaki|yamabiko|hayabusa|komachi|toki|asama|shirasagi)\s*[|｜]?\s*[a-z]*\s*\d+/i.test(line)) || "";
    const trainNumber = (routeName.match(/(?:nozomi|hikari|kodama|mizuho|sakura|hakutaka|tsurugi|kagayaki|yamabiko|hayabusa|komachi|toki|asama|shirasagi)\s*\d+/i) || [""])[0];
    const seats = seatOptionDetails(scope);
    return {
      departureTime: clocks[0].value,
      arrivalTime: clocks[1].value,
      departureStation: stationLines[0] || "",
      arrivalStation: stationLines[1] || "",
      trainName: routeName,
      trainNumber,
      seats,
      sourceText: [...new Set([...textLines(card), ...textLines(scope)])].join("\n"),
    };
  }

  function extractExpandedTrainDetails(value, destination) {
    const wanted = trainTimeWindow(value);
    if (!wanted) return [];
    return allTrainCards()
      .map((card) => ({ card, detail: trainDetailFromCard(card) }))
      .filter((item) => item.detail)
      .filter((item) => {
        const minutes = minutesFromClock(item.detail.departureTime);
        return (wanted.unrestricted || (minutes >= wanted.start && minutes <= wanted.end))
          && cardMatchesDestination(item.card, destination);
      })
      .map((item) => item.detail);
  }

  function chineseMonthNumber(value) {
    const months = {
      "一": 1, "二": 2, "三": 3, "四": 4, "五": 5, "六": 6,
      "七": 7, "八": 8, "九": 9, "十": 10, "十一": 11, "十二": 12
    };
    return months[value] || Number(value) || 0;
  }

  function visibleMonthHeaders() {
    const result = [];
    for (const node of document.querySelectorAll("h1, h2, h3, h4, div, span, p")) {
      if (!visible(node)) continue;
      const text = String(node.textContent || "").replace(/[\u3000\s]+/g, "").trim();
      const match = text.match(/^(\d{4})年(一|二|三|四|五|六|七|八|九|十|十一|十二|\d{1,2})月$/);
      if (!match) continue;
      const rect = node.getBoundingClientRect();
      result.push({ node, year: Number(match[1]), month: chineseMonthNumber(match[2]), rect });
    }
    return result;
  }

  function monthSerial(year, month) {
    return year * 12 + month;
  }

  function klookCalendarRoot(anchor) {
    const headers = visibleMonthHeaders();
    let best = null;
    let bestArea = Infinity;

    for (const header of headers) {
      let parent = header.node.parentElement;
      for (let depth = 0; parent && depth < 8; depth += 1, parent = parent.parentElement) {
        const rect = parent.getBoundingClientRect();
        const containedHeaders = headers.filter((item) => parent.contains(item.node));
        const belowAnchor = !anchor || rect.bottom >= anchor.getBoundingClientRect().bottom - 20;
        if (containedHeaders.length >= 2 && rect.width >= 600 && rect.height >= 250 && belowAnchor) {
          const area = rect.width * rect.height;
          if (area < bestArea) {
            best = parent;
            bestArea = area;
          }
        }
      }
    }

    if (!best && headers.length === 1) {
      let parent = headers[0].node.parentElement;
      for (let depth = 0; parent && depth < 8; depth += 1, parent = parent.parentElement) {
        const rect = parent.getBoundingClientRect();
        const belowAnchor = !anchor || rect.bottom >= anchor.getBoundingClientRect().bottom - 20;
        if (rect.width >= 300 && rect.height >= 220 && belowAnchor) {
          const area = rect.width * rect.height;
          if (area < bestArea) {
            best = parent;
            bestArea = area;
          }
        }
      }
    }

    // Fallback for Klook variants that do not give the calendar a semantic
    // role or a stable class name. The month headings still identify it.
    return best || (headers.length >= 2 ? document.body : null);
  }

  function klookDatePanelBounds(root, targetHeader) {
    const headers = visibleMonthHeaders()
      .filter((header) => root.contains(header.node))
      .sort((a, b) => a.rect.left - b.rect.left);
    const targetCenter = center(targetHeader.rect).x;
    const previous = headers.filter((header) => center(header.rect).x < targetCenter).at(-1);
    const next = headers.find((header) => center(header.rect).x > targetCenter);
    const previousCenter = previous && center(previous.rect).x;
    const nextCenter = next && center(next.rect).x;
    const rootRect = root.getBoundingClientRect();
    const panelWidth = nextCenter
      ? nextCenter - targetCenter
      : previousCenter
        ? targetCenter - previousCenter
        : Math.min(700, rootRect.width);
    return {
      left: previous ? (previousCenter + targetCenter) / 2 : Math.max(rootRect.left, targetCenter - panelWidth / 2),
      right: next ? (targetCenter + nextCenter) / 2 : Math.min(rootRect.right, targetCenter + panelWidth / 2)
    };
  }

  function klookDateCell(parts, anchor) {
    const root = klookCalendarRoot(anchor);
    if (!root) return null;
    const targetHeader = visibleMonthHeaders().find((header) =>
      root.contains(header.node) && header.year === parts.year && header.month === parts.month
    );
    if (!targetHeader) return null;

    const bounds = klookDatePanelBounds(root, targetHeader);
    const candidates = [...root.querySelectorAll(
      '[data-date], [data-value], [role="gridcell"], [role="option"], button, td, [tabindex]'
    )].filter(visible);
    const wantedTexts = new Set([
      String(parts.day),
      normalize(parts.monthDay),
      normalize(parts.full),
      parts.iso
    ]);
    const textScope = root === document.body ? document : root;
    for (const node of textScope.querySelectorAll("div, span")) {
      const text = normalize(node.textContent || "");
      if (wantedTexts.has(text) && visible(node)) candidates.push(node);
    }
    let best = null;
    let bestScore = 0;

    for (const node of candidates) {
      const rect = node.getBoundingClientRect();
      const text = normalize([
        node.textContent,
        node.getAttribute("aria-label"),
        node.getAttribute("title"),
        node.getAttribute("data-date"),
        node.getAttribute("data-value")
      ].filter(Boolean).join(" "));
      if (!text || text.length > 80 || rect.left < bounds.left || rect.right > bounds.right) continue;
      if (node.getAttribute("aria-disabled") === "true" || node.disabled) continue;

      const exactDate = text.includes(parts.iso);
      const exactMonthDay = text === normalize(parts.monthDay) || text.startsWith(normalize(parts.monthDay));
      const exactDay = text === String(parts.day) || text.startsWith(`${parts.day} `);
      if (!exactDate && !exactMonthDay && !exactDay) continue;
      if (rect.top < targetHeader.rect.bottom - 10) continue;
      if (rect.top > targetHeader.rect.bottom + 700) continue;

      let score = exactDate ? 1000 : exactMonthDay ? 800 : 500;
      if (exactDay) score += 100;
      if (node.matches("[data-date], [data-value], [role=gridcell], button, td")) score += 200;
      score -= rect.width * rect.height / 1000;
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }

    if (!best) return null;
    return clickableAncestor(best);
  }

  function klookCoordinateDateCell(parts, anchor) {
    const root = klookCalendarRoot(anchor);
    if (!root) return null;
    const targetHeader = visibleMonthHeaders().find((header) =>
      root.contains(header.node) && header.year === parts.year && header.month === parts.month
    );
    if (!targetHeader) return null;

    const bounds = klookDatePanelBounds(root, targetHeader);
    const numericNodes = [...root.querySelectorAll("div, span, button, td, [role=gridcell], [tabindex]")]
      .filter(visible)
      .map((node) => ({ node, rect: node.getBoundingClientRect(), text: normalize(node.textContent || "") }))
      .filter(({ rect, text }) => {
        if (!/^\d{1,2}$/.test(text) || Number(text) < 1 || Number(text) > 31) return false;
        return rect.left >= bounds.left && rect.right <= bounds.right
          && rect.top >= targetHeader.rect.bottom - 10
          && rect.top <= targetHeader.rect.bottom + 700;
      });
    const rowCenters = [];
    for (const item of numericNodes.sort((a, b) => a.rect.top - b.rect.top)) {
      const y = center(item.rect).y;
      if (!rowCenters.some((existing) => Math.abs(existing - y) < 12)) rowCenters.push(y);
    }
    rowCenters.sort((a, b) => a - b);

    const firstWeekday = new Date(Date.UTC(parts.year, parts.month - 1, 1)).getUTCDay();
    const index = firstWeekday + parts.day - 1;
    const row = Math.floor(index / 7);
    const column = index % 7;
    const cellWidth = (bounds.right - bounds.left) / 7;
    const x = bounds.left + cellWidth * (column + 0.5);
    const y = rowCenters[row] || targetHeader.rect.bottom + 100 + row * 70;
    return document.elementFromPoint(x, y);
  }

  function clickKlookDateCell(option) {
    const rect = option.getBoundingClientRect();
    const point = center(rect);
    const hit = document.elementFromPoint(point.x, point.y);
    const target = hit && option.contains(hit) ? hit : option;
    for (const type of ["pointerdown", "mousedown", "pointerup", "mouseup", "click"]) {
      const EventClass = type.startsWith("pointer") ? PointerEvent : MouseEvent;
      target.dispatchEvent(new EventClass(type, { bubbles: true, cancelable: true, view: window }));
    }
  }

  function klookMonthArrow(direction, root) {
    const headers = visibleMonthHeaders().filter((header) => !root || root.contains(header.node));
    if (!headers.length) return null;
    const headerCenters = headers.map((header) => center(header.rect));
    const headingY = headerCenters.reduce((sum, point) => sum + point.y, 0) / headerCenters.length;
    const leftHeaderX = Math.min(...headerCenters.map((point) => point.x));
    const rightHeaderX = Math.max(...headerCenters.map((point) => point.x));
    const rootRect = root?.getBoundingClientRect?.() || document.documentElement.getBoundingClientRect();
    const scope = root === document.body ? document : root;
    const candidates = [...scope.querySelectorAll('button, [role="button"], [tabindex], [aria-label], [title]')]
      .filter(visible)
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width <= 120 && rect.height <= 120 && Math.abs(center(rect).y - headingY) < 110)
      .filter(({ rect }) => direction === "next" ? center(rect).x > rightHeaderX : center(rect).x < leftHeaderX);

    if (candidates.length) {
      candidates.sort((a, b) => direction === "next" ? b.rect.left - a.rect.left : a.rect.left - b.rect.left);
      return candidates[0].node;
    }

    const sortedX = headerCenters.map((point) => point.x).sort((a, b) => a - b);
    const monthGap = sortedX.length >= 2 ? sortedX[sortedX.length - 1] - sortedX[0] : 600;
    const calendarLeft = Math.max(rootRect.left, sortedX[0] - monthGap / 2);
    const calendarRight = Math.min(rootRect.right, sortedX[sortedX.length - 1] + monthGap / 2);
    const x = direction === "next" ? calendarRight - 35 : calendarLeft + 35;
    const hit = document.elementFromPoint(x, headingY);
    return hit?.closest?.('button, [role="button"], [tabindex]') || hit || null;
  }

  function monthArrow(direction) {
    const wanted = direction === "next"
      ? ["next", "\u4e0b\u4e00\u4e2a\u6708", "\u4e0b\u4e00\u6708", ">", "\u203a", "\u2192"]
      : ["previous", "prev", "\u4e0a\u4e00\u4e2a\u6708", "\u4e0a\u4e00\u6708", "<", "\u2039", "\u2190"];
    const nodes = [...document.querySelectorAll('button, [role="button"], [aria-label], [title]')].filter(visible);
    const labelled = nodes
      .map((node) => {
        const text = normalize([
          node.textContent,
          node.getAttribute("aria-label"),
          node.getAttribute("title")
        ].filter(Boolean).join(" "));
        const matched = wanted.some((item) => text === normalize(item) || text.includes(normalize(item)));
        const rect = node.getBoundingClientRect();
        return { node, matched, rect };
      })
      .filter((item) => item.matched)
      .sort((a, b) => (b.rect.width * b.rect.height) - (a.rect.width * a.rect.height))[0]?.node;
    if (labelled) return labelled;

    // Some Klook builds render chevrons as icon-only buttons without labels.
    // Use the calendar heading row to identify those two controls.
    const headers = visibleMonthHeaders();
    if (!headers.length) return null;
    const headingY = headers.reduce((sum, header) => sum + center(header.rect).y, 0) / headers.length;
    const iconButtons = [...document.querySelectorAll('button, [role="button"]')]
      .filter(visible)
      .map((node) => ({ node, rect: node.getBoundingClientRect() }))
      .filter(({ rect }) => rect.width <= 100 && rect.height <= 100 && Math.abs(center(rect).y - headingY) < 100);
    if (!iconButtons.length) return null;
    iconButtons.sort((a, b) => a.rect.left - b.rect.left);
    return direction === "next" ? iconButtons[iconButtons.length - 1].node : iconButtons[0].node;
  }

  function bestDateOption(parts, anchor) {
    return klookDateCell(parts, anchor);
  }

  async function chooseDate(parts, control) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const option = bestDateOption(parts, control);
      if (option) return option;

      const headers = visibleMonthHeaders();
      const visibleSerials = headers.map((header) => monthSerial(header.year, header.month));
      const targetSerial = monthSerial(parts.year, parts.month);
      if (!visibleSerials.length) break;

      const direction = targetSerial > Math.max(...visibleSerials) ? "next"
        : targetSerial < Math.min(...visibleSerials) ? "previous" : null;
      if (!direction) break;
      const arrow = klookMonthArrow(direction, klookCalendarRoot(control));
      if (!arrow) break;
      clickKlookDateCell(arrow);

      const beforeSignature = visibleSerials.join(",");
      let changed = false;
      for (let wait = 0; wait < 8; wait += 1) {
        await sleep(100);
        const afterSignature = visibleMonthHeaders().map((header) => monthSerial(header.year, header.month)).join(",");
        if (afterSignature && afterSignature !== beforeSignature) {
          changed = true;
          break;
        }
      }
      if (!changed) return null;
    }
    return null;
  }

  async function verifyDateApplied(parts, control) {
    const expected = [normalize(parts.iso), normalize(parts.monthDay), normalize(parts.full)];
    for (let attempt = 0; attempt < 30; attempt += 1) {
      const currentControl = dateTrigger() || control;
      const currentText = normalize([
        currentControl?.textContent,
        currentControl?.value,
        currentControl?.getAttribute?.("aria-label"),
        currentControl?.getAttribute?.("data-date")
      ].filter(Boolean).join(" "));
      const pageText = normalize(document.body?.innerText || "");
      const urlDate = new URL(window.location.href).searchParams.get("departure_date");
      if (expected.some((value) => currentText.includes(value) || pageText.includes(value)) || urlDate === parts.iso) return true;
      await sleep(150);
    }
    return false;
  }

  function setValue(el, value) {
    if (!el) return false;
    if (el.matches?.("input, textarea")) {
      const prototype = el.tagName.toLowerCase() === "textarea" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
      if (setter) setter.call(el, value);
      else el.value = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
      return true;
    }
    if (el.isContentEditable) {
      el.textContent = value;
      el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: value }));
      return true;
    }
    return false;
  }

  function editableNear(control, previousActive) {
    if (editable(control) && visible(control)) return control;
    const descendants = [...(control?.querySelectorAll?.(EDITABLE_SELECTOR) || [])].filter(visible);
    if (descendants.length) return descendants[0];
    const active = document.activeElement;
    if (editable(active) && visible(active) && (active !== previousActive || control.contains(active))) return active;
    const anchor = center(control.getBoundingClientRect());
    return [...document.querySelectorAll(EDITABLE_SELECTOR)]
      .filter(visible)
      .map((el) => {
        const point = center(el.getBoundingClientRect());
        const sameContainer = control.parentElement?.contains(el) ? 120 : 0;
        return { el, distance: Math.abs(point.x - anchor.x) + Math.abs(point.y - anchor.y) - sameContainer };
      })
      .sort((a, b) => a.distance - b.distance)[0]?.el || null;
  }

  function suggestionScore(node, query) {
    const text = normalize(node.textContent || node.getAttribute?.("aria-label") || "");
    const { root, station } = stationQuery(query);
    if (!text || !root || !text.includes(root)) return 0;
    if (routeLike(text)) return 0;

    const clickable = node.closest?.('button, [role="option"], [role="button"], li');
    const clickableText = normalize(clickable?.textContent || "");
    if (clickable && clickable !== node && clickableText.length > text.length && routeLike(clickableText)) return 0;

    let score = 40;
    if (text === station) score += 300;
    if (text.startsWith(station)) score += 180;
    if (text.includes(station)) score += 140;
    if (text.endsWith(normalize("\u7ad9"))) score += 40;
    score -= Math.max(0, text.length - station.length);
    return score;
  }

  function dropdownRoots(anchor) {
    const roots = [...document.querySelectorAll(DROPDOWN_SELECTOR)].filter(visible);
    const anchorRect = anchor?.getBoundingClientRect?.();
    return roots.filter((root) => {
      if (!anchorRect) return true;
      const rect = root.getBoundingClientRect();
      return rect.bottom >= anchorRect.top - 30 && rect.top <= anchorRect.bottom + 600;
    });
  }

  function bestSuggestion(query, anchor) {
    const roots = dropdownRoots(anchor);
    const anchorRect = anchor?.getBoundingClientRect?.();
    const pool = roots.length
      ? roots.flatMap((root) => [...root.querySelectorAll('[role="option"], li, button, [role="button"], div')])
      : [...document.querySelectorAll('[role="option"], li, button, div')].filter((node) => {
        if (!anchorRect || !visible(node)) return false;
        const rect = node.getBoundingClientRect();
        const belowAnchor = rect.top >= anchorRect.bottom - 5 && rect.top <= anchorRect.bottom + 600;
        const nearAnchor = rect.right >= anchorRect.left - 300 && rect.left <= anchorRect.right + 300;
        return belowAnchor && nearAnchor;
      });
    const seen = new Set();
    let best = null;
    let bestScore = 0;

    for (const node of pool) {
      if (seen.has(node) || !visible(node)) continue;
      seen.add(node);
      const text = normalize(node.textContent || node.getAttribute?.("aria-label") || "");
      if (!text || text.length > 160) continue;
      const score = suggestionScore(node, query);
      if (score > bestScore) {
        best = node;
        bestScore = score;
      }
    }
    return bestScore > 0 ? clickableAncestor(best) : null;
  }

  async function waitForEditableNear(control, previousActive) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const input = editableNear(control, previousActive);
      if (input) return input;
      await sleep(120);
    }
    return null;
  }

  async function fillAndSelect(kind, value) {
    const control = fieldFor(kind);
    if (!control) return { ok: false, reason: `${kind} field not found` };

    if (stationControlMatches(control, value)) {
      return { ok: true, selectedText: value, alreadySelected: true };
    }

    const previousActive = document.activeElement;
    control.scrollIntoView?.({ block: "center", inline: "nearest" });
    control.click();
    control.focus?.();
    await sleep(250);

    const input = await waitForEditableNear(control, previousActive);
    if (!input || !setValue(input, value)) {
      if (stationControlMatches(control, value)) {
        return { ok: true, selectedText: value, alreadySelected: true };
      }
      return { ok: false, reason: `${kind} input not found` };
    }
    input.focus?.();
    await sleep(650);

    const suggestion = bestSuggestion(value, input);
    if (suggestion) {
      const selectedText = (suggestion.textContent || suggestion.getAttribute("aria-label") || "").trim();
      suggestion.click();
      await sleep(350);
      return { ok: true, selectedText };
    }

    if (stationControlMatches(control, value)) {
      return { ok: true, selectedText: value, alreadySelected: true };
    }

    return { ok: false, reason: `${kind} station suggestion not found`, typed: value };
  }

  async function fillDate(value) {
    const parts = dateParts(value);
    if (!parts) return { ok: false, reason: "departure date is not ISO formatted" };

    const control = dateTrigger();
    if (!control) return { ok: false, reason: "departure date field not found" };

    control.scrollIntoView?.({ block: "center", inline: "nearest" });

    const directInput = editable(control) || [...control.querySelectorAll?.(EDITABLE_SELECTOR) || []].find(visible);
    if (directInput && directInput.matches?.('input[type="date"], input[type="text"], textarea')) {
      setValue(directInput, parts.iso);
      await sleep(300);
      const verified = await verifyDateApplied(parts, control);
      return verified
        ? { ok: true, selectedText: parts.iso }
        : { ok: true, selectedText: parts.iso, pendingSearchVerification: true };
    }

    control.click();
    control.focus?.();
    await sleep(650);

    const option = await Promise.race([
      chooseDate(parts, control),
      sleep(5000).then(() => null)
    ]);
    if (!option) return { ok: false, reason: `departure date option not found: ${parts.iso}` };
    const selectedText = (option.textContent || option.getAttribute("aria-label") || "").trim();
    clickKlookDateCell(option);
    let verified = await verifyDateApplied(parts, control);
    if (!verified) {
      const coordinateTarget = klookCoordinateDateCell(parts, control);
      if (coordinateTarget) {
        clickKlookDateCell(coordinateTarget);
        verified = await verifyDateApplied(parts, control);
      }
    }
    return verified
      ? { ok: true, selectedText }
      : { ok: true, selectedText, pendingSearchVerification: true };
  }

  async function applyParsedState(parsedState) {
    const result = {};
    if (parsedState?.origin) {
      result.origin = await fillAndSelect("origin", parsedState.origin);
      if (!result.origin.ok) return result;
    }
    if (parsedState?.destination) {
      result.destination = await fillAndSelect("destination", parsedState.destination);
      if (!result.destination.ok) return result;
      await sleep(500);
    }
    if (parsedState?.departureDate) {
      result.departureDate = await fillDate(parsedState.departureDate);
      if (!result.departureDate.ok) return result;
    }
    const departureTime = parsedState?.departureTime || "全天";
    result.departureTime = await applyDepartureTime(departureTime);
    if (!result.departureTime.ok) {
      result.search = { ok: false, reason: "departure time filter was not completed; search was not clicked" };
      result.trainDetails = { ok: true, details: [] };
      return result;
    }

    // Search is the explicit commit step after all route/date/time filters.
    await sleep(700);
    result.search = await clickKlookSearch(parsedState?.destination || "");
    if (!result.search.ok) {
      result.departureTrains = {
        ok: false,
        reason: result.search.reason || "Klook search was not completed",
      };
      result.trainDetails = { ok: true, details: [] };
      return result;
    }

    if (parsedState?.departureDate) {
      const parts = dateParts(parsedState.departureDate);
      const dateVerified = parts && await verifyDateApplied(parts, null);
      result.search.dateVerified = Boolean(dateVerified);
      if (!dateVerified) {
        result.departureTrains = {
          ok: false,
          reason: `Klook date was not updated after Search: ${parsedState.departureDate}`,
        };
        result.trainDetails = { ok: true, details: [] };
        return result;
      }
    }

    await sleep(1200);
    result.departureTrains = await expandMatchingTrainCards(departureTime, parsedState?.destination || "");
    await sleep(700);
    const scannedDetails = extractExpandedTrainDetails(departureTime, parsedState?.destination || "");
    const detailMap = new Map();
    for (const detail of [
      ...(result.departureTrains.expandedDetails || []),
      ...scannedDetails,
    ]) {
      const key = `${detail.departureTime}|${detail.arrivalTime}|${detail.trainNumber}|${detail.trainName}`;
      if (!detailMap.has(key)) detailMap.set(key, detail);
    }
    result.trainDetails = {
      ok: true,
      details: [...detailMap.values()],
    };
    return result;
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "get-shinkansen-train-details") {
      sendResponse({ ok: true, details: extractExpandedTrainDetails(message.departureTime || "全天", message.destination || "") });
      return true;
    }
    if (message?.type !== "apply-shinkansen-fields") return false;
    applyParsedState(message.parsedState)
      .then((result) => {
        const ok = Object.values(result).every((item) => item?.ok);
        const firstFailure = Object.values(result).find((item) => !item?.ok);
        sendResponse({ ok, result, reason: firstFailure?.reason });
      })
      .catch((error) => sendResponse({ ok: false, error: error?.message || String(error) }));
    return true;
  });
})();
