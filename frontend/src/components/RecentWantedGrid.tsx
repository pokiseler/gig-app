"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGigs, type GigItem } from "@/services/api";
import { GigCard } from "@/components/GigCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";

export function RecentWantedGrid() {
  const [items, setItems] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGigs({ postType: "WANTED", sortBy: "createdAt", order: "desc", limit: 6 })
      .then((result) => setItems(result.gigs || []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <section className="rounded-2xl border border-black/10 bg-white/80 p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">בקשות אחרונות שנפתחו</h2>
        <Link href="/gigs" className="text-sm text-neutral-600 hover:text-black">
          לכל הבקשות
        </Link>
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-neutral-500">עדיין אין בקשות פתוחות חדשות.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((gig) => (
            <GigCard key={gig._id} gig={gig} />
          ))}
        </div>
      )}
    </section>
  );
}
