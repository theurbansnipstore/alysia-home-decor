import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { faqSettingsSchema } from "@/lib/validations/store-settings";
import { setFaqSettings } from "@/lib/settings/faq";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(faqSettingsSchema, setFaqSettings, CONTENT_AREA_ROLES);
