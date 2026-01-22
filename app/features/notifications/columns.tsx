import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Badge } from "~/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { Button } from "~/components/ui/button";
import { Checkbox } from "~/components/ui/checkbox";
import { Link, useNavigate } from "react-router";

export type Notification = {
  id: string;
  title: string;
  message?: string;
  is_read: boolean;
  created_at: string;
  link?: string;
};

export const notificationColumns: ColumnDef<Notification>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
      />
    ),
    enableSorting: false,
  },

  {
    accessorKey: "title",
    header: "Title",
    cell: ({ row }) => <div className="font-medium">{row.original.title}</div>,
  },

  {
    accessorKey: "message",
    header: "Message",
    cell: ({ row }) =>
      row.original.message ? (
        <span className="text-muted-foreground text-sm">
          {row.original.message}
        </span>
      ) : (
        "-"
      ),
  },

  {
    accessorKey: "created_at",
    header: "Date",
    cell: ({ row }) => new Date(row.original.created_at).toLocaleString(),
  },

  {
    id: "review",
    header: "",
    cell: ({ row }) => (
      <Button variant="link" asChild>
        <Link to={row.original.link ?? "#"}>View →</Link>
      </Button>
    ),
  },
];
