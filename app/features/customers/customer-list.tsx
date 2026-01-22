import { DataTable } from "~/components/ui/data-table";
import { customerColumns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { getAllCustomers } from "~/api/customer";
import { Loader } from "~/components/shared/Loader";

export function CustomerList() {
  const { data: customers, isLoading } = useQuery({
    queryKey: ["customer"],
    queryFn: getAllCustomers,
  });

  if (isLoading) return <Loader />;

  return (
    <DataTable
      data={customers}
      columns={customerColumns}
      searchColumn="name"
      searchPlaceholder="Search customer..."
      title="Customers"
    />
  );
}
