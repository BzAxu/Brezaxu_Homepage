const API = "/api/guestbook";
const ADMIN_REPLY_API = "/api/admin/replies";
const PAGE_SIZE = 20;
const form = document.querySelector("#guestbookForm");
const nameInput = document.querySelector("#guestbookName");
const messageInput = document.querySelector("#guestbookMessage");
const submitButton = document.querySelector("#guestbookSubmit");
const statusNode = document.querySelector("#guestbookStatus");
const listNode = document.querySelector("#guestbookList");
const countNode = document.querySelector("#guestbookCount");
const moreButton = document.querySelector("#guestbookMore");
let offset = 0;
let total = 0;
let loading = false;
let adminAuthenticated = false;

function setStatus(message = "", kind = "") {
  statusNode.textContent = message;
  statusNode.classList.toggle("is-error", kind === "error");
  statusNode.classList.toggle("is-success", kind === "success");
}
function setReplyStatus(node, message = "", kind = "") {
  node.textContent = message;
  node.classList.toggle("is-error", kind === "error");
  node.classList.toggle("is-success", kind === "success");
}
function formatDate(value) {
  if (typeof value !== "string") return "";
  const date = new Date(value.endsWith("Z") ? value : value.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);
}
async function refreshAdminState() {
  try {
    const response = await fetch("/api/admin/session", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    adminAuthenticated = response.ok && data.authenticated === true;
  } catch {
    adminAuthenticated = false;
  }
  return adminAuthenticated;
}
function createReply(reply) {
  const item = document.createElement("article");
  item.className = "guestbook-reply";
  if (Number(reply.is_developer) === 1) item.classList.add("guestbook-reply--developer");

  const head = document.createElement("div");
  head.className = "guestbook-reply-head";
  const nameWrap = document.createElement("div");
  nameWrap.className = "guestbook-reply-author";
  const name = document.createElement("span");
  name.className = "guestbook-reply-name";
  name.textContent = reply.name || "访客";
  nameWrap.append(name);
  if (Number(reply.is_developer) === 1) {
    const badge = document.createElement("span");
    badge.className = "guestbook-developer-badge";
    badge.textContent = "开发者";
    nameWrap.append(badge);
  }

  const date = document.createElement("time");
  date.className = "guestbook-reply-date";
  date.dateTime = reply.created_at || "";
  date.textContent = formatDate(reply.created_at);
  head.append(nameWrap, date);

  const message = document.createElement("p");
  message.className = "guestbook-reply-message";
  message.textContent = reply.message || "";
  item.append(head, message);
  return item;
}
function createAdminReplyForm(entry) {
  const replyForm = document.createElement("form");
  replyForm.className = "guestbook-reply-form";

  const label = document.createElement("label");
  label.className = "guestbook-reply-label";
  label.textContent = "开发者回复";

  const textarea = document.createElement("textarea");
  textarea.className = "guestbook-reply-input";
  textarea.name = "message";
  textarea.rows = 2;
  textarea.maxLength = 500;
  textarea.required = true;
  textarea.placeholder = "回复这条留言（最多 500 字）";
  label.append(textarea);

  const bottom = document.createElement("div");
  bottom.className = "guestbook-reply-form-bottom";
  const status = document.createElement("p");
  status.className = "guestbook-reply-status";
  status.setAttribute("role", "status");
  status.setAttribute("aria-live", "polite");
  const button = document.createElement("button");
  button.className = "guestbook-reply-submit";
  button.type = "submit";
  button.textContent = "发布回复";
  bottom.append(status, button);
  replyForm.append(label, bottom);

  replyForm.addEventListener("submit", async event => {
    event.preventDefault();
    if (button.disabled) return;

    const message = textarea.value.trim();
    if (!message) {
      setReplyStatus(status, "回复内容不能为空。", "error");
      textarea.focus();
      return;
    }

    button.disabled = true;
    button.textContent = "发布中…";
    setReplyStatus(status, "正在发布回复…");
    try {
      const response = await fetch(ADMIN_REPLY_API, {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: JSON.stringify({ entry_id: Number(entry.id), message })
      });
      const data = await response.json().catch(() => ({}));

      if (response.status === 401) {
        adminAuthenticated = false;
        await loadEntries(true);
        setStatus(data.error || "管理员登录已失效，请重新登录。", "error");
        return;
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "回复发布失败，请稍后重试。");
      }

      textarea.value = "";
      await loadEntries(true);
      setStatus("开发者回复已发布。", "success");
    } catch (error) {
      setReplyStatus(status, error.message || "网络请求失败，请重试。", "error");
    } finally {
      button.disabled = false;
      button.textContent = "发布回复";
    }
  });

  return replyForm;
}
function createEntry(entry) {
  const article = document.createElement("article");
  article.className = "guestbook-entry";
  const head = document.createElement("div");
  head.className = "guestbook-entry-head";
  const avatar = document.createElement("span");
  avatar.className = "guestbook-entry-avatar";
  avatar.setAttribute("aria-hidden", "true");
  avatar.textContent = Array.from(entry.name || "?")[0] || "?";
  const meta = document.createElement("div");
  meta.className = "guestbook-entry-meta";
  const name = document.createElement("span");
  name.className = "guestbook-entry-name";
  name.textContent = entry.name;
  const date = document.createElement("time");
  date.className = "guestbook-entry-date";
  date.dateTime = entry.created_at;
  date.textContent = formatDate(entry.created_at);
  meta.append(name, date);
  head.append(avatar, meta);

  const message = document.createElement("p");
  message.className = "guestbook-entry-message";
  message.textContent = entry.message;

  article.append(head, message);

  const replies = Array.isArray(entry.replies) ? entry.replies : [];
  if (replies.length || adminAuthenticated) {
    const replySection = document.createElement("div");
    replySection.className = "guestbook-replies";
    if (replies.length) {
      const heading = document.createElement("div");
      heading.className = "guestbook-replies-heading";
      heading.textContent = replies.length === 1 ? "1 条回复" : replies.length + " 条回复";
      replySection.append(heading);
      replies.forEach(reply => replySection.append(createReply(reply)));
    }
    if (adminAuthenticated) replySection.append(createAdminReplyForm(entry));
    article.append(replySection);
  }

  return article;
}
async function loadEntries(reset = true) {
  if (loading) return;
  loading = true;
  moreButton.disabled = true;
  if (reset) {
    offset = 0;
    total = 0;
    listNode.replaceChildren();
    const placeholder = document.createElement("div");
    placeholder.className = "guestbook-empty";
    placeholder.textContent = "正在读取留言…";
    listNode.append(placeholder);
  }
  try {
    const response = await fetch(`${API}?limit=${PAGE_SIZE}&offset=${offset}`, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "留言读取失败，请稍后重试。");
    total = data.total || 0;
    if (reset) listNode.replaceChildren();
    if (!data.entries?.length && reset) {
      const empty = document.createElement("div");
      empty.className = "guestbook-empty";
      empty.textContent = "还没有留言，来写下第一条吧。";
      listNode.append(empty);
    } else {
      data.entries.forEach(entry => listNode.append(createEntry(entry)));
    }
    offset += data.entries?.length || 0;
    countNode.textContent = `${total} 条留言`;
    moreButton.hidden = offset >= total || total === 0;
    setStatus("");
  } catch (error) {
    if (reset) {
      listNode.replaceChildren();
      const empty = document.createElement("div");
      empty.className = "guestbook-empty";
      empty.textContent = error.message || "暂时无法连接留言板。";
      listNode.append(empty);
    }
    countNode.textContent = "暂不可用";
    setStatus(error.message || "暂时无法连接留言板。", "error");
    moreButton.hidden = true;
  } finally {
    loading = false;
    moreButton.disabled = false;
  }
}
form.addEventListener("submit", async event => {
  event.preventDefault();
  if (submitButton.disabled) return;
  const name = nameInput.value.trim();
  const message = messageInput.value.trim();
  if (!name || !message) {
    setStatus("请先填写名字和留言内容。", "error");
    return;
  }
  submitButton.disabled = true;
  submitButton.querySelector("span").textContent = "发送中…";
  setStatus("正在发送留言…");
  try {
    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
      body: JSON.stringify({ name, message, website: form.elements.website.value })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "发送失败，请稍后再试。");
    messageInput.value = "";
    setStatus("留言已发布，谢谢你来留言！", "success");
    await loadEntries(true);
    setStatus("留言已发布，谢谢你来留言！", "success");
  } catch (error) {
    setStatus(error.message || "发送失败，请检查网络后重试。", "error");
  } finally {
    submitButton.disabled = false;
    submitButton.querySelector("span").textContent = "发送留言";
  }
});
moreButton.addEventListener("click", () => loadEntries(false));
window.addEventListener("admin-session-changed", async () => {
  await refreshAdminState();
  await loadEntries(true);
});

