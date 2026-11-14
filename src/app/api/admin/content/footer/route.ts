import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { footerSettingsSchema } from "@/lib/validations/store-settings";
import { setFooterSettings } from "@/lib/settings/footer";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(footerSettingsSchema, setFooterSettings, CONTENT_AREA_ROLES);
