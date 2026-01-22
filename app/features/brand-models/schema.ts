import { z } from "zod";

export const brandModelSchema = z
  .object({
    name: z.string().min(2, "Model name must be at least 2 characters"),

    brandId: z.string().min(1, "Brand is required"),

    image: z.string().min(1, "Model image is required"),

    minEarnAmount: z.coerce
      .number()
      .min(0, "Minimum earn amount must be 0 or more"),

    maxEarnAmount: z.coerce
      .number()
      .min(0, "Maximum earn amount must be 0 or more"),
  })
  .refine((data) => data.maxEarnAmount >= data.minEarnAmount, {
    message:
      "Maximum earn amount must be greater than or equal to minimum earn amount",
    path: ["maxEarnAmount"],
  });

export type BrandModelFormValues = z.infer<typeof brandModelSchema>;
