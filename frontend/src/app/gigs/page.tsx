"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Pencil } from "lucide-react";
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

    // Block if user has reached the monthly completion limit
    if (user?.usageQuota && user.usageQuota.performedThisMonth >= 4) {
      setModalError("הגעת למגבלה החודשית של 4 חלתורות. תוכל לשלוח בקשות חדשות בחודש הבא.");
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
      <div className="min-h-screen text-white">
        <main className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="flex justify-center py-20">
            <LoadingSpinner size="lg" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-14" dir="rtl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-3xl font-semibold text-white">חלתורות</h1>
          <Link href="/post" className="rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 transition hover:-translate-y-0.5">
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
              <p className="mb-4 text-sm text-white/40">
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
          className={`fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4 transition-colors duration-200 ${
            modalEntered ? "bg-black/60 backdrop-blur-sm" : "bg-black/0"
          }`}
          onClick={(event) => {
            if (event.target === event.currentTarget) closeGigModal();
          }}
        >
          <div
            className={`w-full max-w-2xl overflow-hidden rounded-t-3xl sm:rounded-2xl bg-[#0f1117] border border-white/10 shadow-2xl transition-all duration-200 ${
              modalEntered ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
            dir="rtl"
          >
            {/* Header band */}
            <div className="relative bg-gradient-to-l from-blue-600/20 to-indigo-600/10 px-6 pt-6 pb-5 border-b border-white/8">
              <button
                type="button"
                onClick={closeGigModal}
                className="absolute left-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/60 hover:bg-white/20 hover:text-white transition text-lg leading-none"
              >
                ×
              </button>

              <span className="mb-2 inline-block rounded-full bg-blue-500/20 px-2.5 py-0.5 text-xs font-medium text-blue-300 border border-blue-400/20">
                בקשה
              </span>
              <h2 className="text-xl font-bold text-white leading-snug">{selectedGig.title}</h2>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                {selectedGig.category && (
                  <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-xs text-white/70 border border-white/10">
                    {selectedGig.category}
                  </span>
                )}
                {selectedGig.tipAmount && selectedGig.tipAmount > 0 ? (
                  <span className="rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300 border border-emerald-400/20">
                    ₪{selectedGig.tipAmount} טיפ · {selectedGig.tipMethod === "bit" ? "Bit" : "מזומן"}
                  </span>
                ) : null}
                {selectedGig.location?.city && (
                  <span className="rounded-full bg-white/8 px-2.5 py-0.5 text-xs text-white/50 border border-white/8">
                    📍 {selectedGig.location.city}
                  </span>
                )}
              </div>

              {(selectedGig.author || selectedGig.postedBy) && (
                <p className="mt-3 text-xs text-white/40">
                  פורסם על ידי{" "}
                  <Link
                    href={`/users/${selectedGig.author?._id || selectedGig.postedBy?._id}`}
                    className="text-blue-400/80 hover:text-blue-300 hover:underline"
                  >
                    {selectedGig.author?.name || selectedGig.postedBy?.name}
                  </Link>
                  {selectedGig.createdAt && (
                    <span className="mr-2 text-white/30">
                      · {new Date(selectedGig.createdAt).toLocaleDateString("he-IL")}
                    </span>
                  )}
                </p>
              )}
            </div>

            {/* Body */}
            <div className="max-h-[55vh] overflow-y-auto px-6 py-5 space-y-4">
              {isEditMode ? (
                <>
                  <div className="space-y-3">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                      value={editForm.title}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))}
                      placeholder="כותרת"
                    />
                    <textarea
                      className="min-h-28 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                      value={editForm.description}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))}
                      placeholder="תיאור"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                      value={editForm.category}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, category: e.target.value }))}
                      placeholder="קטגוריה"
                    />
                    <input
                      className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                      value={editForm.city}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, city: e.target.value }))}
                      placeholder="עיר"
                    />
                    <input
                      className="col-span-full w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                      value={editForm.address}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="כתובת"
                    />
                    <input
                      className="col-span-full w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                      value={editForm.tags}
                      onChange={(e) => setEditForm((prev) => ({ ...prev, tags: e.target.value }))}
                      placeholder="תגיות (מופרדות בפסיקים)"
                    />
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-xl bg-white/5 border border-white/8 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-white/40">תיאור</p>
                    <p className="text-sm leading-relaxed text-white/80 whitespace-pre-wrap">{selectedGig.description}</p>
                  </div>

                  {(selectedGig.location?.address || selectedGig.tags?.length) ? (
                    <div className="rounded-xl bg-white/5 border border-white/8 p-4 space-y-2 text-sm">
                      {selectedGig.location?.address && (
                        <p className="text-white/60">
                          <span className="font-medium text-white/80">כתובת:</span> {selectedGig.location.address}
                        </p>
                      )}
                      {selectedGig.tags?.length ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {selectedGig.tags.map((tag) => (
                            <span key={tag} className="rounded-full bg-white/8 px-2 py-0.5 text-xs text-white/50 border border-white/8">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </>
              )}

              {modalError ? (
                <p className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400">{modalError}</p>
              ) : null}
            </div>

            {/* Footer actions */}
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/8 bg-white/3 px-6 py-4">
              {isOwnGig ? (
                isEditMode ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(false)}
                      disabled={modalBusy}
                      className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 hover:bg-white/10 transition disabled:opacity-50"
                    >
                      ביטול
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={modalBusy}
                      className="rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:opacity-90 transition disabled:opacity-50"
                    >
                      {modalBusy ? "שומר..." : "שמירת שינויים"}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => setIsEditMode(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/80 hover:bg-white/10 transition"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      עריכה
                    </button>
                    <button
                      type="button"
                      onClick={handleDelete}
                      disabled={modalBusy}
                      className="rounded-xl bg-red-600/80 px-4 py-2 text-sm font-medium text-white hover:bg-red-600 transition disabled:opacity-50"
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
                  className="rounded-xl bg-gradient-to-l from-emerald-600 to-emerald-500 px-6 py-2 text-sm font-semibold text-white shadow-lg shadow-emerald-900/30 hover:opacity-90 transition disabled:cursor-not-allowed disabled:opacity-50"
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
