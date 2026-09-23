import { useMemo } from "react";
import {
  data as routeData,
  Link,
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams,
} from "react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Filter,
} from "lucide-react";

import { Loader } from "~/components/shared/Loader";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { PAYMENT_ANALYTICS_LABELS } from "~/lib/payment-analytics";
import { createClient } from "~/lib/supabase.server";

type PaymentMetric = {
  metric_key: string;
  current_value: number;
  previous_value: number;
};

type PresetDays = 1 | 7 | 30 | 90;

function toDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function presetRange(days: PresetDays) {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - (days - 1));
  return { start: toDateInput(start), end: toDateInput(end) };
}

function parseRange(request: Request) {
  const url = new URL(request.url);
  const fallback = presetRange(1);
  let startDate = url.searchParams.get("start") ?? fallback.start;
  let endDate = url.searchParams.get("end") ?? fallback.end;
  let start = new Date(`${startDate}T00:00:00`);
  let end = new Date(`${endDate}T00:00:00`);

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(endDate) ||
    !Number.isFinite(start.getTime()) ||
    !Number.isFinite(end.getTime()) ||
    end < start
  ) {
    startDate = fallback.start;
    endDate = fallback.end;
    start = new Date(`${startDate}T00:00:00`);
    end = new Date(`${endDate}T00:00:00`);
  }

  end.setDate(end.getDate() + 1);
  return { startDate, endDate, start, end };
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { startDate, endDate, start, end } = parseRange(request);
  const headers = new Headers();
  const supabase = await createClient(request, { headers } as Response);
  const { data, error } = await supabase.rpc(
    "get_payment_analytics" as never,
    { p_start_at: start.toISOString(), p_end_at: end.toISOString() } as never,
  );

  return routeData(
    {
      startDate,
      endDate,
      metrics: error
        ? []
        : ((data ?? []) as PaymentMetric[])
            .filter((metric) => metric.metric_key in PAYMENT_ANALYTICS_LABELS)
            .map((metric) => ({
              ...metric,
              current_value: Number(metric.current_value),
              previous_value: Number(metric.previous_value),
            })),
      error: error ? "Unable to load payment analytics for this period." : null,
    },
    { headers },
  );
}

function Comparison({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  if (previous === 0 && current > 0)
    return <span className="text-xs font-medium text-blue-600">New</span>;
  const change = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  const positive = change >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

export default function PaymentAnalyticsReport() {
  const { startDate, endDate, metrics, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const loading =
    (navigation.state !== "idle" &&
      navigation.location?.pathname === "/reports/payment-analytics") ||
    revalidator.state !== "idle";
  const preset = useMemo(
    () =>
      ([7, 30, 90] as PresetDays[]).find((days) => {
        const range = presetRange(days);
        return range.start === startDate && range.end === endDate;
      }) ?? null,
    [endDate, startDate],
  );

  const applyPreset = (days: PresetDays) => {
    const range = presetRange(days);
    setSearchParams({ start: range.start, end: range.end });
  };

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Analytics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Payment attempts classified by their latest recorded status.
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="grid w-44 gap-1 text-[11px] font-medium text-muted-foreground">
            <DatePicker
              value={`${startDate}T00:00:00`}
              placeholder="Start date"
              onChange={(value) => {
                if (!value) return;
                const next = new URLSearchParams(searchParams);
                next.set("start", toDateInput(new Date(value)));
                next.set("end", endDate);
                setSearchParams(next);
              }}
            />
          </div>
          <div className="grid w-44 gap-1 text-[11px] font-medium text-muted-foreground">
            <DatePicker
              value={`${endDate}T00:00:00`}
              placeholder="End date"
              minDate={new Date(`${startDate}T00:00:00`)}
              onChange={(value) => {
                if (!value) return;
                const next = new URLSearchParams(searchParams);
                next.set("start", startDate);
                next.set("end", toDateInput(new Date(value)));
                setSearchParams(next);
              }}
            />
          </div>
          <Button
            variant="secondary"
            onClick={() => revalidator.revalidate()}
            disabled={loading}
          >
            <Filter className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      <section>
        {loading ? (
          <Loader />
        ) : error ? (
          <div className="flex min-h-64 items-center justify-center rounded-md border bg-card p-6 text-sm text-red-600">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            {metrics.map((metric) => {
              return (
                <Link
                  key={metric.metric_key}
                  to={`/customers/payment-analytics?metric=${metric.metric_key}&start=${startDate}&end=${endDate}`}
                  className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <Card className="h-full border bg-card shadow-none transition-all duration-200">
                    <CardContent className="flex min-h-32 flex-col">
                      <p className="text-sm font-medium text-muted-foreground">
                        {PAYMENT_ANALYTICS_LABELS[metric.metric_key]}
                      </p>

                      <div className="flex items-end gap-2">
                        <p className="text-3xl font-bold tracking-tight">
                          {metric.current_value.toLocaleString()}
                        </p>

                        <div className="mb-1">
                          <Comparison
                            current={metric.current_value}
                            previous={metric.previous_value}
                          />
                        </div>
                      </div>

                      <div className="mt-auto grid grid-cols-2 divide-x border-t pt-4">
                        <div className="pr-4">
                          <p className="text-[11px] text-muted-foreground">
                            Previous period
                          </p>

                          <p className="mt-1 text-sm font-semibold">
                            {metric.previous_value.toLocaleString()}
                          </p>
                        </div>

                        <div className="pl-4">
                          <p className="text-[11px] text-muted-foreground">
                            Change
                          </p>

                          <p className="mt-1 text-sm font-semibold">
                            <Comparison
                              current={metric.current_value}
                              previous={metric.previous_value}
                            />
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
