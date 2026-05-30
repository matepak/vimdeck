const VIMDECK_DEFAULTS = {
  enabled: true,
  smoothScroll: true,
  scrollStep: 80,
  halfPageRatio: 0.5,
  hintsEnabled: true,
  disabledSites: [],
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

// Returns true when `url` matches any of the disabled-site `patterns`.
// Matching rules per pattern:
//   - contains "*"  -> glob (matched against the hostname, or against
//                      "hostname/path" when the pattern includes a "/")
//   - contains "/"  -> "hostname/path" prefix match
//   - otherwise     -> hostname match (exact or any subdomain)
function vimdeckMatchesDisabledSite(url, patterns) {
  if (!Array.isArray(patterns) || !url) return false;

  let parsed;
  try {
    parsed = new URL(url);
  } catch (error) {
    return false;
  }

  const hostname = parsed.hostname;
  const hostPath = hostname + parsed.pathname;

  return patterns.some((raw) => {
    const pattern = (raw || "").trim();
    if (!pattern) return false;

    if (pattern.includes("*")) {
      const subject = pattern.includes("/") ? hostPath : hostname;
      return vimdeckGlobToRegExp(pattern).test(subject);
    }

    if (pattern.includes("/")) {
      return hostPath === pattern || hostPath.startsWith(pattern);
    }

    return hostname === pattern || hostname.endsWith("." + pattern);
  });
}

function vimdeckGlobToRegExp(pattern) {
  const escaped = pattern
    .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*");
  return new RegExp("^" + escaped + "$");
}

if (typeof module !== "undefined") {
  module.exports = {
    VIMDECK_DEFAULTS,
    vimdeckMatchesDisabledSite,
    vimdeckGlobToRegExp
  };
}
