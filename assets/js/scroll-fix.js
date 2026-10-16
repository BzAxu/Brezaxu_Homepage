/* Prevent browsers from restoring an old scroll position after refresh.
   Keep hash-based in-page navigation intact. Load synchronously from <head>. */
(() => {
  if ("scrollRestoration" in history) {
    history.scrollRestoration = "manual";
  }

  const goToTopUnlessHash = () => {
    if (!window.location.hash) {
      window.scrollTo(0, 0);
    }
  };

  // Run once during parsing and again when the document is shown from reload/BFCache.
  goToTopUnlessHash();
  window.addEventListener("pageshow", goToTopUnlessHash, { once: true });
})();
