import { supabase } from "~/lib/supabase";

const ROLE_HOST = 2;
const ROLE_CUSTOMER = 3;
const PROFILE_BATCH_SIZE = 1000;

type CustomerDocumentRow = {
  aadhaar_name: string | null;
  aadhaar_number: string | null;
  dl_name: string | null;
  dl_number: string | null;
};

type CustomerProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role_id: number | null;
  created_at: string;
  customer: CustomerDocumentRow | CustomerDocumentRow[] | null;
};

type HostProfileRow = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role_id: number | null;
  created_at: string;
};

export async function getAllCustomers() {
  const data: CustomerProfileRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PROFILE_BATCH_SIZE - 1;
    const { data: batch, error } = await supabase
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
      `,
      )
      .eq("role_id", ROLE_CUSTOMER)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    data.push(...((batch ?? []) as CustomerProfileRow[]));

    if (!batch || batch.length < PROFILE_BATCH_SIZE) break;
    from += PROFILE_BATCH_SIZE;
  }

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
  const data: HostProfileRow[] = [];
  let from = 0;

  while (true) {
    const to = from + PROFILE_BATCH_SIZE - 1;
    const { data: batch, error } = await supabase
      .from("profiles")
      .select("id, full_name, email, phone, avatar_url, role_id, created_at")
      .eq("role_id", ROLE_HOST)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;

    data.push(...((batch ?? []) as HostProfileRow[]));

    if (!batch || batch.length < PROFILE_BATCH_SIZE) break;
    from += PROFILE_BATCH_SIZE;
  }

  return data;
}
