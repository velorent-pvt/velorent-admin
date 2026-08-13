import { supabase } from "~/lib/supabase";

export const PUSH_AUDIENCES = ["customers", "hosts", "all"] as const;
export const AUTOMATION_AUDIENCES = ["customer", "host", "both"] as const;

export type PushAudience = (typeof PUSH_AUDIENCES)[number];
export type AutomationAudience = (typeof AUTOMATION_AUDIENCES)[number];

export type PushNotificationCampaign = {
  id: string;
  title: string;
  message: string;
  audience: PushAudience;
  link: string | null;
  deeplink: string | null;
  scheduled_at: string;
  status: "draft" | "scheduled" | "processing" | "sent" | "cancelled" | "failed";
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sent_at: string | null;
  error_message: string | null;
};

export type PushNotificationAutomation = {
  event_type: string;
  title: string;
  message: string;
  audience: AutomationAudience;
  link_template: string | null;
  deeplink_template: string | null;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type PushNotificationJob = {
  id: string;
  campaign_id: string | null;
  user_id: string;
  title: string;
  message: string;
  status: "queued" | "sent" | "failed";
  attempts: number;
  last_error: string | null;
  scheduled_at: string;
  created_at: string;
  sent_at: string | null;
};

export async function getAllNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getUnreadNotifications(userId: string) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .eq("is_read", false)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getPushNotificationCampaigns(): Promise<
  PushNotificationCampaign[]
> {
  const { data, error } = await supabase
    .from("push_notification_campaigns")
    .select("*")
    .order("scheduled_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PushNotificationCampaign[];
}

export async function getPushNotificationAutomations(): Promise<
  PushNotificationAutomation[]
> {
  const { data, error } = await supabase
    .from("push_notification_automations")
    .select("*")
    .order("event_type", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PushNotificationAutomation[];
}

export async function getRecentPushNotificationJobs(): Promise<
  PushNotificationJob[]
> {
  const { data, error } = await supabase
    .from("push_notification_jobs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw error;
  return (data ?? []) as PushNotificationJob[];
}

export type CreatePushNotificationCampaignInput = {
  title: string;
  message: string;
  audience: PushAudience;
  link?: string;
  deeplink?: string;
  scheduled_at: string;
};

export async function createPushNotificationCampaign(
  input: CreatePushNotificationCampaignInput,
) {
  const { error } = await supabase.from("push_notification_campaigns").insert({
    title: input.title.trim(),
    message: input.message.trim(),
    audience: input.audience,
    link: input.link?.trim() || null,
    deeplink: input.deeplink?.trim() || null,
    scheduled_at: input.scheduled_at,
    status: "scheduled",
  });

  if (error) throw error;

  const { error: enqueueError } = await supabase.rpc(
    "enqueue_due_push_notification_campaigns",
  );

  if (enqueueError) throw enqueueError;

  const { error: pushError } = await supabase.functions.invoke(
    "send-push-notifications",
    {
      method: "POST",
    },
  );

  if (pushError) throw pushError;
}

export async function cancelPushNotificationCampaign(id: string) {
  const { error } = await supabase
    .from("push_notification_campaigns")
    .update({ status: "cancelled" })
    .eq("id", id)
    .in("status", ["draft", "scheduled"]);

  if (error) throw error;
}

export async function updatePushNotificationAutomation(
  eventType: string,
  updates: Partial<
    Pick<
      PushNotificationAutomation,
      | "title"
      | "message"
      | "audience"
      | "link_template"
      | "deeplink_template"
      | "is_enabled"
    >
  >,
) {
  const { error } = await supabase
    .from("push_notification_automations")
    .update(updates)
    .eq("event_type", eventType);

  if (error) throw error;
}
