const CLIENT_ID = "MOBrBDS8blbauoSck0ZfDbtuzpyT";
const CLIENT_SECRET = "lsACyCD94FhDUtGTXi3QzcFE2uU1hqtDaKeqrdwj";
const HASH_SECRET = "28c1fdd170a5204386cb1313c7077b34f83e4aaf4aa829ce78c231e05b0bae2c";
const API = "https://app-api.pixiv.net";

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*"
    }
  });
}

async function md5Hex(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("MD5", bytes);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function getAccessToken(refreshToken) {
  const time = new Date().toISOString().replace(/\.\d{3}Z$/, "+00:00");
  const form = new URLSearchParams({
    get_secure_url: "1",
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    grant_type: "refresh_token",
    refresh_token: refreshToken
  });
  const response = await fetch("https://oauth.secure.pixiv.net/auth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Client-Time": time,
      "X-Client-Hash": await md5Hex(time + HASH_SECRET),
      "App-OS": "ios",
      "App-OS-Version": "14.6",
      "User-Agent": "PixivIOSApp/7.13.3 (iOS 14.6; iPhone13,2)"
    },
    body: form
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.response?.access_token) {
    throw new Error("Pixiv 授权失败（HTTP " + response.status + "）。请检查 refresh token 是否有效。");
  }
  return data.response;
}

function cleanIllustrations(items, origin) {
  return (items || []).map((item) => ({
    id: item.id,
    title: item.title || "未命名作品",
    author: item.user?.name || "Pixiv 用户",
    userId: item.user?.id || null,
    pageCount: item.page_count || 1,
    image: item.image_urls?.large || item.image_urls?.medium || item.image_urls?.square_medium || "",
    pages: item.meta_pages?.map((page) => page.image_urls?.large || page.image_urls?.original || "").filter(Boolean) || [],
    pixivUrl: "https://www.pixiv.net/artworks/" + item.id
  })).filter((item) => item.id && item.image);
}

export async function onRequestGet({ request, env }) {
  if (!env.PIXIV_REFRESH_TOKEN) {
    return json({
      error: "尚未配置 Pixiv 授权",
      message: "请在 Cloudflare Pages 项目设置中添加 PIXIV_REFRESH_TOKEN 环境变量，然后重新部署。"
    }, 503);
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "bookmarks" ? "bookmarks" : "recommended";
  const cursor = url.searchParams.get("cursor");
  try {
    const token = await getAccessToken(env.PIXIV_REFRESH_TOKEN);
    let apiUrl;
    if (cursor) {
      let next;
      try { next = new URL(cursor); } catch { return json({ error: "无效的分页参数" }, 400); }
      if (next.origin !== API || !next.pathname.startsWith("/v1/")) {
        return json({ error: "无效的分页地址" }, 400);
      }
      apiUrl = next;
    } else if (mode === "bookmarks") {
      if (!token.user?.id) return json({ error: "Pixiv 未返回当前用户 ID" }, 502);
      apiUrl = new URL("/v1/user/bookmarks/illust", API);
      apiUrl.searchParams.set("user_id", String(token.user.id));
      apiUrl.searchParams.set("restrict", "private");
      apiUrl.searchParams.set("type", "illust");
    } else {
      apiUrl = new URL("/v1/illust/recommended", API);
      apiUrl.searchParams.set("content_type", "illust");
      apiUrl.searchParams.set("include_ranking_illusts", "true");
    }

    const response = await fetch(apiUrl, {
      headers: {
        Authorization: "Bearer " + token.access_token,
        "App-OS": "ios",
        "App-OS-Version": "14.6",
        "User-Agent": "PixivIOSApp/7.13.3 (iOS 14.6; iPhone13,2)",
        "Referer": "https://app-api.pixiv.net/"
      }
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return json({
        error: "Pixiv 接口请求失败",
        message: "Pixiv 返回 HTTP " + response.status + (data.error?.message ? "：" + data.error.message : "")
      }, response.status === 401 ? 401 : 502);
    }

    const illustrations = cleanIllustrations(data.illusts, url.origin);
    return json({
      mode,
      user: token.user ? { id: token.user.id, name: token.user.name } : null,
      illustrations,
      next: data.next_url || null
    });
  } catch (error) {
    return json({
      error: "Pixiv 连接失败",
      message: error instanceof Error ? error.message : "未知错误"
    }, 502);
  }
}
