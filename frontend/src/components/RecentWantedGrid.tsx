"use client";

import { useState } from "react";
import { MapPin, Clock, Coins } from "lucide-react";
import { type GigItem } from "@/services/api";
import { GigCard } from "@/components/GigCard";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RecentWantedGridProps {
  items: GigItem[];
  loading?: boolean;
}

export function RecentWantedGrid({ items, loading = false }: RecentWantedGridProps) {
  const [selectedGig, setSelectedGig] = useState<GigItem | null>(null);

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

      <Dialog
        open={!!selectedGig}
        onOpenChange={(open) => {
          if (!open) setSelectedGig(null);
        }}
      >
        <DialogContent
          dir="rtl"
          className="max-h-[90vh] max-w-2xl overflow-y-auto text-right"
        >
          {selectedGig && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold text-blue-900">
                  {selectedGig.title}
                </DialogTitle>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Badge variant="secondary" className="bg-blue-50 text-blue-700">
                    {selectedGig.category}
                  </Badge>
                  {selectedGig.tipAmount && selectedGig.tipAmount > 0 && (
                    <Badge className="bg-green-100 text-green-800">
                      &#x20AA;{selectedGig.tipAmount} טיפ (
                      {selectedGig.tipMethod === "bit" ? "Bit" : "מזומן"})
                    </Badge>
                  )}
                </div>
              </DialogHeader>

              <div className="mt-4 space-y-6">
                <p className="whitespace-pre-wrap leading-relaxed text-neutral-700">
                  {selectedGig.description}
                </p>

                <div className="grid grid-cols-2 gap-4 rounded-lg bg-neutral-50 p-4">
                  <div className="flex items-center gap-2">
                    <Coins className="h-5 w-5 text-amber-500" />
                    <div>
                      <p className="text-xs text-neutral-500">תגמול</p>
                      <p className="font-bold">
                        {selectedGig.price > 0 ? `&#x20AA;${selectedGig.price}` : "ללא תגמול"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-neutral-500">פורסם ב</p>
                      <p className="font-medium">
                        {selectedGig.createdAt
                          ? new Date(selectedGig.createdAt).toLocaleDateString("he-IL")
                          : "—"}
                      </p>
                    </div>
                  </div>

                  {selectedGig.location?.city && (
                    <div className="col-span-2 flex items-center gap-2 border-t pt-2">
                      <MapPin className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="text-xs text-neutral-500">מיקום</p>
                        <p className="font-medium">
                          {selectedGig.location.city}
                          {selectedGig.location.address
                            ? `, ${selectedGig.location.address}`
                            : ""}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

