import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, Clock, Eye, IdCard, XCircle } from "lucide-react";

import {
  getPendingVerifications,
  approveAadhaarVerification,
  approveDLVerification,
  rejectVerification,
  type ManualVerification,
} from "~/api/verifications";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { DataTable } from "~/components/ui/data-table";
import { getVerificationColumns } from "./verifications-columns";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Loader } from "~/components/shared/Loader";
import { StatefulButton } from "~/components/ui/stateful-button";
import type { Route } from "../+types";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Document Verifications | Velorent" }];
}

// ── Zod schemas ───────────────────────────────────────────────────────────────

const aadhaarSchema = z.object({
  aadhaar_number: z.string().min(1, "Aadhaar number is required"),
  aadhaar_name: z.string().min(1, "Full name is required"),
  aadhaar_address: z.string().min(1, "Address is required"),
});

const dlSchema = z.object({
  dl_number: z.string().min(1, "DL number is required"),
  dl_name: z.string().min(1, "Full name is required"),
  dl_address: z.string().optional(),
});

type AadhaarFormValues = z.infer<typeof aadhaarSchema>;
type DLFormValues = z.infer<typeof dlSchema>;

// ── Main page ─────────────────────────────────────────────────────────────────

export default function VerificationsPage() {
  const [selected, setSelected] = useState<ManualVerification | null>(null);

  const { data: verifications = [], isLoading } = useQuery({
    queryKey: ["pending-verifications"],
    queryFn: getPendingVerifications,
  });

  if (isLoading) return <Loader />;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <div>
        <h1 className="text-3xl font-bold">Document Verifications</h1>
      </div>

      {verifications.length === 0 ? (
        <Card className="shadow-none">
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <CheckCircle2 className="h-12 w-12 text-muted-foreground/30" />
            <p className="text-muted-foreground font-medium">
              No pending verifications
            </p>
          </CardContent>
        </Card>
      ) : (
        <DataTable
          data={verifications}
          columns={getVerificationColumns(setSelected)}
          title="Pending Verifications"
          showHeader={false}
        />
      )}

      {selected && (
        <ReviewDialog
          verification={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

// ── Review dialog ─────────────────────────────────────────────────────────────

function ReviewDialog({
  verification,
  onClose,
}: {
  verification: ManualVerification;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const isAadhaar = verification.document_type === "aadhaar";

  const [enlarged, setEnlarged] = useState<string | null>(null);

  function onMutationSuccess() {
    queryClient.invalidateQueries({ queryKey: ["pending-verifications"] });
    toast.success("Verification updated successfully");
    onClose();
  }

  const approveMutation = useMutation({
    mutationFn: (values: AadhaarFormValues | DLFormValues) => {
      if (isAadhaar) {
        const v = values as AadhaarFormValues;
        return approveAadhaarVerification({
          verificationId: verification.id,
          profileId: verification.profile_id,
          aadhaarNumber: v.aadhaar_number,
          aadhaarName: v.aadhaar_name,
          aadhaarAddress: v.aadhaar_address,
        });
      } else {
        const v = values as DLFormValues;
        return approveDLVerification({
          verificationId: verification.id,
          profileId: verification.profile_id,
          dlNumber: v.dl_number,
          dlName: v.dl_name,
          dlAddress: v.dl_address,
        });
      }
    },
    onSuccess: onMutationSuccess,
    onError: (err: Error) => toast.error(err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectVerification(verification.id),
    onSuccess: onMutationSuccess,
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <>
      <Dialog open onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Review {isAadhaar ? "Aadhaar" : "Driving License"} —{" "}
              {verification.profile?.full_name ?? "Unknown Customer"}
            </DialogTitle>
          </DialogHeader>

          {/* Images side by side */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            {[
              { label: "Front Side", url: verification.front_image_url },
              { label: "Back Side", url: verification.back_image_url },
            ].map(({ label, url }) => (
              <div key={label} className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {label}
                </p>
                <button
                  type="button"
                  className="w-full overflow-hidden rounded-lg border bg-muted hover:opacity-90 transition-opacity cursor-zoom-in"
                  onClick={() => setEnlarged(url)}
                >
                  <img
                    src={url}
                    alt={label}
                    className="w-full h-44 object-cover"
                  />
                </button>
                <p className="text-xs text-muted-foreground text-center">
                  Click to enlarge
                </p>
              </div>
            ))}
          </div>

          <hr className="my-2" />

          {/* Entry form */}
          {isAadhaar ? (
            <AadhaarForm
              onSubmit={(v) => approveMutation.mutate(v)}
              approveStatus={approveMutation.status}
              rejectStatus={rejectMutation.status}
              onReject={() => rejectMutation.mutate()}
            />
          ) : (
            <DLForm
              onSubmit={(v) => approveMutation.mutate(v)}
              approveStatus={approveMutation.status}
              rejectStatus={rejectMutation.status}
              onReject={() => rejectMutation.mutate()}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Enlarged image overlay */}
      {enlarged && (
        <Dialog open onOpenChange={() => setEnlarged(null)}>
          <DialogContent className="max-w-5xl p-4">
            <img
              src={enlarged}
              alt="Document"
              className="w-full max-h-[80vh] object-contain rounded-md"
            />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

// ── Aadhaar form ──────────────────────────────────────────────────────────────

function AadhaarForm({
  onSubmit,
  onReject,
  approveStatus,
  rejectStatus,
}: {
  onSubmit: (v: AadhaarFormValues) => void;
  onReject: () => void;
  approveStatus: "idle" | "pending" | "success" | "error";
  rejectStatus: "idle" | "pending" | "success" | "error";
}) {
  const form = useForm<AadhaarFormValues>({
    resolver: zodResolver(aadhaarSchema),
    defaultValues: { aadhaar_number: "", aadhaar_name: "", aadhaar_address: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm font-semibold">Enter details from the Aadhaar card above:</p>

        <FormField
          name="aadhaar_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Aadhaar Number</FormLabel>
              <FormControl>
                <Input placeholder="XXXX XXXX XXXX" {...field} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="aadhaar_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="As printed on Aadhaar" {...field} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="aadhaar_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Address on Aadhaar" {...field} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            disabled={rejectStatus === "pending" || approveStatus === "pending"}
            onClick={onReject}
          >
            {rejectStatus === "pending" ? (
              <span className="animate-pulse">Rejecting…</span>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </>
            )}
          </Button>

          <StatefulButton
            type="submit"
            status={approveStatus}
            className="flex-1"
            disabled={rejectStatus === "pending"}
          >
            Approve &amp; Verify
          </StatefulButton>
        </div>
      </form>
    </Form>
  );
}

// ── DL form ───────────────────────────────────────────────────────────────────

function DLForm({
  onSubmit,
  onReject,
  approveStatus,
  rejectStatus,
}: {
  onSubmit: (v: DLFormValues) => void;
  onReject: () => void;
  approveStatus: "idle" | "pending" | "success" | "error";
  rejectStatus: "idle" | "pending" | "success" | "error";
}) {
  const form = useForm<DLFormValues>({
    resolver: zodResolver(dlSchema),
    defaultValues: { dl_number: "", dl_name: "", dl_address: "" },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <p className="text-sm font-semibold">Enter details from the driving license above:</p>

        <FormField
          name="dl_number"
          render={({ field }) => (
            <FormItem>
              <FormLabel>DL Number</FormLabel>
              <FormControl>
                <Input placeholder="e.g. MH01 2024 0012345" {...field} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="dl_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl>
                <Input placeholder="As printed on license" {...field} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="dl_address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address (optional)</FormLabel>
              <FormControl>
                <Input placeholder="Address on license" {...field} className="bg-card" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="destructive"
            className="flex-1"
            disabled={rejectStatus === "pending" || approveStatus === "pending"}
            onClick={onReject}
          >
            {rejectStatus === "pending" ? (
              <span className="animate-pulse">Rejecting…</span>
            ) : (
              <>
                <XCircle className="h-4 w-4 mr-1" /> Reject
              </>
            )}
          </Button>

          <StatefulButton
            type="submit"
            status={approveStatus}
            className="flex-1"
            disabled={rejectStatus === "pending"}
          >
            Approve &amp; Verify
          </StatefulButton>
        </div>
      </form>
    </Form>
  );
}
