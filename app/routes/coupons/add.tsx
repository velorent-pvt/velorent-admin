import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";

import { createCoupon } from "~/api/coupons";
import { CouponForm } from "~/features/coupons/coupon-form";
import type { Route } from "../+types";

export function meta({}: Route.MetaArgs) {
  return [{ title: "New coupon | Velorent" }];
}

export default function AddCouponPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, status } = useMutation({
    mutationFn: createCoupon,

    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      toast.success("Coupon added successfully");
      navigate("/coupons");
    },
  });

  function handleSubmit(values: any) {
    mutate(values);
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <h1 className="text-3xl font-bold mb-6">Add Coupon</h1>

      <CouponForm onSubmit={handleSubmit} status={status} />
    </div>
  );
}
