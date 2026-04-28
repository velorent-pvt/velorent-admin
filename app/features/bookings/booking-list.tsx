import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAllBookings, type AdminBooking } from "~/api/bookings";
import { Loader } from "~/components/shared/Loader";
import { DataTable } from "~/components/ui/data-table";
import { bookingColumns } from "./columns";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { SlidersHorizontal, X } from "lucide-react";
import { DatePicker } from "~/components/ui/date-picker";

type SortColumn = "created_at" | "start_time" | "total_amount" | "total_hours";
type SortDir = "asc" | "desc";

export function BookingsList() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin_bookings"],
    queryFn: getAllBookings,
  });

  // Filter state
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [depositStatus, setDepositStatus] = useState("all");
  const [minAmount, setMinAmount] = useState("");
  const [maxAmount, setMaxAmount] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // Sort state
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const items = (bookings ?? []) as AdminBooking[];

  const processedBookings = useMemo(() => {
    const filtered = items.filter((b) => {
      // Search (booking code, car name, registration number, customer, host)
      if (search) {
        const q = search.toLowerCase();
        const match =
          b.booking_code.toLowerCase().includes(q) ||
          b.car_name.toLowerCase().includes(q) ||
          b.registration_number.toLowerCase().includes(q) ||
          b.customer_name.toLowerCase().includes(q) ||
          b.host_name.toLowerCase().includes(q);
        if (!match) return false;
      }

      // Status filters
      if (status !== "all" && b.status !== status) return false;
      if (depositStatus !== "all" && b.deposit_status !== depositStatus) return false;

      // Amount filters
      if (minAmount !== "" && b.total_amount < Number(minAmount)) return false;
      if (maxAmount !== "" && b.total_amount > Number(maxAmount)) return false;

      // Date range (start_time)
      if (dateFrom) {
        const start = new Date(b.start_time);
        const from = new Date(dateFrom);
        from.setHours(0, 0, 0, 0);
        if (start < from) return false;
      }
      if (dateTo) {
        const start = new Date(b.start_time);
        const to = new Date(dateTo);
        to.setHours(23, 59, 59, 999);
        if (start > to) return false;
      }

      return true;
    });

    const dir = sortDir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      let valA: any = a[sortColumn];
      let valB: any = b[sortColumn];

      if (sortColumn === "created_at" || sortColumn === "start_time") {
        valA = new Date(valA ?? 0).getTime();
        valB = new Date(valB ?? 0).getTime();
      }

      if (valA < valB) return -1 * dir;
      if (valA > valB) return 1 * dir;
      return 0;
    });
  }, [items, search, status, depositStatus, minAmount, maxAmount, dateFrom, dateTo, sortColumn, sortDir]);

  const activeFilterCount = [
    status !== "all",
    depositStatus !== "all",
    minAmount !== "",
    maxAmount !== "",
    dateFrom !== "",
    dateTo !== "",
  ].filter(Boolean).length;

  function clearFilters() {
    setStatus("all");
    setDepositStatus("all");
    setMinAmount("");
    setMaxAmount("");
    setDateFrom("");
    setDateTo("");
  }

  if (isLoading) return <Loader />;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Bookings</h1>

        <div className="flex items-center gap-2">
          {/* Search */}
          <Input
            placeholder="Search booking, car, customer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[220px] bg-card"
          />

          {/* Filters Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="relative bg-card gap-2 rounded-none">
                <SlidersHorizontal className="h-4 w-4" />
                Filters & Sort
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {activeFilterCount}
                  </span>
                )}
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-80 p-4" align="end">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold">Filters & Sort</p>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Clear all
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Booking Status */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Booking Status
                  </label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger className="bg-card w-full">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="confirmed">Confirmed</SelectItem>
                      <SelectItem value="ongoing">Ongoing</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Deposit Status */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Deposit Status
                  </label>
                  <Select value={depositStatus} onValueChange={setDepositStatus}>
                    <SelectTrigger className="bg-card w-full">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="refunded">Refunded</SelectItem>
                      <SelectItem value="forfeited">Forfeited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Amount Range */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Amount Range (₹)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minAmount}
                      onChange={(e) => setMinAmount(e.target.value)}
                      className="bg-card"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxAmount}
                      onChange={(e) => setMaxAmount(e.target.value)}
                      className="bg-card"
                    />
                  </div>
                </div>

                {/* Trip Start Date Range */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Trip Start Window
                  </label>
                  <div className="flex flex-col gap-2">
                    <DatePicker
                      value={dateFrom}
                      onChange={(val) => setDateFrom(val ?? "")}
                      placeholder="Start from"
                    />
                    <DatePicker
                      value={dateTo}
                      onChange={(val) => setDateTo(val ?? "")}
                      placeholder="End to"
                      minDate={dateFrom ? new Date(dateFrom) : undefined}
                    />
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sort By
                    </label>
                    <Select
                      value={sortColumn}
                      onValueChange={(val) => setSortColumn(val as SortColumn)}
                    >
                      <SelectTrigger className="bg-card w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Booking Date</SelectItem>
                        <SelectItem value="start_time">Trip Start</SelectItem>
                        <SelectItem value="total_amount">Amount</SelectItem>
                        <SelectItem value="total_hours">Duration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Order
                    </label>
                    <Select
                      value={sortDir}
                      onValueChange={(val) => setSortDir(val as SortDir)}
                    >
                      <SelectTrigger className="bg-card w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest / Highest First</SelectItem>
                        <SelectItem value="asc">Oldest / Lowest First</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <DataTable
        data={processedBookings}
        columns={bookingColumns}
        title="Bookings"
        showHeader={false}
      />
    </div>
  );
}
