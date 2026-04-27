import { DataTable } from "~/components/ui/data-table";
import { hostColumns } from "./columns";
import { getAllHosts } from "~/api/customer";
import { useQuery } from "@tanstack/react-query";
import { Loader } from "~/components/shared/Loader";
import { DatePicker } from "~/components/ui/date-picker";
import { useMemo, useState } from "react";
import { Button } from "~/components/ui/button";

export function HostList() {
  const { data: hosts, isLoading } = useQuery({
    queryKey: ["hosts"],
    queryFn: getAllHosts,
  });
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  if (isLoading) return <Loader />;

  const filteredHosts = useMemo(() => {
    const items = hosts ?? [];

    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    return items.filter((host) => {
      const joinedAt = new Date(host.created_at);
      if (Number.isNaN(joinedAt.getTime())) return false;
      if (from && joinedAt < from) return false;
      if (to && joinedAt > to) return false;
      return true;
    });
  }, [hosts, fromDate, toDate]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">Hosts</h1>
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-44">
            <DatePicker
              value={fromDate}
              onChange={setFromDate}
              placeholder="Joined from"
            />
          </div>
          <div className="w-44">
            <DatePicker
              value={toDate}
              onChange={setToDate}
              placeholder="Joined to"
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
        data={filteredHosts}
        columns={hostColumns}
        title="Hosts"
        showHeader={false}
      />
    </div>
  );
}
