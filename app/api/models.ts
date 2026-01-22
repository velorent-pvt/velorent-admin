import { supabase } from "~/lib/supabase";

import type {
  CarModel,
  CreateCarModelInput,
  UpdateCarModelInput,
  UploadCarModelImageInput,
} from "~/types/models";

export async function uploadCarModelImage({
  brandId,
  modelName,
  file,
}: UploadCarModelImageInput): Promise<string> {
  const ext = file.type.split("/")[1];
  const safeName = modelName.toLowerCase().replace(/\s+/g, "-");
  const path = `${brandId}-${safeName}.${ext}`;

  const { error } = await supabase.storage
    .from("car-model-images")
    .upload(path, file, {
      upsert: true,
      contentType: file.type,
    });

  if (error) throw error;

  const { data } = supabase.storage.from("car-model-images").getPublicUrl(path);

  return data.publicUrl;
}

export async function createCarModel(
  input: CreateCarModelInput
): Promise<CarModel> {
  const { brand_id, name, min_earn_amount, max_earn_amount, imageFile } = input;

  let image_url: string | null = null;

  if (imageFile) {
    image_url = await uploadCarModelImage({
      brandId: brand_id,
      modelName: name,
      file: imageFile,
    });
  }

  const { data, error } = await supabase
    .from("car_models")
    .insert({
      brand_id,
      name,
      min_earn_amount,
      max_earn_amount,
      image_url,
    })
    .select()
    .single<CarModel>();

  if (error) throw error;

  return data;
}

export async function getCarModels(brand_id?: string): Promise<CarModel[]> {
  let query = supabase
    .from("car_models")
    .select(
      `
      id,
      brand_id,
      name,
      image_url,
      min_earn_amount,
      max_earn_amount,
      created_at,
      updated_at,
      car_brands (
        name
      )
    `
    )
    .order("name");

  if (brand_id) {
    query = query.eq("brand_id", brand_id);
  }

  const { data, error } = await query;

  if (error) throw error;
  return data;
}

export async function updateCarModel({
  id,
  brand_id,
  imageFile,
  ...updates
}: UpdateCarModelInput): Promise<CarModel> {
  let image_url: string | undefined;

  if (imageFile && updates.name) {
    image_url = await uploadCarModelImage({
      brandId: brand_id,
      modelName: updates.name,
      file: imageFile,
    });
  }

  const { data, error } = await supabase
    .from("car_models")
    .update({
      ...updates,
      ...(image_url && { image_url }),
    })
    .eq("id", id)
    .select()
    .single<CarModel>();

  if (error) throw error;

  return data;
}

export async function deleteCarModel(id: CarModel["id"]): Promise<boolean> {
  const { data, error } = await supabase
    .from("car_models")
    .select("image_url")
    .eq("id", id)
    .single();

  if (error) throw error;

  if (data?.image_url) {
    const path = data.image_url.split("/car-model-images/")[1];
    if (path) {
      await supabase.storage.from("car-model-images").remove([path]);
    }
  }

  const { error: deleteError } = await supabase
    .from("car_models")
    .delete()
    .eq("id", id);

  if (deleteError) throw deleteError;

  return true;
}
export async function getCarModelById(id: string): Promise<CarModel | null> {
  const { data, error } = await supabase
    .from("car_models")
    .select(
      `
      id,
      brand_id,
      name,
      image_url,
      min_earn_amount,
      max_earn_amount
    `
    )
    .eq("id", id)
    .single<CarModel>();

  if (error) throw error;

  return data;
}
