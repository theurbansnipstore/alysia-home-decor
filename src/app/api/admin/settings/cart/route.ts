import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { cartSettingsSchema } from "@/lib/validations/store-settings";
import { setCartSettings } from "@/lib/settings/cart";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";

export const PATCH = handleSettingsPatch(cartSettingsSchema, setCartSettings, SETTINGS_AREA_ROLES);
