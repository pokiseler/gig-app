"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getGigs, type GigItem } from "@/services/api";
import { GigCard } from "@/components/GigCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function RecentWantedGrid() {
  const [items, setItems] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGig, setSelectedGig] = useState<GigItem | null>(null);

  useEffect(() => {
    getGigs({ postType: "WANTED", sortBy: "createdAt", order: "desc", limit: 6 })
      .then((result) => setItems(result.gigs || []))
      .finally(() => setLoading(false));
  }, []);

  const displayAuthor = selectedGig?.author || selectedGig?.postedBy;

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
            <GigCard key={gig._id} gig={gig} onOpen={setSelectedGig} />
          ))}
        </div>
      )}

      <Dialog open={!!selectedGig} onOpenChange={(open) => { if (!open) setSelectedGig(null); }}>
        <DialogContent dir="rtl" className="max-w-lg">
          {selectedGig ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <Badge className="bg-blue-50 text-blue-700">בקשה</Badge>
                  {selectedGig.category && <Badge variant="secondary">{selectedGig.category}</Badge>}
                  {selectedGig.tipAmount && selectedGig.tipAmount > 0 ? (
                    <Badge className="bg-green-100 text-green-800">
                      ₪{selectedGig.tipAmount} טיפ ({selectedGig.tipMethod === "bit" ? "Bit" : "מזומן"})
                    </Badge>
                  ) : null}
                </div>
                <DialogTitle className="text-lg leading-snug">{selectedGig.title}</DialogTitle>
              </DialogHeader>

              <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-wrap">
                {selectedGig.description}
              </p>

              <div className="mt-2 rounded-lg border border-black/10 bg-neutral-50 p-3 text-sm space-y-1.5">
                <p><span className="font-medium">תשלום:</span> 30 נקודות</p>
                {selectedGig.location?.city ? (
                  <p>
                    <span className="font-medium">עיר:</span>{" "}
                    {selectedGig.location.city}
                    {selectedGig.location.address ? `, ${selectedGig.location.address}` : ""}
                  </p>
                ) : null}
                {displayAuthor ? (
                  <p>
                    <span className="font-medium">מפרסם:</span>{" "}
                    <Link
                      href={`/users/${displayAuthor._id}`}
                      onClick={() => setSelectedGig(null)}
                      className="underline hover:text-neutral-600"
                    >
                      {displayAuthor.name}
                    </Link>
                  </p>
                ) : null}
                {selectedGig.tags?.length ? (
                  <p><span className="font-medium">תגיות:</span> {selectedGig.tags.join(", ")}</p>
                ) : null}
              </div>

              <div className="mt-1 flex justify-end">
                <Link
                  href="/gigs"
                  onClick={() => setSelectedGig(null)}
                  className="inline-flex h-9 items-center rounded-full bg-black px-4 text-sm font-semibold text-white transition hover:bg-neutral-800"
                >
                  לכל הבקשות
                </Link>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

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
