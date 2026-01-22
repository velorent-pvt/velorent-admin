import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getCarBrands } from "~/api/brands";
import { Loader } from "~/components/shared/Loader";
import { BrandModelForm } from "~/features/brand-models/model-form";
import { createCarModel } from "~/api/models";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { BrandModelFormValues } from "~/features/brand-models/schema";

export default function AddBrandModelPage() {
  const { data: brands, isLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: getCarBrands,
  });

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, status } = useMutation({
    mutationFn: createCarModel,

    onSuccess() {
      navigate("/models");
      queryClient.invalidateQueries({ queryKey: ["models"] });
      toast.success("Model added successfully");
    },
  });

  function handleSubmit(values: BrandModelFormValues, file?: File) {
    mutate({
      name: values.name,
      brand_id: values.brandId,
      min_earn_amount: values.minEarnAmount,
      max_earn_amount: values.maxEarnAmount,
      imageFile: file,
    });
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <h1 className="text-3xl font-bold mb-6">Add Model</h1>

      {isLoading ? (
        <Loader />
      ) : (
        <BrandModelForm
          brands={brands ?? []}
          onSubmit={handleSubmit}
          status={status}
        />
      )}
    </div>
  );
}
