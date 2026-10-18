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

    document.getElementById("copyPage").addEventListener("click", async () => {
      try {
        await copyText(window.location.href);
        showToast("主页链接已复制");
      } catch {
        showToast("复制失败，请手动复制浏览器地址");
      }
    });

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
      const destination = dialog.querySelector(".external-dialog__destination");
      const emailContactMenu = document.getElementById("emailContactMenu");
      let pendingUrl = "";
      let contactMode = "";
      let contactValue = "";
      let previousFocus = null;

      const contactLabels = {
        qq: { eyebrow: "QQ CONTACT", title: "添加 QQ 好友", label: "QQ 号", value: "1593107836", description: "请打开 QQ，在搜索中输入下方号码并添加好友。", copyLabel: "复制 QQ 号", toast: "QQ 号已复制" },
        wechat: { eyebrow: "WECHAT CONTACT", title: "添加微信好友", label: "微信号", description: "请打开微信，通过下方微信号搜索并添加好友。", copyLabel: "复制微信号", toast: "微信号已复制" },
        email: { eyebrow: "EMAIL CONTACT", title: "联系邮箱", label: "邮箱地址", description: "复制下方邮箱地址，可在邮件应用中向我发送邮件。", copyLabel: "复制邮箱地址", toast: "邮箱地址已复制" },
        "email-menu": { eyebrow: "EMAIL CONTACT", title: "选择联系邮箱", description: "选择一个邮箱地址，可单独复制后使用邮件应用联系我。" }
      };

      async function copyDialogValue() {
        const value = contactMode ? (contactValue || contactLabels[contactMode]?.value) : pendingUrl;
        if (!value || contactMode === "email-menu") return;
        try {
          await copyText(value);
          showToast(contactMode ? contactLabels[contactMode].toast : "完整跳转链接已复制");
          if (contactMode) closeDialog();
        } catch {
          showToast("复制失败，请手动选择并复制");
        }
      }
      copyExternalLink.addEventListener("click", copyDialogValue);

      function openDialog({ url = "", contact = "", value = "", trigger = document.activeElement } = {}) {
        pendingUrl = url;
        contactMode = contact;
        contactValue = value || contactLabels[contact]?.value || "";
        previousFocus = trigger;
        const info = contactLabels[contact];
        dialogEyebrow.textContent = info ? info.eyebrow : "EXTERNAL LINK";
        dialogTitle.textContent = info ? info.title : "即将访问";
        dialogDescription.textContent = info ? info.description : "目标链接如下。";
        destinationLabel.textContent = info ? (info.label || "") : "完整链接";
        hostLabel.textContent = info ? contactValue : url;
        const isEmailMenu = contact === "email-menu";
        destination.hidden = isEmailMenu;
        emailContactMenu.hidden = !isEmailMenu;
        copyExternalLink.hidden = isEmailMenu;
        continueButton.hidden = isEmailMenu;
        dialog.querySelector(".external-dialog__actions").classList.toggle("email-menu-active", isEmailMenu);
        copyExternalLink.setAttribute("aria-label", info ? (info.copyLabel || "复制邮箱地址") : "复制完整链接");
        copyExternalLink.title = info ? info.copyLabel : "复制完整链接";
        continueButton.innerHTML = info ? (info.copyLabel || "复制邮箱地址") + ' <span aria-hidden="true">⧉</span>' : '继续访问 <span aria-hidden="true">↗</span>';
        dialog.hidden = false;
        document.body.classList.add("external-dialog-open");
        if (isEmailMenu) emailContactMenu.querySelector("button").focus();
        else continueButton.focus();
      }

      function closeDialog() {
        dialog.hidden = true;
        document.body.classList.remove("external-dialog-open");
        pendingUrl = "";
        contactMode = "";
        contactValue = "";
        destination.hidden = false;
        emailContactMenu.hidden = true;
        copyExternalLink.hidden = false;
        continueButton.hidden = false;
        if (previousFocus && typeof previousFocus.focus === "function") previousFocus.focus();
      }

      document.querySelector("[data-qq-contact]").addEventListener("click", (event) => {
        openDialog({ contact: "qq", trigger: event.currentTarget });
      });

      emailContactMenu.querySelectorAll("[data-email-copy]").forEach((button) => {
        button.addEventListener("click", async () => {
          try {
            await copyText(button.dataset.emailCopy);
            showToast(button.dataset.emailCopy + " 已复制");
          } catch {
            showToast("复制失败，请手动选择并复制");
          }
        });
      });

      document.querySelectorAll("[data-contact-type]").forEach((button) => {
        button.addEventListener("click", (event) => {
          openDialog({
            contact: button.dataset.contactType,
            value: button.dataset.contactValue,
            trigger: event.currentTarget
          });
        });
      });

      document.querySelector("[data-bili-contact]").addEventListener("click", (event) => {
        openDialog({ url: "https://space.bilibili.com/1389725434", trigger: event.currentTarget });
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
        if (contactMode) {
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
          const controls = [...dialog.querySelectorAll("button")].filter((el) => !el.disabled && !el.hidden && el.offsetParent !== null);
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
  // Track each active pointer independently so multi-touch cannot strand a
  // control in its pressed state or release another finger's feedback early.
  const activePointers = new Map();

  const refreshPressedState = (control) => {
    if (!control) return;
    const stillPressed = [...activePointers.values()].includes(control);
    control.classList.toggle("feedback-pressed", stillPressed);
  };

  document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const control = target.closest(selector);
    if (!control) return;
    // Clicking the external-dialog backdrop only closes the dialog; it must not
    // trigger the global press glow/ripple over the entire viewport.
    if (control.matches(".external-dialog__backdrop")) return;
    if (event.pointerType === "mouse" && event.button !== 0) return;

    const previous = activePointers.get(event.pointerId);
    if (previous && previous !== control) {
      activePointers.delete(event.pointerId);
      refreshPressedState(previous);
    }
    activePointers.set(event.pointerId, control);
    control.classList.add("feedback-pressed");
  }, { passive: true, capture: true });

  const release = (event) => {
    const control = activePointers.get(event.pointerId);
    if (!control) return;
    activePointers.delete(event.pointerId);
    refreshPressedState(control);
  };
  const releaseAll = () => {
    const controls = new Set(activePointers.values());
    activePointers.clear();
    controls.forEach((control) => control.classList.remove("feedback-pressed"));
  };
  document.addEventListener("pointerup", release, { passive: true, capture: true });
  document.addEventListener("pointercancel", release, { passive: true, capture: true });
  window.addEventListener("blur", releaseAll);

  // Keyboard activation gets an equivalent short pulse.
  document.addEventListener("keydown", (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const control = target.closest(selector);
    if (!control) return;
    control.classList.remove("feedback-confirmed");
    void control.offsetWidth;
    control.classList.add("feedback-confirmed");
    const clearPulse = (animationEvent) => {
      if (animationEvent.target !== control || animationEvent.animationName !== "tactileNudge") return;
      control.classList.remove("feedback-confirmed");
      control.removeEventListener("animationend", clearPulse);
    };
    control.addEventListener("animationend", clearPulse);
  }, true);
})();


