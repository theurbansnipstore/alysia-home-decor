import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { productPageSettingsSchema } from "@/lib/validations/store-settings";
import { setProductPageSettings } from "@/lib/settings/product-page";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";

export const PATCH = handleSettingsPatch(productPageSettingsSchema, setProductPageSettings, SETTINGS_AREA_ROLES);
