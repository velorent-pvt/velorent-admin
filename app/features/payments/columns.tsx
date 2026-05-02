import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router";
import type { AdminPayment } from "~/api/payments";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";

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

function formatAmount(value: number, currency: string) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: currency || "INR",
    maximumFractionDigits: 2,
  });
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  const normalized = status.toLowerCase();
  if (normalized === "successful" || normalized === "refunded") return "success";
  if (normalized === "failed") return "destructive";
  if (normalized === "initiated") return "secondary";
  return "outline";
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const paymentColumns: ColumnDef<AdminPayment>[] = [
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
    accessorKey: "payment_code",
    header: "Payment",
    cell: ({ row }) => <span className="font-medium">#{row.original.payment_code}</span>,
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
  {
    accessorKey: "customer_name",
    header: "Customer",
  },
  {
    accessorKey: "amount",
    header: "Amount",
    cell: ({ row }) => (
      <span className="font-medium">
        {formatAmount(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "gateway_payment_id",
    header: "Reference",
    cell: ({ row }) => <span className="text-muted-foreground">{row.original.gateway_payment_id}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={statusVariant(row.original.status)}>
        {humanize(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: "created_at",
    header: "Created",
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
];
