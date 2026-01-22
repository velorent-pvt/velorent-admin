import { DataTable } from "~/components/ui/data-table";
import { pendingCarColumns } from "./pending-cars-columns";
import { useQuery } from "@tanstack/react-query";
import { getPendingCars } from "~/api/cars";
import { Loader } from "~/components/shared/Loader";

export function PendingCarsList() {
  const { data: pendingCars, isLoading } = useQuery({
    queryKey: ["pending"],
    queryFn: getPendingCars,
  });

  if (isLoading) return <Loader />;

  return (
    <DataTable
      data={pendingCars}
      columns={pendingCarColumns}
      searchColumn="registration_number"
      searchPlaceholder="Search"
      title="Pending Cars"
    />
  );
}
