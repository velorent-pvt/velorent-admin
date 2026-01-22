import type { Database } from "~/database/types";

export type Coupon = Database["public"]["Tables"]["coupons"]["Row"];

export type CouponInsert = Database["public"]["Tables"]["coupons"]["Insert"];

export type CouponUpdate = Database["public"]["Tables"]["coupons"]["Update"];
