import { DataTable } from "~/components/ui/data-table";
import { hostColumns } from "./columns";
import { getAllHosts } from "~/api/customer";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "~/components/shared/Loader";

export function HostList() {
  const { data: hosts, isLoading } = useQuery({
    queryKey: ["hosts"],
    queryFn: getAllHosts,
  });

  if (isLoading) return <Loader />;

  return (
    <DataTable
      data={hosts}
      columns={hostColumns}
      searchColumn="name"
      searchPlaceholder="Search host..."
      title="Hosts"
    />
  );
}
