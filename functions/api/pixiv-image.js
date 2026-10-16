function jsonError(message, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

export async function onRequestGet({ request }) {
  const url = new URL(request.url);
  const target = url.searchParams.get("url");
  if (!target) return jsonError("缺少图片地址");
  let imageUrl;
  try { imageUrl = new URL(target); } catch { return jsonError("图片地址无效"); }
  if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "i.pximg.net") {
    return jsonError("只允许读取 Pixiv 图片域名");
  }

  const upstream = await fetch(imageUrl.toString(), {
    headers: { "Referer": "https://www.pixiv.net/", "User-Agent": "Mozilla/5.0" }
  });
  if (!upstream.ok) return jsonError("Pixiv 图片请求失败（HTTP " + upstream.status + "）", 502);
  const headers = new Headers();
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "image/jpeg");
  headers.set("Cache-Control", "public, max-age=3600");
  headers.set("X-Content-Type-Options", "nosniff");
  return new Response(upstream.body, { status: 200, headers });
}
