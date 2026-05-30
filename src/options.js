(function () {
  "use strict";

  const form = document.getElementById("optionsForm");
  const keymapContainer = document.getElementById("keymap");
  const status = document.getElementById("status");
  const reset = document.getElementById("reset");
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-value]"));
  const THEME_STORAGE_KEY = "newtabTheme";
  const DEFAULT_THEME = "dark";
  const keyNames = {
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
    cancel: "Cancel"
  };

  renderKeymap();
  loadTheme();
  load();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    save();
  });

  reset.addEventListener("click", () => {
    chrome.storage.sync.set({ settings: VIMDECK_DEFAULTS }, () => {
      load();
      flash("Reset");
    });
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => saveTheme(button.dataset.themeValue));
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes[THEME_STORAGE_KEY]) return;
    setTheme(changes[THEME_STORAGE_KEY].newValue);
  });

  function renderKeymap() {
    Object.entries(keyNames).forEach(([name, labelText]) => {
      const label = document.createElement("label");
      const span = document.createElement("span");
      const input = document.createElement("input");
      span.textContent = labelText;
      input.id = `key-${name}`;
      input.name = name;
      input.maxLength = 12;
      label.append(span, input);
      keymapContainer.appendChild(label);
    });
  }

  function load() {
    chrome.storage.sync.get({ settings: VIMDECK_DEFAULTS }, (data) => {
      const settings = mergeSettings(data.settings);
      form.scrollStep.value = settings.scrollStep;
      form.halfPageRatio.value = settings.halfPageRatio;
      Object.keys(keyNames).forEach((name) => {
        document.getElementById(`key-${name}`).value = settings.keymap[name];
      });
      form.disabledSites.value = settings.disabledSites.join("\n");
    });
  }

  function loadTheme() {
    chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME }, (data) => {
      setTheme(data[THEME_STORAGE_KEY]);
    });
  }

  function saveTheme(value) {
    setTheme(value);
    chrome.storage.sync.set({ [THEME_STORAGE_KEY]: currentTheme(value) });
  }

  function setTheme(value) {
    const theme = currentTheme(value);
    document.documentElement.dataset.theme = theme;
    themeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeValue === theme));
    });
  }

  function currentTheme(value) {
    return value === "light" ? "light" : "dark";
  }

  function save() {
    const keymap = {};
    Object.keys(keyNames).forEach((name) => {
      keymap[name] = document.getElementById(`key-${name}`).value.trim();
    });

    const disabledSites = form.disabledSites.value
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    chrome.storage.sync.get({ settings: VIMDECK_DEFAULTS }, (data) => {
      const existing = mergeSettings(data.settings);
      chrome.storage.sync.set({
        settings: {
          ...existing,
          scrollStep: Number(form.scrollStep.value),
          halfPageRatio: Number(form.halfPageRatio.value),
          disabledSites,
          keymap
        }
      }, () => flash("Saved"));
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

  function flash(message) {
    status.textContent = message;
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => {
      status.textContent = "";
    }, 1600);
  }
})();
