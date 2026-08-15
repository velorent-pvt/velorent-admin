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
  device_id: string | null;
  title: string;
  message: string;
  link: string | null;
  deeplink: string | null;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function isExpoToken(token: string | null | undefined) {
  return Boolean(token && /^ExponentPushToken\[[^\]]+\]$/.test(token));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed",
      },
      405,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse(
      {
        error: "Missing Supabase environment",
      },
      500,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  /*
   * 1. Convert due campaigns into push jobs
   */
  const { error: campaignError } = await supabase.rpc(
    "enqueue_due_push_notification_campaigns",
  );

  if (campaignError) {
    return jsonResponse(
      {
        error: campaignError.message,
      },
      500,
    );
  }

  /*
   * 2. Get queued jobs
   */
  const { data: jobs, error: jobsError } = await supabase
    .from("push_notification_jobs")
    .select("id, user_id, device_id, title, message, link, deeplink")
    .eq("status", "queued")
    .lte("scheduled_at", new Date().toISOString())
    .order("scheduled_at", {
      ascending: true,
    })
    .limit(BATCH_SIZE);

  if (jobsError) {
    return jsonResponse(
      {
        error: jobsError.message,
      },
      500,
    );
  }

  const queuedJobs = (jobs ?? []) as PushJob[];

  if (queuedJobs.length === 0) {
    return jsonResponse({
      processed: 0,
      sent: 0,
      failed: 0,
    });
  }

  /*
   * 3. Get devices referenced by the jobs
   */
  const deviceIds = [
    ...new Set(
      queuedJobs
        .map((job) => job.device_id)
        .filter((deviceId): deviceId is string => Boolean(deviceId)),
    ),
  ];

  if (deviceIds.length === 0) {
    return jsonResponse({
      processed: queuedJobs.length,
      sent: 0,
      failed: queuedJobs.length,
    });
  }

  /*
   * 4. Get Expo tokens from push_devices
   */
  const { data: devices, error: devicesError } = await supabase
    .from("push_devices")
    .select("id, expo_push_token")
    .in("id", deviceIds);

  if (devicesError) {
    return jsonResponse(
      {
        error: devicesError.message,
      },
      500,
    );
  }

  const tokenByDeviceId = new Map<string, string>();

  for (const device of devices ?? []) {
    if (device.expo_push_token) {
      tokenByDeviceId.set(device.id, device.expo_push_token);
    }
  }

  let sent = 0;
  let failed = 0;

  /*
   * 5. Send notifications
   */
  for (const job of queuedJobs) {
    if (!job.device_id) {
      failed++;

      await supabase
        .from("push_notification_jobs")
        .update({
          status: "failed",
          attempts: 1,
          last_error: "Push device ID is missing",
        })
        .eq("id", job.id);

      continue;
    }

    const token = tokenByDeviceId.get(job.device_id);

    if (!isExpoToken(token)) {
      failed++;

      await supabase
        .from("push_notification_jobs")
        .update({
          status: "failed",
          attempts: 1,
          last_error: "Missing or invalid Expo push token",
        })
        .eq("id", job.id);

      continue;
    }

    const payload = {
      to: token,
      title: job.title,
      body: job.message,
      sound: "default",
      priority: "high",
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
          body?.data?.message ??
            body?.errors?.[0]?.message ??
            "Expo push failed",
        );
      }

      const ticketId = body?.data?.id;

      if (!ticketId) {
        throw new Error("Expo did not return a ticket ID");
      }

      sent++;

      await supabase
        .from("push_notification_jobs")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
          attempts: 1,
          last_error: null,
          expo_ticket_id: ticketId,
        })
        .eq("id", job.id);
    } catch (error) {
      failed++;

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
  }

  return jsonResponse({
    processed: queuedJobs.length,
    sent,
    failed,
  });
});
