(() => {
  const notice = document.getElementById("buildVersionNotice");
  if (!notice) return;

  notice.setAttribute("role", "button");
  notice.setAttribute("tabindex", "0");
  notice.setAttribute("aria-label", "打开管理员登录");

  const dialog = document.createElement("dialog");
  dialog.id = "adminLoginDialog";
  dialog.setAttribute("aria-labelledby", "adminLoginTitle");
  dialog.innerHTML = `
    <form class="admin-login-inner" id="adminLoginForm">
      <h2 id="adminLoginTitle">管理员登录</h2>
      <p>此入口仅用于站点管理。管理员密码由服务器验证，不会写入页面代码。</p>
      <label for="adminLoginPassword">管理员密码
        <input id="adminLoginPassword" name="password" type="password"
          autocomplete="current-password" minlength="1" maxlength="1024" required>
      </label>
      <p id="adminLoginStatus" role="status" aria-live="polite"></p>
      <div class="admin-login-actions">
        <button type="button" id="adminLoginCancel">取消</button>
        <button type="submit" id="adminLoginSubmit">登录</button>
      </div>
    </form>
  `;
  document.body.appendChild(dialog);

  const form = dialog.querySelector("#adminLoginForm");
  const password = dialog.querySelector("#adminLoginPassword");
  const status = dialog.querySelector("#adminLoginStatus");
  const submit = dialog.querySelector("#adminLoginSubmit");
  const cancel = dialog.querySelector("#adminLoginCancel");

  function openDialog() {
    status.textContent = "";
    password.value = "";
    if (!dialog.open) dialog.showModal();
    window.setTimeout(() => password.focus(), 0);
    fetch("/api/admin/session", { credentials: "same-origin", cache: "no-store" })
      .then(response => response.ok ? response.json() : null)
      .then(data => {
        if (data?.authenticated) {
          status.textContent = "当前浏览器已登录管理员会话。";
          password.placeholder = "已登录；重新输入密码可重新登录";
        } else {
          password.placeholder = "输入管理员密码";
        }
      })
      .catch(() => {
        status.textContent = "暂时无法检查登录状态，请稍后重试。";
      });
  }

  notice.addEventListener("click", openDialog);
  notice.addEventListener("keydown", event => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openDialog();
    }
  });
  cancel.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });
  dialog.addEventListener("close", () => notice.focus({ preventScroll: true }));

  form.addEventListener("submit", async event => {
    event.preventDefault();
    if (submit.disabled) return;
    status.textContent = "";
    submit.disabled = true;
    submit.textContent = "正在验证…";
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.value })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        status.textContent = data.error || "登录失败，请稍后重试。";
        return;
      }
      password.value = "";
      status.textContent = "登录成功。管理员会话有效期为 24 小时。";
      window.dispatchEvent(new CustomEvent("admin-session-changed", { detail: { authenticated: true } }));
      window.setTimeout(() => dialog.close(), 900);
    } catch {
      status.textContent = "网络请求失败，请检查网络后重试。";
    } finally {
      submit.disabled = false;
      submit.textContent = "登录";
    }
  });
})();
