import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { returnsSettingsSchema } from "@/lib/validations/store-settings";
import { setReturnsSettings } from "@/lib/settings/returns";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(returnsSettingsSchema, setReturnsSettings, CONTENT_AREA_ROLES);
