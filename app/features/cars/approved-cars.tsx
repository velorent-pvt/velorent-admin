import { useMemo, useState } from "react";
import { DataTable } from "~/components/ui/data-table";
import { approvedCarColumns } from "./approved-cars-columns";
import { useQuery } from "@tanstack/react-query";
import { getApprovedCars } from "~/api/cars";
import { Loader } from "~/components/shared/Loader";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { SlidersHorizontal, X } from "lucide-react";
import type { PendingCar } from "~/types/cars";

type AvailabilityFilter = "all" | "available" | "booked";
type SortColumn =
  | "created_at"
  | "hourly_price"
  | "next_available"
  | "booking_count"
  | "upcoming_booking";

function getNextAvailableTime(car: PendingCar): number {
  const busyBlocks = [
    ...car.bookings
      .filter((b) => ["confirmed", "ongoing"].includes(b.status))
      .map((b) => ({ start: new Date(b.start_time), end: new Date(b.end_time) })),
    ...car.car_availability
      .filter((a) => a.status === "unavailable")
      .map((a) => ({ start: new Date(a.start_time), end: new Date(a.end_time) })),
  ].sort((a, b) => a.start.getTime() - b.start.getTime());

  let currentEnd = new Date();
  for (const block of busyBlocks) {
    if (block.start <= currentEnd) {
      if (block.end > currentEnd) currentEnd = block.end;
    } else break;
  }
  return currentEnd.getTime();
}

function getUpcomingBookingTime(car: PendingCar): number {
  const now = new Date();
  const upcoming = car.bookings
    .filter((b) => ["confirmed", "ongoing"].includes(b.status))
    .map((b) => new Date(b.start_time))
    .filter((d) => d > now)
    .sort((a, b) => a.getTime() - b.getTime())[0];
  return upcoming ? upcoming.getTime() : Infinity;
}

export function ApprovedCarsList() {
  const { data: approvedCars, isLoading } = useQuery({
    queryKey: ["approved_cars"],
    queryFn: getApprovedCars,
  });

  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedModel, setSelectedModel] = useState("all");
  const [availability, setAvailability] = useState<AvailabilityFilter>("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [search, setSearch] = useState("");
  const [sortColumn, setSortColumn] = useState<SortColumn>("created_at");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const cars = (approvedCars ?? []) as unknown as PendingCar[];

  const brands = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const c of cars) {
      if (c.brand && !seen.has(c.brand.id)) {
        seen.add(c.brand.id);
        result.push({ id: c.brand.id, name: c.brand.name });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [cars]);

  const models = useMemo(() => {
    const seen = new Set<string>();
    const result: { id: string; name: string }[] = [];
    for (const c of cars) {
      if (selectedBrand !== "all" && c.brand?.id !== selectedBrand) continue;
      if (c.model && !seen.has(c.model.id)) {
        seen.add(c.model.id);
        result.push({ id: c.model.id, name: c.model.name });
      }
    }
    return result.sort((a, b) => a.name.localeCompare(b.name));
  }, [cars, selectedBrand]);

  const processedCars = useMemo(() => {
    const now = new Date();
    const filtered = cars.filter((car) => {
      if (selectedBrand !== "all" && car.brand?.id !== selectedBrand) return false;
      if (selectedModel !== "all" && car.model?.id !== selectedModel) return false;
      if (minPrice !== "" && car.hourly_price < Number(minPrice)) return false;
      if (maxPrice !== "" && car.hourly_price > Number(maxPrice)) return false;
      if (search && !car.registration_number.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (availability !== "all") {
        const nextMs = getNextAvailableTime(car);
        const isAvailableNow = new Date(nextMs).toDateString() === now.toDateString();
        if (availability === "available" && !isAvailableNow) return false;
        if (availability === "booked" && isAvailableNow) return false;
      }
      return true;
    });

    const dir = sortDir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      switch (sortColumn) {
        case "created_at":
          return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
        case "hourly_price":
          return dir * (a.hourly_price - b.hourly_price);
        case "booking_count":
          return dir * (a.bookings.length - b.bookings.length);
        case "next_available":
          return dir * (getNextAvailableTime(a) - getNextAvailableTime(b));
        case "upcoming_booking":
          return dir * (getUpcomingBookingTime(a) - getUpcomingBookingTime(b));
        default:
          return 0;
      }
    });
  }, [cars, selectedBrand, selectedModel, minPrice, maxPrice, search, availability, sortColumn, sortDir]);

  const activeFilterCount = [
    selectedBrand !== "all",
    selectedModel !== "all",
    availability !== "all",
    minPrice !== "",
    maxPrice !== "",
  ].filter(Boolean).length;

  function clearFilters() {
    setSelectedBrand("all");
    setSelectedModel("all");
    setAvailability("all");
    setMinPrice("");
    setMaxPrice("");
  }

  if (isLoading) return <Loader />;

  return (
    <div>
      {/* Header: title left, search + filter trigger right */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Approved Cars</h1>

        <div className="flex items-center gap-2">
          {/* Search */}
          <Input
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-[220px] bg-card"
          />

          {/* Filter & Sort popover */}
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
                <p className="text-sm font-semibold">Filters &amp; Sort</p>
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

              <div className="space-y-3">
                {/* Brand */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Brand
                  </label>
                  <Select
                    value={selectedBrand}
                    onValueChange={(val) => {
                      setSelectedBrand(val);
                      setSelectedModel("all");
                    }}
                  >
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue placeholder="All Brands" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Brands</SelectItem>
                      {brands.map((b) => (
                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Model */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Model
                  </label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue placeholder="All Models" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Models</SelectItem>
                      {models.map((m) => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Availability */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Availability
                  </label>
                  <Select
                    value={availability}
                    onValueChange={(val) => setAvailability(val as AvailabilityFilter)}
                  >
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="available">Available Now</SelectItem>
                      <SelectItem value="booked">Currently Booked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Price range */}
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Price Range (₹/hr)
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={minPrice}
                      onChange={(e) => setMinPrice(e.target.value)}
                      className="bg-card"
                    />
                    <span className="text-muted-foreground">—</span>
                    <Input
                      type="number"
                      placeholder="Max"
                      value={maxPrice}
                      onChange={(e) => setMaxPrice(e.target.value)}
                      className="bg-card"
                    />
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  {/* Sort by */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Sort By
                    </label>
                    <Select
                      value={sortColumn}
                      onValueChange={(val) => setSortColumn(val as SortColumn)}
                    >
                      <SelectTrigger className="w-full bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="created_at">Date Added</SelectItem>
                        <SelectItem value="hourly_price">Price</SelectItem>
                        <SelectItem value="next_available">Next Available</SelectItem>
                        <SelectItem value="booking_count">Booking Count</SelectItem>
                        <SelectItem value="upcoming_booking">Upcoming Booking</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sort direction */}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Order
                    </label>
                    <Select
                      value={sortDir}
                      onValueChange={(val) => setSortDir(val as "asc" | "desc")}
                    >
                      <SelectTrigger className="w-full bg-card">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="desc">Newest / Z to A</SelectItem>
                        <SelectItem value="asc">Oldest / A to Z</SelectItem>
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
        data={processedCars}
        columns={approvedCarColumns}
        title="Approved Cars"
        showHeader={false}
        hiddenColumns={["created_at", "booking_count"]}
      />
    </div>
  );
}
