import { Calendar, CarFront, UserRound, Users, Wallet } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary } from "~/api/dashboard";
import { Loader } from "~/components/shared/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { StatsCard } from "~/features/dashboard/stats-card";
import { Header } from "~/features/dashboard/header";
import { PaymentsSummary } from "~/features/dashboard/payments-summary";

function formatAmount(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

export default function Home() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin_dashboard_summary"],
    queryFn: getDashboardSummary,
  });

  if (isLoading) return <Loader />;

  if (isError || !data) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6">
        <Header />
        <Card>
          <CardHeader>
            <CardTitle>Failed to load dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {(error as any)?.message || "Please try again."}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6">
      <Header />
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatsCard
          icon={Users}
          label="Total Customers"
          value={data.totals.customers.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={UserRound}
          label="Total Hosts"
          value={data.totals.hosts.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={Calendar}
          label="Total Bookings"
          value={data.totals.bookings.toLocaleString("en-IN")}
        />
        <StatsCard
          icon={Wallet}
          label="Total Payment Volume"
          value={formatAmount(data.totals.payment_volume)}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle>New in Last {data.new_counts.days} Days</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-2xl border bg-gradient-to-br from-card to-card/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">New Customers</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold mt-3">
                {data.new_counts.customers.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Customer signups in this period</p>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-card to-card/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">New Hosts</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <UserRound className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold mt-3">
                {data.new_counts.hosts.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Host onboarding in this period</p>
            </div>
            <div className="rounded-2xl border bg-gradient-to-br from-card to-card/70 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">New Bookings</p>
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                  <CarFront className="h-4 w-4 text-primary" />
                </div>
              </div>
              <p className="text-3xl font-bold mt-3">
                {data.new_counts.bookings.toLocaleString("en-IN")}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Fresh bookings created</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        <PaymentsSummary chartData={data.payment_chart} />
      </div>
    </div>
  );
}
