// Same-origin proxy for the public SFW waifu.pics image API.
export async function onRequestGet() {
  try {
    const upstream = await fetch("https://api.waifu.pics/many/sfw/waifu", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: "{}"
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      return Response.json({
        error: "图片服务返回 HTTP " + upstream.status
      }, { status: 502, headers: { "Cache-Control": "no-store" } });
    }
    if (!Array.isArray(data.files)) {
      return Response.json({ error: "图片服务返回的数据格式不正确" }, {
        status: 502,
        headers: { "Cache-Control": "no-store" }
      });
    }
    return Response.json({ files: data.files }, {
      headers: { "Cache-Control": "public, max-age=60" }
    });
  } catch {
    return Response.json({ error: "Cloudflare 无法连接图片服务" }, {
      status: 502,
      headers: { "Cache-Control": "no-store" }
    });
  }
}
