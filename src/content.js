(function () {
  "use strict";

  const DEFAULTS = {
    enabled: true,
    smoothScroll: true,
    scrollStep: 80,
    halfPageRatio: 0.5,
    hintsEnabled: true,
    keymap: {
      scrollDown: "j",
      scrollUp: "k",
      scrollLeft: "h",
      scrollRight: "l",
      top: "gg",
      bottom: "G",
      pageDown: "d",
      pageUp: "u",
      hints: "f",
      goBack: "H",
      goForward: "L",
      help: "?",
      openTab: "t",
      closeTab: "x",
      cancel: "Escape"
    }
  };

  const HINT_CHARS = "asdfghjklqwertyuiopzxcvbnm";
  const state = {
    settings: DEFAULTS,
    sequence: "",
    sequenceTimer: 0,
    hints: [],
    hintQuery: "",
    hintLayer: null,
    helpLayer: null
  };

  loadSettings();
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes.settings) return;
    state.settings = mergeSettings(changes.settings.newValue || {});
    clearHints();
  });

  window.addEventListener("keydown", onKeyDown, true);

  function loadSettings() {
    chrome.storage.sync.get({ settings: DEFAULTS }, (data) => {
      state.settings = mergeSettings(data.settings);
    });
  }

  function mergeSettings(settings) {
    return {
      ...DEFAULTS,
      ...settings,
      keymap: {
        ...DEFAULTS.keymap,
        ...(settings && settings.keymap ? settings.keymap : {})
      }
    };
  }

  function onKeyDown(event) {
    if (!state.settings.enabled || event.defaultPrevented) return;

    if (state.hintLayer) {
      handleHintKey(event);
      return;
    }

    if (state.helpLayer) {
      handleHelpKey(event);
      return;
    }

    if (shouldIgnoreEvent(event)) return;

    const key = normalizeKey(event);
    const action = resolveAction(key);
    if (!action) return;

    event.preventDefault();
    event.stopPropagation();
    runAction(action);
  }

  function shouldIgnoreEvent(event) {
    if (event.altKey || event.ctrlKey || event.metaKey) return true;
    const active = document.activeElement;
    if (!active) return false;
    if (active.isContentEditable) return true;
    const tagName = active.tagName ? active.tagName.toLowerCase() : "";
    if (tagName === "textarea" || tagName === "select") return true;
    if (tagName !== "input") return false;
    const type = (active.getAttribute("type") || "text").toLowerCase();
    return !["button", "checkbox", "radio", "range", "reset", "submit"].includes(type);
  }

  function normalizeKey(event) {
    if (event.key === " ") return "Space";
    return event.key;
  }

  function resolveAction(key) {
    const keymap = state.settings.keymap;
    if (key === keymap.top[0] && keymap.top.length > 1) {
      state.sequence += key;
      window.clearTimeout(state.sequenceTimer);
      state.sequenceTimer = window.setTimeout(() => {
        state.sequence = "";
      }, 700);

      if (state.sequence === keymap.top) {
        state.sequence = "";
        return "top";
      }
      return null;
    }

    state.sequence = "";
    if (key === keymap.help) return "help";
    return Object.entries(keymap).find(([, mappedKey]) => mappedKey === key)?.[0] || null;
  }

  function runAction(action) {
    const behavior = state.settings.smoothScroll ? "smooth" : "auto";
    const step = Number(state.settings.scrollStep) || DEFAULTS.scrollStep;
    const halfPage = Math.floor(window.innerHeight * state.settings.halfPageRatio);

    if (action === "scrollDown") window.scrollBy({ top: step, behavior });
    if (action === "scrollUp") window.scrollBy({ top: -step, behavior });
    if (action === "scrollLeft") window.scrollBy({ left: -step, behavior });
    if (action === "scrollRight") window.scrollBy({ left: step, behavior });
    if (action === "top") window.scrollTo({ top: 0, behavior });
    if (action === "bottom") window.scrollTo({ top: document.documentElement.scrollHeight, behavior });
    if (action === "pageDown") window.scrollBy({ top: halfPage, behavior });
    if (action === "pageUp") window.scrollBy({ top: -halfPage, behavior });
    if (action === "goBack") window.history.back();
    if (action === "goForward") window.history.forward();
    if (action === "help") showHelp();
    if (action === "openTab") openNewTab();
    if (action === "closeTab") closeCurrentTab();
    if (action === "hints" && state.settings.hintsEnabled) showHints();
  }

  function showHelp() {
    clearHelp();

    const overlay = document.createElement("div");
    const dialog = document.createElement("section");
    const heading = document.createElement("div");
    const title = document.createElement("h2");
    const close = document.createElement("button");
    const grid = document.createElement("div");

    overlay.className = "vimdeck-help-layer";
    overlay.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "display:grid",
      "place-items:center",
      "padding:24px",
      "background:rgba(9,11,12,.72)",
      "font:14px/1.4 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"
    ].join(";");

    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "vimdeck-help-title");
    dialog.style.cssText = [
      "width:min(560px,100%)",
      "max-height:min(720px,calc(100vh - 48px))",
      "overflow:auto",
      "border:1px solid #303836",
      "border-radius:8px",
      "background:#15191a",
      "color:#e8ece7",
      "box-shadow:0 24px 90px rgba(0,0,0,.58)"
    ].join(";");

    heading.style.cssText = [
      "display:flex",
      "align-items:center",
      "justify-content:space-between",
      "gap:16px",
      "padding:18px 18px 10px"
    ].join(";");

    title.id = "vimdeck-help-title";
    title.textContent = "Mapped Keys";
    title.style.cssText = "margin:0;color:#f5f0df;font-size:18px;line-height:1.2";

    close.type = "button";
    close.textContent = "x";
    close.setAttribute("aria-label", "Close help");
    close.style.cssText = [
      "display:grid",
      "width:30px",
      "height:30px",
      "place-items:center",
      "border:1px solid #303836",
      "border-radius:7px",
      "background:#171c1d",
      "color:#8d9691",
      "font:700 15px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace",
      "cursor:pointer"
    ].join(";");
    close.addEventListener("click", clearHelp);

    grid.style.cssText = [
      "display:grid",
      "grid-template-columns:1fr",
      "gap:8px",
      "padding:8px 18px 18px"
    ].join(";");

    helpRows().forEach(({ key, label }) => {
      const row = document.createElement("div");
      const keyEl = document.createElement("kbd");
      const labelEl = document.createElement("span");

      row.style.cssText = [
        "display:flex",
        "align-items:center",
        "justify-content:space-between",
        "gap:16px",
        "min-height:38px",
        "border:1px solid #303836",
        "border-radius:7px",
        "padding:8px 10px",
        "background:#171c1d"
      ].join(";");

      keyEl.textContent = displayKey(key);
      keyEl.style.cssText = [
        "min-width:54px",
        "border-radius:5px",
        "padding:5px 8px",
        "background:#242b2a",
        "color:#91d18b",
        "text-align:center",
        "font:700 13px/1 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"
      ].join(";");

      labelEl.textContent = label;
      labelEl.style.cssText = "color:#d4dad6;text-align:right";

      row.append(keyEl, labelEl);
      grid.appendChild(row);
    });

    heading.append(title, close);
    dialog.append(heading, grid);
    overlay.appendChild(dialog);
    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) clearHelp();
    });

    state.helpLayer = overlay;
    document.documentElement.appendChild(overlay);
    close.focus({ preventScroll: true });
  }

  function helpRows() {
    const keymap = state.settings.keymap;
    const labels = {
      scrollDown: "Scroll down",
      scrollUp: "Scroll up",
      scrollLeft: "Scroll left",
      scrollRight: "Scroll right",
      top: "Top of page",
      bottom: "Bottom of page",
      pageDown: "Half page down",
      pageUp: "Half page up",
      hints: "Open link hints",
      goBack: "History back",
      goForward: "History forward",
      help: "Open help",
      openTab: "Open new tab",
      closeTab: "Close tab",
      cancel: "Close modal / cancel"
    };

    return Object.entries(labels).map(([action, label]) => ({
      key: keymap[action],
      label
    })).filter((row) => row.key);
  }

  function displayKey(key) {
    if (key === "G") return "Shift+G";
    if (key === "L") return "Shift+L";
    if (key === "Escape") return "Esc";
    return key;
  }

  function openNewTab() {
    chrome.runtime.sendMessage({ type: "VIMDECK_OPEN_TAB" });
  }

  function closeCurrentTab() {
    chrome.runtime.sendMessage({ type: "VIMDECK_CLOSE_TAB" });
  }

  function showHints() {
    clearHints();
    const targets = findHintTargets();
    if (!targets.length) return;

    state.hintLayer = document.createElement("div");
    state.hintLayer.className = "vimdeck-hint-layer";
    state.hintLayer.style.cssText = [
      "position:fixed",
      "inset:0",
      "z-index:2147483647",
      "pointer-events:none",
      "font:700 12px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace"
    ].join(";");
    document.documentElement.appendChild(state.hintLayer);

    const labelLength = hintLabelLength(targets.length);
    state.hints = targets.map((target, index) => {
      const rect = target.getBoundingClientRect();
      const label = labelForIndex(index, labelLength);
      const marker = document.createElement("span");
      marker.textContent = label;
      marker.style.cssText = [
        "position:fixed",
        `left:${Math.max(0, rect.left)}px`,
        `top:${Math.max(0, rect.top)}px`,
        "transform:translateY(-100%)",
        "background:#ffd84d",
        "color:#111827",
        "border:1px solid #111827",
        "border-radius:3px",
        "padding:1px 4px",
        "box-shadow:0 1px 3px rgba(0,0,0,.25)"
      ].join(";");
      state.hintLayer.appendChild(marker);
      return { label, marker, target };
    });
  }

  function findHintTargets() {
    const selector = [
      "a[href]",
      "button",
      "input:not([type='hidden'])",
      "textarea",
      "select",
      "[role='button']",
      "[tabindex]:not([tabindex='-1'])"
    ].join(",");

    return Array.from(document.querySelectorAll(selector)).filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= window.innerHeight &&
        rect.left <= window.innerWidth &&
        style.visibility !== "hidden" &&
        style.display !== "none";
    }).slice(0, 512);
  }

  function hintLabelLength(count) {
    let length = 1;
    let capacity = HINT_CHARS.length;
    while (capacity < count) {
      length += 1;
      capacity *= HINT_CHARS.length;
    }
    return length;
  }

  function labelForIndex(index, length) {
    const base = HINT_CHARS.length;
    let value = index;
    let label = "";
    while (label.length < length) {
      label = HINT_CHARS[value % base] + label;
      value = Math.floor(value / base);
    }
    return label;
  }

  function handleHintKey(event) {
    const key = normalizeKey(event);
    event.preventDefault();
    event.stopPropagation();

    if (key === state.settings.keymap.cancel) {
      clearHints();
      return;
    }

    if (key === "Backspace") {
      state.hintQuery = state.hintQuery.slice(0, -1);
      updateHintVisibility();
      return;
    }

    if (!HINT_CHARS.includes(key.toLowerCase())) return;
    state.hintQuery += key.toLowerCase();
    updateHintVisibility();

    const exact = state.hints.find((hint) => hint.label === state.hintQuery);
    if (exact && state.hintQuery.length === exact.label.length) {
      activateHint(exact.target);
      clearHints();
    }
  }

  function handleHelpKey(event) {
    const key = normalizeKey(event);
    event.preventDefault();
    event.stopPropagation();

    if (key === state.settings.keymap.cancel || key === state.settings.keymap.help) {
      clearHelp();
    }
  }

  function updateHintVisibility() {
    const matches = state.hints.filter((hint) => hint.label.startsWith(state.hintQuery));
    state.hints.forEach((hint) => {
      hint.marker.style.display = matches.includes(hint) ? "" : "none";
    });
    if (!matches.length) {
      clearHints();
    }
  }

  function activateHint(target) {
    target.scrollIntoView({ block: "center", inline: "center" });
    target.focus({ preventScroll: true });
    target.click();
  }

  function clearHints() {
    if (state.hintLayer) state.hintLayer.remove();
    state.hints = [];
    state.hintQuery = "";
    state.hintLayer = null;
  }

  function clearHelp() {
    if (state.helpLayer) state.helpLayer.remove();
    state.helpLayer = null;
  }
})();
