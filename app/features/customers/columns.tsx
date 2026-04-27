import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "~/components/ui/badge";
import { Checkbox } from "~/components/ui/checkbox";

export type Customer = {
  id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  role_id: number | null;
  created_at: string;
  aadhaar_name: string | null;
  aadhaar_number: string | null;
  dl_name: string | null;
  dl_number: string | null;
  verification_completed: number;
  verification_total: number;
  verification_pending: number;
};

export const customerColumns: ColumnDef<Customer>[] = [
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
    id: "avatar",
    header: "Avatar",
    cell: ({ row }) => (
      <img
        src={row.original.avatar_url || "/avatar-placeholder.png"}
        alt={row.original.full_name || "User"}
        className="h-9 w-9 rounded-full border object-cover"
      />
    ),
  },
  {
    accessorKey: "full_name",
    header: "Name",
    cell: ({ row }) => (
      <span className="font-medium">{row.original.full_name || "-"}</span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email || "-"}</span>
    ),
  },
  {
    accessorKey: "phone",
    header: "Phone",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.phone || "-"}</span>
    ),
  },
  {
    accessorKey: "aadhaar_number",
    header: "Aadhaar",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.aadhaar_number || "-"}</span>
    ),
  },
  {
    accessorKey: "dl_number",
    header: "Driving License",
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.dl_number || "-"}</span>
    ),
  },
  {
    accessorKey: "verification_completed",
    header: "Verification",
    cell: ({ row }) => {
      const isVerified =
        row.original.verification_completed === row.original.verification_total;

      return (
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">
            {row.original.verification_completed}/{row.original.verification_total}
          </span>
          <Badge variant={isVerified ? "success" : "secondary"}>
            {isVerified ? "verified" : `${row.original.verification_pending} pending`}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: "created_at",
    header: "Joined On",
    cell: ({ row }) =>
      new Date(row.original.created_at).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
  },
];
