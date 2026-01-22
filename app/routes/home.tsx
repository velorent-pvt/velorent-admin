import { Calendar, Car, Wallet, CarFront } from "lucide-react";

import type { ChartConfig } from "~/components/ui/chart";
import { StatsCard } from "~/features/dashboard/stats-card";
import { Header } from "~/features/dashboard/header";
import { EarningsSummary } from "~/features/dashboard/earning-summary";
import { BookingsSummary } from "~/features/dashboard/bookings-summary";

const chartConfig = {
  earning: {
    label: "Earning",
    color: "var(--primary)",
  },
} satisfies ChartConfig;

const earnings = [
  { day: "Mon", Earning: 1200 },
  { day: "Tue", Earning: 980 },
  { day: "Wed", Earning: 1600 },
  { day: "Thu", Earning: 900 },
  { day: "Fri", Earning: 2000 },
  { day: "Sat", Earning: 2500 },
  { day: "Sun", Earning: 1800 },
];

export default function Home() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6">
      <Header />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          icon={Wallet}
          label="Total Revenue"
          value="78,423"
          change="15.2%"
        />

        <StatsCard
          icon={Calendar}
          label="New Booking"
          value="32,567"
          change="5.2%"
        />

        <StatsCard
          icon={Car}
          label="Rented Cars"
          value="41,411"
          change="21.2%"
        />

        <StatsCard
          icon={CarFront}
          label="Available Cars"
          value="28,623"
          change="7.2%"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <EarningsSummary />
        <BookingsSummary />
      </div>
    </div>
  );
}
