import { NextRequest, NextResponse } from "next/server";

function buildResultRedirect(request: NextRequest, fallbackStatus: "success" | "failed") {
  const query = new URLSearchParams(request.nextUrl.searchParams);
  if (!query.get("status")) {
    query.set("status", fallbackStatus);
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.pathname = "/wallet/topup/result";
  redirectUrl.search = query.toString();

  return NextResponse.redirect(redirectUrl);
}

export async function GET(request: NextRequest) {
  return buildResultRedirect(request, "failed");
}
