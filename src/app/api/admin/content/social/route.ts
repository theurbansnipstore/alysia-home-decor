import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { socialSettingsSchema } from "@/lib/validations/store-settings";
import { setSocialSettings } from "@/lib/settings/social";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(socialSettingsSchema, setSocialSettings, CONTENT_AREA_ROLES);
