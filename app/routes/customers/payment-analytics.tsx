import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { getPaymentAnalyticsCustomers } from "~/api/customer";
import { Loader } from "~/components/shared/Loader";
import { CustomerList } from "~/features/customers/customer-list";
import { actionVehicleColumns } from "~/features/customers/action-columns";
import { getActionDateRange, updateActionDateRange } from "~/lib/analytics-actions";
import {
  PAYMENT_ANALYTICS_LABELS,
  PAYMENT_ANALYTICS_METRICS,
} from "~/lib/payment-analytics";

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export default function PaymentAnalyticsCustomers() {
  const [searchParams, setSearchParams] = useSearchParams();
  const range = getActionDateRange(searchParams);
  const metric = searchParams.get("metric");
  const startDate = validDate(range.start);
  const endDate = validDate(range.end);
  const validSelection = Boolean(
    metric &&
    PAYMENT_ANALYTICS_METRICS.includes(metric) &&
    startDate &&
    endDate &&
    new Date(`${endDate}T00:00:00`) >= new Date(`${startDate}T00:00:00`),
  );
  const {
    data: customers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["payment-analytics-customers", metric, startDate, endDate],
    queryFn: () => getPaymentAnalyticsCustomers(metric!, startDate!, endDate!),
    enabled: validSelection,
  });

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      {!validSelection ? (
        <div className="flex min-h-64 items-center justify-center rounded-md border bg-card p-6 text-sm text-red-600">
          Invalid payment analytics selection.
        </div>
      ) : isLoading ? (
        <Loader />
      ) : isError ? (
        <div className="flex min-h-64 items-center justify-center rounded-md border bg-card p-6 text-sm text-red-600">
          Unable to load customers for this payment metric.
        </div>
      ) : (
        <>
        <CustomerList
          initialCustomers={customers}
          title={`${PAYMENT_ANALYTICS_LABELS[metric!]} customers`}
          columns={actionVehicleColumns}
          actionRange={{ ...range, onChange: (field, value) => setSearchParams(updateActionDateRange(searchParams, field, value)) }}
        />
        <p className="text-sm text-muted-foreground">
          {customers.length.toLocaleString()} attempts by {new Set(customers.map((customer) => customer.id)).size.toLocaleString()} customers in the selected period.
        </p>
        </>
      )}
    </div>
  );
}
