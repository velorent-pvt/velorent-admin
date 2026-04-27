import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  CalendarClock,
  Car,
  CircleDollarSign,
  CreditCard,
  RefreshCw,
  Route,
  User,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import {
  getBookingByIdAdmin,
  markBookingPaymentRefundedAdmin,
  updateBookingStatusAdmin,
  updateDepositStatusAdmin,
} from "~/api/bookings";
import { Loader } from "~/components/shared/Loader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { Separator } from "~/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { toast } from "sonner";

const BOOKING_STATUSES = [
  "approved",
  "pending",
  "confirmed",
  "ongoing",
  "completed",
  "cancelled",
  "rejected",
] as const;

const DEPOSIT_STATUSES = ["pending", "paid", "refunded", "forfeited"] as const;

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatAmount(value: number) {
  return value.toLocaleString("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  });
}

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  const normalized = status.toLowerCase();
  if (["approved", "confirmed", "ongoing", "completed", "paid", "refunded"].includes(normalized)) {
    return "success";
  }
  if (["cancelled", "rejected", "failed", "forfeited"].includes(normalized)) {
    return "destructive";
  }
  if (["pending", "initiated"].includes(normalized)) {
    return "secondary";
  }
  return "outline";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 py-3 md:flex-row md:items-start md:justify-between md:gap-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium md:text-right">{value}</p>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ReactNode;
}) {
  return (
    <Card className="bg-card/80">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
          <div className="text-muted-foreground">{icon}</div>
        </div>
        <p className="text-xl font-semibold leading-tight">{value}</p>
        {sub ? <p className="mt-1 text-xs text-muted-foreground">{sub}</p> : null}
      </CardContent>
    </Card>
  );
}