// Track card presses independently from buttons/links. Each pointer owns a
// separate press lifecycle. A quick release cannot reverse the press transition
// before the full 640ms press phase has been shown on that card.
(() => {
  const cardSelector = ".panel, .cover, .post, .feature, .contact-strip, .side-card, .profile-card, .contact-card";
  const pressPhaseMs = 640;
  const activePointers = new Map();
  // Released pointers remain here until their card has shown the full press phase.
  const presses = new Map();

  function isCardPressed(card) {
    for (const press of presses.values()) {
      if (press.card === card) return true;
    }
    return false;
  }

  function refresh(card) {
    if (!card) return;
    card.classList.toggle("card-pointer-pressed", isCardPressed(card));
  }

  function finishPointer(pointerId) {
    const press = activePointers.get(pointerId);
    if (!press) return;
    activePointers.delete(pointerId);
    press.releasedAt = performance.now();

    const elapsed = press.releasedAt - press.startedAt;
    const remaining = Math.max(0, pressPhaseMs - elapsed);
    press.timer = window.setTimeout(() => {
      presses.delete(pointerId);
      refresh(press.card);
    }, remaining);
  }

  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const target = event.target;
    if (!target || typeof target.closest !== "function") return;
    const card = target.closest(cardSelector);
    if (!card || card.closest(".external-dialog")) return;

    // Defensive cleanup in case a browser reuses an ID without a normal release.
    if (activePointers.has(event.pointerId)) finishPointer(event.pointerId);

    const press = {
      card,
      startedAt: performance.now(),
      releasedAt: null,
      timer: null
    };
    activePointers.set(event.pointerId, press);
    presses.set(event.pointerId, press);
    card.classList.add("card-pointer-pressed");
  }, { passive: true, capture: true });

  document.addEventListener("pointerup", (event) => finishPointer(event.pointerId), {
    passive: true,
    capture: true
  });
  document.addEventListener("pointercancel", (event) => finishPointer(event.pointerId), {
    passive: true,
    capture: true
  });

  function releaseAll() {
    const cards = new Set([...presses.values()].map((press) => press.card));
    for (const press of presses.values()) {
      if (press.timer !== null) window.clearTimeout(press.timer);
    }
    activePointers.clear();
    presses.clear();
    cards.forEach((card) => card.classList.remove("card-pointer-pressed"));
  }
  window.addEventListener("blur", releaseAll);
})();

