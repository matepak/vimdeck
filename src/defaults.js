const VIMDECK_DEFAULTS = {
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
    help: "?",
    openTab: "t",
    closeTab: "x",
    cancel: "Escape"
  }
};

if (typeof module !== "undefined") {
  module.exports = { VIMDECK_DEFAULTS };
}
