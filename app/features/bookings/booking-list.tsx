import { useQuery } from "@tanstack/react-query";
import { getAllBookings } from "~/api/bookings";
import { DataTable } from "~/components/ui/data-table";
import { Loader } from "~/components/shared/Loader";
import { bookingColumns } from "./columns";

export function BookingList() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: getAllBookings,
  });

  if (isLoading) return <Loader />;

  return (
    <DataTable
      data={bookings ?? []}
      columns={bookingColumns}
      title="Bookings"
      searchColumn="status"
      searchPlaceholder="Filter by status..."
    />
  );
}
