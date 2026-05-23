(function () {
  "use strict";

  const fields = ["enabled", "smoothScroll", "hintsEnabled"];
  const keys = document.getElementById("keys");
  const actionLabels = {
    scrollDown: "Down",
    scrollUp: "Up",
    scrollLeft: "Left",
    scrollRight: "Right",
    top: "Top",
    bottom: "Bottom",
    pageDown: "Page down",
    pageUp: "Page up",
    hints: "Hints",
    goBack: "Back",
    goForward: "Forward",
    help: "Help",
    openTab: "New tab",
    closeTab: "Close tab",
    cancel: "Cancel"
  };

  chrome.storage.sync.get({ settings: VIMDECK_DEFAULTS }, (data) => {
    const settings = mergeSettings(data.settings);
    fields.forEach((field) => {
      const input = document.getElementById(field);
      input.checked = Boolean(settings[field]);
      input.addEventListener("change", () => saveField(field, input.checked));
    });
    renderKeys(settings.keymap);
  });

  function saveField(field, value) {
    chrome.storage.sync.get({ settings: VIMDECK_DEFAULTS }, (data) => {
      chrome.storage.sync.set({
        settings: {
          ...VIMDECK_DEFAULTS,
          ...(data.settings || {}),
          [field]: value
        }
      });
    });
  }

  function renderKeys(keymap) {
    keys.replaceChildren();
    Object.entries(actionLabels).forEach(([action, label]) => {
      const mappedKey = keymap[action];
      if (!mappedKey) return;

      const row = document.createElement("div");
      const key = document.createElement("kbd");
      const text = document.createElement("span");
      key.textContent = displayKey(mappedKey);
      text.textContent = label;
      row.append(key, text);
      keys.appendChild(row);
    });
  }

  function mergeSettings(settings) {
    return {
      ...VIMDECK_DEFAULTS,
      ...(settings || {}),
      keymap: {
        ...VIMDECK_DEFAULTS.keymap,
        ...((settings && settings.keymap) || {})
      }
    };
  }

  function displayKey(key) {
    if (key === "Escape") return "Esc";
    if (key.length === 1 && key === key.toUpperCase() && key !== key.toLowerCase()) {
      return `Shift+${key}`;
    }
    return key;
  }
})();
