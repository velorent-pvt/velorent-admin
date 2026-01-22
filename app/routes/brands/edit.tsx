import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

import { getCarBrand, updateCarBrand } from "~/api/brands";
import { Loader } from "~/components/shared/Loader";
import { BrandForm } from "~/features/brands/brand-form";
import type { Route } from "./+types";

export function meta({ params }: Route.MetaArgs) {
  return [{ title: "Edit brand | Velorent" }];
}

export default function EditBrandPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const id = searchParams.get("id");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!id) {
      navigate("/brands");
    }
  }, [id, navigate]);

  const { data: brand, isLoading } = useQuery({
    queryKey: ["brand", id],
    queryFn: () => getCarBrand(id!),
    enabled: !!id,
  });

  const { mutate, status } = useMutation({
    mutationFn: updateCarBrand,
    onSuccess() {
      navigate("/brands");
      queryClient.invalidateQueries({ queryKey: ["brands"] });
      toast.success("Brand updated successfully");
    },
  });

  function handleUpdate(values: any, file?: File) {
    if (!id) return;
    mutate({
      id,
      name: values.name,
      logoFile: file,
    });
  }

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6 p-4 md:p-6 my-6">
      {isLoading ? (
        <Loader />
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-6">Edit Brand</h1>
          {brand && (
            <BrandForm
              onSubmit={handleUpdate}
              status={status}
              defaultValues={brand}
              submitLabel="Update"
            />
          )}
        </>
      )}
    </div>
  );
}
