// Main page interactions and optional liquid-glass enhancement.
// External-link confirmation must keep working even if the CDN is unavailable.
import("https://cdn.jsdelivr.net/npm/@dpawlikowski/liquid-glass@0.3.0/dist/index.js")
  .then(({ injectLiquidGlassFilter }) => {
    // Static optics: no animated turbulence and no moving page background.
    try {
      injectLiquidGlassFilter({ animate: false, scale: 18 });
    } catch (error) {
      console.warn("Liquid-glass filter unavailable; continuing without refraction.", error);
    }

    document.querySelectorAll(".panel").forEach((panel) => {
      panel.classList.add("liquid-glass", "liquid-glass--vivid", "liquid-glass--static");
      const refraction = document.createElement("span");
      refraction.className = "liquid-glass__refraction";
      refraction.setAttribute("aria-hidden", "true");

      const content = document.createElement("div");
      content.className = "liquid-glass__content";
      while (panel.firstChild) content.append(panel.firstChild);
      panel.append(refraction, content);
    });
  })
  .catch((error) => {
    // The confirmation dialog, QQ prompt, copy buttons and tactile feedback
    // do not depend on the optional visual-effects CDN.
    console.warn("Liquid-glass enhancement failed; core interactions remain active.", error);
  });

// Copy buttons and toast notifications.
"use strict";
    document.getElementById("year").textContent = new Date().getFullYear();

    const toast = document.getElementById("toast");
    let toastTimer;
    function showToast(message) {
      toast.textContent = message;
      toast.classList.add("show");
      clearTimeout(toastTimer);
      toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
    }

    async function copyText(text) {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return;
      }
      const field = document.createElement("textarea");
      field.value = text;
      field.setAttribute("readonly", "");
      field.style.position = "fixed";
      field.style.left = "-9999px";
      field.style.opacity = "0";
      document.body.appendChild(field);
      field.select();
      const copied = document.execCommand("copy");
      field.remove();
      if (!copied) throw new Error("copy failed");
    }

    document.querySelectorAll("#copyPage").forEach((button) => button.addEventListener("click", async () => {
      try {
        await copyText(window.location.href);
        showToast("主页链接已复制");
      } catch {
        showToast("复制失败，请手动复制浏览器地址");
      }
    }));

    document.querySelectorAll("[data-copy-text]").forEach((button) => {
      button.addEventListener("click", async () => {
        try {
          await copyText(button.dataset.copyText);
          showToast(button.dataset.copyText === "1593107836" ? "QQ 号已复制" : "内容已复制");
        } catch {
          showToast("复制失败，请手动选择并复制");
        }
      });
    });

