"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface CityAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
  className?: string;
  clearAriaLabel?: string;
}

export function CityAutocomplete({
  value,
  onChange,
  options,
  placeholder = "הקלד עיר",
  className,
  clearAriaLabel = "נקה עיר",
}: CityAutocompleteProps) {
  const [open, setOpen] = useState(false);

  const normalizedValue = value.trim().toLowerCase();
  const suggestions = useMemo(() => {
    if (!normalizedValue) {
      return options.slice(0, 8);
    }

    const startsWith = options.filter((city) => city.toLowerCase().startsWith(normalizedValue));
    const includes = options.filter(
      (city) => city.toLowerCase().includes(normalizedValue) && !city.toLowerCase().startsWith(normalizedValue),
    );
    return [...startsWith, ...includes].slice(0, 8);
  }, [options, normalizedValue]);

  return (
    <div className={cn("relative", className)}>
      <Input
        value={value}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        onChange={(event) => onChange(event.target.value)}
        className="pe-10"
      />
      {value ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={clearAriaLabel}
          onClick={() => onChange("")}
          className="absolute left-1 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
        >
          <X className="size-4" />
        </Button>
      ) : null}

      {open && suggestions.length > 0 ? (
        <div className="absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-white/10 bg-[#10131d] p-1 shadow-2xl">
          {suggestions.map((city) => (
            <button
              key={city}
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(city);
                setOpen(false);
              }}
              className="w-full rounded-lg px-3 py-2 text-right text-sm text-white/85 transition hover:bg-white/10"
            >
              {city}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
