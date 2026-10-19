import { adminJson, verifyAdminSession } from "../../../_shared/admin-auth.js";

export async function onRequestGet({ request, env }) {
  const authenticated = await verifyAdminSession(request, env);
  return adminJson({ ok: true, authenticated });
}
