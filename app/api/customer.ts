import { supabase } from "~/lib/supabase";

export async function getAllCustomers() {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      `
      id,
      full_name,
      email,
      phone,
      avatar_url,
      role_id,
      created_at,
      customer:customers!inner(
        aadhaar_name,
        aadhaar_number,
        dl_name,
        dl_number
      )
    `
    )
    .eq("role_id", 3)
    .order("full_name", { ascending: true });

  if (error) throw error;

  return (data ?? []).map((item) => {
    const customer = Array.isArray(item.customer) ? item.customer[0] : item.customer;
    const aadhaarVerified = Boolean(customer?.aadhaar_number);
    const dlVerified = Boolean(customer?.dl_number);
    const completed = Number(aadhaarVerified) + Number(dlVerified);

    return {
      ...item,
      aadhaar_name: customer?.aadhaar_name ?? null,
      aadhaar_number: customer?.aadhaar_number ?? null,
      dl_name: customer?.dl_name ?? null,
      dl_number: customer?.dl_number ?? null,
      verification_completed: completed,
      verification_total: 2,
      verification_pending: 2 - completed,
    };
  });
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
