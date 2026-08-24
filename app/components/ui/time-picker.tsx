"use client";

import * as React from "react";
import { Clock, ChevronDownIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

interface TimePickerProps {
  /** Controlled value as "HH:MM" in 24-hour format */
  value?: string;
  /** Called with "HH:MM" (24-hour) whenever the user confirms a time */
  onChange?: (time: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/** Parse a "HH:MM" 24-h string into { hour12, minute, ampm } display state */
function parse24h(value: string): { hour: number; minute: number; ampm: "AM" | "PM" } {
  const [hStr = "12", mStr = "0"] = value.split(":");
  const h24 = parseInt(hStr, 10);
  const minute = parseInt(mStr, 10);
  const ampm: "AM" | "PM" = h24 >= 12 ? "PM" : "AM";
  const hour = h24 % 12 === 0 ? 12 : h24 % 12;
  return { hour, minute, ampm };
}

/** Format display label for a "HH:MM" 24-h value */
function formatDisplay(value: string): string {
  const { hour, minute, ampm } = parse24h(value);
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")} ${ampm}`;
}

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time",
  disabled,
}: TimePickerProps) {
  const [open, setOpen] = React.useState(false);

  const init = value ? parse24h(value) : { hour: 12, minute: 0, ampm: "AM" as const };
  const [hour, setHour] = React.useState<number>(init.hour);
  const [minute, setMinute] = React.useState<number>(init.minute);
  const [ampm, setAmPm] = React.useState<"AM" | "PM">(init.ampm);

  // Sync internal pickers when controlled value changes externally
  React.useEffect(() => {
    if (value) {
      const parsed = parse24h(value);
      setHour(parsed.hour);
      setMinute(parsed.minute);
      setAmPm(parsed.ampm);
    }
  }, [value]);

  const handleConfirm = () => {
    let h24 = hour % 12;
    if (ampm === "PM") h24 += 12;
    const hStr = h24.toString().padStart(2, "0");
    const mStr = minute.toString().padStart(2, "0");
    onChange?.(`${hStr}:${mStr}`);
    setOpen(false);
  };

  const displayLabel = value ? formatDisplay(value) : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          className="h-10 w-full justify-between bg-card hover:bg-card rounded-none border border-input shadow-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            {displayLabel}
          </div>
          <ChevronDownIcon className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-4" align="start">
        <div className="flex items-center justify-center gap-3">
          <select
            value={hour}
            onChange={(e) => setHour(parseInt(e.target.value))}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((h) => (
              <option key={h} value={h}>
                {h.toString().padStart(2, "0")}
              </option>
            ))}
          </select>

          <span className="font-medium">:</span>

          <select
            value={minute}
            onChange={(e) => setMinute(parseInt(e.target.value))}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
          >
            {Array.from({ length: 60 }, (_, i) => i).map((m) => (
              <option key={m} value={m}>
                {m.toString().padStart(2, "0")}
              </option>
            ))}
          </select>

          <select
            value={ampm}
            onChange={(e) => setAmPm(e.target.value as "AM" | "PM")}
            className="border rounded-md px-2 py-1 text-sm focus:outline-none"
          >
            <option value="AM">AM</option>
            <option value="PM">PM</option>
          </select>
        </div>

        <div className="mt-4 flex justify-end">
          <Button size="sm" onClick={handleConfirm}>
            Set Time
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
