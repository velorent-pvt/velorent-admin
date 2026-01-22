import { supabase } from "~/lib/supabase";
import type { CouponInsert, CouponUpdate } from "~/types/coupon";

export async function getAllCoupons() {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching coupons:", error);
    throw error;
  }

  return data;
}

export async function getCouponById(id: string) {
  const { data, error } = await supabase
    .from("coupons")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    console.error("Error fetching coupon:", error);
    throw error;
  }

  return data;
}

export async function createCoupon(input: CouponInsert) {
  const { error } = await supabase.from("coupons").insert(input);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function updateCoupon({
  id,
  ...updates
}: {
  id: string;
} & CouponUpdate): Promise<boolean> {
  const { error } = await supabase
    .from("coupons")
    .update({
      ...updates,
    })
    .eq("id", id);

  if (error) {
    throw error;
  }

  return true;
}

export async function deleteCoupon(id: string) {
  const { error } = await supabase.from("coupons").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  return true;
}
