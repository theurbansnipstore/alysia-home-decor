import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@prisma/client";
import { signToken, verifyToken } from "@/lib/auth";
import type { SessionUser } from "@/types/auth";

const COOKIE_NAME = process.env.AUTH_COOKIE_NAME || "kutir_session";
const DEFAULT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const REMEMBER_EXPIRES_IN = process.env.JWT_REMEMBER_EXPIRES_IN || "30d";

const DEFAULT_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;
const REMEMBER_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

export interface CreateSessionOptions {
  rememberMe?: boolean;
}

export async function createSession(user: SessionUser, options: CreateSessionOptions = {}): Promise<void> {
  const rememberMe = options.rememberMe ?? false;
  const expiresIn = rememberMe ? REMEMBER_EXPIRES_IN : DEFAULT_EXPIRES_IN;
  const maxAge = rememberMe ? REMEMBER_MAX_AGE_SECONDS : DEFAULT_MAX_AGE_SECONDS;

  const token = await signToken(
    { userId: user.id, email: user.email, name: user.name, role: user.role },
    expiresIn
  );

  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  });
}

export async function getSession(): Promise<SessionUser | null> {
  const token = cookies().get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  return {
    id: payload.userId,
    email: payload.email,
    name: payload.name,
    role: payload.role,
  };
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    redirect("/login");
  }
  return session;
}

export function hasRole(session: SessionUser | null, allowed: Role | Role[]): boolean {
  if (!session) return false;
  const roles = Array.isArray(allowed) ? allowed : [allowed];
  return roles.includes(session.role);
}

export async function requireRole(allowed: Role | Role[]): Promise<SessionUser> {
  const session = await requireSession();
  if (!hasRole(session, allowed)) {
    redirect("/");
  }
  return session;
}

export async function destroySession(): Promise<void> {
  cookies().set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
