import { currentUser } from "@clerk/nextjs/server";

export async function requireUser() {
  const user = await currentUser();
  if (!user?.id) throw new Error("UNAUTHORIZED");
  return user;
}
