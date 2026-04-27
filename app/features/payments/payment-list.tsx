import { useQuery } from "@tanstack/react-query";
import { getAllPayments } from "~/api/payments";
import { Loader } from "~/components/shared/Loader";
import { DataTable } from "~/components/ui/data-table";
import { paymentColumns } from "./columns";

export function PaymentList() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin_payments"],
    queryFn: getAllPayments,
  });

  if (isLoading) return <Loader />;

  return (
    <DataTable
      data={payments ?? []}
      columns={paymentColumns}
      searchColumn="payment_code"
      searchPlaceholder="Search payment..."
      title="Payments"
    />
  );
}
