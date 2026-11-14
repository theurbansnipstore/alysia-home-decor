import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { accountSettingsSchema } from "@/lib/validations/store-settings";
import { setAccountSettings } from "@/lib/settings/account";
import { SETTINGS_AREA_ROLES } from "@/lib/admin/settings-roles";

export const PATCH = handleSettingsPatch(accountSettingsSchema, setAccountSettings, SETTINGS_AREA_ROLES);
