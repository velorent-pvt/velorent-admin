import type { Route } from "../+types";
import { CouponList } from "~/features/coupons/coupon-list";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "Coupons | Velorent" }];
}

export default function Coupons() {
  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <CouponList />
    </div>
  );
}
