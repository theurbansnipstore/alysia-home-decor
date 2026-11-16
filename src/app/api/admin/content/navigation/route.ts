// Query live data and request context only when this endpoint is called.
export const dynamic = "force-dynamic";

import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { navigationSettingsSchema } from "@/lib/validations/store-settings";
import { getNavigationSettings, setNavigationSettings } from "@/lib/settings/navigation";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";
import { requireApiRole } from "@/lib/admin/api-auth";
import { apiSuccess } from "@/lib/api-response";

export async function GET() {
  const auth = await requireApiRole(CONTENT_AREA_ROLES);
  if (!auth.ok) return auth.response;
  return apiSuccess(await getNavigationSettings());
}

export const PATCH = handleSettingsPatch(navigationSettingsSchema, setNavigationSettings, CONTENT_AREA_ROLES);
