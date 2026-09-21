import { supabase } from "~/lib/supabase";
import type { Customer } from "~/features/customers/columns";

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

export type CustomerFilters = {
  search?: string;
  fromDate?: string;
  toDate?: string;
};

function toStartOfDay(date: string) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result.toISOString();
}

function toEndOfDay(date: string) {
  const result = new Date(date);
  result.setHours(23, 59, 59, 999);
  return result.toISOString();
}

function escapeLikeSearch(search: string) {
  return search.replace(/\\/g, "\\\\").replace(/[%_]/g, "\\$&").replace(/[,()]/g, " ");
}

export async function getAllCustomers({
  search,
  fromDate,
  toDate,
}: CustomerFilters = {}) {
  const data: CustomerProfileRow[] = [];
  let from = 0;
  const searchTerm = search?.trim();

  while (true) {
    const to = from + PROFILE_BATCH_SIZE - 1;
    let query = supabase
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
      .eq("role_id", ROLE_CUSTOMER);

    if (searchTerm) {
      const value = escapeLikeSearch(searchTerm);
      query = query.or(
        `full_name.ilike.%${value}%,email.ilike.%${value}%,phone.ilike.%${value}%`,
      );
    }
    if (fromDate) query = query.gte("created_at", toStartOfDay(fromDate));
    if (toDate) query = query.lte("created_at", toEndOfDay(toDate));

    const { data: batch, error } = await query
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

type FunnelDropoffCustomer = Omit<
  Customer,
  "verification_completed" | "verification_total" | "verification_pending"
>;

type AnalyticsCustomer = FunnelDropoffCustomer;

export async function getFunnelDropoffCustomers(
  stageIndex: number,
  startDate: string,
  endDate: string,
) {
  const params = new URLSearchParams(
    {
      stage: String(stageIndex),
      start: startDate,
      end: endDate,
    },
  );
  const response = await fetch(`/api/customer-funnel-dropoffs?${params}`);
  const result = (await response.json()) as {
    customers?: FunnelDropoffCustomer[];
    error?: string;
  };

  if (!response.ok) throw new Error(result.error ?? "Unable to load funnel customers.");

  return (result.customers ?? []).map((customer) => {
    const completed = Number(Boolean(customer.aadhaar_number)) + Number(Boolean(customer.dl_number));
    return {
      ...customer,
      created_at: customer.created_at ?? "",
      verification_completed: completed,
      verification_total: 2,
      verification_pending: 2 - completed,
    };
  });
}

export async function getPaymentAnalyticsCustomers(
  metric: string,
  startDate: string,
  endDate: string,
) {
  const params = new URLSearchParams({ metric, start: startDate, end: endDate });
  const response = await fetch(`/api/payment-analytics-customers?${params}`);
  const result = (await response.json()) as {
    customers?: AnalyticsCustomer[];
    error?: string;
  };

  if (!response.ok) throw new Error(result.error ?? "Unable to load payment customers.");

  return (result.customers ?? []).map((customer) => {
    const completed = Number(Boolean(customer.aadhaar_number)) + Number(Boolean(customer.dl_number));
    return {
      ...customer,
      created_at: customer.created_at ?? "",
      verification_completed: completed,
      verification_total: 2,
      verification_pending: 2 - completed,
    };
  });
}
