import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { CalendarClock } from "lucide-react";
import { toast } from "sonner";

import {
  createPushNotificationCampaign,
  type PushAudience,
} from "~/api/notifications";
import { Button } from "~/components/ui/button";
import { Card, CardContent } from "~/components/ui/card";
import { DatePicker } from "~/components/ui/date-picker";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { Textarea } from "~/components/ui/textarea";

const DEFAULT_WEB_LINK = "/";
const DEFAULT_DEEPLINK = "velorent://";

function getDefaultScheduleDate() {
  return new Date();
}

function toTimeInputValue(date: Date) {
  return `${date.getHours().toString().padStart(2, "0")}:${date
    .getMinutes()
    .toString()
    .padStart(2, "0")}`;
}

function toScheduledAt(dateValue: string, timeValue: string) {
  const date = new Date(dateValue);
  const [hours, minutes] = timeValue.split(":").map(Number);

  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function NotificationList() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [audience, setAudience] = useState<PushAudience>("customers");
  const [scheduledDate, setScheduledDate] = useState(() =>
    getDefaultScheduleDate().toISOString(),
  );
  const [scheduledTime, setScheduledTime] = useState(() =>
    toTimeInputValue(getDefaultScheduleDate()),
  );

  const createMutation = useMutation({
    mutationFn: createPushNotificationCampaign,
    onSuccess: () => {
      setTitle("");
      setMessage("");
      const defaultScheduleDate = getDefaultScheduleDate();
      setScheduledDate(defaultScheduleDate.toISOString());
      setScheduledTime(toTimeInputValue(defaultScheduleDate));
      toast.success("Push notification scheduled");
    },
  });

  function handleSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || !message.trim()) {
      toast.error("Title and message are required");
      return;
    }

    createMutation.mutate({
      title,
      message,
      audience,
      link: DEFAULT_WEB_LINK,
      deeplink: DEFAULT_DEEPLINK,
      scheduled_at: toScheduledAt(scheduledDate, scheduledTime),
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Compose</h1>
          <p className="text-sm text-muted-foreground">
            Schedule push notifications for customers and hosts.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSchedule} className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Audience</Label>
              <Select
                value={audience}
                onValueChange={(value: PushAudience) => setAudience(value)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="customers">Customers</SelectItem>
                  <SelectItem value="hosts">Hosts</SelectItem>
                  <SelectItem value="all">Customers and hosts</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Schedule time</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                <DatePicker
                  value={scheduledDate}
                  onChange={(value) => {
                    if (value) {
                      setScheduledDate(value);
                    }
                  }}
                  minDate={new Date()}
                />
                <Input
                  type="time"
                  value={scheduledTime}
                  onChange={(event) => setScheduledTime(event.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Weekend rentals are open"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Message</Label>
              <Textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Send a short message that will fit on a lock screen."
                className="min-h-28"
              />
            </div>

            <div className="md:col-span-2">
              <Button
                type="submit"
                disabled={createMutation.status === "pending"}
              >
                <CalendarClock />
                Schedule
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