// 移动端键盘弹出后，只按可视视口的实际边界微调页面滚动，避免重复叠加 offsetTop。
function keepFocusedFieldVisible() {
  const field = document.activeElement;
  if (!field || !form.contains(field) || !field.matches("input:not([name='website']), textarea")) return;

  const viewport = window.visualViewport;
  const viewportHeight = viewport ? viewport.height : window.innerHeight;
  const rect = field.getBoundingClientRect();
  const safeTop = 76;
  const safeBottom = viewportHeight - 24;
  let shift = 0;

  if (rect.bottom > safeBottom) {
    shift = rect.bottom - safeBottom;
  } else if (rect.top < safeTop) {
    shift = rect.top - safeTop;
  }

  if (Math.abs(shift) > 2) {
    window.scrollBy({ top: shift, behavior: "smooth" });
  }
}

let keyboardAdjustFrame = 0;
function scheduleKeyboardAdjustment() {
  cancelAnimationFrame(keyboardAdjustFrame);
  keyboardAdjustFrame = requestAnimationFrame(() => {
    keyboardAdjustFrame = requestAnimationFrame(keepFocusedFieldVisible);
  });
}

form.addEventListener("focusin", event => {
  if (event.target.matches("input:not([name='website']), textarea")) {
    scheduleKeyboardAdjustment();
  }
});
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", scheduleKeyboardAdjustment, { passive: true });
}
window.addEventListener("orientationchange", scheduleKeyboardAdjustment, { passive: true });
refreshAdminState().finally(() => loadEntries());
