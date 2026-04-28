import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, Car, Link2, User } from "lucide-react";
import { useMemo } from "react";
import { useNavigate, useParams } from "react-router";
import { getDisputeByIdAdmin, updateDisputeStatusAdmin } from "~/api/disputes";
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
import { toast } from "sonner";

const DISPUTE_STATUSES = ["open", "in_review", "resolved", "rejected"] as const;

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

function statusVariant(
  status: string,
): "default" | "secondary" | "destructive" | "outline" | "success" {
  const normalized = status.toLowerCase();
  if (normalized === "resolved") return "success";
  if (normalized === "rejected") return "destructive";
  if (normalized === "open") return "secondary";
  return "outline";
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-sm font-medium text-right">{value}</p>
    </div>
  );
}

export default function DisputeDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const {
    data: dispute,
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ["admin_dispute", id],
    queryFn: () => getDisputeByIdAdmin(id!),
    enabled: !!id,
  });

  const { mutate: updateStatus, isPending: isUpdating } = useMutation({
    mutationFn: (status: string) => updateDisputeStatusAdmin(id!, status),
    onSuccess: () => {
      toast.success("Dispute status updated");
      queryClient.invalidateQueries({ queryKey: ["admin_dispute", id] });
      queryClient.invalidateQueries({ queryKey: ["admin_disputes"] });
    },
    onError: (e: any) => toast.error(e?.message || "Failed to update dispute"),
  });

  const nextStatuses = useMemo(
    () =>
      DISPUTE_STATUSES.filter((status) => status !== dispute?.status).map((status) => ({
        label: humanize(status),
        value: status,
      })),
    [dispute?.status],
  );

  if (!id) {
    return <div className="max-w-7xl mx-auto p-6">Invalid dispute id</div>;
  }

  if (isLoading) return <Loader />;

  if (isError || !dispute) {
    return (
      <div className="max-w-7xl mx-auto flex flex-col gap-3 p-6 my-6">
        <Button variant="outline" className="w-fit" onClick={() => navigate("/disputes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Disputes
        </Button>
        <Card>
          <CardHeader>
            <CardTitle>Failed to load dispute</CardTitle>
            <CardDescription>{(error as any)?.message || "Dispute not found"}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="outline" className="w-fit" onClick={() => navigate("/disputes")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Disputes
        </Button>

        <Badge variant={statusVariant(dispute.status)}>{humanize(dispute.status)}</Badge>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-2xl">Dispute #{dispute.dispute_code}</CardTitle>
          <CardDescription>
            Booking #{dispute.booking_code} - Raised {formatDateTime(dispute.created_at)}
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Dispute Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Type" value={humanize(dispute.dispute_type)} />
              <Separator />
              <DetailRow label="Status" value={humanize(dispute.status)} />
              <Separator />
              <DetailRow label="Description" value={dispute.description} />
              <Separator />
              <DetailRow label="Updated At" value={formatDateTime(dispute.updated_at)} />
              {dispute.image_url ? (
                <>
                  <Separator />
                  <div className="flex items-center justify-between gap-4 py-2">
                    <p className="text-sm text-muted-foreground">Evidence</p>
                    <Button variant="link" asChild className="h-auto p-0">
                      <a href={dispute.image_url} target="_blank" rel="noreferrer">
                        <Link2 className="mr-2 h-4 w-4" />
                        Open attachment
                      </a>
                    </Button>
                  </div>
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="h-4 w-4" />
                Participants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Raised By" value={dispute.raised_by_name} />
              <Separator />
              <DetailRow label="Customer" value={dispute.customer_name} />
              <Separator />
              <DetailRow label="Host" value={dispute.host_name} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Car className="h-4 w-4" />
                Booking Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent>
              <DetailRow label="Booking" value={`#${dispute.booking_code}`} />
              <Separator />
              <DetailRow label="Booking Status" value={humanize(dispute.booking_status)} />
              <Separator />
              <DetailRow label="Car" value={dispute.car_name} />
              <Separator />
              <DetailRow label="Registration" value={dispute.registration_number} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Admin Actions</CardTitle>
              <CardDescription>Update dispute state from here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {nextStatuses.map((action) => (
                  <Button
                    key={action.value}
                    variant="outline"
                    size="sm"
                    disabled={isUpdating}
                    onClick={() => updateStatus(action.value)}
                  >
                    {action.label}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
