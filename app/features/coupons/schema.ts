import { z } from "zod";

export const couponSchema = z.object({
  title: z.string().min(1, "Coupon title is required"),
  code: z.string().min(3, "Coupon code is required"),
  description: z.string().optional(),
  image_url: z.string().optional(),
  bg_color: z.string().optional(),
  accent_color: z.string().optional(),
  discount_type: z.enum(["percentage", "flat"]),
  discount_value: z.number().positive("Discount must be greater than 0"),
  min_booking_amount: z.number().optional(),
  per_customer_limit: z.number().optional(),
  start_date: z.string().min(1, "Start date is required"),
  end_date: z.string().min(1, "End date is required"),
  is_active: z.boolean().optional(),
});

export type CouponFormValues = z.infer<typeof couponSchema>;
