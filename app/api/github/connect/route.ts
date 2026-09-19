import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  if (!process.env.GITHUB_CLIENT_ID) return NextResponse.json({ error: "GITHUB_CLIENT_ID_NOT_CONFIGURED" }, { status: 500 });

  const state = randomBytes(32).toString("hex");
  const jar = await cookies();
  jar.set("sk_builder_github_state", state, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 600, path: "/" });

  const redirectUri = process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/api/github/callback` : new URL("/api/github/callback", process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ? "http://localhost:3000" : "http://localhost:3000").toString();
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", "repo");
  url.searchParams.set("state", state);
  return NextResponse.redirect(url);
}
