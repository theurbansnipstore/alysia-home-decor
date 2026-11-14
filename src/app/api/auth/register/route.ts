import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { createSession } from "@/lib/session";
import { registerSchema } from "@/lib/validations/auth";
import { apiSuccess, apiError } from "@/lib/api-response";
import { emit } from "@/lib/services/notifications";
import { importAddressesFromGuestOrders } from "@/lib/checkout/account-linking";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return apiError("Invalid request body", 400);
    }

    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Invalid input", 400, parsed.error.flatten().fieldErrors);
    }

    const { name, email, password, phone, rememberMe } = parsed.data;

    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      return apiError("An account with this email already exists", 409);
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.user.create({
      data: { name, email, phone: phone || null, passwordHash, role: "CUSTOMER" },
      select: { id: true, name: true, email: true, role: true },
    });

    await createSession(user, { rememberMe });

    await emit("user.registered", { userId: user.id, email: user.email, phone: phone || undefined, name: user.name });
    await importAddressesFromGuestOrders(user.id, user.email);

    return apiSuccess({ user }, 201);
  } catch (err) {
    console.error("[POST /api/auth/register]", err);
    return apiError("Registration failed. Please try again.", 500);
  }
}
