"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu, X, Bell, Home, Briefcase, PlusCircle,
  ClipboardList, User, LogOut, LogIn, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSSE } from "@/hooks/useSSE";
import {
  acceptGigRequest,
  denyGigRequest,
  getMyGigRequests,
  type GigRequestItem,
} from "@/services/api";

export function Navbar() {
  const { user, token, isAuthenticated, signOut, loading } = useAuth();
  const { notifications, dismiss, dismissAll } = useSSE(isAuthenticated ? token : null);
  const router = useRouter();

  const [pendingRequests, setPendingRequests] = useState<GigRequestItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busyRequestKey, setBusyRequestKey] = useState("");

  const closeAll = () => {
    setBellOpen(false);
    setMenuOpen(false);
  };

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

  useEffect(() => { void loadRequests(); }, [loadRequests]);

  useEffect(() => {
    if (notifications.some((n) => n.event === "gig_request")) void loadRequests();
  }, [notifications, loadRequests]);

  const totalBellCount = useMemo(
    () => pendingRequests.length + notifications.length,
    [pendingRequests.length, notifications.length],
  );

  const handleAcceptRequest = async (req: GigRequestItem) => {
    if (!token) return;
    const key = `${req.gigId}:${req.applicantId}:accept`;
    setBusyRequestKey(key);
    try {
      await acceptGigRequest(token, req.gigId, req.applicantId);
      setPendingRequests((prev) =>
        prev.filter((r) => !(r.gigId === req.gigId && r.applicantId === req.applicantId)),
      );
    } finally { setBusyRequestKey(""); }
  };

  const handleDenyRequest = async (req: GigRequestItem) => {
    if (!token) return;
    const key = `${req.gigId}:${req.applicantId}:deny`;
    setBusyRequestKey(key);
    try {
      await denyGigRequest(token, req.gigId, req.applicantId);
      setPendingRequests((prev) =>
        prev.filter((r) => !(r.gigId === req.gigId && r.applicantId === req.applicantId)),
      );
    } finally { setBusyRequestKey(""); }
  };

  const handleSignOut = () => {
    signOut();
    closeAll();
    router.push("/");
  };

  // Shared link class for desktop nav
  const navLink =
    "inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-white/70 transition-all duration-200 hover:bg-white/10 hover:text-white";

  return (
    <header className="sticky top-0 z-50 glass border-b border-white/10">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">

        {/* ── Logo ── */}
        <Link
          href="/"
          onClick={closeAll}
          className="text-lg font-extrabold tracking-tight"
        >
          <span className="bg-gradient-to-l from-blue-300 to-blue-500 bg-clip-text text-transparent">
            חלתורה
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden sm:flex items-center gap-1">
          <Link href="/" className={navLink}><Home className="h-4 w-4" />בית</Link>
          <Link href="/gigs" className={navLink}><Briefcase className="h-4 w-4" />חלתורות</Link>
          <Link
            href={isAuthenticated ? "/post" : "/register"}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-l from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-700/50"
          >
            <PlusCircle className="h-4 w-4" />פרסום
          </Link>
          {isAuthenticated && (
            <Link href="/tasks" className={navLink}><ClipboardList className="h-4 w-4" />משימות</Link>
          )}
          {!loading && (
            <>
              {isAuthenticated ? (
                <>
                  {user?._id && (
                    <Link href={`/users/${user._id}`} className={navLink}>
                      <User className="h-4 w-4" />פרופיל
                    </Link>
                  )}
                  {user?.role === "admin" && (
                    <Link
                      href="/admin"
                      className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-400/20"
                    >
                      <ShieldCheck className="h-3.5 w-3.5" />ניהול
                    </Link>
                  )}

                  {/* Bell */}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setBellOpen((v) => !v); setMenuOpen(false); }}
                      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
                      title={totalBellCount > 0 ? `${totalBellCount} התראות` : "התראות"}
                    >
                      <Bell className="h-4 w-4" />
                      {totalBellCount > 0 && (
                        <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                          {totalBellCount > 9 ? "9+" : totalBellCount}
                        </span>
                      )}
                    </button>

                    {bellOpen && (
                      <div className="glass-heavy absolute left-0 z-50 mt-2 w-80 rounded-2xl p-3">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-semibold text-white">התראות</p>
                          <button
                            type="button"
                            onClick={() => { dismissAll(); setBellOpen(false); }}
                            className="text-xs text-white/50 hover:text-white"
                          >
                            ניקוי
                          </button>
                        </div>
                        <div className="max-h-72 space-y-2 overflow-y-auto">
                          {pendingRequests.map((req) => {
                            const aKey = `${req.gigId}:${req.applicantId}:accept`;
                            const dKey = `${req.gigId}:${req.applicantId}:deny`;
                            return (
                              <div key={`${req.gigId}:${req.applicantId}`} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                                <p className="text-xs font-medium text-white">{req.applicantName} רוצה לבצע: {req.gigTitle}</p>
                                <div className="mt-2 flex gap-2">
                                  <button type="button" onClick={() => handleAcceptRequest(req)} disabled={busyRequestKey === aKey || busyRequestKey === dKey} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
                                    {busyRequestKey === aKey ? "מאשר..." : "אישור"}
                                  </button>
                                  <button type="button" onClick={() => handleDenyRequest(req)} disabled={busyRequestKey === aKey || busyRequestKey === dKey} className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-white/70 disabled:opacity-50">
                                    {busyRequestKey === dKey ? "דוחה..." : "דחייה"}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {notifications.map((n) => (
                            <button key={n.id} type="button" onClick={() => dismiss(n.id)} className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-right text-xs text-white/70 hover:bg-white/10">
                              {n.message}
                            </button>
                          ))}
                          {pendingRequests.length === 0 && notifications.length === 0 && (
                            <p className="py-4 text-center text-xs text-white/40">אין התראות חדשות</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <span className="hidden max-w-[100px] truncate text-xs text-white/40 lg:inline">
                    {user?.name}
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="inline-flex h-9 items-center gap-1.5 rounded-full border border-white/15 px-3 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
                  >
                    <LogOut className="h-4 w-4" />
                    <span className="hidden sm:inline">יציאה</span>
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => router.push("/auth")}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-l from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition hover:-translate-y-0.5"
                >
                  <LogIn className="h-4 w-4" />התחברות
                </button>
              )}
            </>
          )}
        </nav>

        {/* ── Mobile: bell + hamburger ── */}
        <div className="flex items-center gap-2 sm:hidden">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => { setBellOpen((v) => !v); setMenuOpen(false); }}
              className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70"
            >
              <Bell className="h-4 w-4" />
              {totalBellCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {totalBellCount > 9 ? "9+" : totalBellCount}
                </span>
              )}
            </button>
          )}
          <button
            type="button"
            onClick={() => { setMenuOpen((v) => !v); setBellOpen(false); }}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            aria-label={menuOpen ? "סגור תפריט" : "פתח תפריט"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* ── Mobile bell dropdown ── */}
      {bellOpen && isAuthenticated && (
        <div className="glass-heavy mx-4 mb-3 rounded-2xl p-3 sm:hidden">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-semibold text-white">התראות</p>
            <button type="button" onClick={() => { dismissAll(); setBellOpen(false); }} className="text-xs text-white/50 hover:text-white">ניקוי</button>
          </div>
          <div className="max-h-60 space-y-2 overflow-y-auto">
            {pendingRequests.map((req) => {
              const aKey = `${req.gigId}:${req.applicantId}:accept`;
              const dKey = `${req.gigId}:${req.applicantId}:deny`;
              return (
                <div key={`${req.gigId}:${req.applicantId}`} className="rounded-xl border border-white/10 bg-white/5 p-2.5">
                  <p className="text-xs font-medium text-white">{req.applicantName} רוצה לבצע: {req.gigTitle}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => handleAcceptRequest(req)} disabled={busyRequestKey === aKey || busyRequestKey === dKey} className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white disabled:opacity-50">
                      {busyRequestKey === aKey ? "מאשר..." : "אישור"}
                    </button>
                    <button type="button" onClick={() => handleDenyRequest(req)} disabled={busyRequestKey === aKey || busyRequestKey === dKey} className="rounded-lg border border-white/15 px-2.5 py-1 text-xs font-medium text-white/70 disabled:opacity-50">
                      {busyRequestKey === dKey ? "דוחה..." : "דחייה"}
                    </button>
                  </div>
                </div>
              );
            })}
            {notifications.map((n) => (
              <button key={n.id} type="button" onClick={() => dismiss(n.id)} className="w-full rounded-xl border border-white/10 bg-white/5 p-2 text-right text-xs text-white/70">
                {n.message}
              </button>
            ))}
            {pendingRequests.length === 0 && notifications.length === 0 && (
              <p className="py-3 text-center text-xs text-white/40">אין התראות חדשות</p>
            )}
          </div>
        </div>
      )}

      {/* ── Mobile nav menu ── */}
      {menuOpen && (
        <nav className="glass-heavy border-t border-white/10 px-4 py-4 sm:hidden" dir="rtl">
          <div className="flex flex-col gap-1">
            {[
              { href: "/", label: "בית", icon: <Home className="h-4 w-4" /> },
              { href: "/gigs", label: "חלתורות", icon: <Briefcase className="h-4 w-4" /> },
              { href: isAuthenticated ? "/post" : "/register", label: "פרסום חלתורה", icon: <PlusCircle className="h-4 w-4" /> },
              ...(isAuthenticated ? [{ href: "/tasks", label: "משימות שלי", icon: <ClipboardList className="h-4 w-4" /> }] : []),
              ...(isAuthenticated && user?._id ? [{ href: `/users/${user._id}`, label: "פרופיל שלי", icon: <User className="h-4 w-4" /> }] : []),
              ...(user?.role === "admin" ? [{ href: "/admin", label: "לוח ניהול", icon: <ShieldCheck className="h-4 w-4" /> }] : []),
            ].map(({ href, label, icon }) => (
              <Link
                key={href}
                href={href}
                onClick={closeAll}
                className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <span className="text-white/50">{icon}</span>
                {label}
              </Link>
            ))}

            <div className="my-2 border-t border-white/10" />

            {!loading && (
              isAuthenticated ? (
                <>
                  {user && (
                    <div className="px-3 py-2 text-xs text-white/40">
                      מחובר כ: <span className="text-white/70 font-medium">{user.name}</span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium text-red-400 transition hover:bg-red-400/10"
                  >
                    <LogOut className="h-4 w-4" />התנתקות
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => { router.push("/auth"); closeAll(); }}
                  className="flex items-center gap-3 rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 px-4 py-3 text-sm font-semibold text-white"
                >
                  <LogIn className="h-4 w-4" />התחברות / הרשמה
                </button>
              )
            )}
          </div>
        </nav>
      )}
    </header>
  );
}


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
