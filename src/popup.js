(function () {
  "use strict";

  const fields = ["enabled", "smoothScroll", "hintsEnabled"];
  const keys = document.getElementById("keys");
  let activeHost = "";
  const THEME_STORAGE_KEY = "newtabTheme";
  const DEFAULT_THEME = "dark";
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

  chrome.storage.sync.get({
    settings: VIMDECK_DEFAULTS,
    [THEME_STORAGE_KEY]: DEFAULT_THEME
  }, (data) => {
    setTheme(data[THEME_STORAGE_KEY]);
    const settings = mergeSettings(data.settings);
    fields.forEach((field) => {
      const input = document.getElementById(field);
      input.checked = Boolean(settings[field]);
      input.addEventListener("change", () => saveField(field, input.checked));
    });
    renderKeys(settings.keymap);
    setupSiteToggle(settings);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes[THEME_STORAGE_KEY]) return;
    setTheme(changes[THEME_STORAGE_KEY].newValue);
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

  function setupSiteToggle(settings) {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const url = tabs && tabs[0] && tabs[0].url;
      let parsed = null;
      try {
        parsed = url ? new URL(url) : null;
      } catch (error) {
        parsed = null;
      }
      if (!parsed || !/^https?:$/.test(parsed.protocol)) return;

      activeHost = parsed.hostname;
      const input = document.getElementById("disableSite");
      document.getElementById("siteToggleLabel").textContent = `Disable on ${activeHost}`;
      // Reflect any matching pattern (wildcard/path included), not just a bare
      // hostname entry, so the checkbox agrees with what content.js actually does.
      input.checked = vimdeckMatchesDisabledSite(url, settings.disabledSites);
      document.getElementById("siteToggle").hidden = false;
      input.addEventListener("change", () => toggleSite(input.checked));
    });
  }

  function toggleSite(disable) {
    chrome.storage.sync.get({ settings: VIMDECK_DEFAULTS }, (data) => {
      const settings = mergeSettings(data.settings);
      const sites = new Set(settings.disabledSites);
      if (disable) {
        sites.add(activeHost);
      } else {
        sites.delete(activeHost);
      }
      chrome.storage.sync.set({
        settings: { ...settings, disabledSites: Array.from(sites) }
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

  function setTheme(value) {
    document.documentElement.dataset.theme = value === "light" ? "light" : "dark";
  }

  function displayKey(key) {
    if (key === "Escape") return "Esc";
    if (key.length === 1 && key === key.toUpperCase() && key !== key.toLowerCase()) {
      return `Shift+${key}`;
    }
    return key;
  }
})();
