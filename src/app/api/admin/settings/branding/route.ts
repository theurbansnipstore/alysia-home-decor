import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { brandingSettingsSchema } from "@/lib/validations/store-settings";
import { setBrandingSettings } from "@/lib/settings/branding";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";

export const PATCH = handleSettingsPatch(brandingSettingsSchema, setBrandingSettings, SETTINGS_AREA_ROLES);
