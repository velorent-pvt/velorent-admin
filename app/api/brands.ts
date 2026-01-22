import { supabase } from "~/lib/supabase";
import type {
  CarBrand,
  CreateCarBrandInput,
  UpdateCarBrandInput,
  UploadBrandLogoInput,
} from "~/types/brands";

export async function uploadBrandLogo({
  brandName,
  file,
}: UploadBrandLogoInput): Promise<string> {
  const fileExt = file.type.split("/")[1];
  const filePath = `${brandName.toLowerCase()}-logo.${fileExt}`;

  const { error } = await supabase.storage
    .from("car-brand-logos")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage
    .from("car-brand-logos")
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function createCarBrand(
  input: CreateCarBrandInput
): Promise<CarBrand> {
  const { name, logoFile } = input;

  const logo_url = await uploadBrandLogo({
    brandName: name,
    file: logoFile,
  });

  const { data, error } = await supabase
    .from("car_brands")
    .insert({
      name,
      logo_url,
    })
    .select()
    .single<CarBrand>();

  if (error) throw error;

  return data;
}

export async function updateCarBrand({
  id,
  logoFile,
  ...updates
}: UpdateCarBrandInput): Promise<CarBrand> {
  let logo_url: string | undefined;

  if (updates.name && logoFile) {
    logo_url = await uploadBrandLogo({
      brandName: updates.name,
      file: logoFile,
    });
  }

  const { data, error } = await supabase
    .from("car_brands")
    .update({
      ...updates,
      ...(logo_url && { logo_url }),
    })
    .eq("id", id)
    .select()
    .single<CarBrand>();

  if (error) throw error;

  return data;
}

export async function getCarBrands(): Promise<CarBrand[]> {
  const { data, error } = await supabase
    .from("car_brands")
    .select("*")
    .order("name");

  if (error) throw error;

  return data as CarBrand[];
}

export async function getCarBrand(id: CarBrand["id"]): Promise<CarBrand> {
  const { data, error } = await supabase
    .from("car_brands")
    .select("*")
    .eq("id", id)
    .single<CarBrand>();

  if (error) throw error;

  return data;
}

export async function deleteCarBrand(id: CarBrand["id"]): Promise<boolean> {
  const { data, error } = await supabase
    .from("car_brands")
    .select("logo_url")
    .eq("id", id)
    .single();

  if (error) throw error;

  if (data?.logo_url) {
    const path = data.logo_url.split("/car-brand-logos/")[1];
    if (path) {
      await supabase.storage.from("car-brand-logos").remove([path]);
    }
  }

  const { error: deleteError } = await supabase
    .from("car_brands")
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;

  return true;
}
