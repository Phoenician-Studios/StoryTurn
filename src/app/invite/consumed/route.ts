import { NextResponse } from "next/server";
import { appUrl } from "@/lib/config";
import { PENDING_INVITE_COOKIE } from "@/lib/pending-invite";

function absolute(path: string, requestUrl: string): URL {
  try {
    return new URL(path, appUrl());
  } catch {
    return new URL(path, requestUrl);
  }
}

/** Clear the pending-invite cookie after a successful join, then go home. */
export async function GET(request: Request) {
  const response = NextResponse.redirect(absolute("/", request.url));
  response.cookies.delete(PENDING_INVITE_COOKIE);
  return response;
}
