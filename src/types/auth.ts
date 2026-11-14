import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface JwtPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
}
