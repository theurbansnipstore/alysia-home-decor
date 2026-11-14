import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { mediaSettingsSchema } from "@/lib/validations/store-settings";
import { getMediaSettings, setMediaSettings } from "@/lib/settings/media";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { requireApiRole } from "@/lib/admin/api-auth";
import { apiSuccess } from "@/lib/api-response";

/** Module 38 — needed by the CMS image picker (other admin forms fetch the
 *  saved media list to offer "choose from Media") and by the media
 *  library's own usage lookup. Read access uses the same CONTENT_AREA_ROLES
 *  gate as the PATCH below — no wider than what could already edit media. */
export async function GET() {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;
  return apiSuccess(await getMediaSettings());
}

export const PATCH = handleSettingsPatch(mediaSettingsSchema, setMediaSettings, CONTENT_AREA_ROLES);
