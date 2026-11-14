import { NextResponse } from "next/server";

interface ApiSuccessBody<T> {
  success: true;
  data: T;
}

interface ApiErrorBody {
  success: false;
  error: string;
  details?: unknown;
}

export function apiSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ success: true, data }, { status });
}

export function apiError(message: string, status = 400, details?: unknown): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    { success: false, error: message, ...(details !== undefined ? { details } : {}) },
    { status }
  );
}
