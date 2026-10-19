import {
  adminCookie,
  adminJson,
  checkSameOrigin,
  createAdminSession,
  hashClientAddress,
  hasAdminConfig,
  verifyAdminPassword
} from "../../_shared/admin-auth.js";

export async function onRequestPost({ request, env }) {
  if (!checkSameOrigin(request)) {
    return adminJson({ ok: false, error: "请求来源无效" }, 403);
  }
  if (!hasAdminConfig(env)) {
    return adminJson({ ok: false, error: "管理员登录尚未配置" }, 503);
  }
  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > 4096) {
    return adminJson({ ok: false, error: "请求内容过大" }, 413);
  }
  if (!(request.headers.get("Content-Type") || "").toLowerCase().includes("application/json")) {
    return adminJson({ ok: false, error: "请求格式无效" }, 415);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return adminJson({ ok: false, error: "请求格式无效" }, 400);
  }
  const password = body && typeof body.password === "string" ? body.password : "";
  if (password.length > 1024) {
    return adminJson({ ok: false, error: "密码不正确" }, 401);
  }

  const now = Math.floor(Date.now() / 1000);
  let ipHash;
  try {
    ipHash = await hashClientAddress(request, env);
  } catch {
    return adminJson({ ok: false, error: "管理员登录暂时不可用" }, 503);
  }

  let row;
  try {
    row = await env.DB.prepare(
      "SELECT window_started, attempts, blocked_until FROM admin_login_attempts WHERE ip_hash = ?"
    ).bind(ipHash).first();
  } catch {
    return adminJson({ ok: false, error: "管理员登录暂时不可用" }, 503);
  }

  if (row && Number(row.blocked_until) > now) {
    return adminJson({ ok: false, error: "尝试次数过多，请稍后再试" }, 429, {
      "Retry-After": String(Number(row.blocked_until) - now)
    });
  }

  let windowStarted = row ? Number(row.window_started) : now;
  let attempts = row ? Number(row.attempts) : 0;
  if (!row || now - windowStarted >= 900 || now < windowStarted) {
    windowStarted = now;
    attempts = 0;
  }

  let passwordMatches = false;
  try {
    passwordMatches = await verifyAdminPassword(password, env);
  } catch {
    return adminJson({ ok: false, error: "管理员登录暂时不可用" }, 503);
  }

  if (!passwordMatches) {
    attempts += 1;
    const blockedUntil = attempts >= 5 ? now + 900 : 0;
    try {
      await env.DB.prepare(
        "INSERT INTO admin_login_attempts (ip_hash, window_started, attempts, blocked_until) VALUES (?, ?, ?, ?) " +
        "ON CONFLICT(ip_hash) DO UPDATE SET window_started = excluded.window_started, attempts = excluded.attempts, blocked_until = excluded.blocked_until"
      ).bind(ipHash, windowStarted, attempts, blockedUntil).run();
    } catch {
      return adminJson({ ok: false, error: "管理员登录暂时不可用" }, 503);
    }
    return adminJson({ ok: false, error: blockedUntil ? "尝试次数过多，请 15 分钟后再试" : "密码不正确" }, blockedUntil ? 429 : 401);
  }

  try {
    await env.DB.prepare("DELETE FROM admin_login_attempts WHERE ip_hash = ?").bind(ipHash).run();
    const token = await createAdminSession(env);
    return adminJson({ ok: true, expiresIn: 86400 }, 200, {
      "Set-Cookie": adminCookie(token)
    });
  } catch {
    return adminJson({ ok: false, error: "管理员登录暂时不可用" }, 503);
  }
}
