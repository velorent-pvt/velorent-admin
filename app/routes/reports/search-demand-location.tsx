import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ColumnDef } from "@tanstack/react-table";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, Search, Users, XCircle } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { getSearchLocationDetail } from "~/api/search-demand";
import { Loader } from "~/components/shared/Loader";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { CustomerList } from "~/features/customers/customer-list";
import { customerColumns, type Customer } from "~/features/customers/columns";

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

const searchCustomerColumns: ColumnDef<Customer>[] = [
  ...customerColumns.slice(0, 4),
  {
    accessorKey: "search_count",
    header: "Searches",
    cell: ({ row }) => row.original.search_count?.toLocaleString() ?? "0",
  },
  {
    accessorKey: "no_result_count",
    header: "No results",
    cell: ({ row }) => row.original.no_result_count?.toLocaleString() ?? "0",
  },
  {
    accessorKey: "last_searched_at",
    header: "Last searched",
    cell: ({ row }) =>
      row.original.last_searched_at
        ? new Date(row.original.last_searched_at).toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
          })
        : "-",
  },
];

export default function SearchDemandLocation() {
  const [searchParams] = useSearchParams();
  const location = searchParams.get("name")?.trim() ?? "";
  const startDate = validDate(searchParams.get("start"));
  const endDate = validDate(searchParams.get("end"));
  const valid = Boolean(location && startDate && endDate);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["search-location-detail", location, startDate, endDate],
    queryFn: () => getSearchLocationDetail(location, startDate!, endDate!),
    enabled: valid,
  });
  const customers = useMemo(
    () =>
      (data?.customers ?? []).map((customer) => {
        const completed =
          Number(Boolean(customer.aadhaar_number)) +
          Number(Boolean(customer.dl_number));
        return {
          ...customer,
          verification_completed: completed,
          verification_total: 2,
          verification_pending: 2 - completed,
        };
      }),
    [data?.customers],
  );
  const totalSearches =
    data?.daily.reduce((sum, item) => sum + Number(item.searches), 0) ?? 0;
  const noResults =
    data?.daily.reduce(
      (sum, item) => sum + Number(item.no_result_searches),
      0,
    ) ?? 0;
  const backUrl = `/reports/search-demand?start=${startDate ?? ""}&end=${endDate ?? ""}`;

  if (!valid)
    return (
      <div className="flex min-h-64 items-center justify-center p-6 text-sm text-red-600">
        Invalid search term selection.
      </div>
    );
  if (isLoading) return <Loader />;
  if (isError || !data)
    return (
      <div className="flex min-h-64 items-center justify-center p-6 text-sm text-red-600">
        Unable to load search term details.
      </div>
    );

  return (
    <div className="mx-auto flex w-full max-w-400 flex-col gap-5 p-5">
      <div>
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={backUrl}>
            <ArrowLeft className="h-4 w-4" />
            Back to search demand
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-bold">{location}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Customer search activity for this search term.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <Metric label="Searches" value={totalSearches} icon={Search} />
        <Metric
          label="Unique customers"
          value={customers.length}
          icon={Users}
        />
        <Metric label="No-result searches" value={noResults} icon={XCircle} />
      </div>
      <Card className="shadow-none">
        <CardHeader>
          <CardTitle className="text-sm">Daily search trend</CardTitle>
        </CardHeader>
        <CardContent className="h-80">
          {data.daily.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No searches in this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) =>
                    new Date(`${value}T00:00:00`).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                    })
                  }
                />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="searches"
                  name="Searches"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="no_result_searches"
                  name="No results"
                  stroke="#dc2626"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <CustomerList
        initialCustomers={customers}
        columns={searchCustomerColumns}
        title="Customers using this search term"
      />
    </div>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
}) {
  return (
    <Card className="shadow-none">
      <CardContent className="flex min-h-28 items-center justify-between gap-3 p-5">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-1 text-2xl font-bold">{value.toLocaleString()}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-md bg-blue-50 text-blue-600">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}
