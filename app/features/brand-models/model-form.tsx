import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";
import type { MutationStatus } from "@tanstack/react-query";

import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Spinner } from "~/components/ui/spinner";

import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "~/components/ui/file-upload";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { brandModelSchema, type BrandModelFormValues } from "./schema";
import type { Tables } from "~/database/types";

interface BrandModelFormProps {
  brands: Tables<"car_brands">[];
  defaultValues?: {
    name: string;
    brandId: string;
    image: string;
    minEarnAmount: number;
    maxEarnAmount: number;
  };
  onSubmit: (values: BrandModelFormValues, file?: File) => void;
  status: MutationStatus;
  submitLabel?: string;
}

export function BrandModelForm({
  brands,
  defaultValues,
  onSubmit,
  status,
  submitLabel = "Save",
}: BrandModelFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const navigate = useNavigate();

  const form = useForm<BrandModelFormValues>({
    resolver: zodResolver(brandModelSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      brandId: defaultValues?.brandId ?? "",
      image: defaultValues?.image ?? "",
      minEarnAmount: 0,
      maxEarnAmount: 0,
    },
  });
  console.log(defaultValues);

  const onFileReject = useCallback((file: File, message: string) => {
    toast.error(message, { description: file.name });
  }, []);

  const handleFileChange = (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setFile(selected);
    form.setValue("image", selected.name, { shouldValidate: true });
  };

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values, file ?? undefined);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <FormField
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Model name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Fortuner"
                  {...field}
                  className="bg-card"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="brandId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="bg-card w-full">
                    <SelectValue placeholder="Select brand" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {brands.map((brand) => (
                    <SelectItem key={brand.id} value={brand.id}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            name="minEarnAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Min Earn Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Minimum amount"
                    className="bg-card"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="maxEarnAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Max Earn Amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    placeholder="Maximum amount"
                    className="bg-card"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {defaultValues?.image && (
          <div className="space-y-2">
            <FormLabel>Current image</FormLabel>
            <div className="h-20 w-32 overflow-hidden rounded-md border bg-white">
              <img
                src={defaultValues.image}
                alt={defaultValues.name}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        )}

        <FormItem>
          <FormLabel>Model image</FormLabel>

          <FileUpload
            maxFiles={1}
            maxSize={5 * 1024 * 1024}
            value={file ? [file] : []}
            onValueChange={handleFileChange}
            onFileReject={onFileReject}
            accept="image/*"
          >
            <FileUploadDropzone className="bg-card border shadow-xs cursor-pointer hover:bg-card">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="rounded-full border p-2.5">
                  <Upload className="size-5 text-muted-foreground" />
                </div>
                <p className="text-sm font-medium">Upload model image</p>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG up to 5MB
                </p>
              </div>
            </FileUploadDropzone>

            <FileUploadList>
              {file && (
                <FileUploadItem value={file} className="bg-card">
                  <FileUploadItemPreview />
                  <FileUploadItemMetadata />
                  <FileUploadItemDelete asChild>
                    <Button variant="ghost" size="icon" className="size-7">
                      <X />
                    </Button>
                  </FileUploadItemDelete>
                </FileUploadItem>
              )}
            </FileUploadList>
          </FileUpload>

          {form.formState.errors.image?.message && (
            <FormMessage>Please provide an image</FormMessage>
          )}
        </FormItem>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/models")}
          >
            Cancel
          </Button>

          <Button type="submit" disabled={status === "pending"}>
            {status === "pending" && <Spinner />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
