import { useQuery } from "@tanstack/react-query";
import { getAllPayments } from "~/api/payments";
import { Loader } from "~/components/shared/Loader";
import { DataTable } from "~/components/ui/data-table";
import { paymentColumns } from "./columns";
import { DatePicker } from "~/components/ui/date-picker";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";

export function PaymentList() {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin_payments"],
    queryFn: getAllPayments,
  });

  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  const filteredPayments = useMemo(() => {
    const items = payments ?? [];

    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    return items.filter((payment) => {
      const createdAt = new Date(payment.created_at);
      if (Number.isNaN(createdAt.getTime())) return false;
      if (from && createdAt < from) return false;
      if (to && createdAt > to) return false;
      return true;
    });
  }, [payments, fromDate, toDate]);

  if (isLoading) return <Loader />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-3xl font-bold">Payments</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="Created from"
            />
          </div>
          <div className="w-44">
            <DatePicker
              value={toDate}
              onChange={setToDate}
              placeholder="Created to"
              minDate={fromDate ? new Date(fromDate) : undefined}
            />
          </div>
          {(fromDate || toDate) && (
            <Button
              variant="outline"
              onClick={() => {
                setFromDate(undefined);
                setToDate(undefined);
              }}
            >
              Clear
            </Button>
          )}
        </div>
      </div>

      <DataTable
        data={filteredPayments}
        columns={paymentColumns}
        title="Payments"
        showHeader={false}
      />
    </div>
  );
}
