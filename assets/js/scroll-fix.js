/* On refresh, discard the previous fragment and scroll position.
   Keep normal in-page anchor navigation on non-reload visits. */
(() => {
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";

  const navigation = performance.getEntriesByType("navigation")[0];
  const isReload = navigation && navigation.type === "reload";

  if (isReload) {
    // Replace the URL without reloading so a stale #contact/#projects fragment
    // cannot force the browser to restore the previous section.
    history.replaceState(null, "", location.pathname + location.search);
  }

  const resetScroll = () => {
    if (!isReload) return;
    document.documentElement.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      window.scrollTo(0, 0);
      document.documentElement.style.removeProperty("scroll-behavior");
    });
  };

  resetScroll();
  window.addEventListener("pageshow", resetScroll);
})();
