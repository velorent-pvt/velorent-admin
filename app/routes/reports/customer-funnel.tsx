import { useMemo } from "react";
import {
  data as routeData,
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams,
  Link,
} from "react-router";
import { ArrowDownRight, ArrowUpRight, Filter } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Loader } from "~/components/shared/Loader";
import { Card, CardContent } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { createClient } from "~/lib/supabase.server";
import { CUSTOMER_FUNNEL_STAGE_LABELS } from "~/lib/customer-funnel";

type FunnelRow = {
  stage_index: number;
  event_name: string;
  current_customers: number;
  previous_customers: number;
};

type FunnelStage = FunnelRow & {
  stageLabel: string;
  stageConversion: number | null;
  dropped: number | null;
  dropRate: number | null;
  funnelShare: number;
};

type PresetDays = 7 | 30 | 90;

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
  const fallback = presetRange(30);
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
    "get_customer_funnel" as never,
    { p_start_at: start.toISOString(), p_end_at: end.toISOString() } as never,
  );

  return routeData(
    {
      startDate,
      endDate,
      rows: error
        ? []
        : ((data ?? []) as FunnelRow[]).map((row) => ({
            ...row,
            stage_index: Number(row.stage_index),
            current_customers: Number(row.current_customers),
            previous_customers: Number(row.previous_customers),
          })),
      error: error ? "Unable to load funnel data for this period." : null,
    },
    { headers },
  );
}

function percent(value: number) {
  return `${value.toFixed(1)}%`;
}

function comparison(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : null;
  return ((current - previous) / previous) * 100;
}

function Comparison({
  current,
  previous,
}: {
  current: number;
  previous: number;
}) {
  const change = comparison(current, previous);
  if (change === null) {
    return <span className="text-xs font-medium text-blue-600">New</span>;
  }

  const positive = change >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${
        positive ? "text-emerald-600" : "text-red-600"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(change).toFixed(1)}%
    </span>
  );
}

export default function CustomerFunnelReport() {
  const { startDate, endDate, rows, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const loading =
    (navigation.state !== "idle" &&
      navigation.location?.pathname === "/reports/customer-funnel") ||
    revalidator.state !== "idle";
  const preset = useMemo(() => {
    return (
      ([7, 30, 90] as PresetDays[]).find((days) => {
        const range = presetRange(days);
        return range.start === startDate && range.end === endDate;
      }) ?? null
    );
  }, [endDate, startDate]);

  const first = rows[0]?.current_customers ?? 0;
  const stages = useMemo<FunnelStage[]>(
    () =>
      rows.map((row, index) => {
        const previousStage =
          rows[index - 1]?.current_customers ?? row.current_customers;
        const dropped =
          index === 0
            ? null
            : Math.max(0, previousStage - row.current_customers);
        return {
          ...row,
          stageLabel:
            CUSTOMER_FUNNEL_STAGE_LABELS[row.stage_index] ?? row.event_name,
          stageConversion:
            index === 0
              ? null
              : previousStage > 0
                ? (row.current_customers / previousStage) * 100
                : 0,
          dropped,
          dropRate:
            index === 0 || previousStage === 0 || dropped === null
              ? null
              : (dropped / previousStage) * 100,
          funnelShare:
            first > 0 ? Math.max(2, (row.current_customers / first) * 100) : 0,
        };
      }),
    [first, rows],
  );

  const applyPreset = (days: PresetDays) => {
    const range = presetRange(days);
    setSearchParams({ start: range.start, end: range.end });
  };

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customer Funnel</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Unique customers progressing through the booking journey in order.
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
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {stages.map((stage) => (
              <Link
                key={stage.stage_index}
                to={`/customers/funnel-dropoffs?stage=${stage.stage_index}&start=${startDate}&end=${endDate}`}
                className="group block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <Card className="h-full border bg-card shadow-none transition-all duration-200">
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold">
                        {stage.stageLabel}
                      </h3>
                    </div>

                    <div className="mt-5">
                      <p className="text-xs font-medium text-muted-foreground">
                        Customers
                      </p>

                      <div className="mt-1 flex items-end gap-2">
                        <p className="text-3xl font-bold tracking-tight">
                          {stage.current_customers.toLocaleString()}
                        </p>

                        <div className="mb-1">
                          <Comparison
                            current={stage.current_customers}
                            previous={stage.previous_customers}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-5">
                      <div className="mb-2 flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">
                          Funnel share
                        </span>

                        <span className="font-medium">
                          {percent(stage.funnelShare)}
                        </span>
                      </div>

                      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-300"
                          style={{
                            width: `${Math.min(stage.funnelShare, 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 grid grid-cols-3 divide-x border-t pt-4">
                      <div className="pr-3">
                        <p className="text-[11px] text-muted-foreground">
                          Conversion
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {stage.stageConversion === null
                            ? "-"
                            : percent(stage.stageConversion)}
                        </p>
                      </div>

                      <div className="px-3">
                        <p className="text-[11px] text-muted-foreground">
                          Dropped
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {stage.dropped === null
                            ? "-"
                            : stage.dropped.toLocaleString()}
                        </p>
                      </div>

                      <div className="pl-3">
                        <p className="text-[11px] text-muted-foreground">
                          Previous
                        </p>
                        <p className="mt-1 text-sm font-semibold">
                          {stage.previous_customers.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
