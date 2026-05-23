(function () {
  "use strict";

  const STORAGE_KEY = "newtabShortcuts";
  const DEFAULT_SHORTCUTS = [
    { name: "GitHub", url: "https://github.com" },
    { name: "Docs", url: "https://developer.mozilla.org" }
  ];

  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const shortcutDialog = document.getElementById("shortcutDialog");
  const shortcutForm = document.getElementById("shortcutForm");
  const openShortcutDialog = document.getElementById("openShortcutDialog");
  const closeShortcutDialog = document.getElementById("closeShortcutDialog");
  const cancelShortcutDialog = document.getElementById("cancelShortcutDialog");
  const shortcutGrid = document.getElementById("shortcutGrid");
  const shortcutName = document.getElementById("shortcutName");
  const shortcutUrl = document.getElementById("shortcutUrl");
  const shortcutCount = document.getElementById("shortcutCount");
  const emptyState = document.getElementById("emptyState");

  let shortcuts = [];

  loadShortcuts();

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const target = targetFromQuery(searchInput.value);
    if (target) window.location.href = target;
  });

  shortcutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addShortcut();
  });

  openShortcutDialog.addEventListener("click", () => {
    shortcutDialog.showModal();
    shortcutName.focus();
  });

  closeShortcutDialog.addEventListener("click", closeDialog);
  cancelShortcutDialog.addEventListener("click", closeDialog);

  shortcutDialog.addEventListener("click", (event) => {
    if (event.target === shortcutDialog) closeDialog();
  });

  window.addEventListener("keydown", (event) => {
    if (event.key === "/" && !isTypingTarget(event.target)) {
      event.preventDefault();
      searchInput.focus();
      return;
    }

    if (event.key === "Escape" && isTypingTarget(event.target)) {
      event.target.blur();
    }
  });

  shortcutGrid.addEventListener("click", (event) => {
    const removeButton = event.target.closest("[data-remove]");
    if (!removeButton) return;
    event.preventDefault();
    removeShortcut(removeButton.dataset.remove);
  });

  function loadShortcuts() {
    chrome.storage.sync.get({ [STORAGE_KEY]: DEFAULT_SHORTCUTS }, (data) => {
      shortcuts = normalizeShortcuts(data[STORAGE_KEY]);
      renderShortcuts();
    });
  }

  function saveShortcuts() {
    chrome.storage.sync.set({ [STORAGE_KEY]: shortcuts }, renderShortcuts);
  }

  function addShortcut() {
    const name = shortcutName.value.trim();
    const url = normalizeUrl(shortcutUrl.value.trim());
    if (!name || !url) return;

    shortcuts = [
      ...shortcuts.filter((shortcut) => shortcut.url !== url),
      { name, url }
    ].slice(-12);

    shortcutForm.reset();
    saveShortcuts();
    closeDialog();
  }

  function removeShortcut(url) {
    shortcuts = shortcuts.filter((shortcut) => shortcut.url !== url);
    saveShortcuts();
  }

  function renderShortcuts() {
    shortcutGrid.replaceChildren();
    emptyState.hidden = shortcuts.length > 0;
    shortcutCount.textContent = `${shortcuts.length} ${shortcuts.length === 1 ? "mark" : "marks"}`;

    shortcuts.forEach((shortcut) => {
      const tile = document.createElement("article");
      const link = document.createElement("a");
      const key = document.createElement("span");
      const text = document.createElement("span");
      const name = document.createElement("strong");
      const host = document.createElement("small");
      const remove = document.createElement("button");

      tile.className = "shortcut-tile";
      link.className = "shortcut-link";
      link.href = shortcut.url;
      key.className = "shortcut-key";
      key.textContent = shortcut.name.slice(0, 1).toLowerCase() || ":";
      text.className = "shortcut-text";
      name.textContent = shortcut.name;
      host.textContent = hostFromUrl(shortcut.url);
      remove.className = "shortcut-remove";
      remove.type = "button";
      remove.textContent = "x";
      remove.title = `Remove ${shortcut.name}`;
      remove.setAttribute("aria-label", `Remove ${shortcut.name}`);
      remove.dataset.remove = shortcut.url;

      text.append(name, host);
      link.append(key, text);
      tile.append(link, remove);
      shortcutGrid.appendChild(tile);
    });
  }

  function normalizeShortcuts(value) {
    if (!Array.isArray(value)) return DEFAULT_SHORTCUTS;
    return value
      .map((shortcut) => ({
        name: String(shortcut.name || "").trim(),
        url: normalizeUrl(String(shortcut.url || "").trim())
      }))
      .filter((shortcut) => shortcut.name && shortcut.url)
      .slice(0, 12);
  }

  function targetFromQuery(query) {
    const trimmed = query.trim();
    if (!trimmed) return "";
    const url = normalizeUrl(trimmed);
    if (looksLikeUrl(trimmed) && url) return url;
    return `https://www.google.com/search?q=${encodeURIComponent(trimmed)}`;
  }

  function normalizeUrl(value) {
    if (!value) return "";
    const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value);
    const localHost = value.startsWith("localhost") || value.startsWith("127.0.0.1");
    const candidate = hasScheme ? value : `${localHost ? "http" : "https"}://${value}`;
    try {
      return new URL(candidate).href;
    } catch (_error) {
      return "";
    }
  }

  function looksLikeUrl(value) {
    return /^[a-z][a-z0-9+.-]*:\/\//i.test(value) || value.includes(".") || value.startsWith("localhost");
  }

  function hostFromUrl(url) {
    try {
      return new URL(url).host.replace(/^www\./, "");
    } catch (_error) {
      return url;
    }
  }

  function closeDialog() {
    shortcutForm.reset();
    shortcutDialog.close();
    openShortcutDialog.focus();
  }

  function isTypingTarget(target) {
    if (!target) return false;
    if (target.isContentEditable) return true;
    const tagName = target.tagName ? target.tagName.toLowerCase() : "";
    return tagName === "input" || tagName === "textarea" || tagName === "select";
  }
})();
