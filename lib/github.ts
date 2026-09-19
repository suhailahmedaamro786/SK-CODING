import "server-only";
import { decryptSecret } from "@/lib/secrets";

const GITHUB_API = "https://api.github.com";

async function githubFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    cache: "no-store",
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28", ...(init.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.message || `GitHub request failed: ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return body as T;
}

export async function githubUser(token: string) {
  return githubFetch<{id: number; login: string; name?: string; email?: string; avatar_url?: string}>("/user", token);
}

export async function createGithubRepository(token: string, name: string, description?: string) {
  return githubFetch<{id: number; name: string; full_name: string; html_url: string; default_branch: string; owner:{login:string}}>("/user/repos", token, {
    method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({ name, description, private: true, auto_init: true }),
  });
}

export async function upsertGithubFile(token: string, fullName: string, path: string, content: string, message: string, branch = "main") {
  const [owner, repo] = fullName.split("/");
  if (!owner || !repo) throw new Error("INVALID_GITHUB_REPOSITORY");
  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  let sha: string | undefined;
  const existing = await fetch(`${GITHUB_API}/repos/${owner}/${repo}/contents/${encodedPath}?ref=${encodeURIComponent(branch)}`, {
    cache: "no-store",
    headers: { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "x-github-api-version": "2022-11-28" }
  });
  if (existing.ok) {
    const body = await existing.json();
    if (!Array.isArray(body)) sha = body.sha;
  } else if (existing.status !== 404) {
    const body = await existing.json().catch(()=>({}));
    throw new Error(body?.message || `GitHub file lookup failed: ${existing.status}`);
  }
  return githubFetch<any>(`/repos/${owner}/${repo}/contents/${encodedPath}`, token, {
    method: "PUT",
    headers: {"content-type":"application/json"},
    body: JSON.stringify({ message, content: Buffer.from(content, "utf8").toString("base64"), branch, ...(sha ? {sha} : {}) })
  });
}

export async function getStoredGithubToken(encrypted: string) {
  return decryptSecret(encrypted);
}
