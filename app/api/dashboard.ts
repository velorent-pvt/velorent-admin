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
