import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, CalendarClock, Play, Save, XCircle } from "lucide-react";
import { toast } from "sonner";

import {
  cancelPushNotificationCampaign,
  createPushNotificationCampaign,
  getPushNotificationAutomations,
  getPushNotificationCampaigns,
  getRecentPushNotificationJobs,
  updatePushNotificationAutomation,
  type AutomationAudience,
  type PushAudience,
  type PushNotificationAutomation,
  type PushNotificationCampaign,
} from "~/api/notifications";
import { Loader } from "~/components/shared/Loader";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
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

const STATUS_VARIANT: Record<
  PushNotificationCampaign["status"],
  "default" | "secondary" | "destructive" | "outline"
> = {
  draft: "outline",
  scheduled: "secondary",
  processing: "default",
  sent: "default",
  cancelled: "outline",
  failed: "destructive",
};

function toLocalDateTimeInputValue(date: Date) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDateTimeInputValue(value: string) {
  return new Date(value).toISOString();
}

function formatAudience(audience: string) {
  return audience.replace("_", " ");
}

function AutomationRow({
  automation,
}: {
  automation: PushNotificationAutomation;
}) {
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({
    title: automation.title,
    message: automation.message,
    audience: automation.audience,
    link_template: automation.link_template ?? "",
    deeplink_template: automation.deeplink_template ?? "",
  });

  const updateMutation = useMutation({
    mutationFn: (updates: Parameters<typeof updatePushNotificationAutomation>[1]) =>
      updatePushNotificationAutomation(automation.event_type, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-notification-automations"] });
      toast.success("Automation updated");
    },
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">
            {EVENT_LABELS[automation.event_type] ?? automation.event_type}
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {automation.event_type}
          </p>
        </div>

        <Switch
          checked={automation.is_enabled}
          onCheckedChange={(is_enabled) =>
            updateMutation.mutate({ is_enabled })
          }
        />
      </CardHeader>

      <CardContent className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Title</Label>
          <Input
            value={draft.title}
            onChange={(event) =>
              setDraft((current) => ({ ...current, title: event.target.value }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Audience</Label>
          <Select
            value={draft.audience}
            onValueChange={(audience: AutomationAudience) =>
              setDraft((current) => ({ ...current, audience }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="customer">Customer</SelectItem>
              <SelectItem value="host">Host</SelectItem>
              <SelectItem value="both">Customer and host</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label>Message</Label>
          <Textarea
            value={draft.message}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                message: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>Web link</Label>
          <Input
            value={draft.link_template}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                link_template: event.target.value,
              }))
            }
          />
        </div>

        <div className="space-y-2">
          <Label>App deeplink</Label>
          <Input
            value={draft.deeplink_template}
            onChange={(event) =>
              setDraft((current) => ({
                ...current,
                deeplink_template: event.target.value,
              }))
            }
          />
        </div>

        <div className="md:col-span-2">
          <Button
            type="button"
            size="sm"
            onClick={() =>
              updateMutation.mutate({
                title: draft.title.trim(),
                message: draft.message.trim(),
                audience: draft.audience,
                link_template: draft.link_template.trim() || null,
                deeplink_template: draft.deeplink_template.trim() || null,
              })
            }
            disabled={updateMutation.status === "pending"}
          >
            <Save />
            Save automation
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function NotificationList() {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<PushAudience>("customers");
  const [link, setLink] = useState("");
  const [deeplink, setDeeplink] = useState("");
  const [scheduledAt, setScheduledAt] = useState(() =>
    toLocalDateTimeInputValue(new Date(Date.now() + 15 * 60_000)),
  );

  const campaignsQuery = useQuery({
    queryKey: ["push-notification-campaigns"],
    queryFn: getPushNotificationCampaigns,
  });
  const automationsQuery = useQuery({
    queryKey: ["push-notification-automations"],
    queryFn: getPushNotificationAutomations,
  });
  const jobsQuery = useQuery({
    queryKey: ["push-notification-jobs"],
    queryFn: getRecentPushNotificationJobs,
  });

  const createMutation = useMutation({
    mutationFn: createPushNotificationCampaign,
    onSuccess: () => {
      setTitle("");
      setMessage("");
      setLink("");
      setDeeplink("");
      setScheduledAt(toLocalDateTimeInputValue(new Date(Date.now() + 15 * 60_000)));
      queryClient.invalidateQueries({ queryKey: ["push-notification-campaigns"] });
      toast.success("Push notification scheduled");
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelPushNotificationCampaign,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["push-notification-campaigns"] });
      toast.success("Campaign cancelled");
    },
  });

  const jobSummary = useMemo(() => {
    const jobs = jobsQuery.data ?? [];
    return {
      queued: jobs.filter((job) => job.status === "queued").length,
      sent: jobs.filter((job) => job.status === "sent").length,
      failed: jobs.filter((job) => job.status === "failed").length,
    };
  }, [jobsQuery.data]);

  function handleSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    createMutation.mutate({
      title,
      message,
      audience,
      link,
      deeplink,
      scheduled_at: fromLocalDateTimeInputValue(scheduledAt),
    });
  }

  if (campaignsQuery.isLoading || automationsQuery.isLoading || jobsQuery.isLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Push Notifications</h1>
          <p className="text-sm text-muted-foreground">
            Schedule campaigns and manage automatic customer and host alerts.
          </p>
        </div>

        <div className="flex gap-2">
          <Badge variant="secondary">{jobSummary.queued} queued</Badge>
          <Badge>{jobSummary.sent} sent</Badge>
          <Badge variant={jobSummary.failed > 0 ? "destructive" : "outline"}>
            {jobSummary.failed} failed
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="compose">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="automations">Task alerts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BellRing className="size-5" />
                Schedule push notification
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSchedule} className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select
                    value={audience}
                    onValueChange={(value: PushAudience) => setAudience(value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="customers">Customers</SelectItem>
                      <SelectItem value="hosts">Hosts</SelectItem>
                      <SelectItem value="all">Customers and hosts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Schedule time</Label>
                  <Input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={(event) => setScheduledAt(event.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Title</Label>
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Weekend rentals are open"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Message</Label>
                  <Textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Send a short message that will fit on a lock screen."
                    className="min-h-28"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Web link</Label>
                  <Input
                    value={link}
                    onChange={(event) => setLink(event.target.value)}
                    placeholder="/bookings"
                  />
                </div>

                <div className="space-y-2">
                  <Label>App deeplink</Label>
                  <Input
                    value={deeplink}
                    onChange={(event) => setDeeplink(event.target.value)}
                    placeholder="velorent://bookings"
                  />
                </div>

                <div className="md:col-span-2">
                  <Button
                    type="submit"
                    disabled={createMutation.status === "pending"}
                  >
                    <CalendarClock />
                    Schedule
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="automations" className="mt-6 space-y-4">
          {(automationsQuery.data ?? []).map((automation) => (
            <AutomationRow
              key={automation.event_type}
              automation={automation}
            />
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-6 space-y-4">
          <div className="grid gap-4">
            {(campaignsQuery.data ?? []).map((campaign) => (
              <Card key={campaign.id}>
                <CardContent className="flex flex-wrap items-start justify-between gap-4 p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-semibold">{campaign.title}</h2>
                      <Badge variant={STATUS_VARIANT[campaign.status]}>
                        {campaign.status}
                      </Badge>
                      <Badge variant="outline">
                        {formatAudience(campaign.audience)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {campaign.message}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Scheduled {new Date(campaign.scheduled_at).toLocaleString()}
                      {campaign.sent_at
                        ? ` | Sent ${new Date(campaign.sent_at).toLocaleString()}`
                        : ""}
                    </p>
                    {campaign.error_message && (
                      <p className="text-xs text-destructive">
                        {campaign.error_message}
                      </p>
                    )}
                  </div>

                  {["draft", "scheduled"].includes(campaign.status) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => cancelMutation.mutate(campaign.id)}
                      disabled={cancelMutation.status === "pending"}
                    >
                      <XCircle />
                      Cancel
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}

            {(campaignsQuery.data ?? []).length === 0 && (
              <Card>
                <CardContent className="p-6 text-sm text-muted-foreground">
                  No campaigns scheduled yet.
                </CardContent>
              </Card>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="size-5" />
                Recent delivery jobs
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(jobsQuery.data ?? []).slice(0, 20).map((job) => (
                <div
                  key={job.id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b pb-3 last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{job.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {job.user_id} | {new Date(job.created_at).toLocaleString()}
                    </p>
                    {job.last_error && (
                      <p className="text-xs text-destructive">{job.last_error}</p>
                    )}
                  </div>
                  <Badge
                    variant={job.status === "failed" ? "destructive" : "outline"}
                  >
                    {job.status}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