// Soft glow only when the empty background of a card is tapped; no expanding ring.
(() => {
  const cardSelector = ".panel, .cover, .post, .feature, .contact-strip, .side-card, .profile-card, .contact-card";
  document.addEventListener("pointerdown", (event) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const card = event.target.closest(cardSelector);
    if (!card || event.target !== card) return;
    if (event.target.closest("a, button, input, [role='button']")) return;
    card.classList.remove("card-background-glow");
    void card.offsetWidth;
    card.classList.add("card-background-glow");
  }, { passive: true });
  document.addEventListener("animationend", (event) => {
    if (event.animationName === "cardBackgroundGlow") event.target.classList.remove("card-background-glow");
  });
})();

// Homepage card entrances: reveal on initial load, scroll-in, and section navigation.
(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cards = [...document.querySelectorAll(".layout .panel, .layout .feature-grid > .feature")]
    .filter((card) => !card.closest(".external-dialog"));
  if (!cards.length) return;

  cards.forEach((card, index) => {
    card.classList.add("homepage-card-reveal");
    card.style.setProperty("--card-enter-delay", Math.min(index * 65, 390) + "ms");
    card.addEventListener("animationend", (event) => {
      if (event.target !== card || event.animationName !== "homepageCardEnter") return;
      // Drop the finished animation so hover/press transitions can own transform again.
      card.classList.remove("is-card-visible");
      card.classList.add("card-entered");
    });
  });

  if (reduceMotion || !("IntersectionObserver" in window)) {
    cards.forEach((card) => card.classList.add("is-card-visible"));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-card-visible");
      observer.unobserve(entry.target);
    });
  }, { threshold: 0.12, rootMargin: "0px 0px -3% 0px" });

  cards.forEach((card) => observer.observe(card));

  function replayCard(card) {
    if (!card) return;
    card.classList.remove("card-entered", "is-card-visible");
    // Force a style boundary so the entrance can replay even when the card is already visible.
    void card.offsetWidth;
    card.classList.add("is-card-visible");
  }

  document.querySelectorAll('.top-nav a[href^="#"], .wordmark[href^="#"]').forEach((link) => {
    link.addEventListener("click", () => {
      const id = link.getAttribute("href").slice(1);
      const target = document.getElementById(id);
      if (!target) return;

      let replayTargets = [];
      if (id === "projects") {
        replayTargets = [...document.querySelectorAll(".feature-grid > .feature")];
      } else if (target.matches(".panel, .feature")) {
        replayTargets = [target];
      } else {
        replayTargets = [...target.querySelectorAll(".panel, .feature")];
      }

      replayTargets.forEach((card, index) => {
        card.style.setProperty("--card-enter-delay", Math.min(index * 65, 390) + "ms");
        replayCard(card);
      });
    });
  });
})();
