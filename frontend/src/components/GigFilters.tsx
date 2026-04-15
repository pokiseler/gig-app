"use client";

import { useState } from "react";
import type { GigFilters } from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CityAutocomplete } from "@/components/CityAutocomplete";
import { ISRAEL_CITIES, MARKET_CATEGORIES } from "@/lib/marketOptions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GigFiltersProps {
  onFilter: (filters: GigFilters) => void;
}

const CATEGORIES = [...MARKET_CATEGORIES];

const SORT_OPTIONS: { label: string; sortBy: GigFilters["sortBy"]; order: GigFilters["order"] }[] = [
  { label: "החדשים ביותר",       sortBy: "createdAt", order: "desc" },
  { label: "הוותיקים ביותר",      sortBy: "createdAt", order: "asc"  },
  { label: "טיפ - מהגבוה לנמוך",   sortBy: "tipAmount",  order: "desc" },
];

const INITIAL: GigFilters = {
  search:   "",
  postType: "WANTED",
  category: "",
  city:     "",
  sortBy:   "createdAt",
  order:    "desc",
};

export function GigFilters({ onFilter }: GigFiltersProps) {
  const [filters, setFilters] = useState<GigFilters>(INITIAL);
  const [open, setOpen] = useState(false);

  const set = <K extends keyof GigFilters>(key: K, value: GigFilters[K]) => {
    setFilters((prev: GigFilters) => ({ ...prev, [key]: value }));
  };

  const handleSortChange = (value: string | null) => {
    if (!value) {
      return;
    }

    const option = SORT_OPTIONS.find((o) => `${o.sortBy}_${o.order}` === value);
    if (option) {
      setFilters((prev: GigFilters) => ({ ...prev, sortBy: option.sortBy, order: option.order }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFilter(filters);
    setOpen(false);
  };

  const handleReset = () => {
    setFilters(INITIAL);
    onFilter(INITIAL);
    setOpen(false);
  };

  const sortValue = `${filters.sortBy}_${filters.order}`;
  const selectedSortLabel =
    SORT_OPTIONS.find((o) => `${o.sortBy}_${o.order}` === sortValue)?.label ||
    "החדשים ביותר";

  return (
    <div className="glass-heavy rounded-2xl">
      <Button
        type="button"
        onClick={() => setOpen((v) => !v)}
        variant="ghost"
        className="flex w-full items-center justify-between rounded-none px-5 py-4 text-sm font-medium text-white/80 hover:bg-white/5 lg:hidden"
      >
        <span>סינון ומיון</span>
        <span className="text-white/40">{open ? "▲" : "▼"}</span>
      </Button>

      <form
        onSubmit={handleSubmit}
        className={`p-5 pt-0 lg:block lg:pt-5 ${open ? "block" : "hidden"}`}
      >
      <div className="mb-4">
        <Label className="mb-1 block text-xs font-medium text-white/50">חיפוש</Label>
        <Input
          type="text"
          placeholder="כותרת, תיאור, קטגוריה או עיר..."
          value={filters.search}
          onChange={(e) => set("search", e.target.value)}
          className="w-full"
        />
      </div>

      <div className="mb-4">
        <Label className="mb-1 block text-xs font-medium text-white/50">קטגוריה</Label>
        <Select
          value={filters.category || undefined}
          onValueChange={(value) => {
            if (!value || value === "all") {
              set("category", "");
              return;
            }

            set("category", value);
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="הכל" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">הכל</SelectItem>
            {CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="mb-4">
        <Label className="mb-1 block text-xs font-medium text-white/50">עיר</Label>
        <CityAutocomplete
          value={filters.city ?? ""}
          onChange={(value) => set("city", value)}
          options={ISRAEL_CITIES}
          placeholder="לדוגמה: תל אביב"
          className="w-full"
          clearAriaLabel="נקה סינון עיר"
        />
      </div>

      <div className="mb-5">
        <Label className="mb-1 block text-xs font-medium text-white/50">מיון לפי</Label>
        <Select value={sortValue} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full">
            <SelectValue>{selectedSortLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((o) => (
              <SelectItem key={`${o.sortBy}_${o.order}`} value={`${o.sortBy}_${o.order}`}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="submit" className="flex-1">
          החל
        </Button>
        <Button type="button" variant="outline" onClick={handleReset}>
          איפוס
        </Button>
      </div>
    </form>
    </div>
  );
}
