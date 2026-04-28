import { useMemo, useState } from "react";
import { DataTable } from "~/components/ui/data-table";
import { pendingCarColumns } from "./pending-cars-columns";
import { useQuery } from "@tanstack/react-query";
import { getPendingCars } from "~/api/cars";
import { Loader } from "~/components/shared/Loader";
import { DatePicker } from "~/components/ui/date-picker";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { PendingCar } from "~/types/cars";

export function PendingCarsList() {
  const { data: pendingCars, isLoading } = useQuery({
    queryKey: ["pending"],
    queryFn: getPendingCars,
  });

  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  const cars = (pendingCars ?? []) as unknown as PendingCar[];

  const filteredCars = useMemo(() => {
    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    return cars.filter((car) => {
      // Date filter
      const submittedAt = new Date(car.created_at);
      if (Number.isNaN(submittedAt.getTime())) return false;
      if (from && submittedAt < from) return false;
      if (to && submittedAt > to) return false;
      
      return true;
    });
  }, [cars, fromDate, toDate]);

  if (isLoading) return <Loader />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <h1 className="text-3xl font-bold">Requested Cars</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="Request from"
            />
          </div>
          <div className="w-44">
            <DatePicker
              value={toDate}
              onChange={setToDate}
              placeholder="Request to"
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
        data={filteredCars}
        columns={pendingCarColumns}
        title="Requested Cars"
        showHeader={false}
      />
    </div>
  );
}
