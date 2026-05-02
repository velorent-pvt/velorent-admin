import { useQuery } from "@tanstack/react-query";
import {
  getAllPayments,
  getCompanyEarnings,
  getHostPayouts,
  type CompanyEarningRecord,
  type HostPayoutRecord,
} from "~/api/payments";
import { Loader } from "~/components/shared/Loader";
import { DataTable } from "~/components/ui/data-table";
import { paymentColumns } from "./columns";
import { DatePicker } from "~/components/ui/date-picker";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "~/components/ui/checkbox";
import { Badge } from "~/components/ui/badge";
import { Link } from "react-router";

type PaymentSection = "customer-refund" | "customer-deposit" | "host-payout" | "earning";

function formatDateTime(value: string) {
  const date = new Date(value);
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatCurrency(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });
}

function payoutStatusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  const normalized = String(status ?? "").toLowerCase();
  if (normalized === "paid" || normalized === "success") return "success";
  if (normalized === "failed") return "destructive";
  if (normalized === "processing" || normalized === "queued" || normalized === "pending") {
    return "secondary";
  }
  return "outline";
}

function humanize(value: string) {
  return String(value ?? "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

const hostPayoutColumns: ColumnDef<HostPayoutRecord>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "booking_code",
    header: "Booking",
    cell: ({ row }) => (
      <Button variant="link" className="h-auto p-0" asChild>
        <Link to={`/bookings/${row.original.booking_id}`}>#{row.original.booking_code}</Link>
      </Button>
    ),
  },
  { accessorKey: "host_name", header: "Host" },
  {
    accessorKey: "host_earnings_amount",
    header: "Payout Amount",
    cell: ({ row }) => formatCurrency(row.original.host_earnings_amount),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={payoutStatusVariant(row.original.status)}>
        {humanize(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: "payout_completed_at",
    header: "Completed",
    cell: ({ row }) =>
      row.original.payout_completed_at ? formatDateTime(row.original.payout_completed_at) : "—",
  },
];

const earningColumns: ColumnDef<CompanyEarningRecord>[] = [
  { accessorKey: "booking_code", header: "Booking", cell: ({ row }) => `#${row.original.booking_code}` },
  { accessorKey: "customer_name", header: "Customer" },
  { accessorKey: "host_name", header: "Host" },
  {
    accessorKey: "commission_amount",
    header: "Company Earning",
    cell: ({ row }) => formatCurrency(row.original.commission_amount),
  },
  { accessorKey: "booking_status", header: "Booking Status" },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
];

export function PaymentList({ section = "customer-deposit" }: { section?: PaymentSection }) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin_payments", section],
    queryFn: getAllPayments,
    enabled: section === "customer-refund" || section === "customer-deposit",
  });

  const { data: hostPayouts, isLoading: isHostPayoutLoading } = useQuery({
    queryKey: ["admin_host_payouts"],
    queryFn: getHostPayouts,
    enabled: section === "host-payout",
  });

  const { data: earnings, isLoading: isEarningLoading } = useQuery({
    queryKey: ["admin_company_earnings"],
    queryFn: getCompanyEarnings,
    enabled: section === "earning",
  });

  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  const filteredPayments = useMemo(() => {
    const rawItems =
      section === "host-payout"
        ? hostPayouts ?? []
        : section === "earning"
          ? earnings ?? []
          : payments ?? [];
    const items =
      section === "customer-refund"
        ? (rawItems as any[]).filter((item) => String(item.status).toLowerCase() === "refunded")
        : section === "customer-deposit"
          ? (rawItems as any[]).filter((item) =>
              ["initiated", "successful", "failed"].includes(
                String(item.status).toLowerCase(),
              ),
            )
          : rawItems;

    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    return items.filter((payment) => {
      const createdAt = new Date((payment as any).created_at);
      if (Number.isNaN(createdAt.getTime())) return false;
      if (from && createdAt < from) return false;
      if (to && createdAt > to) return false;
      return true;
    });
  }, [section, payments, hostPayouts, earnings, fromDate, toDate]);

  if (isLoading || isHostPayoutLoading || isEarningLoading) return <Loader />;

  const heading =
    section === "customer-refund"
      ? "Customer Refund"
      : section === "customer-deposit"
        ? "Earning"
        : section === "host-payout"
          ? "Host Payout"
          : "Earning";
  const columns =
    section === "host-payout"
      ? hostPayoutColumns
      : section === "earning"
        ? earningColumns
        : paymentColumns;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-3xl font-bold">{heading}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="Created from"
            />
          </div>
          <div className="w-44">
            <DatePicker
              value={toDate}
              onChange={setToDate}
              placeholder="Created to"
              minDate={fromDate ? new Date(fromDate) : undefined}
            />
          </div>
          {(fromDate || toDate) && (
            <Button
              variant="outline"
              onClick={() => {
                setFromDate(undefined);
                setToDate(undefined);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={filteredPayments as any[]}
        columns={columns as any}
        title={heading}
        showHeader={false}
      />
    </div>
  );
}
