chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message) return;

  if (message.type === "VIMDECK_OPEN_TAB") {
    openTabNearSender(sender)
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type !== "VIMDECK_CLOSE_TAB") return;

  resolveSenderTab(sender).then((tab) => {
    if (!tab || typeof tab.id !== "number") {
      sendResponse({ ok: false });
      return;
    }
    chrome.tabs.remove(tab.id).then(() => sendResponse({ ok: true }));
  }).catch((error) => sendResponse({ ok: false, error: error.message }));
  return true;
});

async function openTabNearSender(sender) {
  const tab = await resolveSenderTab(sender);
  const createProperties = {};

  if (tab && typeof tab.index === "number") {
    createProperties.index = tab.index + 1;
  }
  if (tab && typeof tab.id === "number") {
    createProperties.openerTabId = tab.id;
  }

  return chrome.tabs.create(createProperties);
}

async function resolveSenderTab(sender) {
  if (sender.tab) return sender.tab;

  const [activeTab] = await chrome.tabs.query({
    active: true,
    currentWindow: true
  });
  return activeTab || null;
}
