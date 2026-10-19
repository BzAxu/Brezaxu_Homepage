const encoder = new TextEncoder();
const COOKIE_NAME = "__Host-guestbook_admin";
const SESSION_SECONDS = 24 * 60 * 60;

const json = (data, status = 200, extraHeaders = {}) => new Response(JSON.stringify(data), {
  status,
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    ...extraHeaders
  }
});

function base64url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64url(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - base64.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

async function sha256(value) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

async function signingKey(env) {
  if (typeof env.SESSION_SECRET !== "string" || env.SESSION_SECRET.length < 32) {
    throw new Error("Admin session secret is not configured");
  }
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(env.SESSION_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

function safeEqual(a, b) {
  const left = encoder.encode(a);
  const right = encoder.encode(b);
  let diff = left.length ^ right.length;
  const max = Math.max(left.length, right.length);
  for (let i = 0; i < max; i++) diff |= (left[i] || 0) ^ (right[i] || 0);
  return diff === 0;
}

export function adminJson(data, status = 200, headers = {}) {
  return json(data, status, headers);
}

export function hasAdminConfig(env) {
  return typeof env.ADMIN_PASSWORD === "string" &&
    env.ADMIN_PASSWORD.length >= 12 &&
    typeof env.SESSION_SECRET === "string" &&
    env.SESSION_SECRET.length >= 32;
}

export function checkSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}

export async function verifyAdminPassword(password, env) {
  if (!hasAdminConfig(env) || typeof password !== "string") return false;
  return safeEqual(password, env.ADMIN_PASSWORD);
}

export async function hashClientAddress(request, env) {
  const address = request.headers.get("CF-Connecting-IP") || "unknown";
  const digest = await sha256(env.SESSION_SECRET + "|" + address);
  return base64url(digest);
}

export function getAdminCookie(request) {
  const cookieHeader = request.headers.get("Cookie") || "";
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(COOKIE_NAME + "=")) {
      return trimmed.slice(COOKIE_NAME.length + 1);
    }
  }
  return "";
}

export async function createAdminSession(env) {
  const key = await signingKey(env);
  const passwordFingerprint = base64url(await sha256(env.ADMIN_PASSWORD));
  const payload = {
    v: 1,
    exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS,
    pf: passwordFingerprint
  };
  const encodedPayload = base64url(encoder.encode(JSON.stringify(payload)));
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(encodedPayload)));
  return encodedPayload + "." + base64url(signature);
}

export async function verifyAdminSession(request, env) {
  if (!hasAdminConfig(env)) return false;
  try {
    const token = getAdminCookie(request);
    const parts = token.split(".");
    if (parts.length !== 2 || !parts[0] || !parts[1]) return false;
    const key = await signingKey(env);
    const signatureValid = await crypto.subtle.verify(
      "HMAC",
      key,
      decodeBase64url(parts[1]),
      encoder.encode(parts[0])
    );
    if (!signatureValid) return false;
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64url(parts[0])));
    if (payload.v !== 1 || !Number.isInteger(payload.exp) || payload.exp <= Math.floor(Date.now() / 1000)) {
      return false;
    }
    const currentFingerprint = base64url(await sha256(env.ADMIN_PASSWORD));
    return typeof payload.pf === "string" && safeEqual(payload.pf, currentFingerprint);
  } catch {
    return false;
  }
}

export function adminCookie(token) {
  return COOKIE_NAME + "=" + token + "; Path=/; Max-Age=" + SESSION_SECONDS + "; HttpOnly; Secure; SameSite=Strict";
}

export function clearAdminCookie() {
  return COOKIE_NAME + "=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict";
}
