import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { shopSettingsSchema } from "@/lib/validations/store-settings";
import { setShopSettings } from "@/lib/settings/shop";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";

export const PATCH = handleSettingsPatch(shopSettingsSchema, setShopSettings, SETTINGS_AREA_ROLES);
