import { DataTable } from "~/components/ui/data-table";
import { customerColumns } from "./columns";
import { useQuery } from "@tanstack/react-query";
import { getAllCustomers } from "~/api/customer";
import { Loader } from "~/components/shared/Loader";
import { DatePicker } from "~/components/ui/date-picker";
import { useEffect, useMemo, useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import type { Customer } from "./columns";
import type { ColumnDef } from "@tanstack/react-table";

export function CustomerList({
  initialCustomers,
  title = "Customers",
  columns = customerColumns,
}: {
  initialCustomers?: Customer[];
  title?: string;
  columns?: ColumnDef<Customer>[];
} = {}) {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<string | undefined>();
  const [toDate, setToDate] = useState<string | undefined>();

  useEffect(() => {
    const timer = window.setTimeout(() => setSearch(searchInput), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customer", { search, fromDate, toDate }],
    queryFn: () => getAllCustomers({ search, fromDate, toDate }),
    enabled: initialCustomers === undefined,
    placeholderData: (previousData) => previousData,
  });

  const filteredInitialCustomers = useMemo(() => {
    if (initialCustomers === undefined) return customers ?? [];
    const items = initialCustomers ?? customers ?? [];

    const from = fromDate ? new Date(fromDate) : undefined;
    const to = toDate ? new Date(toDate) : undefined;

    if (from) from.setHours(0, 0, 0, 0);
    if (to) to.setHours(23, 59, 59, 999);

    return items.filter((customer) => {
      const joinedAt = new Date(customer.created_at);
      if (Number.isNaN(joinedAt.getTime())) return false;
      if (from && joinedAt < from) return false;
      if (to && joinedAt > to) return false;
      return true;
    });
  }, [customers, fromDate, initialCustomers, toDate]);

  if (initialCustomers === undefined && isLoading) return <Loader />;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-3xl font-bold">{title}</h1>
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

      {initialCustomers === undefined && (
        <div className="mt-3 max-w-md">
          <Input
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by name, email, or phone"
            aria-label="Search customers"
          />
        </div>
      )}

      <DataTable
        data={filteredInitialCustomers}
        columns={columns}
        title="Customers"
        showHeader={false}
        showPageSizeSelector
      />
    </div>
  );
}
