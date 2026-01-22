import { DataTable } from "~/components/ui/data-table";
import { couponColumns } from "./columns";

import { useQuery } from "@tanstack/react-query";
import { Loader } from "~/components/shared/Loader";
import { getAllCoupons } from "~/api/coupons";

export function CouponList() {
  const { data = [], isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: getAllCoupons,
  });

  if (isLoading) {
    return <Loader />;
  }

  return (
    <DataTable
      data={data}
      columns={couponColumns}
      searchColumn="name"
      searchPlaceholder="Search coupons..."
      title="Coupons"
    />
  );
}
