import { NextResponse } from "next/server";

type DeviceStartRequest = {
  type: "start";
};

type DeviceTokenRequest = {
  type: "token";
  deviceCode: string;
};

type DeviceRequest = DeviceStartRequest | DeviceTokenRequest;

function getClientId() {
  return process.env.GITHUB_CLIENT_ID || process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID || "";
}

export async function POST(request: Request) {
  const clientId = getClientId();
  if (!clientId) {
    return NextResponse.json(
      { error: "GitHub OAuth client id is not configured." },
      { status: 500 }
    );
  }

  let body: DeviceRequest;
  try {
    body = (await request.json()) as DeviceRequest;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (body.type === "start") {
    const response = await fetch("https://github.com/login/device/code", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        scope: "read:user user:email",
      }).toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error_description || data?.error || "Unable to start GitHub login." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  }

  if (body.type === "token") {
    if (!body.deviceCode) {
      return NextResponse.json({ error: "deviceCode is required." }, { status: 400 });
    }

    const response = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        device_code: body.deviceCode,
        grant_type: "urn:ietf:params:oauth:grant-type:device_code",
      }).toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error_description || data?.error || "Unable to fetch GitHub token." },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  }

  return NextResponse.json({ error: "Unsupported request type." }, { status: 400 });
}
