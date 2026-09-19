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
  return githubFetch<{id: number; name: string; full_name: string; html_url: string; default_branch: string}>("/user/repos", token, {
    method: "POST", headers: {"content-type":"application/json"},
    body: JSON.stringify({ name, description, private: true, auto_init: true }),
  });
}

export async function getStoredGithubToken(encrypted: string) {
  return decryptSecret(encrypted);
}
