(function () {
  "use strict";

  const SHORTCUTS_STORAGE_KEY = "newtabShortcuts";
  const THEME_STORAGE_KEY = "newtabTheme";
  const DEFAULT_THEME = "dark";
  const DEFAULT_SHORTCUTS = [
    { name: "GitHub", url: "https://github.com" },
    { name: "Docs", url: "https://developer.mozilla.org" }
  ];

  const searchForm = document.getElementById("searchForm");
  const searchInput = document.getElementById("searchInput");
  const themeButtons = Array.from(document.querySelectorAll("[data-theme-value]"));
  const shortcutDialog = document.getElementById("shortcutDialog");
  const shortcutForm = document.getElementById("shortcutForm");
  const toggleShortcutEditing = document.getElementById("toggleShortcutEditing");
  const openShortcutDialog = document.getElementById("openShortcutDialog");
  const closeShortcutDialog = document.getElementById("closeShortcutDialog");
  const cancelShortcutDialog = document.getElementById("cancelShortcutDialog");
  const shortcutGrid = document.getElementById("shortcutGrid");
  const shortcutDialogTitle = document.getElementById("shortcutDialogTitle");
  const shortcutName = document.getElementById("shortcutName");
  const shortcutUrl = document.getElementById("shortcutUrl");
  const saveShortcut = document.getElementById("saveShortcut");
  const shortcutCount = document.getElementById("shortcutCount");
  const emptyState = document.getElementById("emptyState");

  let shortcuts = [];
  let theme = DEFAULT_THEME;
  let shortcutEditing = false;
  let editingShortcutUrl = "";

  loadTheme();
  loadShortcuts();

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync" || !changes[THEME_STORAGE_KEY]) return;
    setTheme(changes[THEME_STORAGE_KEY].newValue);
  });

  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const target = targetFromQuery(searchInput.value);
    if (target) window.location.href = target;
  });

  shortcutForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveShortcutFromForm();
  });

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => saveTheme(button.dataset.themeValue));
  });

  toggleShortcutEditing.addEventListener("click", () => {
    setShortcutEditing(!shortcutEditing);
  });

  openShortcutDialog.addEventListener("click", () => {
    openAddShortcutDialog();
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
    if (removeButton) {
      event.preventDefault();
      if (!shortcutEditing) return;
      removeShortcut(removeButton.dataset.remove);
      return;
    }

    const tile = event.target.closest("[data-shortcut-url]");
    if (tile && shortcutEditing) {
      event.preventDefault();
      openEditShortcutDialog(tile.dataset.shortcutUrl);
    }
  });

  shortcutGrid.addEventListener("dragstart", (event) => {
    const tile = event.target.closest("[data-shortcut-url]");
    if (!tile || event.target.closest("button")) return;
    tile.classList.add("is-dragging");
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", tile.dataset.shortcutUrl);
  });

  shortcutGrid.addEventListener("dragover", (event) => {
    const targetTile = event.target.closest("[data-shortcut-url]");
    const draggingTile = shortcutGrid.querySelector(".is-dragging");
    if (!targetTile || !draggingTile || targetTile === draggingTile) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    showDropTarget(targetTile, getDropPlacement(targetTile, event));
  });

  shortcutGrid.addEventListener("dragleave", (event) => {
    const tile = event.target.closest("[data-shortcut-url]");
    if (tile && !tile.contains(event.relatedTarget)) clearDropTargets();
  });

  shortcutGrid.addEventListener("drop", (event) => {
    const targetTile = event.target.closest("[data-shortcut-url]");
    const sourceUrl = event.dataTransfer.getData("text/plain");
    if (!targetTile || !sourceUrl) return;

    event.preventDefault();
    reorderShortcut(sourceUrl, targetTile.dataset.shortcutUrl, getDropPlacement(targetTile, event));
  });

  shortcutGrid.addEventListener("dragend", () => {
    clearDropTargets();
    const draggingTile = shortcutGrid.querySelector(".is-dragging");
    if (draggingTile) draggingTile.classList.remove("is-dragging");
  });

  function loadShortcuts() {
    chrome.storage.sync.get({ [SHORTCUTS_STORAGE_KEY]: DEFAULT_SHORTCUTS }, (data) => {
      shortcuts = normalizeShortcuts(data[SHORTCUTS_STORAGE_KEY]);
      renderShortcuts();
    });
  }

  function loadTheme() {
    chrome.storage.sync.get({ [THEME_STORAGE_KEY]: DEFAULT_THEME }, (data) => {
      setTheme(data[THEME_STORAGE_KEY]);
    });
  }

  function saveTheme(value) {
    setTheme(value);
    chrome.storage.sync.set({ [THEME_STORAGE_KEY]: theme });
  }

  function setTheme(value) {
    theme = value === "light" ? "light" : "dark";
    document.documentElement.dataset.theme = theme;
    themeButtons.forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.themeValue === theme));
    });
  }

  function saveShortcuts() {
    chrome.storage.sync.set({ [SHORTCUTS_STORAGE_KEY]: shortcuts }, renderShortcuts);
  }

  function saveShortcutFromForm() {
    const name = shortcutName.value.trim();
    const url = normalizeUrl(shortcutUrl.value.trim());
    if (!name || !url) return;

    if (editingShortcutUrl) {
      const editIndex = shortcuts.findIndex((shortcut) => shortcut.url === editingShortcutUrl);
      const nextShortcuts = shortcuts.filter((shortcut) => (
        shortcut.url !== editingShortcutUrl && shortcut.url !== url
      ));
      nextShortcuts.splice(Math.max(editIndex, 0), 0, { name, url });
      shortcuts = nextShortcuts;
    } else {
      shortcuts = [
        ...shortcuts.filter((shortcut) => shortcut.url !== url),
        { name, url }
      ].slice(-12);
    }

    shortcutForm.reset();
    saveShortcuts();
    closeDialog();
  }

  function openAddShortcutDialog() {
    editingShortcutUrl = "";
    shortcutDialogTitle.textContent = "Add Shortcut";
    saveShortcut.textContent = "Add";
    shortcutForm.reset();
    shortcutDialog.showModal();
    shortcutName.focus();
  }

  function openEditShortcutDialog(url) {
    const shortcut = shortcuts.find((item) => item.url === url);
    if (!shortcut) return;

    editingShortcutUrl = shortcut.url;
    shortcutDialogTitle.textContent = "Edit Shortcut";
    saveShortcut.textContent = "Save";
    shortcutName.value = shortcut.name;
    shortcutUrl.value = shortcut.url;
    shortcutDialog.showModal();
    shortcutName.focus();
    shortcutName.select();
  }

  function removeShortcut(url) {
    shortcuts = shortcuts.filter((shortcut) => shortcut.url !== url);
    saveShortcuts();
  }

  function reorderShortcut(sourceUrl, targetUrl, placement) {
    if (sourceUrl === targetUrl) return;

    const sourceIndex = shortcuts.findIndex((shortcut) => shortcut.url === sourceUrl);
    const targetIndex = shortcuts.findIndex((shortcut) => shortcut.url === targetUrl);
    if (sourceIndex < 0 || targetIndex < 0) return;

    const nextShortcuts = [...shortcuts];
    const [shortcut] = nextShortcuts.splice(sourceIndex, 1);
    const adjustedTargetIndex = nextShortcuts.findIndex((item) => item.url === targetUrl);
    const insertIndex = placement === "after" ? adjustedTargetIndex + 1 : adjustedTargetIndex;

    nextShortcuts.splice(insertIndex, 0, shortcut);
    shortcuts = nextShortcuts;
    saveShortcuts();
  }

  function setShortcutEditing(value) {
    shortcutEditing = Boolean(value);
    shortcutGrid.classList.toggle("is-editing", shortcutEditing);
    toggleShortcutEditing.setAttribute("aria-pressed", String(shortcutEditing));
    renderShortcuts();
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
      tile.draggable = true;
      tile.dataset.shortcutUrl = shortcut.url;
      link.className = "shortcut-link";
      link.href = shortcut.url;
      link.draggable = false;
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
      remove.hidden = !shortcutEditing;
      remove.disabled = !shortcutEditing;
      remove.dataset.remove = shortcut.url;

      text.append(name, host);
      link.append(key, text);
      tile.append(link, remove);
      shortcutGrid.appendChild(tile);
    });
  }

  function getDropPlacement(tile, event) {
    const rect = tile.getBoundingClientRect();
    const isVertical = getGridColumnCount() === 1;
    const pointer = isVertical ? event.clientY - rect.top : event.clientX - rect.left;
    const midpoint = (isVertical ? rect.height : rect.width) / 2;
    return pointer > midpoint ? "after" : "before";
  }

  function getGridColumnCount() {
    return getComputedStyle(shortcutGrid).gridTemplateColumns.split(" ").filter(Boolean).length;
  }

  function showDropTarget(tile, placement) {
    clearDropTargets();
    tile.classList.add(placement === "after" ? "is-drop-after" : "is-drop-before");
  }

  function clearDropTargets() {
    shortcutGrid.querySelectorAll(".is-drop-before, .is-drop-after").forEach((tile) => {
      tile.classList.remove("is-drop-before", "is-drop-after");
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
    if (/\s/.test(value)) return false;
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
    editingShortcutUrl = "";
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
