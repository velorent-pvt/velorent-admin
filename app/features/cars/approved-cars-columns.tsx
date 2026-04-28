import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import type { PendingCar } from "~/types/cars";
import { Badge } from "~/components/ui/badge";

export const approvedCarColumns: ColumnDef<PendingCar>[] = [
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
    id: "image",
    header: "Photo",
    cell: ({ row }) => {
      const image = row.original.image?.[0]?.image_url;

      return image ? (
        <img
          src={image}
          alt={row.original.model.name}
          className="h-12 w-20 rounded-md object-contain"
        />
      ) : (
        <div className="h-12 w-20 rounded-md bg-muted" />
      );
    },
  },

  {
    id: "model",
    header: "Car",
    cell: ({ row }) => (
      <div className="text-sm">
        <div className="font-medium">{row.original.model.name}</div>
        <div className="text-muted-foreground">
          {row.original.registration_number}
        </div>
      </div>
    ),
  },

  {
    id: "hourly_price",
    accessorKey: "hourly_price",
    header: "Price",
    cell: ({ row }) => (
      <span className="font-medium">₹{row.original.hourly_price}/hr</span>
    ),
  },

  {
    id: "upcoming_booking",
    accessorFn: (row) => {
      const now = new Date();
      const upcoming = row.bookings
        .filter((b) => ["confirmed", "ongoing"].includes(b.status))
        .map((b) => ({ ...b, start: new Date(b.start_time) }))
        .filter((b) => b.start > now)
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
      return upcoming ? new Date(upcoming.start_time).getTime() : Infinity;
    },
    header: "Upcoming Booking",
    cell: ({ row }) => {
      const now = new Date();
      const upcoming = row.original.bookings
        .filter((b) => ["confirmed", "ongoing"].includes(b.status))
        .map((b) => ({ ...b, start: new Date(b.start_time) }))
        .filter((b) => b.start > now)
        .sort((a, b) => a.start.getTime() - b.start.getTime())[0];

      if (!upcoming) return <span className="text-muted-foreground">N/A</span>;

      return (
        <div className="text-sm">
          <div className="font-medium">
            {new Date(upcoming.start_time).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
            })}
          </div>
          <div className="text-xs text-muted-foreground uppercase">
            {upcoming.status}
          </div>
        </div>
      );
    },
  },

  {
    id: "next_available",
    accessorFn: (row) => {
      const busyBlocks = [
        ...row.bookings
          .filter((b) => ["confirmed", "ongoing"].includes(b.status))
          .map((b) => ({ start: new Date(b.start_time), end: new Date(b.end_time) })),
        ...row.car_availability
          .filter((a) => a.status === "unavailable")
          .map((a) => ({ start: new Date(a.start_time), end: new Date(a.end_time) })),
      ].sort((a, b) => a.start.getTime() - b.start.getTime());

      let currentEnd = new Date();
      for (const block of busyBlocks) {
        if (block.start <= currentEnd) {
          if (block.end > currentEnd) {
            currentEnd = block.end;
          }
        } else {
          break;
        }
      }
      return currentEnd.getTime();
    },
    header: "Next Available",
    cell: ({ row }) => {
      const now = new Date();
      const busyBlocks = [
        ...row.original.bookings
          .filter((b) => ["confirmed", "ongoing"].includes(b.status))
          .map((b) => ({ start: new Date(b.start_time), end: new Date(b.end_time) })),
        ...row.original.car_availability
          .filter((a) => a.status === "unavailable")
          .map((a) => ({ start: new Date(a.start_time), end: new Date(a.end_time) })),
      ].sort((a, b) => a.start.getTime() - b.start.getTime());

      let currentEnd = new Date();
      for (const block of busyBlocks) {
        if (block.start <= currentEnd) {
          if (block.end > currentEnd) {
            currentEnd = block.end;
          }
        } else {
          break;
        }
      }

      const isToday =
        currentEnd.toLocaleDateString() === now.toLocaleDateString();

      if (isToday) {
        return <Badge variant="success">Today</Badge>;
      }

      return (
        <span className="font-medium">
          {currentEnd.toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })}
        </span>
      );
    },
  },

  {
    id: "host",
    header: "Host",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.host.full_name}</span>
    ),
  },

  {
    id: "location",
    header: "Location",
    cell: ({ row }) => {
      const loc = row.original.location;
      return <span className="text-sm">{loc ? `${loc.city}` : "Not set"}</span>;
    },
  },

  {
    id: "review",
    header: "",
    cell: ({ row }) => (
      <Button variant="link" asChild>
        <Link to={`/cars/${row.original.id}`}>View →</Link>
      </Button>
    ),
  },

  // Hidden accessor columns used only for sorting
  {
    id: "created_at",
    accessorKey: "created_at",
    header: () => null,
    cell: () => null,
  },
  {
    id: "booking_count",
    accessorFn: (row) => row.bookings.length,
    header: () => null,
    cell: () => null,
  },
];
