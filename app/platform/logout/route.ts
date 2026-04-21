import { clearPlatformSessionCookie } from "@/lib/platform-session";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await clearPlatformSessionCookie();
  return NextResponse.redirect(new URL("/platform/login", req.url), { status: 303 });
}

