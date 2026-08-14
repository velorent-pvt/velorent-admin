import { createClient } from "npm:@supabase/supabase-js@2";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
  serve(handler: (req: Request) => Response | Promise<Response>): void;
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const BATCH_SIZE = 100;

type PushJob = {
  id: string;
  user_id: string;
  title: string;
  message: string;
  link: string | null;
  deeplink: string | null;
};

type Profile = {
  id: string;
  expo_push_token: string | null;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isExpoToken(token: string | null | undefined) {
  return Boolean(token && /^ExponentPushToken\[[^\]]+\]$/.test(token));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Missing Supabase environment" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { error: campaignError } = await supabase.rpc(
    "enqueue_due_push_notification_campaigns",
  );

  if (campaignError) {
    return jsonResponse({ error: campaignError.message }, 500);
  }

  const { data: jobs, error: jobsError } = await supabase
    .from("push_notification_jobs")
    .select("id, user_id, title, message, link, deeplink")
    .eq("status", "queued")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (jobsError) {
    return jsonResponse({ error: jobsError.message }, 500);
  }

  const queuedJobs = (jobs ?? []) as PushJob[];

  if (queuedJobs.length === 0) {
    return jsonResponse({ processed: 0, sent: 0, failed: 0 });
  }

  const profileIds = [...new Set(queuedJobs.map((job) => job.user_id))];
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, expo_push_token")
    .in("id", profileIds);

  if (profilesError) {
    return jsonResponse({ error: profilesError.message }, 500);
  }

  const tokenByUserId = new Map(
    ((profiles ?? []) as Profile[]).map((profile) => [
      profile.id,
      profile.expo_push_token,
    ]),
  );

  let sent = 0;
  let failed = 0;

  await Promise.all(
    queuedJobs.map(async (job) => {
      const token = tokenByUserId.get(job.user_id);

      if (!isExpoToken(token)) {
        failed += 1;
        await supabase
          .from("push_notification_jobs")
          .update({
            status: "failed",
            attempts: 1,
            last_error: "Missing or invalid Expo push token",
          })
          .eq("id", job.id);
        return;
      }

      const payload = {
        to: token,
        title: job.title,
        body: job.message,
        sound: "default",
        data: {
          link: job.link,
          deeplink: job.deeplink,
          notificationId: job.id,
        },
      };

      try {
        const response = await fetch(EXPO_PUSH_URL, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        const body = await response.json().catch(() => null);

        if (!response.ok || body?.data?.status === "error") {
          throw new Error(
            body?.data?.message ?? body?.errors?.[0]?.message ?? "Expo push failed",
          );
        }

        sent += 1;
        await supabase
          .from("push_notification_jobs")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: 1,
            last_error: null,
          })
          .eq("id", job.id);
      } catch (error) {
        failed += 1;
        await supabase
          .from("push_notification_jobs")
          .update({
            status: "failed",
            attempts: 1,
            last_error:
              error instanceof Error ? error.message : "Unknown push error",
          })
          .eq("id", job.id);
      }
    }),
  );

  return jsonResponse({ processed: queuedJobs.length, sent, failed });
});
