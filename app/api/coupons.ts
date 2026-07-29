import { supabase } from "~/lib/supabase";
import type { CreateCouponInput, UpdateCouponInput } from "~/types/coupon";

export async function uploadCouponImage({
  code,
  file,
}: {
  code: string;
  file: File | Blob;
}): Promise<string> {
  const ext = file.type.split("/")[1] || "jpg";
  const safeCode = code.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const path = `${safeCode}-${Date.now()}.${ext}`;

  const { error } = await supabase.storage
    .from("coupon-images")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("coupon-images").getPublicUrl(path);

  return data.publicUrl;
}

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

export async function createCoupon(input: CreateCouponInput) {
  const { imageFile, ...coupon } = input;
  const image_url = imageFile
    ? await uploadCouponImage({ code: coupon.code, file: imageFile })
    : coupon.image_url;

  // Extract bg_color and accent_color from input if present
  const { bg_color, accent_color } = coupon as any;

  const { error } = await supabase.from("coupons").insert({
    ...coupon,
    image_url,
    ...(bg_color !== undefined && { bg_color }),
    ...(accent_color !== undefined && { accent_color }),
  });

  if (error) {
    throw new Error(error.message);
  }

  return true;
}

export async function updateCoupon({
  id,
  imageFile,
  ...updates
}: UpdateCouponInput): Promise<boolean> {
  const image_url = imageFile
    ? await uploadCouponImage({ code: updates.code ?? id, file: imageFile })
    : updates.image_url;

  // Extract color fields separately to conditionally include them
  const { bg_color, accent_color, ...restUpdates } = updates as any;

  const { error } = await supabase
    .from("coupons")
    .update({
      ...restUpdates,
      ...(image_url !== undefined && { image_url }),
      ...(bg_color !== undefined && { bg_color }),
      ...(accent_color !== undefined && { accent_color }),
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
