import { type ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { useNavigate } from "react-router";
import type { Coupon } from "~/types/coupon";
import { Badge } from "~/components/ui/badge";

export const couponColumns: ColumnDef<Coupon>[] = [
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
    accessorKey: "code",
    header: "Code",
    cell: ({ row }) => <span className="font-medium">{row.original.code}</span>,
  },

  {
    header: "Discount",
    cell: ({ row }) => {
      const { discount_type, discount_value } = row.original;
      return discount_type === "percentage"
        ? `${discount_value}%`
        : `₹${discount_value}`;
    },
  },

  {
    accessorKey: "min_booking_amount",
    header: "Min Amount",
    cell: ({ row }) => <span>₹{row.original.min_booking_amount}</span>,
  },

  {
    accessorKey: "start_date",
    header: "Start Date",
    cell: ({ row }) => {
      return new Date(row.original.start_date).toLocaleDateString();
    },
  },
  {
    accessorKey: "end_date",
    header: "End Date",
    cell: ({ row }) => {
      return new Date(row.original.end_date).toLocaleDateString();
    },
  },

  {
    accessorKey: "per_customer_limit",
    header: "Limit",
    cell: ({ row }) => `${row.original.per_customer_limit} / user`,
  },

  {
    accessorKey: "is_active",
    header: "Status",
    cell: ({ row }) => {
      const isActive = row.original.is_active;

      return (
        <Badge
          variant={isActive ? "success" : "destructive"}
          className="px-2 py-0.5 text-xs"
        >
          {isActive ? "Active" : "Inactive"}
        </Badge>
      );
    },
  },

  {
    id: "actions",
    cell: ({ row }) => {
      const coupon = row.original;
      const navigate = useNavigate();

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => navigate(`edit?id=${coupon.id}`)}
            >
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              variant="destructive"
              className="cursor-pointer"
              onClick={() =>
                navigate(`delete?title=${coupon.code}&id=${coupon.id}`)
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
