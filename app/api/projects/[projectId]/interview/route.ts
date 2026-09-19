import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireUser(); const { projectId } = await params;
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from("project_messages").select("id,role,content,metadata,created_at").eq("project_id",projectId).eq("clerk_user_id",user.id).order("created_at",{ascending:true});
    if (error) return Response.json({error:error.message},{status:500});
    return Response.json({messages:data??[]});
  } catch (error) { return Response.json({error:error instanceof Error?error.message:"UNAUTHORIZED"},{status:401}); }
}

export async function POST(request: Request, { params }: { params: Promise<{ projectId: string }> }) {
  try {
    const user = await requireUser(); const { projectId } = await params;
    const body = await request.json().catch(()=>({})); const content=String(body?.content??"").trim();
    if (!content) return Response.json({error:"Message is required"},{status:400});
    const supabase=createServerSupabaseClient();
    const {data:project}=await supabase.from("projects").select("id,name,description").eq("id",projectId).eq("owner_clerk_user_id",user.id).maybeSingle();
    if (!project) return Response.json({error:"Project not found"},{status:404});
    await supabase.from("project_messages").insert({project_id:projectId,clerk_user_id:user.id,role:"user",content});
    const {data:history}=await supabase.from("project_messages").select("role,content").eq("project_id",projectId).eq("clerk_user_id",user.id).order("created_at",{ascending:true}).limit(30);
    const origin=new URL(request.url).origin;
    const ai=await fetch(new URL("/api/ai/generate",origin),{method:"POST",headers:{"content-type":"application/json",cookie:request.headers.get("cookie")??""},body:JSON.stringify({
      projectId,taskType:"requirements",
      messages:[
        {role:"system",content:"You are SK Builder's senior product requirements interviewer. Ask one concise, high-value question at a time. Collect purpose, target users, pages, core features, auth, payments, admin, database, design, integrations, and deployment needs. Do not generate code yet. Once enough detail is collected, summarize the requirements and state that the interview is ready for approval."},
        ...(history??[]).map(m=>({role:m.role as "user"|"assistant"|"system",content:m.content}))
      ]
    })});
    const result=await ai.json();
    if (!ai.ok) return Response.json({error:result?.error??"AI interview failed"},{status:ai.status});
    const assistant=String(result?.text??"");
    await supabase.from("project_messages").insert({project_id:projectId,clerk_user_id:user.id,role:"assistant",content:assistant});
    await supabase.from("projects").update({status:"planning",updated_at:new Date().toISOString()}).eq("id",projectId).eq("owner_clerk_user_id",user.id);
    return Response.json({text:assistant});
  } catch(error) { return Response.json({error:error instanceof Error?error.message:"INTERVIEW_FAILED"},{status:500}); }
}
