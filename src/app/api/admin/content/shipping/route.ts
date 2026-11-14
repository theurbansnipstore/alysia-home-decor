import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { shippingSettingsSchema } from "@/lib/validations/store-settings";
import { setShippingSettings } from "@/lib/settings/shipping";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(shippingSettingsSchema, setShippingSettings, CONTENT_AREA_ROLES);
