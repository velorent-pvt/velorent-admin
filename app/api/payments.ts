import { supabase } from "~/lib/supabase";

export type AdminPayment = {
  id: string;
  payment_code: string;
  booking_id: string;
  booking_code: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  currency: string;
  payment_gateway: string;
  payment_method: string;
  gateway_payment_id: string;
  gateway_order_id: string;
  status: string;
  created_at: string;
  updated_at: string;
};

function normalizeMoney(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getProfilesMap(profileIds: string[]) {
  if (profileIds.length === 0) return new Map<string, { full_name: string | null }>();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (error) throw error;

  return new Map(
    ((data as any[]) ?? []).map((profile) => [
      String(profile.id),
      { full_name: profile.full_name ?? null },
    ]),
  );
}

function mapPaymentRow(
  row: any,
  profilesById: Map<string, { full_name: string | null }>,
): AdminPayment {
  const customerId = String(row.customer_id ?? "");
  const bookingId = String(row.booking_id ?? "");

  return {
    id: String(row.id),
    payment_code: String(row.id).slice(-8).toUpperCase(),
    booking_id: bookingId,
    booking_code: bookingId.slice(-8).toUpperCase(),
    customer_id: customerId,
    customer_name: profilesById.get(customerId)?.full_name ?? "Unknown Customer",
    amount: normalizeMoney(row.amount),
    currency: String(row.currency ?? "INR"),
    payment_gateway: String(row.payment_gateway ?? "-"),
    payment_method: String(row.payment_method ?? "-"),
    gateway_payment_id: String(row.gateway_payment_id ?? "-"),
    gateway_order_id: String(row.gateway_order_id ?? "-"),
    status: String(row.status ?? "initiated"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function getAllPayments(): Promise<AdminPayment[]> {
  const { data, error } = await supabase
    .from("payments")
    .select(
      `
      id,
      booking_id,
      customer_id,
      amount,
      currency,
      payment_gateway,
      payment_method,
      gateway_payment_id,
      gateway_order_id,
      status,
      created_at,
      updated_at
      `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data as any[]) ?? [];
  const profileIds = Array.from(
    new Set(
      rows
        .map((row) => row.customer_id)
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );

  const profilesById = await getProfilesMap(profileIds);
  return rows.map((row) => mapPaymentRow(row, profilesById));
}
