import { supabase } from "~/lib/supabase";

export const ALLOWED_MINIMUM_BOOKING_HOURS = [6, 12, 24] as const;
export type MinimumBookingHours = (typeof ALLOWED_MINIMUM_BOOKING_HOURS)[number];

export async function getBookingSettings(): Promise<{ minimumBookingHours: MinimumBookingHours }> {
  const { data, error } = await supabase.from("booking_settings").select("minimum_booking_hours").eq("id", true).maybeSingle();
  if (error) throw error;
  const value = Number(data?.minimum_booking_hours);
  return { minimumBookingHours: value === 12 || value === 24 ? value : 6 };
}

export async function updateMinimumBookingHours(hours: MinimumBookingHours) {
  if (!ALLOWED_MINIMUM_BOOKING_HOURS.includes(hours)) throw new Error("Choose 6, 12, or 24 hours.");
  const { error } = await supabase.from("booking_settings").update({ minimum_booking_hours: hours, updated_at: new Date().toISOString() }).eq("id", true);
  if (error) throw error;
}
