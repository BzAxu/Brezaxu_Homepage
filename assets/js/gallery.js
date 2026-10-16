// Client-side gallery route: navigation uses history state and never reloads the document.
(() => {
  const homePage = document.getElementById("top");
  const galleryPage = document.getElementById("galleryPage");
  const footer = document.querySelector("footer");
  const grid = document.getElementById("galleryGrid");
  const status = document.getElementById("galleryStatus");
  const empty = document.getElementById("galleryEmpty");
  const emptyTitle = document.getElementById("galleryEmptyTitle");
  const emptyText = document.getElementById("galleryEmptyText");
  const refreshButton = document.getElementById("galleryRefresh");
  const retryButton = document.getElementById("galleryRetry");
  const moreButton = document.getElementById("galleryMore");
  const lightbox = document.getElementById("galleryLightbox");
  const lightboxImage = document.getElementById("galleryLightboxImage");
  if (!homePage || !galleryPage || !grid) return;

  const API = "https://api.waifu.pics/many/sfw/waifu";
  const seen = new Set();
  let loading = false;
  let currentRoute = "home";
  let lightboxTrigger = null;

  function transition(callback) {
    if (document.startViewTransition) document.startViewTransition(callback);
    else callback();
  }

  function renderRoute(route, { updateHistory = false, replace = false } = {}) {
    currentRoute = route === "gallery" ? "gallery" : "home";
    transition(() => {
      const isGallery = currentRoute === "gallery";
      homePage.hidden = isGallery;
      galleryPage.hidden = !isGallery;
      if (footer) footer.hidden = isGallery;
      document.body.classList.toggle("gallery-open", false);
      window.scrollTo({ top: 0, behavior: "instant" });
      if (updateHistory) {
        const url = new URL(window.location.href);
        if (isGallery) url.searchParams.set("page", "gallery");
        else url.searchParams.delete("page");
        history[replace ? "replaceState" : "pushState"]({ view: currentRoute }, "", url);
      }
    });
    if (currentRoute === "gallery" && !grid.children.length && !loading) loadImages();
  }

  document.addEventListener("click", (event) => {
    const open = event.target.closest("[data-gallery-open]");
    if (open) {
      event.preventDefault();
      if (currentRoute !== "gallery") renderRoute("gallery", { updateHistory: true });
      return;
    }
    const home = event.target.closest("[data-gallery-home]");
    if (home && currentRoute === "gallery") {
      event.preventDefault();
      history.pushState({ view: "home" }, "", window.location.pathname + window.location.hash);
      renderRoute("home");
    }
  });

  window.addEventListener("popstate", () => {
    renderRoute(new URL(window.location.href).searchParams.get("page") === "gallery" ? "gallery" : "home");
  });

  function setLoading(value) {
    loading = value;
    refreshButton.disabled = value;
    moreButton.disabled = value;
    retryButton.disabled = value;
    refreshButton.textContent = value ? "加载中…" : "↻ 换一批";
    moreButton.textContent = value ? "正在加载…" : "再看一些 ↓";
    if (value) {
      empty.hidden = true;
      status.textContent = "正在从公开接口获取插画…";
    }
  }

  function addImage(url, index) {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gallery-item";
    card.setAttribute("aria-label", "查看第 " + (grid.children.length + 1) + " 张插画");
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "随机二次元插画";
    img.className = "is-loading";
    img.src = url;
    img.addEventListener("load", () => img.classList.remove("is-loading"), { once: true });
    img.addEventListener("error", () => {
      img.classList.remove("is-loading");
      img.classList.add("is-broken");
      card.classList.add("gallery-item--broken");
    }, { once: true });
    const caption = document.createElement("div");
    caption.className = "gallery-item-caption";
    const label = document.createElement("strong");
    label.textContent = "ANIME / " + String(grid.children.length + 1).padStart(2, "0");
    const zoom = document.createElement("span");
    zoom.textContent = "点击放大 ↗";
    caption.append(label, zoom);
    card.append(img, caption);
    card.addEventListener("click", () => {
      if (!img.complete || !img.naturalWidth) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      lightboxTrigger = card;
      lightboxImage.src = url;
      lightbox.hidden = false;
      document.body.classList.add("gallery-open");
      lightbox.querySelector("[data-gallery-close]").focus();
    });
    grid.append(card);
    return true;
  }

  async function loadImages({ reset = false } = {}) {
    if (loading) return;
    setLoading(true);
    if (reset) {
      grid.replaceChildren();
      seen.clear();
    }
    try {
      const response = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exclude: [...seen] })
      });
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (!Array.isArray(data.files)) throw new Error("Invalid API response");
      let added = 0;
      data.files.forEach((url, index) => { if (addImage(url, index)) added++; });
      if (!added && !grid.children.length) throw new Error("No images returned");
      empty.hidden = true;
      status.textContent = grid.children.length + " 张插画 · SFW 随机图库";
    } catch (error) {
      console.warn("Gallery API request failed:", error);
      if (!grid.children.length) {
        empty.hidden = false;
        emptyTitle.textContent = "暂时无法加载画廊";
        emptyText.textContent = "第三方接口可能暂时不可用，或当前网络限制了跨域请求。请重试；主页其他功能不受影响。";
      }
      status.textContent = grid.children.length ? "部分图片加载失败，可以继续重试" : "接口连接失败";
    } finally {
      setLoading(false);
      if (currentRoute === "gallery") moreButton.hidden = grid.children.length === 0;
    }
  }

  function closeLightbox() {
    lightbox.hidden = true;
    lightboxImage.removeAttribute("src");
    document.body.classList.remove("gallery-open");
    if (lightboxTrigger) lightboxTrigger.focus();
    lightboxTrigger = null;
  }
  lightbox.querySelectorAll("[data-gallery-close]").forEach((button) => button.addEventListener("click", closeLightbox));
  document.addEventListener("keydown", (event) => {
    if (lightbox.hidden) return;
    if (event.key === "Escape") closeLightbox();
    if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
      const cards = [...grid.querySelectorAll(".gallery-item img")].filter((img) => img.complete && img.naturalWidth);
      const index = cards.findIndex((img) => img.src === lightboxImage.src);
      const next = cards[index + (event.key === "ArrowRight" ? 1 : -1)];
      if (next) lightboxImage.src = next.src;
    }
  });

  refreshButton.addEventListener("click", () => loadImages({ reset: true }));
  retryButton.addEventListener("click", () => loadImages({ reset: grid.children.length === 0 }));
  moreButton.addEventListener("click", () => loadImages());

  const initialRoute = new URL(window.location.href).searchParams.get("page") === "gallery" ? "gallery" : "home";
  renderRoute(initialRoute, { replace: true });
})();
