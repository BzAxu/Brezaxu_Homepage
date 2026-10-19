/**
 * Reverse-proxy the standalone Waifu-Gallery Pages project under /Waifu-Gallery.
 * The trailing-slash redirect is important because the gallery uses relative
 * asset URLs (./assets/...), which resolve incorrectly from /Waifu-Gallery.
 */
export async function onRequest(context) {
  const incoming = new URL(context.request.url);

  if (incoming.pathname === "/Waifu-Gallery") {
    incoming.pathname = "/Waifu-Gallery/";
    return Response.redirect(incoming.toString(), 308);
  }

  const prefix = "/Waifu-Gallery";
  if (incoming.pathname !== prefix && !incoming.pathname.startsWith(prefix + "/")) {
    return new Response("Not found", { status: 404 });
  }

  const upstream = new URL("https://waifu-gallery-bce.pages.dev");
  upstream.pathname = incoming.pathname.slice(prefix.length) || "/";
  upstream.search = incoming.search;

  const headers = new Headers(context.request.headers);
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

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}
