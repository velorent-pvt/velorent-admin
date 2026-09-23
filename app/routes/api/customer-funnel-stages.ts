import type { LoaderFunctionArgs } from "react-router";

import { createClient } from "~/lib/supabase.server";
import { loadAllAnalyticsActions } from "~/lib/analytics-actions";

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const stageIndex = Number(url.searchParams.get("stage"));
  const startDate = validDate(url.searchParams.get("start"));
  const endDate = validDate(url.searchParams.get("end"));

  if (!Number.isInteger(stageIndex) || stageIndex < 1 || stageIndex > 10 || !startDate || !endDate) {
    return Response.json({ error: "Invalid funnel selection." }, { status: 400 });
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  end.setDate(end.getDate() + 1);

  if (end <= start) {
    return Response.json({ error: "Invalid date range." }, { status: 400 });
  }

  const headers = new Headers();
  const supabase = await createClient(request, { headers } as Response);
  const { data, error } = await loadAllAnalyticsActions((from, to) => supabase.rpc(
    "get_customer_funnel_stage_actions" as never,
    {
      p_start_at: start.toISOString(),
      p_end_at: end.toISOString(),
      p_stage_index: stageIndex,
    } as never,
  ).range(from, to));

  if (error) {
    console.error("Failed to load funnel stage customers:", error);
    return Response.json(
      { error: "Unable to load customers for this funnel stage." },
      { status: error.code === "42501" ? 403 : 500, headers },
    );
  }

  return Response.json({ customers: data ?? [] }, { headers });
}
