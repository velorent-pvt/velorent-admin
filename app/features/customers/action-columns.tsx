import type { ColumnDef } from "@tanstack/react-table";
import { customerColumns, type Customer } from "./columns";
import { vehicleColumns } from "./vehicle-columns";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Badge } from "~/components/ui/badge";

const actionAtColumn: ColumnDef<Customer> = {
  accessorKey: "action_at",
  header: "Action At",
  cell: ({ row }) => row.original.action_at
    ? new Date(row.original.action_at).toLocaleString("en-IN", {
        day: "2-digit", month: "short", year: "numeric",
        hour: "2-digit", minute: "2-digit", second: "2-digit",
      })
    : "-",
};

function withActionTime(columns: ColumnDef<Customer>[]): ColumnDef<Customer>[] {
  return columns.map((column) =>
    "accessorKey" in column && column.accessorKey === "created_at" ? actionAtColumn : column,
  );
}

const assignedLeadColumn: ColumnDef<Customer> = {
  id: "lead_assignee",
  header: "Lead Assigned To",
  cell: ({ row }) => {
    const assignee = row.original.lead_assignee;
    if (!assignee) return <span className="text-muted-foreground">No matching lead</span>;
    if (!assignee.full_name) return <Badge variant="outline">Unassigned</Badge>;
    return (
      <span className="inline-flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarImage src={assignee.avatar_url ?? undefined} alt={assignee.full_name} />
          <AvatarFallback>{assignee.full_name.slice(0, 1).toUpperCase()}</AvatarFallback>
        </Avatar>
        {assignee.full_name}
      </span>
    );
  },
};

export const actionColumns = [
  ...withActionTime(customerColumns),
  assignedLeadColumn,
];

export const actionVehicleColumns = [
  ...withActionTime(vehicleColumns),
  assignedLeadColumn,
];
