import { type ColumnDef } from "@tanstack/react-table";
import { Checkbox } from "~/components/ui/checkbox";
import { Button } from "~/components/ui/button";
import { Link } from "react-router";
import type { PendingCar } from "~/types/cars";

export const pendingCarColumns: ColumnDef<PendingCar>[] = [
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
        <Link to={`/pending/${row.original.id}`}>Review →</Link>
      </Button>
    ),
  },
];
