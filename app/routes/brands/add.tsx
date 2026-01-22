import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { createCarBrand } from "~/api/brands";
import { BrandForm } from "~/features/brands/brand-form";
import type { Route } from "../+types";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "New brand | Velorent" }];
}

export default function AddBrandPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { mutate, status } = useMutation({
    mutationFn: createCarBrand,

    onSuccess() {
      navigate("/brands");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand added successfully");
    },
  });

  function handleSubmit(values: any, file?: File) {
    if (!file) return;
    mutate({ name: values.name, logoFile: file });
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      <h1 className="text-3xl font-bold mb-6">Add Brand</h1>

      <BrandForm onSubmit={handleSubmit} status={status} />
    </div>
  );
}
