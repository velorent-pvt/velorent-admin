import { useQuery } from "@tanstack/react-query";
import { getAllDisputes } from "~/api/disputes";
import { Loader } from "~/components/shared/Loader";
import { DataTable } from "~/components/ui/data-table";
import { disputeColumns } from "./columns";

export function DisputeList() {
  const { data: disputes, isLoading } = useQuery({
    queryKey: ["admin_disputes"],
    queryFn: getAllDisputes,
  });

  if (isLoading) return <Loader />;

  return (
    <DataTable
      data={disputes ?? []}
      columns={disputeColumns}
      searchColumn="dispute_code"
      searchPlaceholder="Search dispute..."
      title="Disputes"
    />
  );
}
