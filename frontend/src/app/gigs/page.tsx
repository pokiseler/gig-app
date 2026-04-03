"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { GigCard } from "@/components/GigCard";
import { LoadingSpinner } from "@/components/LoadingSpinner";
import {
  deleteGig,
  getGigs,
  requestGig,
  updateGig,
  type GigFilters as GigFiltersType,
  type GigItem,
} from "@/services/api";
import { useAuth } from "@/hooks/useAuth";
import dynamic from "next/dynamic";
import { Separator } from "@/components/ui/separator";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), {
  ssr: false,
});

const GigFilters = dynamic(() => import("@/components/GigFilters").then((m) => m.GigFilters), {
  ssr: false,
});

const DEFAULT_FILTERS: GigFiltersType = {
  postType: "WANTED",
  sortBy: "createdAt",
  order: "desc",
};

export default function GigsPage() {
  const { token, user, isAuthenticated } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilters, setActiveFilters] = useState<GigFiltersType>(DEFAULT_FILTERS);
  const [selectedGig, setSelectedGig] = useState<GigItem | null>(null);
  const [modalEntered, setModalEntered] = useState(false);
  const [modalError, setModalError] = useState("");
  const [modalBusy, setModalBusy] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    category: "",
    city: "",
    address: "",
    tags: "",
  });

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
  }, []);

  const fetchGigs = useCallback((filters: GigFiltersType) => {
    setLoading(true);
    setError("");
    getGigs(filters, token || undefined)
      .then((result) => {
        setGigs(result.gigs || []);
        setTotal(result.total ?? 0);
      })
        .catch((err) => setError(err instanceof Error ? err.message : "טעינת הפוסטים נכשלה"))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    queueMicrotask(() => fetchGigs(DEFAULT_FILTERS));
  }, [fetchGigs]);

  const handleFilter = (filters: GigFiltersType) => {
    setActiveFilters(filters);
    fetchGigs(filters);
  };

  const openGigModal = (gig: GigItem) => {
    setSelectedGig(gig);
    setModalEntered(false);
    requestAnimationFrame(() => setModalEntered(true));
    setModalError("");
    setIsEditMode(false);
    setEditForm({
      title: gig.title,
      description: gig.description,
      category: gig.category,
      city: gig.location?.city || "",
      address: gig.location?.address || "",
      tags: gig.tags?.join(", ") || "",
    });
  };

  const closeGigModal = () => {
    setModalEntered(false);
    window.setTimeout(() => {
      setSelectedGig(null);
      setModalError("");
      setModalBusy(false);
      setIsEditMode(false);
    }, 160);
  };

  const ownerId = selectedGig?.author?._id || selectedGig?.postedBy?._id;
  const isOwnGig = Boolean(selectedGig && user?._id && ownerId && user._id === ownerId);
  const canAccept = Boolean(selectedGig && isAuthenticated && token && selectedGig.status === "open" && !isOwnGig);

  const handleAccept = async () => {
    if (!token || !selectedGig?._id) {
      return;
    }

    setModalBusy(true);
    setModalError("");

    try {
      await requestGig(token, selectedGig._id);
      closeGigModal();
      fetchGigs(activeFilters);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "שליחת הבקשה נכשלה");
    } finally {
      setModalBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!token || !selectedGig?._id) {
      return;
    }

    const confirmed = window.confirm("למחוק את הפוסט הזה?");
    if (!confirmed) {
      return;
    }

    setModalBusy(true);
    setModalError("");

    try {
      await deleteGig(token, selectedGig._id);
      closeGigModal();
      fetchGigs(activeFilters);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "מחיקת הפוסט נכשלה");
    } finally {
      setModalBusy(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!token || !selectedGig?._id) {
      return;
    }

    setModalBusy(true);
    setModalError("");

    try {
      const payload = {
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        category: editForm.category.trim(),
        location: {
          city: editForm.city.trim(),
          address: editForm.address.trim(),
        },
        tags: editForm.tags
          .split(",")
          .map((tag) => tag.trim())
          .filter(Boolean),
      };

      const result = await updateGig(token, selectedGig._id, payload);
      setSelectedGig(result.gig);
      setIsEditMode(false);
      fetchGigs(activeFilters);
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "עדכון הפוסט נכשל");
    } finally {
      setModalBusy(false);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f5f4ef] text-neutral-900">
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe1,_#f3f4ef_45%,_#ecefe8)] text-neutral-900">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-14" dir="rtl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold">חלתורות</h1>
          <Link href="/post" className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-neutral-800">
            יצירת פוסט חדש
          </Link>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          {/* Sidebar filters */}
          <aside className="w-full lg:w-72 lg:shrink-0">
            <GigFilters onFilter={handleFilter} />
          </aside>

          {/* Results */}
          <section className="flex-1 min-w-0">
            {!loading && !error && (
              <p className="mb-4 text-sm text-neutral-500">
                נמצאו {total} {total === 1 ? "תוצאה" : "תוצאות"}
              </p>
            )}

            {loading ? (
              <div className="flex justify-center py-20">
                <LoadingSpinner size="lg" />
              </div>
            ) : error ? (
              <p className="text-red-700">{error}</p>
            ) : gigs.length === 0 ? (
              <p className="text-neutral-500">לא נמצאו פוסטים שתואמים לסינון שבחרת.</p>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {gigs.map((gig) => (
                  <GigCard key={gig._id} gig={gig} onOpen={openGigModal} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {selectedGig ? (
        <div
          className={`fixed inset-0 z-[60] flex items-center justify-center p-4 transition-colors duration-150 ${
            modalEntered ? "bg-black/40" : "bg-black/0"
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              closeGigModal();
            }
          }}
        >
          <div
            className={`w-full max-w-2xl rounded-2xl border border-black/10 bg-white p-5 shadow-2xl transition-all duration-150 sm:p-6 ${
              modalEntered ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-[0.98] opacity-0"
            }`}
            dir="rtl"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-neutral-500">פרטי חלתורה</p>
                <h2 className="mt-1 text-2xl font-semibold text-neutral-900">{selectedGig.title}</h2>
                <p className="mt-1 text-sm text-neutral-500">{selectedGig.category} · תשלום קבוע: 25 נקודות</p>
              </div>
              <button
                type="button"
                onClick={closeGigModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 text-neutral-600 hover:bg-neutral-100"
              >
                ×
              </button>
            </div>

            <Separator />

            {isEditMode ? (
              <div className="mt-4 space-y-4">
                <div className="rounded-xl border border-black/10 bg-neutral-50/70 p-4">
                  <p className="mb-3 text-xs font-semibold text-neutral-600">עריכת תוכן</p>
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      value={editForm.title}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, title: event.target.value }))}
                      placeholder="כותרת"
                    />
                    <textarea
                      className="min-h-28 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      value={editForm.description}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, description: event.target.value }))}
                      placeholder="תיאור"
                    />
                  </div>
                </div>

                <div className="rounded-xl border border-black/10 bg-neutral-50/70 p-4">
                  <p className="mb-3 text-xs font-semibold text-neutral-600">פרטי עבודה</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      value={editForm.category}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, category: event.target.value }))}
                      placeholder="קטגוריה"
                    />
                    <input
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      value={editForm.city}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, city: event.target.value }))}
                      placeholder="עיר"
                    />
                    <input
                      className="w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                      value={editForm.address}
                      onChange={(event) => setEditForm((prev) => ({ ...prev, address: event.target.value }))}
                      placeholder="כתובת"
                    />
                  </div>
                  <input
                    className="mt-3 w-full rounded-lg border border-black/15 bg-white px-3 py-2 text-sm"
                    value={editForm.tags}
                    onChange={(event) => setEditForm((prev) => ({ ...prev, tags: event.target.value }))}
                    placeholder="תגיות (מופרדות בפסיקים)"
                  />
                </div>
              </div>
            ) : (
              <div className="mt-4 space-y-4 text-sm text-neutral-700">
                <div className="rounded-xl border border-black/10 bg-neutral-50/70 p-4">
                  <p className="mb-2 text-xs font-semibold text-neutral-600">תיאור החלתורה</p>
                  <p className="leading-relaxed">{selectedGig.description}</p>
                </div>

                <div className="rounded-xl border border-black/10 p-4">
                  <p className="mb-3 text-xs font-semibold text-neutral-600">מידע נוסף</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <p><span className="font-medium">סטטוס:</span> {selectedGig.status}</p>
                    <p><span className="font-medium">מפרסם:</span> {selectedGig.author?.name || selectedGig.postedBy?.name || "-"}</p>
                    <p><span className="font-medium">עיר:</span> {selectedGig.location?.city || "-"}</p>
                    <p><span className="font-medium">כתובת:</span> {selectedGig.location?.address || "-"}</p>
                  </div>
                  {selectedGig.tags?.length ? (
                    <>
                      <Separator className="my-3" />
                      <p><span className="font-medium">תגיות:</span> {selectedGig.tags.join(", ")}</p>
                    </>
                  ) : null}
                </div>
              </div>
            )}

            {modalError ? <p className="mt-4 text-sm text-red-700">{modalError}</p> : null}

            <Separator className="mt-5" />

            <div className="mt-4 flex flex-wrap justify-end gap-2">
              {isOwnGig ? (
                isEditMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium"
                      disabled={modalBusy}
                    >
                      ביטול
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white"
                      disabled={modalBusy}
                    >
                      {modalBusy ? "שומר..." : "שמירת שינויים"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="rounded-lg border border-black/15 px-4 py-2 text-sm font-medium"
                    >
                      עריכה
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white"
                      disabled={modalBusy}
                    >
                      {modalBusy ? "מוחק..." : "מחיקה"}
                    </button>
                  </>
                )
              ) : (
                <button
                  type="button"
                  onClick={handleAccept}
                  disabled={!canAccept || modalBusy}
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {modalBusy ? "מעבד..." : "שליחת בקשה"}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
