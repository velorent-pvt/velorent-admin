"use client";

import * as React from "react";
import { Clock, ChevronDownIcon } from "lucide-react";
import { Button } from "~/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export function TimePicker() {
  const [open, setOpen] = React.useState(false);
  const [time, setTime] = React.useState<string>("");

  const [hour, setHour] = React.useState<number>(12);
  const [minute, setMinute] = React.useState<number>(0);
  const [ampm, setAmPm] = React.useState<"AM" | "PM">("AM");

  const handleTimeSelect = () => {
    const formatted = `${hour.toString().padStart(2, "0")}:${minute
      .toString()
      .padStart(2, "0")} ${ampm}`;
    setTime(formatted);
    setOpen(false);
  };

  return (
    <div className="flex flex-col gap-3">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="secondary" id="time" className="rounded-xl h-10">
            <Clock className="mr-2 h-4 w-4" />
            {time || "Select time"}
            <ChevronDownIcon className="ml-2 h-4 w-4" />
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
            <Button size="sm" onClick={handleTimeSelect}>
              Set Time
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
