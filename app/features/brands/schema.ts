import { z } from "zod";

export const brandSchema = z.object({
  name: z
    .string()
    .nonempty("Brand name is required")
    .min(2, "Brand name must be at least 2 characters"),

  image: z.string().nonempty("Brand image is required"),
});

export type BrandFormValues = z.infer<typeof brandSchema>;
