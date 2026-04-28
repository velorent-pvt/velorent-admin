import { BookingList } from "~/features/bookings/booking-list";

export default function BookingsPage() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <BookingList />
    </div>
  );
}
