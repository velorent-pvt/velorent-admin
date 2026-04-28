import { supabase } from "~/lib/supabase";

const ROLE_HOST = 2;
const ROLE_CUSTOMER = 3;

export type DashboardSummary = {
  totals: {
    customers: number;
    hosts: number;
    bookings: number;
    payment_transactions: number;
    payment_volume: number;
  };
  new_counts: {
    customers: number;
    hosts: number;
    bookings: number;
    days: number;
  };
  payment_chart: {
    date: string;
    amount: number;
  }[];
};

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function toISODate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

async function getCount(
  table: "profiles" | "bookings" | "payments",
  queryBuilder?: (query: any) => any,
) {
  let query = supabase.from(table).select("id", { count: "exact", head: true });
  if (queryBuilder) {
    query = queryBuilder(query);
  }

  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const now = new Date();
  const newDays = 7;
  const chartDays = 30;

  const newStart = startOfDay(new Date(now));
  newStart.setDate(newStart.getDate() - (newDays - 1));

  const chartStart = startOfDay(new Date(now));
  chartStart.setDate(chartStart.getDate() - (chartDays - 1));

  const [
    totalCustomers,
    totalHosts,
    totalBookings,
    totalPaymentTransactions,
    newCustomers,
    newHosts,
    newBookings,
    successfulPaymentsForVolume,
    paymentRowsForChart,
  ] = await Promise.all([
    getCount("profiles", (query) => query.eq("role_id", ROLE_CUSTOMER)),
    getCount("profiles", (query) => query.eq("role_id", ROLE_HOST)),
    getCount("bookings"),
    getCount("payments"),
    getCount("profiles", (query) =>
      query.eq("role_id", ROLE_CUSTOMER).gte("created_at", newStart.toISOString()),
    ),
    getCount("profiles", (query) =>
      query.eq("role_id", ROLE_HOST).gte("created_at", newStart.toISOString()),
    ),
    getCount("bookings", (query) => query.gte("created_at", newStart.toISOString())),
    supabase.from("payments").select("amount").eq("status", "successful"),
    supabase
      .from("payments")
      .select("amount, status, created_at")
      .gte("created_at", chartStart.toISOString())
      .order("created_at", { ascending: true }),
  ]);

  if (successfulPaymentsForVolume.error) throw successfulPaymentsForVolume.error;
  if (paymentRowsForChart.error) throw paymentRowsForChart.error;

  const paymentVolume = ((successfulPaymentsForVolume.data as any[]) ?? []).reduce(
    (sum, row) => sum + toNumber(row.amount),
    0,
  );

  const chartMap = new Map<string, number>();
  for (let i = 0; i < chartDays; i++) {
    const day = startOfDay(new Date(chartStart));
    day.setDate(chartStart.getDate() + i);
    chartMap.set(toISODate(day), 0);
  }

  for (const row of (paymentRowsForChart.data as any[]) ?? []) {
    if (String(row.status ?? "") !== "successful") continue;
    const dayKey = toISODate(new Date(String(row.created_at)));
    if (!chartMap.has(dayKey)) continue;
    chartMap.set(dayKey, (chartMap.get(dayKey) ?? 0) + toNumber(row.amount));
  }

  return {
    totals: {
      customers: totalCustomers,
      hosts: totalHosts,
      bookings: totalBookings,
      payment_transactions: totalPaymentTransactions,
      payment_volume: paymentVolume,
    },
    new_counts: {
      customers: newCustomers,
      hosts: newHosts,
      bookings: newBookings,
      days: newDays,
    },
    payment_chart: Array.from(chartMap.entries()).map(([date, amount]) => ({
      date,
      amount,
    })),
  };
}

export type NewActivity = {
  customers: { id: string; full_name: string | null; created_at: string }[];
  hosts: { id: string; full_name: string | null; created_at: string }[];
  upcoming_bookings: {
    id: string;
    booking_code: string;
    car_name: string;
    customer_name: string;
    start_time: string;
    status: string;
  }[];
};

export async function getNewActivity(days: number): Promise<NewActivity> {
  const now = new Date();
  const start = new Date(now);
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const [customerRows, hostRows, upcomingRows] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role_id", ROLE_CUSTOMER)
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("role_id", ROLE_HOST)
      .gte("created_at", start.toISOString())
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("bookings")
      .select(
        `id, start_time, status, customer_id,
        car:cars(registration_number, car_brands(name), car_models(name))`,
      )
      .in("status", ["confirmed", "ongoing"])
      .gte("start_time", now.toISOString())
      .order("start_time", { ascending: true })
      .limit(5),
  ]);

  if (customerRows.error) throw customerRows.error;
  if (hostRows.error) throw hostRows.error;
  if (upcomingRows.error) throw upcomingRows.error;

  const upcomingData = (upcomingRows.data as any[]) ?? [];
  const customerIds = [...new Set(upcomingData.map((b) => String(b.customer_id)).filter(Boolean))];

  let profilesMap = new Map<string, string>();
  if (customerIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", customerIds);
    for (const p of (profiles as any[]) ?? []) {
      profilesMap.set(String(p.id), String(p.full_name ?? ""));
    }
  }

  const upcoming_bookings = upcomingData.map((b) => {
    const car = b.car ?? {};
    const brandName = Array.isArray(car.car_brands)
      ? String(car.car_brands[0]?.name ?? "")
      : String(car.car_brands?.name ?? "");
    const modelName = Array.isArray(car.car_models)
      ? String(car.car_models[0]?.name ?? "")
      : String(car.car_models?.name ?? "");
    return {
      id: String(b.id),
      booking_code: String(b.id).slice(-8).toUpperCase(),
      car_name: `${brandName} ${modelName}`.trim() || "Unknown Car",
      customer_name: profilesMap.get(String(b.customer_id)) ?? "Unknown",
      start_time: String(b.start_time),
      status: String(b.status),
    };
  });

  return {
    customers: ((customerRows.data as any[]) ?? []).map((c) => ({
      id: String(c.id),
      full_name: c.full_name ?? null,
      created_at: String(c.created_at),
    })),
    hosts: ((hostRows.data as any[]) ?? []).map((h) => ({
      id: String(h.id),
      full_name: h.full_name ?? null,
      created_at: String(h.created_at),
    })),
    upcoming_bookings,
  };
}
