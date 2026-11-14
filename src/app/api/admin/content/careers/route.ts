import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { careersSettingsSchema } from "@/lib/validations/store-settings";
import { setCareersSettings } from "@/lib/settings/careers";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(careersSettingsSchema, setCareersSettings, CONTENT_AREA_ROLES);
