import { destroySession } from "@/lib/session";
import { apiSuccess } from "@/lib/api-response";

export async function POST() {
  await destroySession();
  return apiSuccess({ loggedOut: true });
}
