import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  data as routeData,
  Link,
  type LoaderFunctionArgs,
  useLoaderData,
  useNavigation,
  useRevalidator,
  useSearchParams,
} from "react-router";
import { ArrowDownRight, ArrowUpRight, Filter } from "lucide-react";

import { Loader } from "~/components/shared/Loader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/ui/data-table";
import { DatePicker } from "~/components/ui/date-picker";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { createClient } from "~/lib/supabase.server";

type PresetDays = 7 | 30 | 90;
type Summary = {
  total_searches: number;
  previous_total_searches: number;
  unique_customers: number;
  previous_unique_customers: number;
  locations_searched: number;
  previous_locations_searched: number;
  no_result_searches: number;
  previous_no_result_searches: number;
  no_result_rate: number;
  previous_no_result_rate: number;
};
type LocationRow = {
  location: string;
  searches: number;
  unique_customers: number;
  no_result_searches: number;
  no_result_rate: number;
  average_results: number;
  previous_searches: number;
  available_vehicles: number;
};
type ReportData = { summary: Summary; locations: LocationRow[] };

function toDateInput(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
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
    "get_search_demand_report" as never,
    { p_start_at: start.toISOString(), p_end_at: end.toISOString() } as never,
  );
  return routeData(
    {
      startDate,
      endDate,
      report: error ? null : (data as unknown as ReportData),
      error: error ? "Unable to load search demand for this period." : null,
    },
    { headers },
  );
}

function Change({ current, previous }: { current: number; previous: number }) {
  if (previous === 0 && current > 0)
    return <span className="text-xs font-medium text-blue-600">New</span>;
  const value = previous === 0 ? 0 : ((current - previous) / previous) * 100;
  const positive = value >= 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium ${positive ? "text-emerald-600" : "text-red-600"}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {Math.abs(value).toFixed(1)}%
    </span>
  );
}

export default function SearchDemandReport() {
  const { startDate, endDate, report, error } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigation = useNavigation();
  const revalidator = useRevalidator();
  const loading =
    (navigation.state !== "idle" &&
      navigation.location?.pathname === "/reports/search-demand") ||
    revalidator.state !== "idle";
  const preset = useMemo(
    () =>
      ([7, 30, 90] as PresetDays[]).find((days) => {
        const range = presetRange(days);
        return range.start === startDate && range.end === endDate;
      }) ?? null,
    [startDate, endDate],
  );

  const columns = useMemo<ColumnDef<LocationRow>[]>(
    () => [
      {
        accessorKey: "location",
        header: "Search term",
        cell: ({ row }) => (
          <Link
            className="font-semibold text-blue-600 hover:underline"
            to={`/reports/search-demand/location?name=${encodeURIComponent(row.original.location)}&start=${startDate}&end=${endDate}`}
          >
            {row.original.location}
          </Link>
        ),
      },
      {
        accessorKey: "searches",
        header: "Searches",
        cell: ({ row }) => row.original.searches.toLocaleString(),
      },
      {
        accessorKey: "no_result_rate",
        header: "No-result rate",
        cell: ({ row }) => (
          <span
            className={
              row.original.no_result_rate >= 25
                ? "font-semibold text-red-600"
                : ""
            }
          >
            {row.original.no_result_rate.toFixed(1)}%
          </span>
        ),
      },
      {
        accessorKey: "average_results",
        header: "Avg. results",
        cell: ({ row }) => row.original.average_results.toFixed(1),
      },
      {
        id: "trend",
        accessorFn: (row) =>
          row.previous_searches === 0
            ? row.searches
            : ((row.searches - row.previous_searches) / row.previous_searches) *
              100,
        header: "Trend",
        cell: ({ row }) => (
          <Change
            current={row.original.searches}
            previous={row.original.previous_searches}
          />
        ),
      },
      {
        id: "status",
        header: "Search outcome",
        cell: ({ row }) => {
          const hasNoResults = row.original.no_result_rate > 0;
          return (
            <Badge variant={hasNoResults ? "destructive" : "secondary"}>
              {hasNoResults ? "No results" : "-"}
            </Badge>
          );
        },
      },
    ],
    [startDate, endDate],
  );

  const applyPreset = (days: PresetDays) => setSearchParams(presetRange(days));
  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5 p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Search Demand</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See what customers search for and which searches return no results.
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
            disabled={loading}
            onClick={() => revalidator.revalidate()}
          >
            <Filter className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>
      {loading ? (
        <Loader />
      ) : error || !report ? (
        <div className="flex min-h-64 items-center justify-center rounded-md border bg-card p-6 text-sm text-red-600">
          {error ?? "No report data available."}
        </div>
      ) : (
        <>
          <DataTable
            data={report.locations}
            columns={columns}
            title="Search terms"
            showTitle={false}
            searchColumn="location"
            searchPlaceholder="Filter search terms..."
            showPageSizeSelector
            defaultSort={{ column: "searches", direction: "desc" }}
            sortOptions={[
              { label: "Search volume", column: "searches" },
              { label: "No-result rate", column: "no_result_rate" },
              { label: "Trend", column: "trend" },
            ]}
          />
        </>
      )}
    </div>
  );
}
