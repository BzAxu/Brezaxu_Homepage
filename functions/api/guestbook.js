const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin"
  }
});

async function hashAddress(address) {
  const bytes = new TextEncoder().encode(address);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  if (!env.DB) return json({ error: "留言板数据库尚未绑定，请稍后再试。" }, 503);

  if (request.method === "GET") {
    const limit = Math.min(50, Math.max(1, Number.parseInt(url.searchParams.get("limit") || "20", 10) || 20));
    const offset = Math.max(0, Number.parseInt(url.searchParams.get("offset") || "0", 10) || 0);
    try {
      const result = await env.DB.prepare(
        "SELECT id, name, message, created_at FROM guestbook_entries ORDER BY id DESC LIMIT ? OFFSET ?"
      ).bind(limit, offset).all();
      const entries = result.results || [];
      const count = await env.DB.prepare("SELECT COUNT(*) AS total FROM guestbook_entries").first();

      // Replies are returned only for this page of entries to keep the response bounded.
      let repliesByEntry = new Map();
      if (entries.length) {
        const placeholders = entries.map(() => "?").join(", ");
        const replyResult = await env.DB.prepare(
          "SELECT id, entry_id, name, message, created_at, is_developer FROM guestbook_replies " +
          "WHERE entry_id IN (" + placeholders + ") ORDER BY id ASC"
        ).bind(...entries.map(entry => entry.id)).all();
        for (const reply of replyResult.results || []) {
          if (!repliesByEntry.has(reply.entry_id)) repliesByEntry.set(reply.entry_id, []);
          repliesByEntry.get(reply.entry_id).push(reply);
        }
      }

      return json({
        entries: entries.map(entry => ({
          ...entry,
          replies: repliesByEntry.get(entry.id) || []
        })),
        total: count?.total || 0
      });
    } catch (error) {
      return json({ error: "留言板数据表还未初始化，请稍后再试。" }, 503);
    }
  }

  if (request.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, POST" } });
  }

  const origin = request.headers.get("Origin");
  if (origin && origin !== url.origin) return json({ error: "请求来源无效。" }, 403);
  if (Number(request.headers.get("Content-Length") || 0) > 6000) {
    return json({ error: "留言内容太长了。" }, 413);
  }

  let rawBody;
  try {
    rawBody = await request.text();
  } catch {
    return json({ error: "提交内容格式不正确。" }, 400);
  }
  if (new TextEncoder().encode(rawBody).byteLength > 6000) {
    return json({ error: "留言内容太长了。" }, 413);
  }

  let body;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return json({ error: "提交内容格式不正确。" }, 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return json({ error: "提交内容格式不正确。" }, 400);
  }

  // A hidden honeypot field quietly rejects most automated form spam.
  if (typeof body.website === "string" && body.website.trim()) return json({ ok: true });
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!name || !message) return json({ error: "名字和留言内容都不能为空。" }, 400);
  if (Array.from(name).length > 24) return json({ error: "名字最多 24 个字符。" }, 400);
  if (Array.from(message).length > 500) return json({ error: "留言最多 500 个字符。" }, 400);

  try {
    const ip = request.headers.get("CF-Connecting-IP") || "unknown";
    const ipHash = await hashAddress(ip);
    const now = Math.floor(Date.now() / 1000);
    const previous = await env.DB.prepare(
      "SELECT last_post FROM guestbook_rate_limits WHERE ip_hash = ?"
    ).bind(ipHash).first();
    if (previous && now - Number(previous.last_post) < 45) {
      return json({ error: "发送得太快啦，请稍等 45 秒再留言。" }, 429);
    }

    await env.DB.prepare(
      "INSERT INTO guestbook_entries (name, message, created_at) VALUES (?, ?, ?)"
    ).bind(name, message, new Date().toISOString()).run();
    await env.DB.prepare(
      "INSERT INTO guestbook_rate_limits (ip_hash, last_post) VALUES (?, ?) ON CONFLICT(ip_hash) DO UPDATE SET last_post = excluded.last_post"
    ).bind(ipHash, now).run();
    await env.DB.prepare("DELETE FROM guestbook_rate_limits WHERE last_post < ?").bind(now - 7 * 86400).run();
    return json({ ok: true }, 201);
  } catch (error) {
    return json({ error: "留言发送失败，数据库可能尚未初始化，请稍后重试。" }, 503);
  }
}
