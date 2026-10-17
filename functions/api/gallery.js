// Same-origin proxy for Waifu.im's public SFW image API.
export async function onRequestGet() {
  try {
    const upstream = await fetch("https://api.waifu.im/images?IsNsfw=False&PageSize=10", {
      headers: { "Accept": "application/json" }
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return Response.json({
        error: "图片服务返回 HTTP " + upstream.status
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    const files = Array.isArray(data.items)
      ? data.items.map((item) => item.url).filter((url) => typeof url === "string" && url.startsWith("https://"))
      : [];
    if (!files.length) {
      return Response.json({ error: "图片服务暂时没有返回可用图片" }, {
        status: 502,
        headers: { "Cache-Control": "no-store" }
      });
    }
    return Response.json({ files }, {
      headers: { "Cache-Control": "public, max-age=60" }
    });
  } catch {
    return Response.json({ error: "Cloudflare 无法连接图片服务" }, {
      status: 502,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
