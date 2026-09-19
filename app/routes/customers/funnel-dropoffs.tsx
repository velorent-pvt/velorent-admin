import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router";

import { getFunnelDropoffCustomers } from "~/api/customer";
import { Loader } from "~/components/shared/Loader";
import { CustomerList } from "~/features/customers/customer-list";
import { CUSTOMER_FUNNEL_STAGE_LABELS } from "~/lib/customer-funnel";

function validDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : null;
}

export default function FunnelDropoffCustomers() {
  const [searchParams] = useSearchParams();
  const stageIndex = Number(searchParams.get("stage"));
  const startDate = validDate(searchParams.get("start"));
  const endDate = validDate(searchParams.get("end"));
  const validSelection = Boolean(
    Number.isInteger(stageIndex) &&
    stageIndex >= 1 &&
    stageIndex <= 10 &&
    startDate &&
    endDate &&
    new Date(`${endDate}T00:00:00`) >= new Date(`${startDate}T00:00:00`),
  );
  const {
    data: customers = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["customer-funnel-dropoffs", stageIndex, startDate, endDate],
    queryFn: () => getFunnelDropoffCustomers(stageIndex, startDate!, endDate!),
    enabled: validSelection,
  });
  const stageLabel = CUSTOMER_FUNNEL_STAGE_LABELS[stageIndex];
  const title =
    stageIndex === 10
      ? "Booking confirmed customers"
      : `Dropped after ${stageLabel}`;

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 p-4 md:p-6">
      {!validSelection ? (
        <div className="flex min-h-64 items-center justify-center rounded-md border bg-card p-6 text-sm text-red-600">
          Invalid funnel selection.
        </div>
      ) : isLoading ? (
        <Loader />
      ) : isError ? (
        <div className="flex min-h-64 items-center justify-center rounded-md border bg-card p-6 text-sm text-red-600">
          Unable to load customers for this funnel stage.
        </div>
      ) : (
        <CustomerList initialCustomers={customers} title={title} />
      )}
    </div>
  );
}
