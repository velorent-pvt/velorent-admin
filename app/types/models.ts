import type { Database } from "~/database/types";

export type CarModel = Database["public"]["Tables"]["car_models"]["Row"];

export type CarModelInsert =
  Database["public"]["Tables"]["car_models"]["Insert"];

export type CarModelUpdate =
  Database["public"]["Tables"]["car_models"]["Update"];

export type UploadCarModelImageInput = {
  brandId: string;
  modelName: string;
  file: File | Blob;
};

export type CreateCarModelInput = Omit<CarModelInsert, "image_url"> & {
  imageFile?: File | Blob;
};

export type UpdateCarModelInput = {
  id: string;
  brand_id: string;
  imageFile?: File | Blob;
} & CarModelUpdate;
