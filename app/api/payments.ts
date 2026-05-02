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

export type HostPayoutRecord = {
  id: string;
  booking_id: string;
  booking_code: string;
  host_id: string;
  host_name: string;
  host_earnings_amount: number;
  gross_booking_amount: number;
  security_deposit_amount: number;
  commission_amount: number;
  status: string;
  payout_due_at: string | null;
  payout_initiated_at: string | null;
  payout_completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyEarningRecord = {
  booking_id: string;
  booking_code: string;
  customer_name: string;
  host_name: string;
  booking_status: string;
  commission_amount: number;
  total_amount: number;
  deposit_amount: number;
  created_at: string;
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

export async function getHostPayouts(): Promise<HostPayoutRecord[]> {
  const { data, error } = await supabase
    .from("host_payouts")
    .select(
      `
      id,
      booking_id,
      host_id,
      host_earnings_amount,
      gross_booking_amount,
      security_deposit_amount,
      commission_amount,
      status,
      payout_due_at,
      payout_initiated_at,
      payout_completed_at,
      created_at,
      updated_at
      `,
    )
    .order("created_at", { ascending: false });

  if (error) throw error;
  const rows = (data as any[]) ?? [];
  const bookingIds = Array.from(new Set(rows.map((row) => String(row.booking_id)).filter(Boolean)));
  const hostIds = Array.from(new Set(rows.map((row) => String(row.host_id)).filter(Boolean)));

  const [{ data: bookingRows }, profilesById] = await Promise.all([
    bookingIds.length
      ? supabase.from("bookings").select("id").in("id", bookingIds)
      : Promise.resolve({ data: [] as any[] }),
    getProfilesMap(hostIds),
  ]);

  const bookingCodeMap = new Map<string, string>(
    ((bookingRows as any[]) ?? []).map((booking) => [
      String(booking.id),
      String(booking.id).slice(-8).toUpperCase(),
    ]),
  );

  return rows.map((row) => ({
    id: String(row.id),
    booking_id: String(row.booking_id),
    booking_code:
      bookingCodeMap.get(String(row.booking_id)) ?? String(row.booking_id).slice(-8).toUpperCase(),
    host_id: String(row.host_id),
    host_name: profilesById.get(String(row.host_id))?.full_name ?? "Unknown Host",
    host_earnings_amount: normalizeMoney(row.host_earnings_amount),
    gross_booking_amount: normalizeMoney(row.gross_booking_amount),
    security_deposit_amount: normalizeMoney(row.security_deposit_amount),
    commission_amount: normalizeMoney(row.commission_amount),
    status: String(row.status ?? "pending"),
    payout_due_at: row.payout_due_at ? String(row.payout_due_at) : null,
    payout_initiated_at: row.payout_initiated_at ? String(row.payout_initiated_at) : null,
    payout_completed_at: row.payout_completed_at ? String(row.payout_completed_at) : null,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }));
}

export async function getCompanyEarnings(): Promise<CompanyEarningRecord[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      customer_id,
      host_id,
      status,
      commission_amount,
      total_amount,
      deposit_amount,
      created_at
      `,
    )
    .not("status", "in", "(cancelled,rejected)")
    .order("created_at", { ascending: false });

  if (error) throw error;

  const rows = (data as any[]) ?? [];
  const profileIds = Array.from(
    new Set(
      rows
        .flatMap((row) => [row.customer_id, row.host_id])
        .filter((id): id is string => typeof id === "string" && id.length > 0),
    ),
  );
  const profilesById = await getProfilesMap(profileIds);

  return rows.map((row) => ({
    booking_id: String(row.id),
    booking_code: String(row.id).slice(-8).toUpperCase(),
    customer_name: profilesById.get(String(row.customer_id))?.full_name ?? "Unknown Customer",
    host_name: profilesById.get(String(row.host_id))?.full_name ?? "Unknown Host",
    booking_status: String(row.status ?? "pending"),
    commission_amount: normalizeMoney(row.commission_amount),
    total_amount: normalizeMoney(row.total_amount),
    deposit_amount: normalizeMoney(row.deposit_amount),
    created_at: String(row.created_at),
  }));
}
