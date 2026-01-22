import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { getCarBrands } from "~/api/brands";
import { getCarModelById, getCarModels, updateCarModel } from "~/api/models";
import { Loader } from "~/components/shared/Loader";
import { BrandModelForm } from "~/features/brand-models/model-form";

export default function EditModelPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) navigate("/models");
  }, [id, navigate]);

  const { data: model, isLoading } = useQuery({
    queryKey: ["model", id],
    queryFn: () => getCarModelById(id),
    enabled: !!id,
  });

  const { data: brands = [], isLoading: isBrandsLoading } = useQuery({
    queryKey: ["brands"],
    queryFn: getCarBrands,
  });

  const { mutate, status } = useMutation({
    mutationFn: updateCarModel,
    onSuccess() {
      queryClient.invalidateQueries({ queryKey: ["models"] });
      navigate("/models");
      toast.success("Model updated successfully");
    },
  });

  function handleUpdate(values: any, file?: File) {
    if (!id) return;

    mutate({
      id,
      name: values.name,
      brand_id: values.brandId,
      image_url: values.image,
      min_earn_amount: values.minEarnAmount,
      max_earn_amount: values.maxEarnAmount,
    });
  }

  if (isLoading || isBrandsLoading) return <Loader />;

  if (!model) return null;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <h1 className="text-3xl font-bold mb-6">Edit Model</h1>

      <BrandModelForm
        brands={brands}
        onSubmit={handleUpdate}
        status={status}
        defaultValues={{
          name: model.name,
          brandId: model.brand_id,
          image: model.image_url ?? "",
          minEarnAmount: model.min_earn_amount,
          maxEarnAmount: model.max_earn_amount,
        }}
        submitLabel="Update"
      />
    </div>
  );
}
