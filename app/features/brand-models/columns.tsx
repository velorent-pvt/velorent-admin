import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { useNavigate } from "react-router";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import type { CarModel } from "~/types/models";

export const brandModelColumns: ColumnDef<CarModel>[] = [
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
    accessorKey: "image_url",
    header: "Image",
    cell: ({ row }) =>
      row.original.image_url ? (
        <img
          src={row.original.image_url}
          alt={row.original.name}
          className="h-12 object-contain"
        />
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
  },

  {
    accessorKey: "brand_name",
    header: "Brand",
    cell: ({ row }) => (
      <span className="font-medium">{row.original?.car_brands?.name}</span>
    ),
  },

  {
    accessorKey: "name",
    header: "Model",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },

  {
    header: "Earnings",
    cell: ({ row }) => (
      <span className="text-sm">
        ₹{row.original.min_earn_amount} - ₹{row.original.max_earn_amount}
        <span className="ml-1 text-xs text-muted-foreground">/ mo</span>
      </span>
    ),
  },

  {
    id: "actions",
    cell: ({ row }) => {
      const navigate = useNavigate();
      const model = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => navigate(`edit?id=${model.id}`)}>
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                navigate(`delete?title=${model.name}&id=${model.id}`)
              }
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
