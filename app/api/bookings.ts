import { supabase } from "~/lib/supabase";

export type AdminBooking = {
  id: string;
  booking_code: string;
  status: string;
  pickup_type: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  total_amount: number;
  base_amount: number;
  delivery_amount: number;
  deposit_amount: number;
  deposit_status: string;
  created_at: string | null;
  car_name: string;
  registration_number: string;
  customer_id: string;
  customer_name: string;
  host_id: string;
  host_name: string;
};

export type AdminBookingDetail = AdminBooking & {
  commission_amount: number;
  commission_percentage: number;
  delivery_address: string | null;
  payment_status: string;
  payment_method: string;
  payment_gateway: string;
  payment_reference: string;
};

const BOOKING_STATUSES = [
  "pending",
  "confirmed",
  "ongoing",
  "completed",
  "cancelled",
  "rejected",
] as const;

const DEPOSIT_STATUSES = ["pending", "paid", "refunded", "forfeited"] as const;

function normalizeMoney(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function firstName(source: any): string {
  if (Array.isArray(source)) return String(source[0]?.name ?? "");
  return String(source?.name ?? "");
}

async function getProfilesMap(profileIds: string[]) {
  if (profileIds.length === 0) return new Map<string, { full_name: string | null }>();

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  if (profileError) throw profileError;

  return new Map(
    ((profileRows as any[]) ?? []).map((profile) => [
      String(profile.id),
      { full_name: profile.full_name ?? null },
    ]),
  );
}

function mapBookingRowToAdminBooking(row: any, profilesById: Map<string, { full_name: string | null }>): AdminBooking {
  const car = row.car ?? {};
  const brandName = firstName(car.car_brands).trim();
  const modelName = firstName(car.car_models).trim();
  const carName = `${brandName} ${modelName}`.trim() || "Unknown Car";

  return {
    id: row.id,
    booking_code: String(row.id).slice(-8).toUpperCase(),
    status: String(row.status ?? "pending"),
    pickup_type: String(row.pickup_type ?? "self_pickup"),
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    total_hours: Number(row.total_hours ?? 0),
    total_amount: normalizeMoney(row.total_amount),
    base_amount: normalizeMoney(row.base_amount),
    delivery_amount: normalizeMoney(row.delivery_amount),
    deposit_amount: normalizeMoney(row.deposit_amount),
    deposit_status: String(row.deposit_status ?? "pending"),
    created_at: row.created_at ?? null,
    car_name: carName,
    registration_number: String(car.registration_number ?? "-"),
    customer_id: String(row.customer_id),
    customer_name:
      profilesById.get(String(row.customer_id))?.full_name ?? "Unknown Customer",
    host_id: String(row.host_id),
    host_name: profilesById.get(String(row.host_id))?.full_name ?? "Unknown Host",
  };
}

export async function getAllBookings(): Promise<AdminBooking[]> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      car_id,
      customer_id,
      host_id,
      start_time,
      end_time,
      total_hours,
      base_amount,
      delivery_amount,
      deposit_amount,
      deposit_status,
      total_amount,
      pickup_type,
      status,
      created_at,
      car:cars(
        registration_number,
        car_brands(name),
        car_models(name)
      )
    `,
    )
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
  return rows.map((row) => mapBookingRowToAdminBooking(row, profilesById));
}

export async function getBookingByIdAdmin(bookingId: string): Promise<AdminBookingDetail> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      `
      id,
      car_id,
      customer_id,
      host_id,
      start_time,
      end_time,
      total_hours,
      base_amount,
      delivery_amount,
      commission_percentage,
      commission_amount,
      deposit_amount,
      deposit_status,
      total_amount,
      pickup_type,
      delivery_address,
      status,
      created_at,
      car:cars(
        registration_number,
        car_brands(name),
        car_models(name)
      )
      `,
    )
    .eq("id", bookingId)
    .single();

  if (error) throw error;

  const profileIds = [String(data.customer_id), String(data.host_id)];
  const profilesById = await getProfilesMap(profileIds);
  const base = mapBookingRowToAdminBooking(data, profilesById);

  const { data: paymentRows, error: paymentError } = await supabase
    .from("payments")
    .select("id, status, payment_method, payment_gateway, gateway_payment_id, created_at")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1);

  if (paymentError) throw paymentError;

  const payment = (paymentRows as any[])?.[0];

  return {
    ...base,
    commission_amount: normalizeMoney((data as any).commission_amount),
    commission_percentage: normalizeMoney((data as any).commission_percentage),
    delivery_address: ((data as any).delivery_address as string | null) ?? null,
    payment_status: String(payment?.status ?? "initiated"),
    payment_method: String(payment?.payment_method ?? "-"),
    payment_gateway: String(payment?.payment_gateway ?? "-"),
    payment_reference: String(payment?.gateway_payment_id ?? "-"),
  };
}

export async function updateBookingStatusAdmin(bookingId: string, status: string) {
  if (!BOOKING_STATUSES.includes(status as (typeof BOOKING_STATUSES)[number])) {
    throw new Error("Invalid booking status");
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) throw error;
}

export async function updateDepositStatusAdmin(bookingId: string, depositStatus: string) {
  if (!DEPOSIT_STATUSES.includes(depositStatus as (typeof DEPOSIT_STATUSES)[number])) {
    throw new Error("Invalid deposit status");
  }

  const { error } = await supabase
    .from("bookings")
    .update({ deposit_status: depositStatus, updated_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) throw error;
}

export async function markBookingPaymentRefundedAdmin(bookingId: string) {
  const { data: latestPayment, error: fetchError } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!latestPayment?.id) throw new Error("No payment found for this booking");

  const { error } = await supabase
    .from("payments")
    .update({ status: "refunded", updated_at: new Date().toISOString() })
    .eq("id", latestPayment.id);

  if (error) throw error;
}
