import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const projectUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const vapidSubject = Deno.env.get("VAPID_SUBJECT") ?? "mailto:admin@example.com";
const admin = createClient(projectUrl, serviceRoleKey, { auth: { persistSession: false } });

function nextOccurrence(row: Record<string, any>) {
  if (row.repeat_type === "none") return null;
  const next = new Date(row.next_at);
  const value = Math.max(1, Number(row.interval_value) || 1);
  if (row.repeat_type === "daily") next.setUTCDate(next.getUTCDate() + 1);
  else if (row.repeat_type === "weekly") next.setUTCDate(next.getUTCDate() + 7);
  else if (row.repeat_type === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
  else if (row.interval_unit === "weeks") next.setUTCDate(next.getUTCDate() + value * 7);
  else if (row.interval_unit === "months") next.setUTCMonth(next.getUTCMonth() + value);
  else next.setUTCDate(next.getUTCDate() + value);
  while (next.getTime() <= Date.now()) {
    if (row.repeat_type === "daily") next.setUTCDate(next.getUTCDate() + 1);
    else if (row.repeat_type === "weekly") next.setUTCDate(next.getUTCDate() + 7);
    else if (row.repeat_type === "monthly") next.setUTCMonth(next.getUTCMonth() + 1);
    else if (row.interval_unit === "weeks") next.setUTCDate(next.getUTCDate() + value * 7);
    else if (row.interval_unit === "months") next.setUTCMonth(next.getUTCMonth() + value);
    else next.setUTCDate(next.getUTCDate() + value);
  }
  return next.toISOString();
}

async function userFromRequest(req: Request) {
  const authorization = req.headers.get("Authorization") ?? "";
  const client = createClient(projectUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false },
  });
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

function isPhoneUserAgent(value: unknown) {
  const userAgent = String(value ?? "");
  return /iPhone|iPod/i.test(userAgent) || (/Android/i.test(userAgent) && /Mobile/i.test(userAgent));
}

async function sendToUser(userId: string, payload: Record<string, unknown>) {
  const { data: subscriptions, error } = await admin.from("hon_push_subscriptions").select("*").eq("user_id", userId).eq("active", true);
  if (error) throw error;
  let sent = 0;
  for (const subscription of subscriptions ?? []) {
    if (!isPhoneUserAgent(subscription.user_agent)) {
      await admin.from("hon_push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", subscription.id);
      continue;
    }
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, JSON.stringify(payload));
      sent += 1;
    } catch (error: any) {
      if ([404, 410].includes(error?.statusCode)) await admin.from("hon_push_subscriptions").update({ active: false, updated_at: new Date().toISOString() }).eq("id", subscription.id);
      else console.error("push failed", error);
    }
  }
  return sent;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (!vapidPublicKey || !vapidPrivateKey) return json({ error: "VAPID secrets are missing" }, 503);
  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const action = new URL(req.url).searchParams.get("action") ?? "";

  if (action === "vapid") {
    const user = await userFromRequest(req);
    return user ? json({ publicKey: vapidPublicKey }) : json({ error: "Unauthorized" }, 401);
  }

  if (action === "test") {
    const user = await userFromRequest(req);
    if (!user) return json({ error: "Unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const sent = await sendToUser(user.id, { title: body.title ?? "HON · בדיקת התראה", body: body.body ?? "ההתראות פועלות.", tag: "hon-test", url: "./" });
    return json({ sent });
  }

  if (action !== "dispatch" || !cronSecret || req.headers.get("X-Cron-Secret") !== cronSecret) return json({ error: "Unauthorized" }, 401);
  const now = new Date().toISOString();
  const { data: reminders, error } = await admin.from("hon_reminders").select("*").eq("active", true).lte("next_at", now).order("next_at").limit(250);
  if (error) return json({ error: error.message }, 500);

  let sent = 0;
  for (const reminder of reminders ?? []) {
    sent += await sendToUser(reminder.user_id, { title: reminder.title, body: reminder.body || "הגיע הזמן לתזכורת שלך", reminderId: reminder.id, tag: `hon-${reminder.id}`, url: "./" });
    const nextAt = nextOccurrence(reminder);
    await admin.from("hon_reminders").update(nextAt ? { next_at: nextAt, updated_at: now } : { active: false, updated_at: now }).eq("user_id", reminder.user_id).eq("id", reminder.id);
  }
  return json({ processed: reminders?.length ?? 0, sent });
});