export default function BookingDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: booking,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin_booking", id],
    queryFn: () => getBookingByIdAdmin(id!),
    enabled: !!id,
  });

  const refreshQueries = () => {
    queryClient.invalidateQueries({ queryKey: ["admin_booking", id] });
    queryClient.invalidateQueries({ queryKey: ["admin_bookings"] });
  };

  const { mutate: updateBookingStatus, isPending: isUpdatingBookingStatus } = useMutation({
    mutationFn: (status: string) => updateBookingStatusAdmin(id!, status),
    onSuccess: () => {
      toast.success("Booking status updated");
      refreshQueries();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update booking status"),
  });

  const { mutate: updateDepositStatus, isPending: isUpdatingDepositStatus } = useMutation({
    mutationFn: (status: string) => updateDepositStatusAdmin(id!, status),
    onSuccess: () => {
      toast.success("Deposit status updated");
      refreshQueries();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update deposit status"),
  });

  const { mutate: markPaymentRefunded, isPending: isMarkingPaymentRefunded } = useMutation({
    mutationFn: (refundAmount?: number) => markBookingPaymentRefundedAdmin(id!, refundAmount),
    onSuccess: () => {
      toast.success("Payment marked as refunded");
      refreshQueries();
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update payment"),
  });

  const isMutating =
    isUpdatingBookingStatus || isUpdatingDepositStatus || isMarkingPaymentRefunded;

  const [selectedBookingStatus, setSelectedBookingStatus] = useState<string>("");
  const [selectedDepositStatus, setSelectedDepositStatus] = useState<string>("");
  const [refundAmount, setRefundAmount] = useState<string>("");

  useEffect(() => {
    if (!booking) return;
    setSelectedBookingStatus(booking.status);
    setSelectedDepositStatus(booking.deposit_status);
    setRefundAmount(String(booking.deposit_amount ?? ""));
  }, [booking]);

  const parsedRefundAmount = Number(refundAmount);
  const isRefundAmountValid =
    refundAmount.trim().length > 0 &&
    Number.isFinite(parsedRefundAmount) &&
    parsedRefundAmount >= 0;

  if (!id) {
    return <div className="max-w-7xl mx-auto p-6">Invalid booking id</div>;
  }

  if (isLoading) return <Loader />;

  if (isError || !booking) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-3 p-6 my-6">
        <Button variant="outline" className="w-fit" onClick={() => navigate("/bookings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Failed to load booking</CardTitle>
            <CardDescription>{(error as any)?.message || "Booking not found"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" className="w-fit" onClick={() => navigate("/bookings")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Bookings
        </Button>

        <div className="flex items-center gap-2">
          <Badge variant={statusVariant(booking.status)}>{humanize(booking.status)}</Badge>
          <Badge variant={statusVariant(booking.deposit_status)}>
            Deposit {humanize(booking.deposit_status)}
          </Badge>
          <Badge variant={statusVariant(booking.payment_status)}>
            Payment {humanize(booking.payment_status)}
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Booking #{booking.booking_code}</CardTitle>
          <CardDescription>
            {booking.car_name} - {booking.registration_number} - Created {booking.created_at ? formatDate(booking.created_at) : "-"}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          label="Total Amount"
          value={formatAmount(booking.total_amount)}
          sub={`${booking.total_hours} hours`}
          icon={<CircleDollarSign className="h-4 w-4" />}
        />
        <StatCard
          label="Trip Start"
          value={formatDateTime(booking.start_time)}
          icon={<CalendarClock className="h-4 w-4" />}
        />
        <StatCard
          label="Trip End"
          value={formatDateTime(booking.end_time)}
          icon={<Route className="h-4 w-4" />}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" />
                Trip Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Car" value={booking.car_name} />
              <Separator />
              <DetailRow label="Registration" value={booking.registration_number} />
              <Separator />
              <DetailRow label="Pickup Type" value={humanize(booking.pickup_type)} />
              {booking.delivery_address ? (
                <>
                  <Separator />
                  <DetailRow label="Delivery Address" value={booking.delivery_address} />
                </>
              ) : null}
              <Separator />
              <DetailRow label="Start" value={formatDateTime(booking.start_time)} />
              <Separator />
              <DetailRow label="End" value={formatDateTime(booking.end_time)} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Parties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Customer" value={booking.customer_name} />
              <Separator />
              <DetailRow label="Host" value={booking.host_name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CreditCard className="h-4 w-4" />
                Payment Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Base Fare" value={formatAmount(booking.base_amount)} />
              <Separator />
              <DetailRow label="Delivery Charge" value={formatAmount(booking.delivery_amount)} />
              <Separator />
              <DetailRow label="Deposit" value={formatAmount(booking.deposit_amount)} />
              <Separator />
              <DetailRow
                label="Commission"
                value={`${formatAmount(booking.commission_amount)} (${booking.commission_percentage}%)`}
              />
              <Separator />
              <DetailRow label="Total Paid" value={formatAmount(booking.total_amount)} />
              <Separator />
              <DetailRow label="Gateway" value={booking.payment_gateway} />
              <Separator />
              <DetailRow label="Method" value={booking.payment_method} />
              <Separator />
              <DetailRow label="Reference" value={booking.payment_reference} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Booking Status</CardTitle>
              <CardDescription>
                Update the booking lifecycle status.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select
                value={selectedBookingStatus}
                onValueChange={setSelectedBookingStatus}
              >
                <SelectTrigger className="w-full bg-card">
                  <SelectValue placeholder="Select booking status" />
                </SelectTrigger>
                <SelectContent>
                  {BOOKING_STATUSES.map((status) => (
                    <SelectItem key={status} value={status}>
                      {humanize(status)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                className="mt-3 w-full"
                size="sm"
                disabled={
                  isMutating ||
                  !selectedBookingStatus ||
                  selectedBookingStatus === booking.status
                }
                onClick={() => updateBookingStatus(selectedBookingStatus)}
              >
                Update Status
              </Button>
            </CardContent>
          </Card>

          {booking.status === "completed" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Deposit & Refund</CardTitle>
                <CardDescription>
                  Manage deposit status and process refund amount.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm font-semibold mb-2">Deposit Status</p>
                  <Select
                    value={selectedDepositStatus}
                    onValueChange={setSelectedDepositStatus}
                  >
                    <SelectTrigger className="w-full bg-card">
                      <SelectValue placeholder="Select deposit status" />
                    </SelectTrigger>
                    <SelectContent>
                      {DEPOSIT_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {humanize(status)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    variant="outline"
                    disabled={
                      isMutating ||
                      !selectedDepositStatus ||
                      selectedDepositStatus === booking.deposit_status
                    }
                    onClick={() => updateDepositStatus(selectedDepositStatus)}
                  >
                    Update Deposit
                  </Button>
                </div>

                <Separator />

                <div>
                  <p className="text-sm font-semibold mb-2">Refund Amount (INR)</p>
                  <Input
                    type="number"
                    min="0"
                    step="1"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    placeholder="Enter refund amount"
                  />
                  <Button
                    className="mt-3 w-full"
                    size="sm"
                    disabled={
                      isMutating ||
                      booking.payment_status === "refunded" ||
                      !isRefundAmountValid
                    }
                    onClick={() => markPaymentRefunded(parsedRefundAmount)}
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Refund Amount
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
