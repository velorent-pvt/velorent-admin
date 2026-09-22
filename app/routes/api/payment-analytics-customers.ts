import type { LoaderFunctionArgs } from "react-router";

import { PAYMENT_ANALYTICS_METRICS } from "~/lib/payment-analytics";
import { createClient } from "~/lib/supabase.server";

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const metric = url.searchParams.get("metric");
  const startDate = validDate(url.searchParams.get("start"));
  const endDate = validDate(url.searchParams.get("end"));

  if (!metric || !PAYMENT_ANALYTICS_METRICS.includes(metric) || !startDate || !endDate) {
    return Response.json({ error: "Invalid payment analytics selection." }, { status: 400 });
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);

  if (end <= start) {
    return Response.json({ error: "Invalid date range." }, { status: 400 });
  }

  const headers = new Headers();
  const supabase = await createClient(request, { headers } as Response);
  const { data, error } = await supabase.rpc(
    "get_payment_analytics_customer_attempts" as never,
    {
      p_start_at: start.toISOString(),
      p_end_at: end.toISOString(),
      p_metric_key: metric,
    } as never,
  );

  if (error) {
    console.error("Failed to load payment analytics customers:", error);
    return Response.json(
      { error: "Unable to load customers for this payment metric." },
      { status: error.code === "42501" ? 403 : 500, headers },
    );
  }

  return Response.json({ customers: data ?? [] }, { headers });
}
