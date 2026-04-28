import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "react-router";
import {
  getBookingById,
  updateBookingStatus,
  type BookingStatus,
} from "~/api/bookings";
import { supabase } from "~/lib/supabase";
import { Loader } from "~/components/shared/Loader";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
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
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import {
  ArrowLeft,
  Ban,
  Calendar,
  Car,
  CheckCircle2,
  CheckCheck,
  Clock,
  CreditCard,
  ExternalLink,
  Flag,
  Gauge,
  Hash,
  Mail,
  MapPin,
  MessageCircleWarning,
  Phone,
  Play,
  Plus,
  Shield,
  Truck,
  Undo2,
  User,
  Banknote,
} from "lucide-react";
import { useState } from "react";
import { Input } from "~/components/ui/input";

// ────────────────────────────────────────────────
// Types / constants
// ────────────────────────────────────────────────

const STATUS_OPTIONS: BookingStatus[] = [
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
];

const STATUS_COLORS: Record<BookingStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 border-blue-200",
  ongoing: "bg-indigo-100 text-indigo-800 border-indigo-200",
  completed: "bg-green-100 text-green-800 border-green-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
};

const tabTriggerClass =
  "bg-transparent border-0 border-b-2 border-b-gray-200 " +
  "data-[state=active]:border-primary " +
  "data-[state=active]:bg-primary/10 " +
  "data-[state=active]:shadow-none " +
  "p-4 rounded-none";

type EventUi = {
  label: string;
  Icon: React.ElementType;
  colorClass: string;
  bgClass: string;
};

function getEventUi(eventType: string | null | undefined): EventUi {
  switch (String(eventType ?? "").toLowerCase()) {
    case "created":
      return {
        label: "Booking Created",
        Icon: Plus,
        colorClass: "text-emerald-600",
        bgClass: "bg-emerald-50",
      };
    case "handover_confirmed":
      return {
        label: "Handover Confirmed",
        Icon: Car,
        colorClass: "text-blue-600",
        bgClass: "bg-blue-50",
      };
    case "trip_started":
      return {
        label: "Trip Started",
        Icon: Play,
        colorClass: "text-emerald-600",
        bgClass: "bg-emerald-50",
      };
    case "trip_ended":
      return {
        label: "Trip Ended",
        Icon: Flag,
        colorClass: "text-blue-600",
        bgClass: "bg-blue-50",
      };
    case "returned":
      return {
        label: "Vehicle Returned",
        Icon: CheckCheck,
        colorClass: "text-emerald-600",
        bgClass: "bg-emerald-50",
      };
    case "cancelled_by_customer":
      return {
        label: "Cancelled by Customer",
        Icon: Ban,
        colorClass: "text-red-600",
        bgClass: "bg-red-50",
      };
    case "rejected_by_host":
      return {
        label: "Rejected by Host",
        Icon: Ban,
        colorClass: "text-red-600",
        bgClass: "bg-red-50",
      };
    default:
      return {
        label: String(eventType ?? "Activity")
          .replace(/_/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase()),
        Icon: Clock,
        colorClass: "text-slate-500",
        bgClass: "bg-slate-50",
      };
  }
}

// ────────────────────────────────────────────────
// Small helpers
// ────────────────────────────────────────────────

function fmt(dateStr: string) {
  return new Date(dateStr).toLocaleString("en-IN", {
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
  });
}

