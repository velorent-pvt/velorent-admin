import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { getCouponById, updateCoupon } from "~/api/coupons";
import { Loader } from "~/components/shared/Loader";
import { CouponForm } from "~/features/coupons/coupon-form";
import type { CouponFormValues } from "~/features/coupons/schema";
import type { Route } from "./+types";

export function meta({}: Route.MetaArgs) {
  return [{ title: "Edit coupon | Velorent" }];
}

export default function EditCouponPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) {
      navigate("/coupons");
    }
  }, [id, navigate]);

  const { data: coupon, isLoading } = useQuery({
    queryKey: ["coupon", id],
    queryFn: () => getCouponById(id!),
    enabled: !!id,
  });

  const { mutate, status } = useMutation({
    mutationFn: updateCoupon,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["coupons"] });
      queryClient.invalidateQueries({ queryKey: ["coupon", id] });
      toast.success("Coupon updated successfully");
      navigate("/coupons");
    },
  });

  function handleUpdate(values: CouponFormValues) {
    if (!id) return;

    mutate({
      id,
      ...values,
    });
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">Edit Coupon</h1>

          {coupon && (
            <CouponForm
              defaultValues={coupon}
              onSubmit={handleUpdate}
              status={status}
              submitLabel="Update"
            />
          )}
        </>
      )}
    </div>
  );
}
