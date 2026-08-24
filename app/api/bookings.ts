import { supabase } from "~/lib/supabase";

export type BookingStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "rejected"
  | "ongoing"
  | "completed";

export type AdminBooking = {
  id: string;
  car_id: string;
  customer_id: string;
  host_id: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  base_amount: number;
  delivery_amount: number;
  commission_percentage: number;
  commission_amount: number;
  deposit_amount: number;
  deposit_status: "pending" | "paid" | "refunded" | "forfeited";
  total_amount: number;
  pickup_type: "self_pickup" | "home_delivery";
  delivery_address?: string | null;
  handover_otp?: string | null;
  status: BookingStatus;
  created_at: string | null;
  updated_at: string;
  booking_code: string;
  car_name: string;
  registration_number: string;
  customer_name: string;
  host_name: string;
  car?: {
    id: string;
    registration_number?: string;
    hourly_price?: number;
    car_brands?: { name: string };
    car_models?: { name: string };
    car_images?: { image_url: string; is_primary: boolean }[];
    host?: { full_name: string; phone?: string; email?: string };
    car_pickup_addresses?: { address_line1: string; city: string; state: string }[];
  };
  customer?: {
    id: string;
    full_name?: string;
    phone?: string;
    email?: string;
    avatar_url?: string;
  };
  customer_details?: any;
  host_details?: any;
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

export type AssignableCar = {
  id: string;
  host_id: string;
  registration_number: string;
  hourly_price: number;
  name: string;
  image_url?: string;
};

const BOOKING_STATUSES = [
  "approved",
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
  if (profileIds.length === 0) {
    return new Map<
      string,
      {
        full_name: string | null;
        phone: string | null;
        email: string | null;
        avatar_url: string | null;
      }
    >();
  }

  const { data: profileRows, error: profileError } = await supabase
    .from("profiles")
    .select("id, full_name, phone, email, avatar_url")
    .in("id", profileIds);

  if (profileError) throw profileError;

  return new Map(
    ((profileRows as any[]) ?? []).map((profile) => [
      String(profile.id),
      {
        full_name: profile.full_name ?? null,
        phone: profile.phone ?? null,
        email: profile.email ?? null,
        avatar_url: profile.avatar_url ?? null,
      },
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
    car_id: String(row.car_id),
    status: (row.status || "pending") as AdminBooking["status"],
    pickup_type: (row.pickup_type || "self_pickup") as AdminBooking["pickup_type"],
    delivery_address: row.delivery_address ?? null,
    handover_otp: row.handover_otp ?? null,
    start_time: String(row.start_time),
    end_time: String(row.end_time),
    total_hours: Number(row.total_hours ?? 0),
    total_amount: normalizeMoney(row.total_amount),
    base_amount: normalizeMoney(row.base_amount),
    delivery_amount: normalizeMoney(row.delivery_amount),
    commission_percentage: Number(row.commission_percentage ?? 0),
    commission_amount: normalizeMoney(row.commission_amount),
    deposit_amount: normalizeMoney(row.deposit_amount),
    deposit_status: (row.deposit_status || "pending") as AdminBooking["deposit_status"],
    created_at: row.created_at ?? null,
    updated_at: String(row.updated_at ?? ""),
    car_name: carName,
    registration_number: String(car.registration_number ?? "-"),
    customer_id: String(row.customer_id),
    customer_name: profilesById.get(String(row.customer_id))?.full_name ?? "Unknown Customer",
    host_id: String(row.host_id),
    host_name: profilesById.get(String(row.host_id))?.full_name ?? "Unknown Host",
    car: {
      id: car.id || "",
      registration_number: String(car.registration_number ?? "-"),
      car_brands: { name: brandName },
      car_models: { name: modelName },
      host: {
        full_name: profilesById.get(String(row.host_id))?.full_name ?? "Unknown Host",
        phone: profilesById.get(String(row.host_id))?.phone ?? undefined,
        email: profilesById.get(String(row.host_id))?.email ?? undefined,
      },
      car_images: car.car_images || []
    },
    customer: {
      id: String(row.customer_id),
      full_name: profilesById.get(String(row.customer_id))?.full_name ?? "Unknown Customer",
      phone: profilesById.get(String(row.customer_id))?.phone ?? undefined,
      email: profilesById.get(String(row.customer_id))?.email ?? undefined,
      avatar_url: profilesById.get(String(row.customer_id))?.avatar_url ?? undefined,
    }
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
      commission_percentage,
      commission_amount,
      deposit_amount,
      deposit_status,
      total_amount,
      pickup_type,
      delivery_address,
      status,
      created_at,
      updated_at,
      car:cars(
        id,
        registration_number,
        hourly_price,
        car_brands(name),
        car_models(name),
        car_images(image_url, is_primary)
      )
    `
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

export async function getBookingById(bookingId: string): Promise<AdminBooking> {
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
      handover_otp,
      status,
      created_at,
      updated_at,
      car:cars(
        id,
        registration_number,
        hourly_price,
        car_brands(name),
        car_models(name),
        car_images(image_url, is_primary),
        car_pickup_addresses(address_line1, city, state)
      )
    `
    )
    .eq("id", bookingId)
    .single();

  if (error) throw error;

  const profileIds = [String(data.customer_id), String(data.host_id)];
  const profilesById = await getProfilesMap(profileIds);
  const base = mapBookingRowToAdminBooking(data, profilesById);

  const [{ data: cData }, { data: hData }] = await Promise.all([
    supabase.from("customers").select("*").eq("id", data.customer_id).maybeSingle(),
    supabase.from("hosts").select("*").eq("id", data.host_id).maybeSingle()
  ]);

  return { ...base, customer_details: cData, host_details: hData } as AdminBooking;
}

export async function updateBookingStatus(id: string, status: BookingStatus) {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function extendBookingAdmin(bookingId: string, endTime: string) {
  const { data, error } = await supabase.rpc("extend_booking_admin", {
    p_booking_id: bookingId,
    p_end_time: endTime,
  });
  if (error) throw error;
  return data;
}

export async function changeBookingCarAdmin(bookingId: string, carId: string) {
  const { data, error } = await supabase.rpc("change_booking_car_admin", {
    p_booking_id: bookingId,
    p_car_id: carId,
  });
  if (error) throw error;
  return data;
}

export async function getAssignableCars(): Promise<AssignableCar[]> {
  const { data, error } = await supabase
    .from("cars")
    .select("id, host_id, registration_number, hourly_price, car_brands(name), car_models(name), car_images(image_url, is_primary)")
    .eq("is_verified", true)
    .eq("is_active", true)
    .order("registration_number");

  if (error) throw error;

  return ((data as any[]) ?? []).map((car) => ({
    id: String(car.id),
    host_id: String(car.host_id),
    registration_number: String(car.registration_number ?? "-"),
    hourly_price: normalizeMoney(car.hourly_price),
    name: `${firstName(car.car_brands)} ${firstName(car.car_models)}`.trim() || "Unnamed car",
    image_url:
      car.car_images?.find((image: any) => image.is_primary)?.image_url ??
      car.car_images?.[0]?.image_url ??
      undefined,
  }));
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

export async function markBookingPaymentRefundedAdmin(bookingId: string, refundAmount?: number) {
  const { data: latestPayment, error: fetchError } = await supabase
    .from("payments")
    .select("id")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!latestPayment?.id) throw new Error("No payment found for this booking");

  const payload: Record<string, unknown> = {
    status: "refunded",
    updated_at: new Date().toISOString(),
  };

  if (typeof refundAmount === "number" && Number.isFinite(refundAmount)) {
    if (refundAmount < 0) throw new Error("Refund amount cannot be negative");
    payload.amount = refundAmount;
  }

  const { error } = await supabase
    .from("payments")
    .update(payload)
    .eq("id", latestPayment.id);

  if (error) throw error;
}

export async function processCustomerRefundAdmin({
  bookingId,
  refundAmount,
}: {
  bookingId: string;
  refundAmount: number;
}) {
  if (!bookingId) throw new Error("bookingId is required");
  if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
    throw new Error("Refund amount must be greater than 0");
  }

  const { data: latestPayment, error: fetchError } = await supabase
    .from("payments")
    .select("id, amount, gateway_order_id, payment_gateway")
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (fetchError) throw fetchError;
  if (!latestPayment?.id) throw new Error("No payment found for this booking");

  const orderId = String(latestPayment.gateway_order_id ?? "").trim();
  const gateway = String(latestPayment.payment_gateway ?? "").toLowerCase();
  if (!orderId) throw new Error("Missing gateway order id for this payment");
  if (gateway !== "cashfree") {
    throw new Error(`Unsupported payment gateway for refund: ${gateway || "unknown"}`);
  }

  const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/cashfree/refund`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      order_id: orderId,
      refund_amount: Number(refundAmount.toFixed(2)),
      refund_note: `Booking cancellation refund for ${bookingId}`,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message ?? "Failed to process Cashfree refund");
  }

  await markBookingPaymentRefundedAdmin(bookingId, refundAmount);
  await updateDepositStatusAdmin(bookingId, "refunded");

  return payload;
}

export async function markHostPayoutPaidAdmin({
  bookingId,
  hostId,
  grossBookingAmount,
  securityDepositAmount,
  commissionAmount,
  notes,
}: {
  bookingId: string;
  hostId: string;
  grossBookingAmount: number;
  securityDepositAmount: number;
  commissionAmount: number;
  notes?: string;
}) {
  if (!bookingId) throw new Error("bookingId is required");
  if (!hostId) throw new Error("hostId is required");

  const now = new Date().toISOString();
  const payload = {
    booking_id: bookingId,
    host_id: hostId,
    gross_booking_amount: Number(grossBookingAmount ?? 0),
    security_deposit_amount: Number(securityDepositAmount ?? 0),
    commission_amount: Number(commissionAmount ?? 0),
    status: "paid",
    payout_initiated_at: now,
    payout_completed_at: now,
    payout_failed_at: null,
    failure_reason: null,
    notes: notes?.trim() || null,
    updated_at: now,
  };

  const { error } = await supabase
    .from("host_payouts")
    .upsert(payload, { onConflict: "booking_id" });

  if (error) throw error;
}

export async function processHostPayoutAdmin({
  bookingId,
  hostId,
  hostName,
  accountNumber,
  ifsc,
  amount,
  phone,
  email,
}: {
  bookingId: string;
  hostId: string;
  hostName: string;
  accountNumber: string;
  ifsc: string;
  amount: number;
  phone?: string;
  email?: string;
}) {
  if (!bookingId || !hostId) throw new Error("bookingId and hostId are required");
  if (!hostName || !accountNumber || !ifsc) {
    throw new Error("Host bank details are incomplete");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Host payout amount must be greater than 0");
  }

  const transferId = `host_${bookingId.slice(0, 8)}_${Date.now()}`;
  const response = await fetch(`${import.meta.env.VITE_API_URL}/payouts/cashfree/host-transfer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      host_id: hostId,
      host_name: hostName,
      account_number: accountNumber,
      ifsc,
      amount: Number(amount.toFixed(2)),
      transfer_id: transferId,
      phone,
      email,
      notes: `Host payout for booking ${bookingId}`,
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.success === false) {
    throw new Error(payload?.message ?? "Failed to process Cashfree host payout");
  }

  const now = new Date().toISOString();
  const normalizedStatus = String(payload?.transfer_status ?? "queued").toLowerCase();
  const payoutStatus =
    normalizedStatus === "success" || normalizedStatus === "paid"
      ? "paid"
      : normalizedStatus === "failed"
        ? "failed"
        : "processing";

  const { error } = await supabase
    .from("host_payouts")
    .upsert(
      {
        booking_id: bookingId,
        host_id: hostId,
        status: payoutStatus,
        payout_initiated_at: now,
        payout_completed_at: payoutStatus === "paid" ? now : null,
        payout_failed_at: payoutStatus === "failed" ? now : null,
        cashfree_payout_reference_id: payload?.transfer_id ?? transferId,
        cashfree_payout_id: payload?.cashfree_payout_id ?? null,
        failure_reason:
          payoutStatus === "failed" ? String(payload?.message ?? "Cashfree transfer failed") : null,
        notes: `Cashfree host payout (${transferId})`,
        updated_at: now,
      },
      { onConflict: "booking_id" },
    );

  if (error) throw error;
  return payload;
}
