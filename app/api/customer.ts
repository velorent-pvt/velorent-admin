import { supabase } from "~/lib/supabase";

export async function getAllCustomers() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role_id", 3)
    .order("full_name", { ascending: true });

  if (error) throw error;

  return data;
}

export async function getAllHosts() {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role_id", 2)
    .order("full_name", { ascending: true });

  if (error) throw error;

  return data;
}
