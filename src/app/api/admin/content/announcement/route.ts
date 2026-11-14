import { handleSettingsPatch } from "@/lib/admin/settings-route-helper";
import { announcementSettingsSchema } from "@/lib/validations/store-settings";
import { setAnnouncementSettings } from "@/lib/settings/announcement";
import { CONTENT_AREA_ROLES } from "@/lib/admin/content-roles";

export const PATCH = handleSettingsPatch(announcementSettingsSchema, setAnnouncementSettings, CONTENT_AREA_ROLES);
