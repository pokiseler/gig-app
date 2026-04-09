"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, Pencil } from "lucide-react";
import { type GigItem } from "@/services/api";
import { GigCard } from "@/components/GigCard";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";

interface RecentWantedGridProps {
  items: GigItem[];
  loading?: boolean;
}

export function RecentWantedGrid({ items, loading = false }: RecentWantedGridProps) {
  const [selectedGig, setSelectedGig] = useState<GigItem | null>(null);
  const { user } = useAuth();
  const router = useRouter();

  if (loading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-64 animate-pulse rounded-xl bg-neutral-100" />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <p className="text-sm text-neutral-500">עדיין אין בקשות פתוחות חדשות.</p>
    );
  }

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {items.map((gig) => (
          <GigCard key={gig._id} gig={gig} onOpen={(g) => setSelectedGig(g)} />
        ))}
      </div>

      {selectedGig && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedGig(null); }}
        >
          <div
            className="w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto sm:p-6"
            dir="rtl"
          >
            {/* Header */}
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-neutral-500">פרטי חלתורה</p>
                <h2 className="mt-1 text-2xl font-semibold text-neutral-900">{selectedGig.title}</h2>
                <p className="mt-1 text-sm text-neutral-500">
                  {selectedGig.category}
                  {selectedGig.tipAmount && selectedGig.tipAmount > 0 ? (
                    <span className="mr-2 inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800">
                      ₪{selectedGig.tipAmount} טיפ ({selectedGig.tipMethod === "bit" ? "Bit" : "מזומן"})
                    </span>
                  ) : null}
                </p>
                {(selectedGig.author || selectedGig.postedBy) && (
                  <p className="mt-1 text-xs text-neutral-400">
                    מאת{" "}
                    <Link
                      href={`/users/${selectedGig.author?._id || selectedGig.postedBy?._id}`}
                      className="hover:underline"
                      onClick={() => setSelectedGig(null)}
                    >
                      {selectedGig.author?.name || selectedGig.postedBy?.name}
                    </Link>
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedGig(null)}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-black/10 text-neutral-600 hover:bg-neutral-100"
              >
                ×
              </button>
            </div>

            <Separator />

            {/* Description + Info */}
            <div className="mt-4 space-y-4 text-sm text-neutral-700">
              <div className="rounded-xl border border-black/10 bg-neutral-50/70 p-4">
                <p className="mb-2 text-xs font-semibold text-neutral-600">תיאור החלתורה</p>
                <p className="leading-relaxed">{selectedGig.description}</p>
              </div>

              <div className="rounded-xl border border-black/10 p-4">
                <p className="mb-3 text-xs font-semibold text-neutral-600">מידע נוסף</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {selectedGig.location?.city && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-4 w-4 text-neutral-400" />
                      <span className="font-medium">עיר:</span> {selectedGig.location.city}
                    </p>
                  )}
                  {selectedGig.location?.address && (
                    <p><span className="font-medium">כתובת:</span> {selectedGig.location.address}</p>
                  )}
                  {selectedGig.createdAt && (
                    <p><span className="font-medium">פורסם:</span> {new Date(selectedGig.createdAt).toLocaleDateString("he-IL")}</p>
                  )}
                </div>
                {selectedGig.tags?.length ? (
                  <>
                    <Separator className="my-3" />
                    <p><span className="font-medium">תגיות:</span> {selectedGig.tags.join(", ")}</p>
                  </>
                ) : null}
              </div>
            </div>

            <Separator className="mt-5" />

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {user?._id && (selectedGig.author?._id ?? selectedGig.postedBy?._id) === user._id ? (
                <button
                  type="button"
                  onClick={() => { setSelectedGig(null); router.push("/gigs"); }}
                  className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-neutral-50 px-4 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-100"
                >
                  <Pencil className="h-4 w-4" />
                  עריכת חלתורה
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => { setSelectedGig(null); router.push("/gigs"); }}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white"
                >
                  שליחת בקשה
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

