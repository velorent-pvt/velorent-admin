import { DataTable } from "~/components/ui/data-table";
import { brandColumns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { getCarBrands } from "~/api/brands";
import { Loader } from "~/components/shared/Loader";

export function BrandList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: getCarBrands,
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <DataTable
      data={data}
      columns={brandColumns}
      searchColumn="name"
      searchPlaceholder="Search brand..."
      title="Brands"
    />
  );
}
