import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "~/components/ui/form";
import { Input } from "~/components/ui/input";
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

interface CouponFormProps {
  defaultValues?: Partial<CouponFormValues>;
  onSubmit: (values: CouponFormValues) => void;
  status: MutationStatus;
  submitLabel?: string;
}

export function CouponForm({
  defaultValues,
  onSubmit,
  status,
  submitLabel = "Save",
}: CouponFormProps) {
  const navigate = useNavigate();

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      code: defaultValues?.code ?? "",
      discount_type: defaultValues?.discount_type ?? "percentage",
      discount_value: defaultValues?.discount_value ?? "",
      min_booking_amount: defaultValues?.min_booking_amount,
      per_customer_limit: defaultValues?.per_customer_limit,
      start_date: defaultValues?.start_date ?? "",
      end_date: defaultValues?.end_date ?? "",
      is_active: defaultValues?.is_active ?? true,
    },
  });

  const handleSubmit = form.handleSubmit(onSubmit);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit} className="max-w-xl space-y-6">
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
                      e.target.value ? Number(e.target.value) : undefined
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
                      e.target.value ? Number(e.target.value) : undefined
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
