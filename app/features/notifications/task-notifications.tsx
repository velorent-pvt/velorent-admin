import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Edit } from "lucide-react";
import { toast } from "sonner";

import {
  getPushNotificationAutomations,
  updatePushNotificationAutomation,
  type AutomationAudience,
  type PushNotificationAutomation,
} from "~/api/notifications";
import { Loader } from "~/components/shared/Loader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { DataTable } from "~/components/ui/data-table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/components/ui/dialog";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { Textarea } from "~/components/ui/textarea";

const EVENT_LABELS: Record<string, string> = {
  user_registered: "Customer registered",
  host_registered: "Host registered",
  booking_created: "Booking created",
  booking_confirmed: "Booking confirmed",
  booking_cancelled: "Booking cancelled",
  booking_rejected: "Booking rejected",
  document_submitted: "Document submitted",
  document_approved: "Document verified",
  document_rejected: "Document rejected",
  vehicle_submitted: "Host car submitted",
  vehicle_approved: "Host car approved",
  vehicle_rejected: "Host car rejected",
};

type AutomationTableRow = PushNotificationAutomation & {
  event_label: string;
};

type AutomationDraft = {
  title: string;
  message: string;
  audience: AutomationAudience;
  link_template: string;
  deeplink_template: string;
  is_enabled: boolean;
};

function getEventLabel(eventType: string) {
  return EVENT_LABELS[eventType] ?? eventType;
}

function formatAudience(audience: AutomationAudience) {
  const labels: Record<AutomationAudience, string> = {
    customer: "Customer",
    host: "Host",
    both: "Customer and host",
  };

  return labels[audience];
}

function toDraft(automation: PushNotificationAutomation): AutomationDraft {
  return {
    title: automation.title,
    message: automation.message,
    audience: automation.audience,
    link_template: automation.link_template ?? "",
    deeplink_template: automation.deeplink_template ?? "",
    is_enabled: automation.is_enabled,
  };
}

export function TaskNotifications() {
  const queryClient = useQueryClient();
  const [selectedAutomation, setSelectedAutomation] =
    useState<AutomationTableRow | null>(null);
  const [draft, setDraft] = useState<AutomationDraft | null>(null);

  const automationsQuery = useQuery({
    queryKey: ["push-notification-automations"],
    queryFn: getPushNotificationAutomations,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      eventType,
      updates,
    }: {
      eventType: string;
      updates: Parameters<typeof updatePushNotificationAutomation>[1];
    }) => updatePushNotificationAutomation(eventType, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["push-notification-automations"],
      });
      setSelectedAutomation(null);
      setDraft(null);
      toast.success("Task notification updated");
    },
  });

  const tableData = useMemo<AutomationTableRow[]>(
    () =>
      (automationsQuery.data ?? []).map((automation) => ({
        ...automation,
        event_label: getEventLabel(automation.event_type),
      })),
    [automationsQuery.data],
  );

  const columns = useMemo<ColumnDef<AutomationTableRow>[]>(
    () => [
      {
        accessorKey: "event_label",
        header: "Task",
      },
      {
        accessorKey: "title",
        header: "Title",
      },
      {
        accessorKey: "audience",
        header: "Audience",
        cell: ({ row }) => formatAudience(row.original.audience),
      },
      {
        accessorKey: "is_enabled",
        header: "Status",
        cell: ({ row }) => (
          <Badge variant={row.original.is_enabled ? "success" : "outline"}>
            {row.original.is_enabled ? "Enabled" : "Disabled"}
          </Badge>
        ),
      },
      {
        accessorKey: "updated_at",
        header: "Updated",
        cell: ({ row }) => new Date(row.original.updated_at).toLocaleString(),
      },
      {
        id: "actions",
        cell: ({ row }) => (
          <Button
            type="button"
            variant="link"
            size="sm"
            onClick={() => {
              setSelectedAutomation(row.original);
              setDraft(toDraft(row.original));
            }}
          >
            <Edit />
            Edit
          </Button>
        ),
      },
    ],
    [],
  );

  function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedAutomation || !draft) return;

    updateMutation.mutate({
      eventType: selectedAutomation.event_type,
      updates: {
        title: draft.title.trim(),
        message: draft.message.trim(),
        audience: draft.audience,
        link_template: draft.link_template.trim() || null,
        deeplink_template: draft.deeplink_template.trim() || null,
        is_enabled: draft.is_enabled,
      },
    });
  }

  if (automationsQuery.isLoading) {
    return <Loader />;
  }

  return (
    <>
      <DataTable
        data={tableData}
        columns={columns}
        searchColumn="event_label"
        searchPlaceholder="Search task notification..."
        title="Task Notifications"
        showPageSizeSelector
      />

      <Dialog
        open={!!selectedAutomation}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedAutomation(null);
            setDraft(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task Notification</DialogTitle>
          </DialogHeader>

          {draft && (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="flex items-center justify-between gap-4 rounded-md border p-3">
                <Label htmlFor="is-enabled">Enabled</Label>
                <Switch
                  id="is-enabled"
                  checked={draft.is_enabled}
                  onCheckedChange={(is_enabled) =>
                    setDraft((current) =>
                      current ? { ...current, is_enabled } : current,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Audience</Label>
                <Select
                  value={draft.audience}
                  onValueChange={(audience: AutomationAudience) =>
                    setDraft((current) =>
                      current ? { ...current, audience } : current,
                    )
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="customer">Customer</SelectItem>
                    <SelectItem value="host">Host</SelectItem>
                    <SelectItem value="both">Customer and host</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={draft.title}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, title: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Message</Label>
                <Textarea
                  value={draft.message}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, message: event.target.value }
                        : current,
                    )
                  }
                  className="min-h-28"
                />
              </div>

              <div className="space-y-2">
                <Label>Web link</Label>
                <Input
                  value={draft.link_template}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, link_template: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>App deeplink</Label>
                <Input
                  value={draft.deeplink_template}
                  onChange={(event) =>
                    setDraft((current) =>
                      current
                        ? { ...current, deeplink_template: event.target.value }
                        : current,
                    )
                  }
                />
              </div>

              <DialogFooter>
                <Button
                  type="submit"
                  disabled={updateMutation.status === "pending"}
                >
                  Save
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
