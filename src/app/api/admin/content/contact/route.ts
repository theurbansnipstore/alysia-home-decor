import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { contactSettingsSchema } from "@/lib/validations/store-settings";
import { setContactSettings } from "@/lib/settings/contact";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(contactSettingsSchema, setContactSettings, CONTENT_AREA_ROLES);
