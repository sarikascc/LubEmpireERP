"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const supabase = await createClient();
  
  // Destroys the secure session [cite: 37-38]
  await supabase.auth.signOut();
  
  // Kicks the user back to the login screen
  redirect("/login");
}