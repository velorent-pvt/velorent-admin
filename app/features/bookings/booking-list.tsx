import { useQuery } from "@tanstack/react-query";
import { getAllBookings } from "~/api/bookings";
import { Loader } from "~/components/shared/Loader";
import { DataTable } from "~/components/ui/data-table";
import { bookingColumns } from "./columns";

export function BookingsList() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin_bookings"],
    queryFn: getAllBookings,
  });

  if (isLoading) return <Loader />;

  return (
    <DataTable
      data={bookings ?? []}
      columns={bookingColumns}
      searchColumn="booking_code"
      searchPlaceholder="Search booking..."
      title="Bookings"
    />
  );
}
