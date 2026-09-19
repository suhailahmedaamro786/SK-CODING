import { requireUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
export async function GET(){
  const user=await requireUser(); if(!user?.id)return NextResponse.json({error:"UNAUTHORIZED"},{status:401});
  const clientId=process.env.VERCEL_CLIENT_ID;if(!clientId)return NextResponse.json({error:"VERCEL_CLIENT_ID_NOT_CONFIGURED"},{status:500});
  const base=process.env.NEXT_PUBLIC_APP_URL||"http://localhost:3000";const redirectUri=`${base}/api/vercel/callback`;const state=randomBytes(32).toString("hex");const jar=await cookies();
  jar.set("sk_builder_vercel_state",state,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",maxAge:600,path:"/"});
  const url=new URL("https://vercel.com/oauth/authorize");url.searchParams.set("client_id",clientId);url.searchParams.set("redirect_uri",redirectUri);url.searchParams.set("response_type","code");url.searchParams.set("scope","openid profile email");url.searchParams.set("state",state);
  return NextResponse.redirect(url);
}
