import type { Database } from "~/database/types";

export type CarBrand = Database["public"]["Tables"]["car_brands"]["Row"];

export type CarBrandInsert =
  Database["public"]["Tables"]["car_brands"]["Insert"];

export type CarBrandUpdate =
  Database["public"]["Tables"]["car_brands"]["Update"];

export type UploadBrandLogoInput = {
  brandName: string;
  file: File | Blob;
};

export type CreateCarBrandInput = Omit<CarBrandInsert, "logo_url"> & {
  logoFile: File | Blob;
};

export type UpdateCarBrandInput = {
  id: string;
  logoFile?: File | Blob;
} & CarBrandUpdate;
