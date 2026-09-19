import "server-only";
import { decryptSecret } from "@/lib/secrets";
const API="https://api.vercel.com";
async function vf<T>(path:string,token:string,init:RequestInit={}):Promise<T>{const r=await fetch(API+path,{...init,cache:"no-store",headers:{accept:"application/json","content-type":"application/json",authorization:`Bearer ${token}`,...(init.headers||{})}});const b=await r.json().catch(()=>({}));if(!r.ok){const e=new Error(b?.error?.message||b?.message||`Vercel request failed: ${r.status}`);(e as Error&{status?:number}).status=r.status;throw e}return b as T}
export async function getVercelUser(token:string){return vf<any>("/v2/user",token)}
export async function createVercelDeployment(token:string,name:string,files:{file:string;data:string}[],teamId?:string|null){const qs=teamId?`?teamId=${encodeURIComponent(teamId)}`:"";return vf<any>(`/v13/deployments${qs}`,token,{method:"POST",body:JSON.stringify({name,files,target:"production",projectSettings:{framework:"nextjs"}})})}
export async function getStoredVercelToken(encrypted:string){return decryptSecret(encrypted)}
