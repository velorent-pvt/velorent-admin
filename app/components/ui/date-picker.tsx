import * as React from "react";
import { ChevronDownIcon, CalendarIcon } from "lucide-react";

import { Button } from "~/components/ui/button";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

interface DatePickerProps {
  value?: string; // ISO string
  onChange?: (iso?: string) => void;
  placeholder?: string;
  disabled?: boolean;
  minDate?: Date;
}

export function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  const selectedDate = value ? new Date(value) : undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          disabled={disabled}
          className="h-10 w-full justify-between bg-card hover:bg-card rounded-none border border-input shadow-xs text-muted-foreground"
        >
          <div className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            {selectedDate ? selectedDate.toLocaleDateString() : placeholder}
          </div>
          <ChevronDownIcon className="h-4 w-4 opacity-60" />
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-auto overflow-hidden p-0" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          captionLayout="dropdown"
          disabled={minDate ? (date) => date < minDate : undefined}
          onSelect={(date) => {
            onChange?.(date ? date.toISOString() : undefined);
            setOpen(false);
          }}
        />
      </PopoverContent>
    </Popover>
  );
}
