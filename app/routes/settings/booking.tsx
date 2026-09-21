import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ALLOWED_MINIMUM_BOOKING_HOURS,
  getBookingSettings,
  type MinimumBookingHours,
  updateMinimumBookingHours,
} from "~/api/booking-settings";
import { Button } from "~/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { useState } from "react";

export default function BookingSettings() {
  const client = useQueryClient();
  const { data, isLoading, error } = useQuery({
    queryKey: ["booking-settings"],
    queryFn: getBookingSettings,
  });
  const [selected, setSelected] = useState<MinimumBookingHours | null>(null);
  const mutation = useMutation({
    mutationFn: updateMinimumBookingHours,
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["booking-settings"] }),
  });
  const value = selected ?? data?.minimumBookingHours ?? 6;
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold">Booking Settings</h1>
        <p className="text-sm text-muted-foreground">
          Set the minimum duration for every new booking.
        </p>
      </div>
      <div className="rounded-lg border bg-card p-6 space-y-4">
        <h2 className="font-semibold">Minimum booking duration</h2>
        <Select
          value={String(value)}
          onValueChange={(next) =>
            setSelected(Number(next) as MinimumBookingHours)
          }
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select duration" />
          </SelectTrigger>
          <SelectContent>
            {ALLOWED_MINIMUM_BOOKING_HOURS.map((hours) => (
              <SelectItem key={hours} value={String(hours)}>
                {hours} hours
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {error && (
          <p className="text-sm text-destructive">
            Unable to load booking settings.
          </p>
        )}
        {mutation.error && (
          <p className="text-sm text-destructive">{mutation.error.message}</p>
        )}
        <Button
          disabled={
            isLoading ||
            mutation.isPending ||
            value === data?.minimumBookingHours
          }
          onClick={() => mutation.mutate(value)}
        >
          {mutation.isPending ? "Saving..." : "Save setting"}
        </Button>
        {mutation.isSuccess && (
          <p className="text-sm text-green-600">Booking duration updated.</p>
        )}
      </div>
    </div>
  );
}
