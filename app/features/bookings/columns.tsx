import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "~/components/ui/badge";
import { Link } from "react-router";
import { Button } from "~/components/ui/button";
import { ExternalLink } from "lucide-react";
import type { AdminBooking, BookingStatus } from "~/api/bookings";

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  ongoing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export const bookingColumns: ColumnDef<AdminBooking>[] = [
  {
    id: "car",
    header: "Car",
    cell: ({ row }) => {
      const car = row.original.car;
      const brand = (car?.car_brands as any)?.name ?? "";
      const model = (car?.car_models as any)?.name ?? "";
      const images = car?.car_images ?? [];
      const primaryImage =
        (images as any[]).find((i) => i.is_primary)?.image_url ||
        (images as any[])[0]?.image_url;
      return (
        <div className="flex items-center gap-3">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={`${brand} ${model}`}
              className="h-10 w-14 rounded-lg object-cover border flex-shrink-0"
            />
          ) : (
            <div className="h-10 w-14 rounded-lg bg-muted flex-shrink-0" />
          )}
          <div>
            <p className="font-semibold text-sm leading-tight">
              {brand} {model}
            </p>
            <p className="text-xs text-muted-foreground">
              {car?.registration_number ?? "—"}
            </p>
          </div>
        </div>
      );
    },
  },

  {
    id: "customer",
    header: "Customer",
    cell: ({ row }) => {
      const c = row.original.customer as any;
      return (
        <div className="flex items-center gap-2">
          {c?.avatar_url ? (
            <img
              src={c.avatar_url}
              alt={c.full_name}
              className="h-8 w-8 rounded-full object-cover border flex-shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-muted flex-shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground">
              {c?.full_name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
          <div>
            <p className="font-medium text-sm">{c?.full_name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{c?.phone ?? c?.email ?? "—"}</p>
          </div>
        </div>
      );
    },
  },

  {
    id: "pickup",
    header: "Pick-up",
    cell: ({ row }) => (
      <span className="text-sm">{fmt(row.original.start_time)}</span>
    ),
  },

  {
    id: "dropoff",
    header: "Drop-off",
    cell: ({ row }) => (
      <span className="text-sm">{fmt(row.original.end_time)}</span>
    ),
  },

  {
    id: "total",
    header: "Total",
    cell: ({ row }) => (
      <span className="font-semibold text-sm">
        ₹{Number(row.original.total_amount).toLocaleString("en-IN")}
      </span>
    ),
  },

  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <Badge
          className={`capitalize border text-xs font-medium ${STATUS_COLORS[status] ?? ""}`}
          variant="outline"
        >
          {status}
        </Badge>
      );
    },
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
