(function () {
  "use strict";

  const form = document.getElementById("optionsForm");
  const keymapContainer = document.getElementById("keymap");
  const status = document.getElementById("status");
  const reset = document.getElementById("reset");
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
  load();

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    save();
  });

  reset.addEventListener("click", () => {
    chrome.storage.sync.set({ settings: VIBE_VIM_DEFAULTS }, () => {
      load();
      flash("Reset");
    });
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
    chrome.storage.sync.get({ settings: VIBE_VIM_DEFAULTS }, (data) => {
      const settings = mergeSettings(data.settings);
      form.scrollStep.value = settings.scrollStep;
      form.halfPageRatio.value = settings.halfPageRatio;
      Object.keys(keyNames).forEach((name) => {
        document.getElementById(`key-${name}`).value = settings.keymap[name];
      });
    });
  }

  function save() {
    const keymap = {};
    Object.keys(keyNames).forEach((name) => {
      keymap[name] = document.getElementById(`key-${name}`).value.trim();
    });

    chrome.storage.sync.get({ settings: VIBE_VIM_DEFAULTS }, (data) => {
      const existing = mergeSettings(data.settings);
      chrome.storage.sync.set({
        settings: {
          ...existing,
          scrollStep: Number(form.scrollStep.value),
          halfPageRatio: Number(form.halfPageRatio.value),
          keymap
        }
      }, () => flash("Saved"));
    });
  }

  function mergeSettings(settings) {
    return {
      ...VIBE_VIM_DEFAULTS,
      ...(settings || {}),
      keymap: {
        ...VIBE_VIM_DEFAULTS.keymap,
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
