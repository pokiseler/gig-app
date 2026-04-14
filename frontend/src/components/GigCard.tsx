"use client";

import Link from "next/link";
import type { GigItem } from "@/services/api";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar } from "lucide-react";

interface GigCardProps {
  gig: GigItem;
  onOpen?: (gig: GigItem) => void;
}

export function GigCard({ gig, onOpen }: GigCardProps) {
  const { title, description, category, location, author, postedBy, createdAt, tipAmount } = gig;
  const displayAuthor = author || postedBy;
  const formattedDate = createdAt ? createdAt.slice(0, 10) : null;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(gig)}
      className="w-full text-right group"
    >
      <div className="gig-card-glass flex h-full flex-col rounded-2xl p-5">
        {/* Header */}
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge className="rounded-full bg-blue-500/20 text-blue-300 border-blue-400/30 text-xs">
            בקשה
          </Badge>
          {category && (
            <Badge variant="secondary" className="rounded-full text-xs bg-white/10 text-white/70 border-white/10">
              {category}
            </Badge>
          )}
          {tipAmount && tipAmount > 0 ? (
            <Badge className="rounded-full bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">
              ₪{tipAmount} טיפ
            </Badge>
          ) : null}
        </div>

        {/* Title */}
        <h3 className="mb-2 line-clamp-2 text-base font-semibold text-white leading-snug group-hover:text-blue-300 transition-colors">
          {title}
        </h3>

        {/* Description */}
        <p className="line-clamp-3 flex-1 text-sm leading-relaxed text-white/55">
          {description}
        </p>

        {/* Footer */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/8 pt-3 text-xs text-white/40">
          {location?.city && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              {location.city}
            </span>
          )}
          {formattedDate && (
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {formattedDate}
            </span>
          )}
          {displayAuthor?.name && (
            <Link
              href={`/users/${displayAuthor._id}`}
              onClick={(e) => e.stopPropagation()}
              className="mr-auto text-blue-400/70 hover:text-blue-300 hover:underline"
            >
              {displayAuthor.name}
            </Link>
          )}
        </div>

        {/* "More details" hint */}
        <div className="mt-3 flex justify-end">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/50 transition group-hover:border-blue-400/30 group-hover:bg-blue-500/10 group-hover:text-blue-300">
            לפרטים ←
          </span>
        </div>
      </div>
    </button>
  );
}
