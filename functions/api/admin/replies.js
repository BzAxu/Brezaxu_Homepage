import {
  adminJson,
  checkSameOrigin,
  verifyAdminSession
} from "../../_shared/admin-auth.js";

const MAX_BODY_BYTES = 8192;
const DEVELOPER_NAME = "BzAxu";

export async function onRequest({ request, env }) {
  if (request.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: {
        Allow: "POST",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff"
      }
    });
  }

  // Require a same-origin browser request before allowing a cookie-authenticated write.
  if (!checkSameOrigin(request)) {
    return adminJson({ ok: false, error: "请求来源无效" }, 403);
  }

  if (!await verifyAdminSession(request, env)) {
    return adminJson({ ok: false, error: "管理员登录已失效，请重新登录" }, 401);
  }

  if (!env.DB) {
    return adminJson({ ok: false, error: "留言板数据库尚未绑定" }, 503);
  }

  const contentType = (request.headers.get("Content-Type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return adminJson({ ok: false, error: "请求格式无效" }, 415);
  }

  const contentLength = Number(request.headers.get("Content-Length") || 0);
  if (contentLength > MAX_BODY_BYTES) {
    return adminJson({ ok: false, error: "请求内容过大" }, 413);
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return adminJson({ ok: false, error: "请求格式无效" }, 400);
  }

  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return adminJson({ ok: false, error: "请求内容过大" }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return adminJson({ ok: false, error: "请求格式无效" }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return adminJson({ ok: false, error: "请求格式无效" }, 400);
  }

  const entryId = body.entry_id;
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!Number.isSafeInteger(entryId) || entryId < 1) {
    return adminJson({ ok: false, error: "留言编号无效" }, 400);
  }
  if (!message) {
    return adminJson({ ok: false, error: "回复内容不能为空" }, 400);
  }
  if (Array.from(message).length > 500) {
    return adminJson({ ok: false, error: "回复最多 500 个字符" }, 400);
  }

  const createdAt = new Date().toISOString();

  try {
    // The author name and developer flag are server-controlled; clients cannot impersonate another user.
    // INSERT ... SELECT keeps the existence check and insert in one database statement.
    const result = await env.DB.prepare(
      "INSERT INTO guestbook_replies (entry_id, name, message, created_at, is_developer) " +
      "SELECT id, ?, ?, ?, 1 FROM guestbook_entries WHERE id = ?"
    ).bind(DEVELOPER_NAME, message, createdAt, entryId).run();

    if (!result.success) {
      return adminJson({ ok: false, error: "回复发布失败，请稍后重试" }, 503);
    }
    if (Number(result.meta?.changes || 0) === 0) {
      return adminJson({ ok: false, error: "这条留言不存在或已被删除" }, 404);
    }

    return adminJson({
      ok: true,
      reply: {
        id: result.meta?.last_row_id ?? null,
        entry_id: entryId,
        name: DEVELOPER_NAME,
        message,
        created_at: createdAt,
        is_developer: 1
      }
    }, 201);
  } catch {
    return adminJson({ ok: false, error: "回复发布失败，请稍后重试" }, 503);
  }
}
