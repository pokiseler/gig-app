"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useSSE } from "@/hooks/useSSE";
import { acceptGigRequest, denyGigRequest, getMyGigRequests, type GigRequestItem } from "@/services/api";

export function Navbar() {
  const { user, token, isAuthenticated, signOut, loading } = useAuth();
  const { notifications, dismiss, dismissAll } = useSSE(isAuthenticated ? token : null);
  const router = useRouter();
  const [pendingRequests, setPendingRequests] = useState<GigRequestItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [busyRequestKey, setBusyRequestKey] = useState("");
  const navButtonClass =
    "inline-flex h-9 items-center rounded-full px-3 text-sm font-medium text-neutral-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-black hover:shadow-sm";

  const loadRequests = useCallback(async () => {
    if (!token || !isAuthenticated) {
      setPendingRequests([]);
      return;
    }

    try {
      const result = await getMyGigRequests(token);
      setPendingRequests(result.requests || []);
    } catch {
      setPendingRequests([]);
    }
  }, [token, isAuthenticated]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    const hasRequestNotification = notifications.some((item) => item.event === "gig_request");
    if (hasRequestNotification) {
      void loadRequests();
    }
  }, [notifications, loadRequests]);

  const totalBellCount = useMemo(
    () => pendingRequests.length + notifications.length,
    [pendingRequests.length, notifications.length],
  );

  const handleAcceptRequest = async (requestItem: GigRequestItem) => {
    if (!token) {
      return;
    }

    const key = `${requestItem.gigId}:${requestItem.applicantId}:accept`;
    setBusyRequestKey(key);
    try {
      await acceptGigRequest(token, requestItem.gigId, requestItem.applicantId);
      setPendingRequests((prev) => prev.filter((item) => !(item.gigId === requestItem.gigId && item.applicantId === requestItem.applicantId)));
    } finally {
      setBusyRequestKey("");
    }
  };

  const handleDenyRequest = async (requestItem: GigRequestItem) => {
    if (!token) {
      return;
    }

    const key = `${requestItem.gigId}:${requestItem.applicantId}:deny`;
    setBusyRequestKey(key);
    try {
      await denyGigRequest(token, requestItem.gigId, requestItem.applicantId);
      setPendingRequests((prev) => prev.filter((item) => !(item.gigId === requestItem.gigId && item.applicantId === requestItem.applicantId)));
    } finally {
      setBusyRequestKey("");
    }
  };

  const handleSignOut = () => {
    signOut();
    router.push("/");
  };

  return (
    <header className="sticky top-0 z-50 border-b border-black/10 bg-white/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Link href="/" className="text-lg font-semibold tracking-tight text-black">
          חלתורה
        </Link>

        <nav className="flex items-center gap-1 text-sm text-neutral-700 sm:gap-2">
          <Link href="/" className={`hidden sm:inline-flex ${navButtonClass}`}>
            בית
          </Link>
          <Link href="/gigs" className={navButtonClass}>
            חלתורות
          </Link>
          <Link
            href="/post"
            className="inline-flex h-9 items-center rounded-full bg-black px-4 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow"
          >
            פרסום
          </Link>
          {isAuthenticated ? (
            <Link href="/tasks" className={navButtonClass}>
              משימות
            </Link>
          ) : null}

          {!loading && (
            <>
              {isAuthenticated ? (
                <>
                  {user?._id ? (
                    <Link
                      href={`/users/${user._id}`}
                      className="hidden sm:inline-flex h-9 items-center rounded-full px-3 text-xs font-medium text-neutral-500 transition-all duration-200 hover:bg-white hover:text-black hover:shadow-sm"
                    >
                      פרופיל
                    </Link>
                  ) : null}
                  {user?.role === "admin" ? (
                    <Link
                      href="/admin"
                      className="hidden sm:inline-flex h-9 items-center rounded-full border border-amber-200 bg-amber-50 px-3 text-xs font-semibold text-amber-700 transition-all duration-200 hover:-translate-y-0.5 hover:bg-amber-100 hover:shadow-sm"
                    >
                      ניהול
                    </Link>
                  ) : null}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setBellOpen((prev) => !prev)}
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/5 bg-white/70 text-neutral-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-white hover:text-black hover:shadow"
                      title={totalBellCount > 0 ? `${totalBellCount} התראות חדשות` : "התראות"}
                    >
                      🔔
                      {totalBellCount > 0 ? (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                          {totalBellCount > 9 ? "9+" : totalBellCount}
                        </span>
                      ) : null}
                    </button>

                    {bellOpen ? (
                      <div className="absolute left-0 z-50 mt-2 w-[320px] rounded-xl border border-black/10 bg-white p-3 shadow-xl">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-neutral-900">התראות</p>
                          <button
                            type="button"
                            onClick={() => {
                              dismissAll();
                              setBellOpen(false);
                            }}
                            className="text-xs text-neutral-500 hover:text-black"
                          >
                            ניקוי
                          </button>
                        </div>

                        <div className="max-h-80 space-y-2 overflow-y-auto">
                          {pendingRequests.map((requestItem) => {
                            const acceptKey = `${requestItem.gigId}:${requestItem.applicantId}:accept`;
                            const denyKey = `${requestItem.gigId}:${requestItem.applicantId}:deny`;
                            const isAcceptBusy = busyRequestKey === acceptKey;
                            const isDenyBusy = busyRequestKey === denyKey;

                            return (
                              <div key={`${requestItem.gigId}:${requestItem.applicantId}`} className="rounded-lg border border-black/10 bg-neutral-50 p-2">
                                <p className="text-xs font-medium text-neutral-900">{requestItem.applicantName} רוצה לבצע: {requestItem.gigTitle}</p>
                                <div className="mt-2 flex gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAcceptRequest(requestItem)}
                                    disabled={isAcceptBusy || isDenyBusy}
                                    className="rounded-md bg-emerald-700 px-2 py-1 text-xs font-medium text-white disabled:opacity-60"
                                  >
                                    {isAcceptBusy ? "מאשר..." : "אישור"}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDenyRequest(requestItem)}
                                    disabled={isAcceptBusy || isDenyBusy}
                                    className="rounded-md border border-black/15 px-2 py-1 text-xs font-medium text-neutral-700 disabled:opacity-60"
                                  >
                                    {isDenyBusy ? "דוחה..." : "דחייה"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}

                          {notifications.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => dismiss(item.id)}
                              className="w-full rounded-lg border border-black/10 bg-white p-2 text-right text-xs text-neutral-700 hover:bg-neutral-50"
                            >
                              {item.message}
                            </button>
                          ))}

                          {pendingRequests.length === 0 && notifications.length === 0 ? (
                            <p className="py-4 text-center text-xs text-neutral-500">אין התראות חדשות</p>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                  <span className="hidden sm:inline max-w-[100px] truncate text-xs text-neutral-500">
                    🟢 ${Math.floor(user?.balance || 0)} · {user?.name}
                  </span>
                  <Button
                    onClick={handleSignOut}
                    size="sm"
                    variant="outline"
                    className="h-9 rounded-full border-black/15 bg-white px-4 font-medium text-neutral-800 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-black hover:text-white"
                  >
                    <span className="hidden sm:inline">התנתקות</span>
                    <span className="sm:hidden">יציאה</span>
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  onClick={() => router.push("/auth")}
                  className="h-9 rounded-full bg-black px-4 font-semibold text-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:bg-neutral-800 hover:shadow"
                >
                  התחברות
                </Button>
              )}
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
