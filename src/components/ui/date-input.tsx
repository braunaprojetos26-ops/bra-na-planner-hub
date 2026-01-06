import * as React from "react";
import { format, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DateInputProps {
  value?: Date;
  onChange: (date: Date | undefined) => void;
  placeholder?: string;
  fromYear?: number;
  toYear?: number;
  disabled?: boolean;
  className?: string;
}

export function DateInput({
  value,
  onChange,
  placeholder = "DD/MM/AAAA",
  fromYear = 1920,
  toYear = new Date().getFullYear(),
  disabled = false,
  className,
}: DateInputProps) {
  const [inputValue, setInputValue] = React.useState(
    value ? format(value, "dd/MM/yyyy") : ""
  );
  const [isOpen, setIsOpen] = React.useState(false);
  const [calendarMonth, setCalendarMonth] = React.useState<Date>(
    value || new Date()
  );

  // Sync input value when external value changes
  React.useEffect(() => {
    if (value) {
      setInputValue(format(value, "dd/MM/yyyy"));
      setCalendarMonth(value);
    } else {
      setInputValue("");
    }
  }, [value]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value;
    
    // Remove non-numeric characters except /
    val = val.replace(/[^\d/]/g, "");
    
    // Auto-insert slashes
    if (val.length === 2 && !val.includes("/")) {
      val = val + "/";
    } else if (val.length === 5 && val.split("/").length === 2) {
      val = val + "/";
    }
    
    // Limit to 10 characters (DD/MM/YYYY)
    val = val.slice(0, 10);
    
    setInputValue(val);

    // Try to parse when we have a complete date
    if (val.length === 10) {
      const parsed = parse(val, "dd/MM/yyyy", new Date());
      if (isValid(parsed)) {
        const year = parsed.getFullYear();
        if (year >= fromYear && year <= toYear) {
          onChange(parsed);
          setCalendarMonth(parsed);
        }
      }
    } else if (val.length === 0) {
      onChange(undefined);
    }
  };

  const handleCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setInputValue(format(date, "dd/MM/yyyy"));
      onChange(date);
      setCalendarMonth(date);
    }
    setIsOpen(false);
  };

  const handleBlur = () => {
    // On blur, validate and reset if invalid
    if (inputValue.length > 0 && inputValue.length < 10) {
      // Incomplete date - reset to last valid value or clear
      if (value) {
        setInputValue(format(value, "dd/MM/yyyy"));
      } else {
        setInputValue("");
      }
    } else if (inputValue.length === 10) {
      const parsed = parse(inputValue, "dd/MM/yyyy", new Date());
      if (!isValid(parsed)) {
        if (value) {
          setInputValue(format(value, "dd/MM/yyyy"));
        } else {
          setInputValue("");
        }
      }
    }
  };

  return (
    <div className={cn("flex gap-2", className)}>
      <Input
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="flex-1"
      />
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="icon"
            disabled={disabled}
            className="shrink-0"
          >
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleCalendarSelect}
            month={calendarMonth}
            onMonthChange={setCalendarMonth}
            initialFocus
            captionLayout="dropdown-buttons"
            fromYear={fromYear}
            toYear={toYear}
            locale={ptBR}
            className="pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
