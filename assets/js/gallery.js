// Public, no-login illustration gallery using the SFW waifu.pics endpoint.
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
  const sourceSelect = document.getElementById("gallerySourceSelect");
  const providerStatusList = document.getElementById("galleryProviderStatusList");
  const providerStatusRefresh = document.getElementById("galleryProviderStatusRefresh");
  const providerStatusSummary = document.getElementById("galleryProviderStatusSummary");
  const lightbox = document.getElementById("galleryLightbox");
  const lightboxImage = document.getElementById("galleryLightboxImage");
  const lightboxTitle = document.getElementById("galleryLightboxTitle");
  const sourceLink = document.getElementById("galleryPixivLink");
  if (!homePage || !galleryPage || !grid) return;

  // Add a download action to the image preview without changing the page template.
  const lightboxCard = lightbox.querySelector(".gallery-lightbox-card");
  const downloadButton = document.createElement("button");
  downloadButton.type = "button";
  downloadButton.className = "button gallery-download";
  downloadButton.textContent = "↓ 下载图片";
  downloadButton.style.marginTop = "12px";
  downloadButton.style.width = "100%";
  lightboxCard.append(downloadButton);


  // Secondary settings menu for all gallery information and source controls.
  const settingsDialog = document.getElementById("gallerySettingsDialog");
  const settingsOpen = document.getElementById("galleryMenuOpen");
  let settingsTrigger = null;
  function openSettings() {
    if (!settingsDialog) return;
    settingsTrigger = document.activeElement;
    settingsDialog.hidden = false;
    document.body.classList.add("gallery-settings-open");
    const closeButton = settingsDialog.querySelector(".gallery-settings-close");
    if (closeButton) closeButton.focus();
  }
  function closeSettings() {
    if (!settingsDialog || settingsDialog.hidden) return;
    settingsDialog.hidden = true;
    document.body.classList.remove("gallery-settings-open");
    if (settingsTrigger && typeof settingsTrigger.focus === "function") settingsTrigger.focus();
  }
  if (settingsOpen) settingsOpen.addEventListener("click", openSettings);
  if (settingsDialog) {
    settingsDialog.querySelectorAll("[data-gallery-settings-close]").forEach((button) => button.addEventListener("click", closeSettings));
    document.addEventListener("keydown", (event) => {
      if (settingsDialog.hidden) return;
      if (event.key === "Escape") {
        event.preventDefault();
        closeSettings();
      } else if (event.key === "Tab") {
        const controls = [...settingsDialog.querySelectorAll("button, select")].filter((el) => !el.disabled);
        if (!controls.length) return;
        const first = controls[0], last = controls[controls.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
  }

  const seen = new Set();
  let loading = false;
  let currentRoute = "home";
  let lightboxTrigger = null;
  let currentSourceName = "图片源";
  let checkingProviders = false;

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
    if (currentRoute === "gallery") checkProviderStatus();
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
      renderRoute("home", { updateHistory: true, replace: true });
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
    refreshButton.textContent = value ? "加载中…" : "↻ 刷新";
    moreButton.textContent = value ? "正在加载…" : "再看一些 ↓";
    if (value) {
      empty.hidden = true;
      status.textContent = "正在获取公开插画…";
    }
  }

  function addImage(url, sourceName = "图片源") {
    if (!url || seen.has(url)) return false;
    seen.add(url);
    const card = document.createElement("button");
    card.type = "button";
    card.className = "gallery-item";
    card.setAttribute("aria-label", "查看随机插画");
    const img = document.createElement("img");
    img.loading = "lazy";
    img.decoding = "async";
    img.alt = "随机插画";
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
    label.textContent = "随机插画";
    const author = document.createElement("span");
    author.textContent = "来源：" + sourceName;
    caption.append(label, author);
    card.append(img, caption);
    card.dataset.sourceUrl = url;
    card.dataset.title = "随机插画";
    card.addEventListener("click", () => {
      lightboxTrigger = card;
      lightboxImage.src = url;
      lightboxTitle.textContent = card.dataset.title;
      sourceLink.href = url;
      sourceLink.textContent = "查看原图 ↗";
      downloadButton.dataset.downloadUrl = url;
      downloadButton.disabled = false;
      downloadButton.textContent = "↓ 下载图片";
      lightbox.hidden = false;
      document.body.classList.add("gallery-open");
      lightbox.querySelector("[data-gallery-close]").focus();
    });
    grid.append(card);
    return true;
  }

  async function loadImages({ reset = false } = {}) {
    if (loading) return;
    if (reset) {
      grid.replaceChildren();
      seen.clear();
    }
    setLoading(true);
    try {
      const source = sourceSelect ? sourceSelect.value : "auto";
      const response = await fetch("/api/gallery?source=" + encodeURIComponent(source), {
        method: "GET",
        headers: { "Accept": "application/json" },
        cache: "no-store"
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || ("图片服务返回 HTTP " + response.status));
      if (!Array.isArray(data.files)) throw new Error("图片服务返回的数据格式不正确");
      let added = 0;
      currentSourceName = data.sourceName || "自动切换";
      data.files.forEach((url) => { if (addImage(url, currentSourceName)) added++; });
      if (!grid.children.length) throw new Error("暂时没有获取到图片，请稍后重试");
      empty.hidden = true;
      status.textContent = currentSourceName + " · 已加载 " + grid.children.length + " 张 · API " + (Number.isFinite(data.latency) ? data.latency + " ms" : "响应正常");
      if (data.fallback && Array.isArray(data.failures)) status.textContent += " · 已自动切换备用源";
      if (!added) status.textContent += " · 本批没有新图，请再刷新";
    } catch (error) {
      console.warn("Gallery request failed:", error);
      if (!grid.children.length) {
        empty.hidden = false;
        emptyTitle.textContent = "暂时无法加载画廊";
        emptyText.textContent = (error instanceof Error ? error.message : "图片服务连接失败") + "。请检查网络后重试。";
      }
      status.textContent = grid.children.length ? "加载失败，可重试" : "图片服务连接失败";
      if (providerStatusSummary) providerStatusSummary.textContent = "当前请求失败；可查看各源状态，或切换到自动模式。";
    } finally {
      setLoading(false);
    }
  }

  async function checkProviderStatus() {
    if (!providerStatusList || checkingProviders) return;
    checkingProviders = true;
    if (providerStatusRefresh) { providerStatusRefresh.disabled = true; providerStatusRefresh.textContent = "检测中…"; }
    if (providerStatusSummary) providerStatusSummary.textContent = "正在并行检测各图片源的响应速度…";
    providerStatusList.replaceChildren();
    try {
      const response = await fetch("/api/gallery?mode=status", { cache: "no-store", headers: { "Accept": "application/json" } });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(data.providers)) throw new Error(data.error || "状态接口暂时不可用");
      let online = 0;
      data.providers.forEach((provider) => {
        if (provider.ok) online++;
        const row = document.createElement("div");
        row.className = "gallery-provider-row" + (provider.ok ? " is-online" : " is-offline");
        const main = document.createElement("div");
        main.className = "gallery-provider-main";
        const name = document.createElement("strong");
        name.textContent = provider.name;
        const detail = document.createElement("span");
        detail.textContent = provider.ok ? "响应正常" : (provider.error || "不可用");
        main.append(name, detail);
        const metric = document.createElement("span");
        metric.className = "gallery-provider-latency";
        metric.textContent = Number.isFinite(provider.latency) ? provider.latency + " ms" : "—";
        const dot = document.createElement("span");
        dot.className = "gallery-provider-dot";
        dot.setAttribute("aria-hidden", "true");
        row.append(dot, main, metric);
        providerStatusList.append(row);
      });
      if (providerStatusSummary) providerStatusSummary.textContent = "在线 " + online + " / " + data.providers.length + " · 检测时间 " + new Date(data.checkedAt || Date.now()).toLocaleTimeString();
    } catch (error) {
      if (providerStatusSummary) providerStatusSummary.textContent = "状态检测失败：" + (error instanceof Error ? error.message : "网络错误");
    } finally {
      checkingProviders = false;
      if (providerStatusRefresh) { providerStatusRefresh.disabled = false; providerStatusRefresh.textContent = "重新检测"; }
    }
  }

  downloadButton.addEventListener("click", async () => {
    const url = downloadButton.dataset.downloadUrl;
    if (!url || downloadButton.disabled) return;
    const originalText = "↓ 下载图片";
    downloadButton.disabled = true;
    downloadButton.textContent = "正在准备下载…";
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) throw new Error("图片下载失败");
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      const type = blob.type.toLowerCase();
      const extension = type.includes("png") ? "png" : type.includes("webp") ? "webp" : type.includes("gif") ? "gif" : "jpg";
      link.download = "BzAxu-illustration-" + Date.now() + "." + extension;
      document.body.append(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
      downloadButton.textContent = "✓ 已开始下载";
    } catch (error) {
      console.warn("Image download failed:", error);
      downloadButton.textContent = "无法直接下载，请点“查看原图”后保存";
    } finally {
      window.setTimeout(() => {
        downloadButton.disabled = false;
        if (downloadButton.textContent === "✓ 已开始下载" || downloadButton.textContent.startsWith("无法直接下载")) {
          downloadButton.textContent = originalText;
        }
      }, 2200);
    }
  });

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
        lightboxImage.src = next.dataset.sourceUrl;
        lightboxTitle.textContent = next.dataset.title;
        sourceLink.href = next.dataset.sourceUrl;
        downloadButton.dataset.downloadUrl = next.dataset.sourceUrl;
        downloadButton.disabled = false;
        downloadButton.textContent = "↓ 下载图片";
      }
    }
  });

  refreshButton.addEventListener("click", () => loadImages({ reset: true }));
  if (sourceSelect) sourceSelect.addEventListener("change", () => loadImages({ reset: true }));
  if (providerStatusRefresh) providerStatusRefresh.addEventListener("click", checkProviderStatus);
  retryButton.addEventListener("click", () => loadImages({ reset: grid.children.length === 0 }));
  moreButton.addEventListener("click", () => loadImages());

  const initialRoute = new URL(window.location.href).searchParams.get("page") === "gallery" ? "gallery" : "home";
  renderRoute(initialRoute, { replace: true });
})();