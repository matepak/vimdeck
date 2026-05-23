chrome.runtime.onMessage.addListener((message, sender) => {
  if (!message || message.type !== "VIBE_VIM_CLOSE_TAB") return;
  if (!sender.tab || typeof sender.tab.id !== "number") return;

  chrome.tabs.remove(sender.tab.id);
});