function fmtCurrency(amount: number) {
  return `₹${Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pickFirstString(
  source: Record<string, unknown>,
  keys: string[],
): string | undefined {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function formatAddress(raw?: string): string {
  if (!raw) return "—";
  return raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function SummaryRow({
  icon: Icon,
  label,
  value,
  valueClass,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 py-3 border-b last:border-0">
      <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm text-muted-foreground flex-1">{label}</span>
      <span className={`text-sm font-semibold text-right ${valueClass ?? ""}`}>
        {value}
      </span>
    </div>
  );
}

function ProofImage({ url, label }: { url?: string | null; label: string }) {
  if (!url) return null;
  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-xs text-muted-foreground font-medium">{label}</p>
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block"
      >
        <img
          src={url}
          alt={label}
          className="w-full h-40 object-cover rounded-xl border bg-muted"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
          <ExternalLink className="h-5 w-5 text-white" />
        </div>
      </a>
    </div>
  );
}

function Detail({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-3">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className="font-medium text-right text-sm">{value ?? "—"}</span>
    </div>
  );
}

// ────────────────────────────────────────────────
// Page
// ────────────────────────────────────────────────

export default function BookingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | "">("");
  const [settlementTarget, setSettlementTarget] = useState<
    "host" | "customer" | ""
  >("");
  const [damageChargeInput, setDamageChargeInput] = useState("0");

  // Core booking
  const { data: booking, isLoading } = useQuery({
    queryKey: ["booking", id],
    queryFn: () => getBookingById(id!),
    enabled: !!id,
  });

  // Activity events
  const { data: bookingEventsData } = useQuery({
    queryKey: ["booking-events", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_events")
        .select("id, event_type, created_at")
        .eq("booking_id", id!)
        .order("created_at", { ascending: true });
      if (error) {
        const msg = String(error.message ?? "").toLowerCase();
        if (msg.includes("booking_events")) return [];
        throw error;
      }
      return data ?? [];
    },
  });

  // Handover details
  const { data: handoverData } = useQuery({
    queryKey: ["booking-handover-details", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_handover_details")
        .select(
          "id, start_odometer_km, odometer_proof_url, customer_photo_url, handover_proof_url, created_at",
        )
        .eq("booking_id", id!)
        .maybeSingle();
      if (error) {
        const msg = String(error.message ?? "").toLowerCase();
        if (msg.includes("booking_handover_details")) return null;
        throw error;
      }
      return data;
    },
  });

  // Return details
  const { data: returnData } = useQuery({
    queryKey: ["booking-return-details", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_return_details")
        .select(
          "id, end_odometer_km, odometer_proof_url, return_proof_url, created_at",
        )
        .eq("booking_id", id!)
        .maybeSingle();
      if (error) {
        const msg = String(error.message ?? "").toLowerCase();
        if (msg.includes("booking_return_details")) return null;
        throw error;
      }
      return data;
    },
  });

  // Disputes
  const { data: disputesData } = useQuery({
    queryKey: ["booking-disputes", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("disputes")
        .select("id, dispute_type, description, status, created_at")
        .eq("booking_id", id!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { mutate: changeStatus, status: mutationStatus } = useMutation({
    mutationFn: ({ status }: { status: BookingStatus }) =>
      updateBookingStatus(id!, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["booking", id] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      setSelectedStatus("");
    },
  });

  // Settlement mutation placeholder
  const { mutate: processSettlement, status: settlementStatus } = useMutation({
    mutationFn: async () => {
      // Intentionally pending API implementation
      await new Promise((r) => setTimeout(r, 1000));
    },
    onSuccess: () => {
      setSettlementTarget("");
      alert("Settlement recorded successfully!");
    },
  });

  if (isLoading) return <Loader />;
  if (!booking)
    return (
      <div className="flex items-center justify-center min-h-[60vh] text-muted-foreground">
        Booking not found.
      </div>
    );

  const car = booking.car as any;
  const customer = booking.customer as any;
  const host = car?.host as any;
  const brand = car?.car_brands?.name ?? "";
  const model = car?.car_models?.name ?? "";
  const images: any[] = car?.car_images ?? [];
  const primaryImage =
    images.find((i) => i.is_primary)?.image_url || images[0]?.image_url;
  const pickup = car?.car_pickup_addresses?.[0];
  const currentStatus = booking.status as BookingStatus;

  // Additional details added from types.ts
  const customerDetails = booking.customer_details || {};
  const hostDetails = booking.host_details || {};
  const aadhaarAddress = pickFirstString(customerDetails, [
    "aadhaar_address",
    "aadhar_address",
    "aadhaar_full_address",
    "aadhar_full_address",
    "aadhaar_current_address",
    "aadhar_current_address",
  ]);
  const dlAddress = pickFirstString(customerDetails, [
    "dl_address",
    "driving_license_address",
    "driving_licence_address",
    "dl_full_address",
    "license_address",
    "licence_address",
  ]);

  // Activity timeline — fallback to synthetic events if table is empty
  const rawEvents = Array.isArray(bookingEventsData) ? bookingEventsData : [];
  const fallbackEvents = [
    { id: "fb-created", event_type: "created", created_at: booking.created_at },
    ...(["ongoing", "completed"].includes(booking.status)
      ? [
          {
            id: "fb-handover",
            event_type: "handover_confirmed",
            created_at: booking.start_time,
          },
          {
            id: "fb-started",
            event_type: "trip_started",
            created_at: booking.start_time,
          },
        ]
      : []),
    ...(booking.status === "completed"
      ? [
          {
            id: "fb-ended",
            event_type: "trip_ended",
            created_at: booking.end_time,
          },
          {
            id: "fb-returned",
            event_type: "returned",
            created_at: booking.end_time,
          },
        ]
      : []),
    ...(booking.status === "cancelled"
      ? [
          {
            id: "fb-cancelled",
            event_type: "cancelled_by_customer",
            created_at: booking.updated_at,
          },
        ]
      : []),
    ...(booking.status === "rejected"
      ? [
          {
            id: "fb-rejected",
            event_type: "rejected_by_host",
            created_at: booking.updated_at,
          },
        ]
      : []),
  ];
  const bookingEvents = rawEvents.length > 0 ? rawEvents : fallbackEvents;

  const handoverDetails = (handoverData as any) ?? null;
  const returnDetails = (returnData as any) ?? null;
  const disputes: any[] = Array.isArray(disputesData) ? disputesData : [];

  const hasDistance =
    handoverDetails?.start_odometer_km != null &&
    returnDetails?.end_odometer_km != null;
  const distanceTravelled = hasDistance
    ? returnDetails.end_odometer_km - handoverDetails.start_odometer_km
    : null;
  const includedKm = (Number(booking.total_hours ?? 0) / 24) * 300;
  const extraDistanceKm = Math.max(0, Number(distanceTravelled ?? 0) - includedKm);
  const extraFare = extraDistanceKm * 8;
  const hostExtraShare = extraFare * 0.5;
  const hostBaseShare =
    Number(booking.total_amount ?? 0) -
    Number(booking.deposit_amount ?? 0) -
    Number(booking.commission_amount ?? 0);
  const hostSettlementAmount = Math.max(0, hostBaseShare + hostExtraShare);

  const damageCharge = Math.max(0, Number(damageChargeInput || 0));
  const customerExtraCharges = extraFare + damageCharge;
  const paidDeposit =
    booking.deposit_status === "paid" ? Number(booking.deposit_amount ?? 0) : 0;
  const customerRefundAmount = Math.max(0, paidDeposit - customerExtraCharges);
  const customerPayableAmount = Math.max(0, customerExtraCharges - paidDeposit);

  const collateralType = (
    pickFirstString(customerDetails, [
      "collateral_type",
      "security_collateral_type",
      "collateral_vehicle_type",
      "security_type",
    ]) ?? ""
  ).toLowerCase();
  const hasTwoWheelerCollateral =
    collateralType.includes("two") ||
    collateralType.includes("2") ||
    collateralType.includes("bike") ||
    collateralType.includes("scooter") ||
    collateralType.includes("motorcycle") ||
    customerDetails?.two_wheeler_collateral === true;

  const settlementButtonLabel =
    settlementTarget === "host"
      ? "Process Host Payout"
      : settlementTarget === "customer" && hasTwoWheelerCollateral
        ? "Resolve via Collateral"
        : settlementTarget === "customer" && customerRefundAmount > 0
          ? "Process Refund"
          : settlementTarget === "customer" && customerPayableAmount > 0
            ? "Collect Payment"
            : "No Action Required";
  const isSettlementDisabled =
    !settlementTarget ||
    settlementStatus === "pending" ||
    (settlementTarget === "customer" &&
      !hasTwoWheelerCollateral &&
      customerRefundAmount <= 0 &&
      customerPayableAmount <= 0);

  return (
    <div className="mx-auto my-10 flex w-full max-w-7xl flex-col gap-6 p-4 md:p-6">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-[1fr_2fr] lg:items-end">
        <div className="flex flex-col gap-3">
          <Button
            variant="outline"
            size="sm"
            asChild
            className="mb-1 w-fit rounded-full px-4"
          >
            <Link to="/bookings">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            Booking #{id?.slice(-8).toUpperCase()}
          </h1>
          <p className="text-sm text-muted-foreground">
            {brand} {model} - {car?.registration_number}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr]">
        <div className="order-2 flex h-fit flex-col gap-6 lg:order-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold tracking-tight">
                Status Update
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">
                  Current Status
                </span>
                <Badge
                  className={`capitalize text-xs font-semibold ${STATUS_COLORS[currentStatus]}`}
                  variant="outline"
                >
                  {currentStatus}
                </Badge>
              </div>
              <Select
                value={selectedStatus}
                onValueChange={(v) => setSelectedStatus(v as BookingStatus)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    {STATUS_OPTIONS.filter((s) => s !== currentStatus).map(
                      (s) => (
                        <SelectItem key={s} value={s} className="capitalize">
                          {s}
                        </SelectItem>
                      ),
                    )}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <Button
                className="w-full mt-2"
                disabled={!selectedStatus || mutationStatus === "pending"}
                onClick={() =>
                  selectedStatus &&
                  changeStatus({ status: selectedStatus as BookingStatus })
                }
              >
                {mutationStatus === "pending" ? "Saving..." : "Update Status"}
              </Button>
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
              <CardTitle className="text-lg font-semibold tracking-tight">
                Settlement
              </CardTitle>
              <CardDescription>Settle payments manually</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Select
                value={settlementTarget}
                onValueChange={(v) => setSettlementTarget(v as any)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pay To..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="host">Host</SelectItem>
                    <SelectItem value="customer">Customer</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>

              {settlementTarget === "host" && (
                <div className="border rounded-md p-3 text-sm space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Host base share</span>
                    <span>{fmtCurrency(Math.max(0, hostBaseShare))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Extra fare share (50%)
                    </span>
                    <span>{fmtCurrency(hostExtraShare)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Extra distance @ 8/km
                    </span>
                    <span>{Math.max(0, Math.round(extraDistanceKm))} km</span>
                  </div>
                  <div className="flex justify-between font-semibold pt-1 border-t mt-1">
                    <span>Host payout</span>
                    <span>{fmtCurrency(hostSettlementAmount)}</span>
                  </div>
                </div>
              )}

              {settlementTarget === "customer" && (
                <div className="border rounded-md p-3 text-sm space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">
                      Damage / misc charges
                    </p>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={damageChargeInput}
                      onChange={(e) => setDamageChargeInput(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Extra distance @ 8/km
                      </span>
                      <span>{fmtCurrency(extraFare)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Damage charges</span>
                      <span>{fmtCurrency(damageCharge)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Total charges</span>
                      <span>{fmtCurrency(customerExtraCharges)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Paid deposit to adjust
                      </span>
                      <span>{fmtCurrency(paidDeposit)}</span>
                    </div>
                    {hasTwoWheelerCollateral ? (
                      <p className="text-xs text-amber-600 pt-1 border-t mt-1">
                        Two-wheeler collateral detected. Settlement should be
                        resolved via collateral flow.
                      </p>
                    ) : (
                      <div className="flex justify-between font-semibold pt-1 border-t mt-1">
                        <span>
                          {customerRefundAmount > 0
                            ? "Refund to customer"
                            : "Collect from customer"}
                        </span>
                        <span>
                          {fmtCurrency(
                            customerRefundAmount > 0
                              ? customerRefundAmount
                              : customerPayableAmount,
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <Button
                variant="default"
                className="w-full mt-2"
                disabled={isSettlementDisabled}
                onClick={() => processSettlement()}
              >
                {settlementStatus === "pending" ? "Processing..." : settlementButtonLabel}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* ── RIGHT MAIN ── */}
        <div className="order-1 space-y-5 lg:order-1">
          {/* Car Detail Preview */}
          <div className="flex items-center gap-4 border bg-card p-4">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={`${brand} ${model}`}
                className="h-20 w-28 object-cover rounded-xl border shrink-0"
              />
            ) : (
              <div className="h-20 w-28 rounded-xl bg-muted shrink-0 flex items-center justify-center text-muted-foreground text-xs">
                No image
              </div>
            )}
            <div className="flex flex-1 flex-col gap-1">
              <p className="text-lg font-bold leading-tight">
                {booking.total_hours}h /{" "}
                {booking.pickup_type === "self_pickup"
                  ? "Self Pickup"
                  : "Home Delivery"}
              </p>
              <p className="text-sm text-muted-foreground">
                {brand} {model}
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 px-4 py-2 text-right">
              <p className="text-xs font-medium text-muted-foreground">Total</p>
              <p className="text-base font-bold text-primary">
                {fmtCurrency(booking.total_amount)}
              </p>
            </div>
          </div>

          <Tabs defaultValue="activity" className="w-full">
            <div>
              <TabsList className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 bg-transparent w-full">
                <TabsTrigger value="activity" className={tabTriggerClass}>
                  Activity
                </TabsTrigger>
                <TabsTrigger value="trip" className={tabTriggerClass}>
                  Trip Details
                </TabsTrigger>
                <TabsTrigger value="customer" className={tabTriggerClass}>
                  Customer
                </TabsTrigger>
                <TabsTrigger value="host" className={tabTriggerClass}>
                  Host
                </TabsTrigger>
                <TabsTrigger value="handover" className={tabTriggerClass}>
                  Handover
                </TabsTrigger>
                <TabsTrigger value="return" className={tabTriggerClass}>
                  Return
                </TabsTrigger>
              </TabsList>
            </div>

            {/* TAB: Activity */}
            <TabsContent value="activity" className="mt-6">
              <div className="grid grid-cols-1 gap-6 border bg-card p-4 md:p-6">
                <div>
                  <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" /> Timeline
                  </h3>
                  <ol className="relative ml-10 border-l border-muted">
                    {bookingEvents.map((event: any, index: number) => {
                      const ui = getEventUi(event?.event_type);
                      const Icon = ui.Icon;
                      const isLast = index === bookingEvents.length - 1;
                      return (
                        <li
                          key={event?.id ?? index}
                          className={`ml-6 ${isLast ? "pb-0" : "pb-8"}`}
                        >
                          <span
                            className={`absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full ${ui.bgClass} border border-background`}
                          >
                            <Icon className={`h-4 w-4 ${ui.colorClass}`} />
                          </span>
                          <p className="text-sm font-semibold text-foreground leading-tight">
                            {ui.label}
                          </p>
                          <time className="text-xs text-muted-foreground mt-1 block">
                            {fmt(event?.created_at ?? booking.created_at)}
                          </time>
                        </li>
                      );
                    })}
                  </ol>
                </div>

                {disputes.length > 0 && (
                  <div className="pt-6 mt-2 border-t">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-destructive">
                      <MessageCircleWarning className="w-5 h-5" /> Disputes
                    </h3>
                    <div className="flex flex-col gap-4">
                      {disputes.map((dispute: any) => {
                        const ds = String(dispute?.status ?? "").toLowerCase();
                        const badgeClass =
                          ds === "in_review"
                            ? "bg-yellow-100 text-yellow-800 border-yellow-200"
                            : ds === "resolved"
                              ? "bg-green-100 text-green-800 border-green-200"
                              : ds === "rejected"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : ds === "open"
                                  ? "bg-blue-100 text-blue-800 border-blue-200"
                                  : "bg-gray-100 text-gray-700 border-gray-200";
                        return (
                          <div
                            key={dispute.id}
                            className="p-4 rounded-xl border bg-muted/30"
                          >
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <p className="text-sm font-semibold capitalize">
                                {String(dispute.dispute_type ?? "Dispute")
                                  .replace(/_/g, " ")
                                  .replace(/\b\w/g, (c: string) =>
                                    c.toUpperCase(),
                                  )}
                              </p>
                              <Badge
                                className={`capitalize border text-xs shrink-0 ${badgeClass}`}
                                variant="outline"
                              >
                                {String(dispute.status ?? "—").replace(
                                  /_/g,
                                  " ",
                                )}
                              </Badge>
                            </div>
                            {dispute.description && (
                              <p className="text-sm text-muted-foreground">
                                {dispute.description}
                              </p>
                            )}
                            <p className="text-xs text-muted-foreground mt-2">
                              {fmt(dispute.created_at)}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: Trip Details */}
            <TabsContent value="trip" className="mt-6">
              <div className="flex flex-col gap-6 border bg-card p-4 md:p-6">
                <div>
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2 border-b pb-2">
                    <Flag className="w-4 h-4 text-primary" /> Logistics
                  </h3>
                  <div className="divide-y divide-muted">
                    <Detail
                      label="Pick-up Time"
                      value={fmt(booking.start_time)}
                    />
                    <Detail
                      label="Drop-off Time"
                      value={fmt(booking.end_time)}
                    />
                    <Detail
                      label="Total Duration"
                      value={`${booking.total_hours} hours`}
                    />
                    <Detail
                      label="Pickup Type"
                      value={
                        booking.pickup_type === "home_delivery"
                          ? "Home Delivery"
                          : "Self Pickup"
                      }
                    />
                    <Detail
                      label="Handover OTP"
                      value={booking.handover_otp || "—"}
                    />
                    {booking.delivery_address && (
                      <Detail
                        label="Delivery Address"
                        value={booking.delivery_address}
                      />
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="text-base font-semibold mb-4 flex items-center gap-2 border-b pb-2">
                    <CreditCard className="w-4 h-4 text-primary" /> Finance
                    Breakdown
                  </h3>
                  <div className="divide-y divide-muted">
                    <Detail
                      label="Base Rental"
                      value={fmtCurrency(booking.base_amount)}
                    />
                    <Detail
                      label="Delivery Charge"
                      value={fmtCurrency(booking.delivery_amount)}
                    />
                    <Detail
                      label="Security Deposit"
                      value={`${fmtCurrency(booking.deposit_amount)} (${booking.deposit_status})`}
                    />
                    <Detail
                      label="Commission"
                      value={`${fmtCurrency(booking.commission_amount)} (${booking.commission_percentage}%)`}
                    />
                    <Detail
                      label="Total Amount"
                      value={
                        <span className="font-bold text-lg text-primary">
                          {fmtCurrency(booking.total_amount)}
                        </span>
                      }
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* TAB: Customer */}
            <TabsContent value="customer" className="mt-6">
              <div className="flex flex-col gap-6 border bg-card p-4 md:p-6">
                <div className="flex items-center gap-4 border-b pb-6">
                  <Avatar className="h-16 w-16">
                    <AvatarImage
                      src={customer?.avatar_url ?? undefined}
                      alt={customer?.full_name}
                    />
                    <AvatarFallback className="text-lg">
                      {customer?.full_name?.[0]?.toUpperCase() ?? "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="text-xl font-bold">
                      {customer?.full_name ?? "Unknown Customer"}
                    </h3>
                    <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      <Phone className="h-3 w-3" />{" "}
                      {customer?.phone || "No Phone"}
                    </p>
                    <p className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-3 w-3" />{" "}
                      {customer?.email || "No Email"}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 divide-y md:divide-y-0 divide-muted">
                  <div className="divide-y divide-muted">
                    <Detail
                      label="Aadhaar Name"
                      value={customerDetails.aadhaar_name}
                    />
                    <Detail
                      label="Aadhaar Number"
                      value={customerDetails.aadhaar_number}
                    />
                    <div className="py-3">
                      <p className="text-sm text-muted-foreground mb-1">
                        Aadhaar Address
                      </p>
                      <p className="text-sm font-medium whitespace-normal wrap-break-word leading-relaxed">
                        {formatAddress(aadhaarAddress)}
                      </p>
                    </div>
                  </div>
                  <div className="divide-y divide-muted h-fit">
                    <Detail label="DL Name" value={customerDetails.dl_name} />
                    <Detail
                      label="DL Number"
                      value={customerDetails.dl_number}
                    />
                    <div className="py-3">
                      <p className="text-sm text-muted-foreground mb-1">
                        DL Address
                      </p>
                      <p className="text-sm font-medium whitespace-normal wrap-break-word leading-relaxed">
                        {formatAddress(dlAddress)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="host" className="mt-6">
              <div className="flex flex-col gap-6 border bg-card p-4 md:p-6">
                {!host ? (
                  <p className="text-muted-foreground text-center py-10">
                    Host information is unavailable.
                  </p>
                ) : (
                  <>
                    <div className="flex items-center gap-4 border-b pb-6">
                      <Avatar className="h-16 w-16">
                        <AvatarFallback className="text-lg bg-primary/10 text-primary">
                          {host.full_name?.[0]?.toUpperCase() ?? "H"}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <h3 className="text-xl font-bold">{host.full_name}</h3>
                        <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                          <Phone className="h-3 w-3" />{" "}
                          {host.phone || "No Phone"}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Mail className="h-3 w-3" />{" "}
                          {host.email || "No Email"}
                        </p>
                      </div>
                    </div>

                    <div className="divide-y divide-muted">
                      <Detail
                        label="Account Holder"
                        value={hostDetails.bank_account_holder}
                      />
                      <Detail
                        label="Account Number"
                        value={hostDetails.bank_account_number}
                      />
                      <Detail label="IFSC Code" value={hostDetails.ifsc_code} />
                    </div>
                  </>
                )}
              </div>
            </TabsContent>

            <TabsContent value="handover" className="mt-6">
              <div className="min-h-[300px] border bg-card p-4 md:p-6">
                {!handoverDetails ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10 gap-2">
                    <Car className="w-12 h-12 opacity-20" />
                    <p>Handover details have not been uploaded yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="divide-y divide-muted mb-2">
                      <Detail
                        label="Odometer Opening"
                        value={
                          <span className="font-bold text-lg">
                            {handoverDetails.start_odometer_km} km
                          </span>
                        }
                      />
                      <Detail
                        label="Handover Time"
                        value={fmt(
                          handoverDetails.created_at ?? booking.start_time,
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <ProofImage
                        url={handoverDetails.odometer_proof_url}
                        label="Odometer Initial"
                      />
                      <ProofImage
                        url={handoverDetails.customer_photo_url}
                        label="Customer with Car"
                      />
                      <ProofImage
                        url={handoverDetails.handover_proof_url}
                        label="Signed Handover Document"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* TAB: Return */}
            <TabsContent value="return" className="mt-6">
              <div className="min-h-[300px] border bg-card p-4 md:p-6">
                {!returnDetails ? (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground py-10 gap-2">
                    <Undo2 className="w-12 h-12 opacity-20" />
                    <p>Return details have not been uploaded yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6">
                    <div className="divide-y divide-muted mb-2">
                      <Detail
                        label="Odometer Closing"
                        value={
                          <span className="font-bold text-lg">
                            {returnDetails.end_odometer_km} km
                          </span>
                        }
                      />
                      {distanceTravelled != null && (
                        <Detail
                          label="Distance Travelled"
                          value={
                            <strong className="text-primary">
                              {distanceTravelled} km
                            </strong>
                          }
                        />
                      )}
                      <Detail
                        label="Return Time"
                        value={fmt(
                          returnDetails.created_at ?? booking.end_time,
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ProofImage
                        url={returnDetails.odometer_proof_url}
                        label="Odometer Final"
                      />
                      <ProofImage
                        url={returnDetails.return_proof_url}
                        label="Condition After Return"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
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
}