// Secondary information menus use the same modal/prompt visual language.
(() => {
  const dialog = document.getElementById("infoDialog");
  if (!dialog) return;
  const title = document.getElementById("infoDialogTitle");
  const eyebrow = document.getElementById("infoDialogEyebrow");
  const description = document.getElementById("infoDialogDescription");
  const panels = [...dialog.querySelectorAll("[data-info-panel]")];
  let previousFocus = null;
  const copyPageButton = document.getElementById("copyPage");

  const content = {
    interests: { eyebrow: "INTERESTS / PROJECTS", title: "兴趣与项目", description: "一些持续关注和探索的方向。" },
    about: { eyebrow: "ABOUT THIS SPACE", title: "关于本站", description: "一个用来收纳兴趣、项目和日常灵感的小空间。" },
    contact: { eyebrow: "CONTACT / SOCIAL", title: "联系方式", description: "选择平台即可查看跳转确认，再决定是否继续访问。" }
  };

  function openInfo(key, trigger) {
    const item = content[key];
    if (!item) return;
    previousFocus = trigger;
    eyebrow.textContent = item.eyebrow;
    title.textContent = item.title;
    description.textContent = item.description;
    panels.forEach(panel => { panel.hidden = panel.dataset.infoPanel !== key; });
    dialog.hidden = false;
    document.body.classList.add("info-dialog-open");
    const firstControl = dialog.querySelector('[data-info-panel="' + key + '"] a, [data-info-panel="' + key + '"] button, [data-info-close]');
    if (firstControl) firstControl.focus();
  }

  function closeInfo() {
    dialog.hidden = true;
    document.body.classList.remove("info-dialog-open");
    if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
  }

  document.addEventListener("click", event => {
    const trigger = event.target.closest("[data-info-open]");
    if (trigger) {
      event.preventDefault();
      openInfo(trigger.dataset.infoOpen, trigger);
    }
  });
  dialog.querySelectorAll("[data-info-close]").forEach(button => button.addEventListener("click", closeInfo));
  document.addEventListener("keydown", event => {
    if (dialog.hidden) return;
    if (event.key === "Escape") {
      event.preventDefault();
      closeInfo();
    } else if (event.key === "Tab") {
      const controls = [...dialog.querySelectorAll("button, a[href]")].filter(el => !el.disabled && el.offsetParent !== null);
      if (!controls.length) return;
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  });
})();

// External-link confirmation and QQ contact dialog.
(() => {
      const dialog = document.getElementById("externalLinkDialog");
      const hostLabel = document.getElementById("externalLinkHost");
      const continueButton = document.getElementById("externalLinkContinue");
      const copyExternalLink = document.getElementById("copyExternalLink");
      const dialogEyebrow = document.getElementById("externalDialogEyebrow");
      const destinationLabel = document.getElementById("externalDestinationLabel");
      const dialogTitle = document.getElementById("externalDialogTitle");
      const dialogDescription = document.getElementById("externalDialogDescription");
      let pendingUrl = "";
      let qqContactMode = false;
      let previousFocus = null;

      async function copyDialogValue() {
        const value = qqContactMode ? "1593107836" : pendingUrl;
        if (!value) return;
        try {
          await copyText(value);
          showToast(qqContactMode ? "QQ 号已复制" : "完整跳转链接已复制");
          if (qqContactMode) closeDialog();
        } catch {
          showToast("复制失败，请手动选择并复制");
        }
      }
      copyExternalLink.addEventListener("click", copyDialogValue);

      function openDialog({ url = "", qq = false, trigger = document.activeElement } = {}) {
        pendingUrl = url;
        qqContactMode = qq;
        previousFocus = trigger;
        dialogEyebrow.textContent = qq ? "QQ CONTACT" : "EXTERNAL LINK";
        dialogTitle.textContent = qq ? "添加 QQ 好友" : "即将访问";
        dialogDescription.textContent = qq ? "请打开 QQ，在搜索中输入下方号码并添加好友。" : "目标链接如下。";
        destinationLabel.textContent = qq ? "QQ 号" : "完整链接";
        hostLabel.textContent = qq ? "1593107836" : url;
        copyExternalLink.setAttribute("aria-label", qq ? "复制 QQ 号" : "复制完整链接");
        copyExternalLink.title = qq ? "复制 QQ 号" : "复制完整链接";
        continueButton.innerHTML = qq ? '复制 QQ 号 <span aria-hidden="true">⧉</span>' : '继续访问 <span aria-hidden="true">↗</span>';
        dialog.hidden = false;
        document.body.classList.add("external-dialog-open");
        continueButton.focus();
      }

      function closeDialog() {
        dialog.hidden = true;
        document.body.classList.remove("external-dialog-open");
        pendingUrl = "";
        qqContactMode = false;
        if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
      }

      document.querySelector("[data-qq-contact]").addEventListener("click", (event) => {
        openDialog({ qq: true, trigger: event.currentTarget });
      });

      document.addEventListener("click", (event) => {
        const link = event.target.closest("a[href]");
        if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        if (link.hasAttribute("download") || link.dataset.skipExternalPrompt === "true") return;

        let destination;
        try { destination = new URL(link.href, window.location.href); } catch { return; }
        if (!["http:", "https:"].includes(destination.protocol)) return;
        if (destination.origin === window.location.origin) return;

        event.preventDefault();
        openDialog({ url: destination.href, trigger: document.activeElement });
      });

      dialog.querySelectorAll("[data-external-cancel]").forEach((button) => button.addEventListener("click", closeDialog));
      continueButton.addEventListener("click", () => {
        if (qqContactMode) {
          copyDialogValue();
          return;
        }
        if (!pendingUrl) return;
        const destination = pendingUrl;
        closeDialog();
        const opened = window.open(destination, "_blank");
        if (opened) opened.opener = null;
        else window.location.assign(destination);
      });

      document.addEventListener("keydown", (event) => {
        if (dialog.hidden) return;
        if (event.key === "Escape") {
          event.preventDefault();
          closeDialog();
        } else if (event.key === "Tab") {
          const controls = [...dialog.querySelectorAll("button")].filter((el) => !el.disabled);
          if (!controls.length) return;
          const first = controls[0], last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        }
      });
    })();


// Tactile feedback for every button/link, including disabled controls where the
// browser exposes pointer events. Delegation also covers dynamically added UI.
(() => {
  const selector = "button, a[href], [role='button'], input[type='button'], input[type='submit']";
  let activePointerTarget = null;

  document.addEventListener("pointerdown", (event) => {
    const control = event.target.closest(selector);
    if (!control) return;
    activePointerTarget = control;
    control.classList.add("feedback-pressed");

    if (event.pointerType === "mouse" && event.button !== 0) return;
    if (control.matches(".external-dialog__backdrop")) return;

    const rect = control.getBoundingClientRect();
    const ripple = document.createElement("span");
    ripple.className = "feedback-ripple";
    ripple.setAttribute("aria-hidden", "true");
    ripple.style.left = (event.clientX - rect.left) + "px";
    ripple.style.top = (event.clientY - rect.top) + "px";
    control.append(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }, { passive: true, capture: true });

  const release = () => {
    if (activePointerTarget) {
      activePointerTarget.classList.remove("feedback-pressed");
      activePointerTarget = null;
    }
  };
  document.addEventListener("pointerup", release, { passive: true, capture: true });
  document.addEventListener("pointercancel", release, { passive: true, capture: true });
  window.addEventListener("blur", release);

  // Keyboard activation gets an equivalent short pulse.
  document.addEventListener("keydown", (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    const control = event.target.closest(selector);
    if (!control) return;
    control.classList.remove("feedback-confirmed");
    void control.offsetWidth;
    control.classList.add("feedback-confirmed");
    control.addEventListener("animationend", () => control.classList.remove("feedback-confirmed"), { once: true });
  }, true);
})();
