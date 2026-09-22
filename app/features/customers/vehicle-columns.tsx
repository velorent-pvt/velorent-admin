import { Link } from "react-router";
import type { ColumnDef } from "@tanstack/react-table";
import { customerColumns, type Customer } from "./columns";
import { Button } from "~/components/ui/button";
import { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "~/components/ui/sheet";
export const vehicleColumns: ColumnDef<Customer>[] = [
  ...customerColumns,
  {
    id: "vehicles",
    header: "Vehicle(s)",
    cell: ({ row }) => row.original.vehicles?.length ? (
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="link" size="sm" className="px-0 font-normal" aria-label={`View vehicles for ${row.original.full_name || "customer"}`}>
            View →
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-full sm:max-w-md">
          <SheetHeader className="shrink-0 border-b pr-10">
            <SheetTitle>Vehicles</SheetTitle>
            <SheetDescription>
              {row.original.full_name || "Customer"} · {row.original.vehicles.length} vehicle{row.original.vehicles.length === 1 ? "" : "s"} in this selection
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">
            <ul className="space-y-3">
              {row.original.vehicles.map((vehicle) => (
                <li key={vehicle.id}>
                  <Link to={`/cars/${vehicle.id}`} className="block rounded-lg border bg-card p-4 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="block font-medium">{vehicle.name || "Vehicle"}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{vehicle.registration_number || "Registration not recorded"}</span>
                    <span className="mt-3 block text-xs font-medium text-primary">View vehicle details →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    ) : <span className="text-muted-foreground">Not recorded</span>,
  },
];

