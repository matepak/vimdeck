(function () {
  "use strict";

  const fields = ["enabled", "smoothScroll", "hintsEnabled"];

  chrome.storage.sync.get({ settings: VIBE_VIM_DEFAULTS }, (data) => {
    const settings = { ...VIBE_VIM_DEFAULTS, ...(data.settings || {}) };
    fields.forEach((field) => {
      const input = document.getElementById(field);
      input.checked = Boolean(settings[field]);
      input.addEventListener("change", () => saveField(field, input.checked));
    });
  });

  function saveField(field, value) {
    chrome.storage.sync.get({ settings: VIBE_VIM_DEFAULTS }, (data) => {
      chrome.storage.sync.set({
        settings: {
          ...VIBE_VIM_DEFAULTS,
          ...(data.settings || {}),
          [field]: value
        }
      });
    });
  }
})();
