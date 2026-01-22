import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useState } from "react";
import { Upload, X } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router";

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

import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "~/components/ui/file-upload";

import { brandSchema, type BrandFormValues } from "./schema";
import type { MutationStatus } from "@tanstack/react-query";
import { Spinner } from "~/components/ui/spinner";

interface BrandFormProps {
  defaultValues?: {
    name: string;
    logo_url: string;
  };
  onSubmit: (values: BrandFormValues, file?: File) => void;
  status: MutationStatus;
  submitLabel?: string;
}

export function BrandForm({
  defaultValues,
  onSubmit,
  status,
  submitLabel = "Save",
}: BrandFormProps) {
  const [file, setFile] = useState<File | null>(null);

  const navigate = useNavigate();

  const form = useForm<BrandFormValues>({
    resolver: zodResolver(brandSchema),
    defaultValues: {
      name: defaultValues?.name ?? "",
      image: defaultValues?.logo_url ?? "",
    },
  });

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
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Brand name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g. Toyota"
                  {...field}
                  className="bg-card"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {defaultValues?.logo_url && (
          <div className="space-y-2">
            <FormLabel>Current logo</FormLabel>

            <div className="h-20 w-20 overflow-hidden rounded-md border bg-white">
              <img
                src={defaultValues.logo_url}
                alt={`${defaultValues.name} logo`}
                className="h-full w-full object-contain"
              />
            </div>
          </div>
        )}

        <FormItem>
          <FormLabel>Brand logo</FormLabel>

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
                <p className="text-sm font-medium">Upload brand logo</p>
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
            <FormMessage>Please provide a logo</FormMessage>
          )}
        </FormItem>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/brands")}
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
