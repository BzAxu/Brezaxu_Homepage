import {
  adminCookie,
  adminJson,
  checkSameOrigin,
  clearAdminCookie
} from "../../_shared/admin-auth.js";

export async function onRequestPost({ request }) {
  if (!checkSameOrigin(request)) {
    return adminJson({ ok: false, error: "请求来源无效" }, 403);
  }
  return adminJson({ ok: true }, 200, { "Set-Cookie": clearAdminCookie() });
}
