import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "~/components/ui/badge";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { Bike, ExternalLink } from "lucide-react";
import { Checkbox } from "~/components/ui/checkbox";
import type { AdminBooking } from "~/api/bookings";

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

function formatAmount(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function bookingStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" {
  const normalized = status.toLowerCase();
  if (normalized === "approved" || normalized === "completed" || normalized === "confirmed" || normalized === "ongoing") return "success";
  if (normalized === "cancelled" || normalized === "rejected") return "destructive";
  if (normalized === "pending") return "secondary";
  return "outline";
}

function depositStatusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" {
  const normalized = status.toLowerCase();
  if (normalized === "paid" || normalized === "refunded") return "success";
  if (normalized === "forfeited") return "destructive";
  if (normalized === "pending") return "secondary";
  return "outline";
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function isTwoWheelerCollateral(row: AdminBooking) {
  const depositAmount = Number(row.deposit_amount ?? 0);
  const depositStatus = String(row.deposit_status ?? "").toLowerCase();
  return depositAmount <= 0 && depositStatus === "pending";
}

export const bookingColumns: ColumnDef<AdminBooking>[] = [
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
    cell: ({ row }) => <span className="font-medium">#{row.original.booking_code}</span>,
  },
  {
    accessorKey: "car_name",
    header: "Car",
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.car_name}</div>
        <div className="text-muted-foreground">{row.original.registration_number}</div>
      </div>
    ),
  },
  {
    accessorKey: "customer_name",
    header: "Customer",
  },
  {
    accessorKey: "host_name",
    header: "Host",
  },
  {
    accessorKey: "start_time",
    header: "Trip Window",
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{formatDateTime(row.original.start_time)}</div>
        <div className="text-muted-foreground">to {formatDateTime(row.original.end_time)}</div>
      </div>
    ),
  },
  {
    accessorKey: "total_amount",
    header: "Amount",
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{formatAmount(row.original.total_amount)}</div>
        <div className="text-muted-foreground">{row.original.total_hours} hrs</div>
      </div>
    ),
  },
  {
    accessorKey: "status",
    header: "Booking Status",
    cell: ({ row }) => (
      <Badge variant={bookingStatusVariant(row.original.status)}>
        {humanize(row.original.status)}
      </Badge>
    ),
  },
  {
    accessorKey: "deposit_status",
    header: "Deposit",
    cell: ({ row }) => (
      <Badge variant={depositStatusVariant(row.original.deposit_status)}>
        {isTwoWheelerCollateral(row.original) ? (
          <span title="Two-wheeler collateral">
            <Bike className="h-3.5 w-3.5" />
          </span>
        ) : (
          humanize(row.original.deposit_status)
        )}
      </Badge>
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button asChild size="sm" variant="ghost">
        <Link to={`/bookings/${row.original.id}`}>
          <ExternalLink className="h-4 w-4 mr-1" />
          View
        </Link>
      </Button>
    ),
  },
];
