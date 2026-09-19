import { requireUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSecret } from "@/lib/secrets";
import { getVercelUser } from "@/lib/vercel";
import { createServerSupabaseClient } from "@/lib/supabase/server";
export async function GET(request:Request){
  const user=await requireUser();if(!user?.id)return NextResponse.redirect(new URL("/sign-in",request.url));
  const url=new URL(request.url);const code=url.searchParams.get("code");const state=url.searchParams.get("state");const jar=await cookies();const expected=jar.get("sk_builder_vercel_state")?.value;jar.delete("sk_builder_vercel_state");
  if(!code||!state||state!==expected)return NextResponse.redirect(new URL("/dashboard/integrations?vercel=state_error",request.url));
  if(!process.env.VERCEL_CLIENT_ID||!process.env.VERCEL_CLIENT_SECRET)return NextResponse.redirect(new URL("/dashboard/integrations?vercel=config_error",request.url));
  const redirectUri=`${process.env.NEXT_PUBLIC_APP_URL||new URL("/",request.url).origin}/api/vercel/callback`;
  const body=new URLSearchParams({grant_type:"authorization_code",client_id:process.env.VERCEL_CLIENT_ID,client_secret:process.env.VERCEL_CLIENT_SECRET,code,redirect_uri:redirectUri});
  const tokenResponse=await fetch("https://api.vercel.com/v2/oauth/access_token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body});
  const tokenBody=await tokenResponse.json().catch(()=>({}));if(!tokenResponse.ok||!tokenBody.access_token)return NextResponse.redirect(new URL("/dashboard/integrations?vercel=token_error",request.url));
  const info=await getVercelUser(tokenBody.access_token);const supabase=createServerSupabaseClient();
  const {error}=await supabase.from("vercel_connections").upsert({clerk_user_id:user.id,encrypted_access_token:encryptSecret(tokenBody.access_token),vercel_user_id:String(tokenBody.user_id||info?.user?.id||""),updated_at:new Date().toISOString()},{onConflict:"clerk_user_id"});
  if(error)return NextResponse.redirect(new URL("/dashboard/integrations?vercel=save_error",request.url));
  return NextResponse.redirect(new URL("/dashboard/integrations?vercel=connected",request.url));
}
