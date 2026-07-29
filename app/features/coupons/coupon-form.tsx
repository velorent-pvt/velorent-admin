import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

import { extractImageColors } from "~/lib/extract-image-color";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
import { Textarea } from "~/components/ui/textarea";
import { Button } from "~/components/ui/button";
import { Spinner } from "~/components/ui/spinner";
import type { MutationStatus } from "@tanstack/react-query";

import { couponSchema, type CouponFormValues } from "./schema";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { DatePicker } from "~/components/ui/date-picker";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadItem,
  FileUploadItemDelete,
  FileUploadItemMetadata,
  FileUploadItemPreview,
  FileUploadList,
} from "~/components/ui/file-upload";

interface CouponFormProps {
  defaultValues?: Partial<CouponFormValues>;
  onSubmit: (values: CouponFormValues, file?: File) => void;
  status: MutationStatus;
  submitLabel?: string;
}

export function CouponForm({
  defaultValues,
  onSubmit,
  status,
  submitLabel = "Save",
}: CouponFormProps) {
  const [file, setFile] = useState<File | null>(null);
  const [extractedColors, setExtractedColors] = useState<{
    bgColor: string;
    accentColor: string;
  } | null>(
    (defaultValues as any)?.bg_color && (defaultValues as any)?.accent_color
      ? {
          bgColor: (defaultValues as any).bg_color as string,
          accentColor: (defaultValues as any).accent_color as string,
        }
      : null,
  );
  const [isExtractingColor, setIsExtractingColor] = useState(false);
  const colorExtractionRef = useRef<AbortController | null>(null);
  const navigate = useNavigate();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      title: defaultValues?.title ?? "",
      code: defaultValues?.code ?? "",
      description: defaultValues?.description ?? "",
      image_url: defaultValues?.image_url ?? "",
      bg_color: (defaultValues as any)?.bg_color ?? undefined,
      accent_color: (defaultValues as any)?.accent_color ?? undefined,
      discount_type: defaultValues?.discount_type ?? "percentage",
      discount_value: defaultValues?.discount_value ?? 0,
      min_booking_amount: defaultValues?.min_booking_amount,
      per_customer_limit: defaultValues?.per_customer_limit,
      start_date: defaultValues?.start_date ?? "",
      end_date: defaultValues?.end_date ?? "",
      is_active: defaultValues?.is_active ?? true,
    },
  });

  const onFileReject = useCallback((file: File, message: string) => {
    toast.error(message, { description: file.name });
  }, []);

  const handleFileChange = (files: File[]) => {
    const selected = files[0];
    if (!selected) return;

    setFile(selected);
    form.setValue("image_url", selected.name, { shouldValidate: true });

    // Cancel any in-flight color extraction
    colorExtractionRef.current?.abort();
    const controller = new AbortController();
    colorExtractionRef.current = controller;

    setIsExtractingColor(true);
    setExtractedColors(null);

    extractImageColors(selected).then((colors) => {
      if (controller.signal.aborted) return;
      setExtractedColors(colors);
      form.setValue("bg_color", colors.bgColor);
      form.setValue("accent_color", colors.accentColor);
      setIsExtractingColor(false);
    });
  };

  const handleSubmit = form.handleSubmit((values) => {
    onSubmit(values, file ?? undefined);
  });

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
        <FormField
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  placeholder="Weekend drive offer"
                  {...field}
                  className="bg-card"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Coupon code</FormLabel>
              <FormControl>
                <Input
                  placeholder="SAVE20"
                  {...field}
                  className="bg-card uppercase"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Short details shown with this coupon"
                  {...field}
                  className="min-h-24 bg-card"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="discount_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount type</FormLabel>

              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger className="w-full bg-card">
                    <SelectValue placeholder="Select discount type" />
                  </SelectTrigger>
                </FormControl>

                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="flat">Flat amount</SelectItem>
                </SelectContent>
              </Select>

              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="discount_value"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Discount value</FormLabel>
              <FormControl>
                <Input
                  className="bg-card"
                  placeholder="20"
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="min_booking_amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Minimum booking amount</FormLabel>
              <FormControl>
                <Input
                  className="bg-card"
                  type="number"
                  placeholder="Optional"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          name="per_customer_limit"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Per customer usage limit</FormLabel>
              <FormControl>
                <Input
                  className="bg-card"
                  type="number"
                  placeholder="Optional"
                  {...field}
                  onChange={(e) =>
                    field.onChange(
                      e.target.value ? Number(e.target.value) : undefined,
                    )
                  }
                />
              </FormControl>
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            name="start_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="Start date"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            name="end_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End date</FormLabel>
                <FormControl>
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                    placeholder="End date"
                    minDate={
                      form.watch("start_date")
                        ? new Date(form.watch("start_date"))
                        : undefined
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {defaultValues?.image_url && (
          <div className="space-y-2">
            <FormLabel>Current image</FormLabel>
            <div className="h-24 w-40 overflow-hidden rounded-md border bg-white">
              <img
                src={defaultValues.image_url}
                alt={defaultValues.title ?? defaultValues.code ?? "Coupon"}
                className="h-full w-full object-cover"
              />
            </div>
          </div>
        )}

        <FormItem>
          <FormLabel>Coupon image</FormLabel>

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
                <p className="text-sm font-medium">Upload coupon image</p>
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

          {/* Color preview swatch */}
          {isExtractingColor && (
            <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              Extracting colors…
            </div>
          )}

          {extractedColors && !isExtractingColor && (
            <div className="mt-3 space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">
                Extracted colors (used for offer card)
              </p>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <div
                    className="size-8 rounded-md border shadow-sm"
                    style={{ backgroundColor: extractedColors.bgColor }}
                    title={extractedColors.bgColor}
                  />
                  <span className="text-xs text-muted-foreground">
                    Background
                    <br />
                    <span className="font-mono">{extractedColors.bgColor}</span>
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <div
                    className="size-8 rounded-md border shadow-sm"
                    style={{ backgroundColor: extractedColors.accentColor }}
                    title={extractedColors.accentColor}
                  />
                  <span className="text-xs text-muted-foreground">
                    Accent
                    <br />
                    <span className="font-mono">
                      {extractedColors.accentColor}
                    </span>
                  </span>
                </div>

                {/* Mini card preview */}
                <div
                  className="ml-4 flex h-10 items-center gap-2 rounded-lg border px-3"
                  style={{ backgroundColor: extractedColors.bgColor }}
                >
                  <div
                    className="h-2 w-10 rounded-full"
                    style={{
                      backgroundColor: extractedColors.accentColor + "40",
                    }}
                  />
                  <div
                    className="h-2 w-16 rounded-full"
                    style={{
                      backgroundColor: extractedColors.accentColor + "80",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </FormItem>

        <div className="flex gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate("/coupons")}
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
