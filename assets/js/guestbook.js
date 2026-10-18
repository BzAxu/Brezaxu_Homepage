const API = "/api/guestbook";
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

function setStatus(message = "", kind = "") {
  statusNode.textContent = message;
  statusNode.classList.toggle("is-error", kind === "error");
  statusNode.classList.toggle("is-success", kind === "success");
}
function formatDate(value) {
  const date = new Date(value.endsWith("Z") ? value : value.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false
  }).format(date);
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
      data.entries.forEach((entry) => listNode.append(createEntry(entry)));
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
form.addEventListener("submit", async (event) => {
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

// 移动端键盘弹出后，自动将当前输入框移到可视区域内，避免被键盘遮挡。
function keepFocusedFieldVisible() {
  const field = document.activeElement;
  if (!field || !form.contains(field) || !field.matches("input:not([name='website']), textarea")) return;
  const viewport = window.visualViewport;
  const viewportTop = viewport ? viewport.offsetTop : 0;
  const viewportBottom = viewport ? viewport.offsetTop + viewport.height : window.innerHeight;
  const rect = field.getBoundingClientRect();
  const safeTop = viewportTop + 76;
  const safeBottom = viewportBottom - 24;
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

form.addEventListener("focusin", (event) => {
  if (event.target.matches("input:not([name='website']), textarea")) {
    requestAnimationFrame(() => requestAnimationFrame(keepFocusedFieldVisible));
  }
});
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", () => {
    requestAnimationFrame(keepFocusedFieldVisible);
  }, { passive: true });
}
window.addEventListener("orientationchange", () => {
  requestAnimationFrame(() => requestAnimationFrame(keepFocusedFieldVisible));
}, { passive: true });
loadEntries();
