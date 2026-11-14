import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { aboutSettingsSchema } from "@/lib/validations/store-settings";
import { setAboutSettings } from "@/lib/settings/about";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(aboutSettingsSchema, setAboutSettings, CONTENT_AREA_ROLES);
