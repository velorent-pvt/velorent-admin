import { DataTable } from "~/components/ui/data-table";
import { approvedCarColumns } from "./approved-cars-columns";
import { useQuery } from "@tanstack/react-query";
import { getApprovedCars } from "~/api/cars";
import { Loader } from "~/components/shared/Loader";

export function ApprovedCarsList() {
  const { data: approvedCars, isLoading } = useQuery({
    queryKey: ["approved_cars"],
    queryFn: getApprovedCars,
  });

  if (isLoading) return <Loader />;

  return (
    <DataTable
      data={approvedCars}
      columns={approvedCarColumns}
      searchColumn="registration_number"
      searchPlaceholder="Search"
      title="Approved Cars"
    />
  );
}
