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
    hintLayer: null
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
    if (action === "closeTab") closeCurrentTab();
    if (action === "hints" && state.settings.hintsEnabled) showHints();
  }

  function closeCurrentTab() {
    chrome.runtime.sendMessage({ type: "VIBE_VIM_CLOSE_TAB" });
  }

  function showHints() {
    clearHints();
    const targets = findHintTargets();
    if (!targets.length) return;

    state.hintLayer = document.createElement("div");
    state.hintLayer.className = "vibe-vim-hint-layer";
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
})();
