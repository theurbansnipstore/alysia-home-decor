import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { homepageSettingsSchema } from "@/lib/validations/store-settings";
import { setHomepageSettings } from "@/lib/settings/homepage";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(homepageSettingsSchema, setHomepageSettings, CONTENT_AREA_ROLES);
