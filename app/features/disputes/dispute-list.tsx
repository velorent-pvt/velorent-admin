import { useQuery } from "@tanstack/react-query";
import { getAllDisputes } from "~/api/disputes";
import { Loader } from "~/components/shared/Loader";
import { DataTable } from "~/components/ui/data-table";
import { disputeColumns } from "./columns";

import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { DatePicker } from "~/components/ui/date-picker";

export function DisputeList() {
  const { data: disputes, isLoading } = useQuery({
    queryKey: ["admin_disputes"],
    queryFn: getAllDisputes,
  });

  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  const filteredDisputes = useMemo(() => {
    const items = disputes ?? [];

    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    return items.filter((dispute) => {
      const raisedOn = new Date(dispute.created_at);
      if (Number.isNaN(raisedOn.getTime())) return false;
      if (from && raisedOn < from) return false;
      if (to && raisedOn > to) return false;
      return true;
    });
  }, [disputes, fromDate, toDate]);

  if (isLoading) return <Loader />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Disputes</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="Raised from"
            />
          </div>
          <div className="w-44">
            <DatePicker
              value={toDate}
              onChange={setToDate}
              placeholder="Raised to"
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
        data={filteredDisputes}
        columns={disputeColumns}
        searchColumn="dispute_code"
        searchPlaceholder="Search dispute..."
        title="Disputes"
        showHeader={false}
      />
    </div>
  );
}
