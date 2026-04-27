import { type ColumnDef } from "@tanstack/react-table";
import { Link } from "react-router";
import type { AdminDispute } from "~/api/disputes";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

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

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  const normalized = status.toLowerCase();
  if (normalized === "resolved") return "success";
  if (normalized === "rejected") return "destructive";
  if (normalized === "open") return "secondary";
  return "outline";
}

export const disputeColumns: ColumnDef<AdminDispute>[] = [
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
    accessorKey: "dispute_code",
    header: "Dispute",
    cell: ({ row }) => <span className="font-medium">#{row.original.dispute_code}</span>,
  },
  {
    accessorKey: "booking_code",
    header: "Booking",
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">#{row.original.booking_code}</div>
        <div className="text-muted-foreground">{row.original.car_name}</div>
      </div>
    ),
  },
  {
    accessorKey: "raised_by_name",
    header: "Raised By",
  },
  {
    accessorKey: "dispute_type",
    header: "Type",
    cell: ({ row }) => humanize(row.original.dispute_type),
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
    header: "Raised On",
    cell: ({ row }) => formatDateTime(row.original.created_at),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <Button variant="link" asChild>
        <Link to={`/disputes/${row.original.id}`}>View</Link>
      </Button>
    ),
  },
];
