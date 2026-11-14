import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { checkoutSettingsSchema } from "@/lib/validations/store-settings";
import { setCheckoutSettings } from "@/lib/settings/checkout";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";

export const PATCH = handleSettingsPatch(checkoutSettingsSchema, setCheckoutSettings, SETTINGS_AREA_ROLES);
