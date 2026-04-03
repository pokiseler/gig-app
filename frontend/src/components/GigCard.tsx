"use client";

import type { GigItem } from "@/services/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface GigCardProps {
  gig: GigItem;
  onOpen: (gig: GigItem) => void;
}

const TYPE_STYLES = {
  WANTED: "bg-blue-50 text-blue-700",
} as const;

const TYPE_LABELS = {
  WANTED: "בקשה",
} as const;

const FIXED_GIG_POINTS = 25;

export function GigCard({ gig, onOpen }: GigCardProps) {
  const { title, description, category, location, author, postedBy, createdAt } = gig;
  const normalizedType = "WANTED" as const;

  // Use a locale-agnostic ISO slice (YYYY-MM-DD) to avoid server/client
  // hydration mismatches caused by differing locale ICU data.
  const formattedDate = createdAt ? createdAt.slice(0, 10) : null;

  return (
    <button type="button" onClick={() => onOpen(gig)} className="w-full text-right">
      <Card className="h-full cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md">
      <CardHeader className="space-y-3">
        <div className="flex items-center gap-2">
          <Badge className={TYPE_STYLES[normalizedType]}>{TYPE_LABELS[normalizedType]}</Badge>
          {category && <Badge variant="secondary">{category}</Badge>}
        </div>
        <CardTitle className="line-clamp-2 text-base">{title}</CardTitle>
      </CardHeader>

      <CardContent className="flex-1">
        <p className="line-clamp-3 text-sm leading-relaxed text-neutral-600">{description}</p>
        <div className="mt-4 flex items-center justify-between text-xs text-neutral-500">
          <span>{FIXED_GIG_POINTS} נקודות</span>
          <span className="rounded-full border border-black/10 px-2 py-1">לפרטים</span>
        </div>
      </CardContent>

      <CardContent className="pt-0">
        <div className="flex flex-col gap-0.5 text-xs text-neutral-500">
          {location?.city && (
            <span>
              {location.city}
              {location.address ? `, ${location.address}` : ""}
            </span>
          )}
          {(author?.name || postedBy?.name) && <span>מאת {author?.name || postedBy?.name}</span>}
          {formattedDate && <span>{formattedDate}</span>}
        </div>
      </CardContent>
      </Card>
    </button>
  );
}
