import { DataTable } from "~/components/ui/data-table";

import { brandModelColumns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { getCarModels } from "~/api/models";
import { Loader } from "~/components/shared/Loader";

export function ModelList() {
  const { data: models = [], isLoading } = useQuery({
    queryKey: ["models"],
    queryFn: () => getCarModels(),
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <DataTable
      data={models}
      columns={brandModelColumns}
      searchColumn="name"
      searchPlaceholder="Search models..."
      title="Models"
    />
  );
}
