/**
 * Reverse-proxy the standalone Waifu-Gallery Pages project under /Waifu-Gallery.
 * The no-slash URL is served directly with a <base> URL so relative CSS, JS,
 * image and API paths continue to resolve below /Waifu-Gallery/.
 */
export async function onRequest(context) {
  const incoming = new URL(context.request.url);
  const prefix = "/Waifu-Gallery";

  if (incoming.pathname !== prefix && !incoming.pathname.startsWith(prefix + "/")) {
    return new Response("Not found", { status: 404 });
  }

  const isBarePath = incoming.pathname === prefix;
  const upstream = new URL("https://waifu-gallery-bce.pages.dev");
  upstream.pathname = incoming.pathname.slice(prefix.length) || "/";
  upstream.search = incoming.search;

  const headers = new Headers(context.request.headers);
  headers.delete("host");
  headers.delete("content-length");

  const proxyRequest = new Request(upstream.toString(), {
    method: context.request.method,
    headers,
    body: ["GET", "HEAD"].includes(context.request.method) ? undefined : context.request.body,
    redirect: "manual"
  });

  const response = await fetch(proxyRequest);
  const responseHeaders = new Headers(response.headers);
  responseHeaders.delete("content-security-policy");
  responseHeaders.delete("content-security-policy-report-only");

  const contentType = responseHeaders.get("content-type") || "";
  if (isBarePath && context.request.method !== "HEAD" &&
      response.ok && contentType.includes("text/html")) {
    let html = await response.text();
    if (/<head(?:\s[^>]*)?>/i.test(html) && !/<base\b/i.test(html)) {
      html = html.replace(/<head(\s[^>]*)?>/i, (head) => `${head}\n<base href="/Waifu-Gallery/">`);
    }
    responseHeaders.delete("content-length");
    responseHeaders.delete("content-encoding");
    responseHeaders.delete("etag");
    responseHeaders.set("cache-control", "no-store");
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders
    });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}
