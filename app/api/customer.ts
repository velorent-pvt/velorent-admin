import { supabase } from "~/lib/supabase";

const ROLE_HOST = 2;
const ROLE_CUSTOMER = 3;

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
      customer:customers(
        aadhaar_name,
        aadhaar_number,
        dl_name,
        dl_number
      )
    `
    )
    .eq("role_id", ROLE_CUSTOMER)
    .order("created_at", { ascending: false });

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
    .eq("role_id", ROLE_HOST)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return data;
}
