// Pixiv gallery SPA route. Pixiv requests are handled by same-origin Pages Functions.
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
  const lightboxTitle = document.getElementById("galleryLightboxTitle");
  const pixivLink = document.getElementById("galleryPixivLink");
  const modeButtons = [...document.querySelectorAll("[data-gallery-mode]")];
  if (!homePage || !galleryPage || !grid) return;

  const seen = new Set();
  let loading = false;
  let currentRoute = "home";
  let currentMode = "recommended";
  let nextCursor = null;
  let lightboxTrigger = null;
  let currentImages = [];

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
      window.scrollTo({ top: 0, behavior: "auto" });
      if (updateHistory) {
        const url = new URL(window.location.href);
        if (isGallery) url.searchParams.set("page", "gallery");
        else url.searchParams.delete("page");
        history[replace ? "replaceState" : "pushState"]({ view: currentRoute }, "", url);
      }
    });
    if (currentRoute === "gallery" && !grid.children.length && !loading) loadImages({ reset: true });
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
      history.replaceState({ view: "home" }, "", window.location.pathname + window.location.hash);
      renderRoute("home");
    }
  });

  window.addEventListener("popstate", () => {
    renderRoute(new URL(window.location.href).searchParams.get("page") === "gallery" ? "gallery" : "home");
  });

  function setLoading(value) {
    loading = value;
    refreshButton.disabled = value;
    moreButton.disabled = value || !nextCursor;
    retryButton.disabled = value;
    modeButtons.forEach((button) => { button.disabled = value; });
    refreshButton.textContent = value ? "加载中…" : "↻ 刷新";
    moreButton.textContent = value ? "正在加载…" : "再看一些 ↓";
    if (value) {
      empty.hidden = true;
      status.textContent = "正在连接 Pixiv…";
    }
  }

  function proxyImage(url) {
    return "/api/pixiv-image?url=" + encodeURIComponent(url);
  }

  function addImage(item) {
    if (!item?.image || seen.has(String(item.id))) return false;
    seen.add(String(item.id));
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gallery-item";
    card.setAttribute("aria-label", "查看作品：" + (item.title || "Pixiv 插画"));
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = item.title || "Pixiv 插画";
    img.className = "is-loading";
    img.src = proxyImage(item.image);
    img.addEventListener("load", () => img.classList.remove("is-loading"), { once: true });
    img.addEventListener("error", () => {
      img.classList.remove("is-loading");
      img.classList.add("is-broken");
      card.classList.add("gallery-item--broken");
    }, { once: true });
    const caption = document.createElement("div");
    caption.className = "gallery-item-caption";
    const label = document.createElement("strong");
    label.textContent = item.title || "未命名作品";
    const author = document.createElement("span");
    author.textContent = item.author || "Pixiv";
    caption.append(label, author);
    card.append(img, caption);
    card.dataset.pixivUrl = item.pixivUrl || ("https://www.pixiv.net/artworks/" + item.id);
    card.dataset.title = item.title || "Pixiv 插画";
    card.dataset.image = img.src;
    card.addEventListener("click", () => {
      lightboxTrigger = card;
      lightboxImage.src = img.src;
      lightboxTitle.textContent = card.dataset.title;
      pixivLink.href = card.dataset.pixivUrl;
      lightbox.hidden = false;
      document.body.classList.add("gallery-open");
      lightbox.querySelector("[data-gallery-close]").focus();
    });
    grid.append(card);
    currentImages.push(item);
    return true;
  }

  async function loadImages({ reset = false, mode = currentMode } = {}) {
    if (loading) return;
    if (reset) {
      grid.replaceChildren();
      seen.clear();
      currentImages = [];
      nextCursor = null;
    }
    currentMode = mode;
    modeButtons.forEach((button) => {
      const active = button.dataset.galleryMode === currentMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });
    setLoading(true);
    try {
      const params = new URLSearchParams({ mode: currentMode });
      if (!reset && nextCursor) params.set("cursor", nextCursor);
      const response = await fetch("/api/pixiv?" + params.toString(), {
        headers: { "Accept": "application/json" },
        credentials: "same-origin"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.message || data.error || ("HTTP " + response.status));
        error.status = response.status;
        throw error;
      }
      if (!Array.isArray(data.illustrations)) throw new Error("Pixiv 返回的数据格式不正确");
      let added = 0;
      data.illustrations.forEach((item) => { if (addImage(item)) added++; });
      nextCursor = data.next || null;
      if (moreButton) moreButton.hidden = !nextCursor;
      if (!added && !grid.children.length) throw new Error("Pixiv 暂时没有返回作品");
      empty.hidden = true;
      const modeLabel = currentMode === "bookmarks" ? "我的收藏" : "Pixiv 推荐";
      status.textContent = modeLabel + " · 已加载 " + grid.children.length + " 件作品";
      if (!nextCursor) status.textContent += " · 已到末页";
    } catch (error) {
      console.warn("Pixiv gallery request failed:", error);
      if (!grid.children.length) {
        empty.hidden = false;
        emptyTitle.textContent = error.status === 503 ? "还差一步：配置 Pixiv 授权" : "暂时无法连接 Pixiv";
        emptyText.textContent = error.message || "请检查 Cloudflare Functions 部署和授权配置后重试。";
      }
      status.textContent = grid.children.length ? "加载失败，可重试" : "Pixiv 连接失败";
    } finally {
      setLoading(false);
      moreButton.disabled = !nextCursor || loading;
      if (currentRoute === "gallery") moreButton.hidden = !nextCursor;
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
      const cards = [...grid.querySelectorAll(".gallery-item")];
      const index = cards.indexOf(lightboxTrigger);
      const next = cards[index + (event.key === "ArrowRight" ? 1 : -1)];
      if (next) {
        lightboxTrigger = next;
        lightboxImage.src = next.dataset.image;
        lightboxTitle.textContent = next.dataset.title;
        pixivLink.href = next.dataset.pixivUrl;
      }
    }
  });

  refreshButton.addEventListener("click", () => loadImages({ reset: true }));
  retryButton.addEventListener("click", () => loadImages({ reset: grid.children.length === 0 }));
  moreButton.addEventListener("click", () => loadImages());
  modeButtons.forEach((button) => button.addEventListener("click", () => {
    if (button.dataset.galleryMode !== currentMode) loadImages({ reset: true, mode: button.dataset.galleryMode });
  }));

  const initialRoute = new URL(window.location.href).searchParams.get("page") === "gallery" ? "gallery" : "home";
  renderRoute(initialRoute, { replace: true });
})();
