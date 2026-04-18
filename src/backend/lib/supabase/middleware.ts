import { createRequestClient } from "./server";

export async function getOptionalUser() {
  const supabase = await createRequestClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user; // null if not logged in
}

export async function getRequiredUser() {
  const user = await getOptionalUser();
  if (!user) throw new Error("AUTH_REQUIRED");
  return user;
}
