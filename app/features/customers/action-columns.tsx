import type { ColumnDef } from "@tanstack/react-table";
import { customerColumns, type Customer } from "./columns";
import { vehicleColumns } from "./vehicle-columns";

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

export const actionColumns = withActionTime(customerColumns);
export const actionVehicleColumns = withActionTime(vehicleColumns);
