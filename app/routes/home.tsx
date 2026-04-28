import { useState } from "react";
import {
  Calendar,
  CarFront,
  UserRound,
  Users,
  Wallet,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDashboardSummary, getNewActivity } from "~/api/dashboard";
import { Loader } from "~/components/shared/Loader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Badge } from "~/components/ui/badge";
import { StatsCard } from "~/features/dashboard/stats-card";
import { Header } from "~/features/dashboard/header";
import { PaymentsSummary } from "~/features/dashboard/payments-summary";
import { Link } from "react-router";

function formatAmount(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function statusVariant(status: string): "default" | "secondary" | "destructive" | "outline" | "success" {
  if (status === "confirmed" || status === "ongoing") return "success";
  if (status === "cancelled" || status === "rejected") return "destructive";
  if (status === "pending") return "secondary";
  return "outline";
}

export default function Home() {
  const [activityDays, setActivityDays] = useState("7");

  const { data, isLoading } = useQuery({
    queryKey: ["admin_dashboard_summary"],
    queryFn: getDashboardSummary,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ["dashboard_new_activity", activityDays],
    queryFn: () => getNewActivity(Number(activityDays)),
  });

  if (isLoading) return <Loader />;

  if (!data) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6">
        <Header />
        <Card className="shadow-none">
          <CardHeader>
            <CardTitle>Failed to load dashboard</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Please try refreshing the page.
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

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <PaymentsSummary chartData={data.payment_chart} />

        <Card className="shadow-none flex flex-col border border-border/50 rounded-none">
          <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
            <div className="flex-1 flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <CardTitle className="text-base">Upcoming Bookings</CardTitle>
            </div>
            <Link
              to="/bookings"
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
            >
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {activityLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
            ) : activity?.upcoming_bookings.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No upcoming bookings
              </p>
            ) : (
              <div className="divide-y">
                {activity?.upcoming_bookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex items-center justify-between py-3 gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                        <CarFront className="h-4 w-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{b.car_name}</p>
                        <p className="text-xs text-muted-foreground">
                          #{b.booking_code} · {b.customer_name}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <p className="text-xs text-muted-foreground hidden sm:block">
                        {formatDateTime(b.start_time)}
                      </p>
                      <Badge variant={statusVariant(b.status)} className="capitalize">
                        {b.status}
                      </Badge>
                      <Link
                        to={`/bookings/${b.id}`}
                        className="text-xs text-primary hover:underline"
                      >
                        View
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* New Customers Card */}
        <Card className="shadow-none flex flex-col border border-border/50 rounded-none">
          <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
            <CardTitle className="flex-1 text-base">New Customers</CardTitle>
            <Select value={activityDays} onValueChange={setActivityDays}>
              <SelectTrigger className="w-[110px] bg-card h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7d</SelectItem>
                <SelectItem value="14">Last 14d</SelectItem>
                <SelectItem value="30">Last 30d</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {activityLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
            ) : activity?.customers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No new customers</p>
            ) : (
              <ul className="space-y-4">
                {activity?.customers.map((c) => (
                  <li key={c.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {(c.full_name ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium leading-none">
                        {c.full_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatRelativeTime(c.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t">
              <Link
                to="/customers"
                className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
              >
                View all customers <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* New Hosts Card */}
        <Card className="shadow-none flex flex-col border border-border/50 rounded-none">
          <CardHeader className="flex items-center gap-2 space-y-0 border-b sm:flex-row">
            <CardTitle className="flex-1 text-base">New Hosts</CardTitle>
            <Select value={activityDays} onValueChange={setActivityDays}>
              <SelectTrigger className="w-[110px] bg-card h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7d</SelectItem>
                <SelectItem value="14">Last 14d</SelectItem>
                <SelectItem value="30">Last 30d</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {activityLoading ? (
              <p className="text-sm text-muted-foreground text-center py-6">Loading…</p>
            ) : activity?.hosts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No new hosts</p>
            ) : (
              <ul className="space-y-4">
                {activity?.hosts.map((h) => (
                  <li key={h.id} className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {(h.full_name ?? "?")[0]?.toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-sm font-medium leading-none">
                        {h.full_name ?? "Unknown"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1.5">
                        {formatRelativeTime(h.created_at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="mt-4 pt-4 border-t">
              <Link
                to="/hosts"
                className="text-xs text-primary hover:underline flex items-center justify-center gap-1"
              >
                View all hosts <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
