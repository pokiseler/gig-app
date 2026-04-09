"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Menu, X, Bell, Home, Briefcase, PlusCircle,
  ClipboardList, User, LogOut, LogIn, ShieldCheck, Coins, MessageSquare,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSSE } from "@/hooks/useSSE";
import { useChat } from "@/context/ChatContext";
import {
  acceptGigRequest,
  denyGigRequest,
  getChatThreads,
  getMyGigRequests,
  type GigRequestItem,
} from "@/services/api";

export function Navbar() {
  const { user, token, isAuthenticated, signOut, loading } = useAuth();
  const { notifications, dismiss, dismissAll } = useSSE(isAuthenticated ? token : null);
  const { openChat } = useChat();
  const router = useRouter();

  const [pendingRequests, setPendingRequests] = useState<GigRequestItem[]>([]);
  const [bellOpen, setBellOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busyRequestKey, setBusyRequestKey] = useState("");
  const [unreadMsgCount, setUnreadMsgCount] = useState(0);
  const prevNotifCountRef = useRef(0);

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

  // Load initial unread message count from DB
  useEffect(() => {
    if (!token || !isAuthenticated) { setUnreadMsgCount(0); return; }
    getChatThreads(token)
      .then((res) => {
        const total = res.threads.reduce((sum, t) => sum + (t.unread || 0), 0);
        setUnreadMsgCount(total);
      })
      .catch(() => { /* network error — badge stays at 0 */ });
  }, [token, isAuthenticated]);

  // Increment unread count for each new_message SSE event
  useEffect(() => {
    const newItems = notifications.slice(prevNotifCountRef.current);
    prevNotifCountRef.current = notifications.length;
    const count = newItems.filter((n) => n.event === "new_message").length;
    if (count > 0) setUnreadMsgCount((v) => v + count);
  }, [notifications]);

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
      // Auto-open chat with the accepted applicant
      openChat(req.applicantId, req.applicantName);
      setBellOpen(false);
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
            href={isAuthenticated ? "/post" : "/auth"}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-l from-blue-600 to-blue-500 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/40 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-blue-700/50"
          >
            <PlusCircle className="h-4 w-4" />פרסום
          </Link>
          {isAuthenticated && (
            <>
              <Link href="/tasks" className={navLink}><ClipboardList className="h-4 w-4" />משימות</Link>
              <Link href="/messages" onClick={() => setUnreadMsgCount(0)} className={`relative ${navLink}`}>
                <MessageSquare className="h-4 w-4" />
                הודעות
                {unreadMsgCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                  </span>
                )}
              </Link>
            </>
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
                      <div className="glass-heavy absolute left-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] rounded-2xl p-3">
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
                                <p className="text-xs font-medium text-white"><Link href={`/users/${req.applicantId}`} onClick={closeAll} className="text-blue-300 hover:underline">{req.applicantName}</Link> רוצה לבצע: {req.gigTitle}</p>
                                <div className="mt-2 flex gap-2">
                                  <button type="button" onClick={() => handleAcceptRequest(req)} disabled={busyRequestKey === aKey || busyRequestKey === dKey} className="rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-medium text-white disabled:opacity-50">
                                    {busyRequestKey === aKey ? "מאשר..." : "אישור"}
                                  </button>
                                  <button type="button" onClick={() => handleDenyRequest(req)} disabled={busyRequestKey === aKey || busyRequestKey === dKey} className="rounded-lg border border-white/15 px-2.5 py-2 text-xs font-medium text-white/70 disabled:opacity-50">
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
                  {typeof user?.balance === "number" && (
                    <span className="hidden items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-semibold text-amber-300 lg:inline-flex">
                      <Coins className="h-3 w-3" />
                      {user.balance.toLocaleString("he-IL")}
                    </span>
                  )}
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

        {/* ── Mobile: messages + bell + hamburger ── */}
        <div className="flex items-center gap-2 sm:hidden">
          {isAuthenticated && (
            <>
              <Link
                href="/messages"
                onClick={() => { setUnreadMsgCount(0); closeAll(); }}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70"
                title="הודעות"
              >
                <MessageSquare className="h-4 w-4" />
                {unreadMsgCount > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                    {unreadMsgCount > 9 ? "9+" : unreadMsgCount}
                  </span>
                )}
              </Link>
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
            </>
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
                  <p className="text-xs font-medium text-white"><Link href={`/users/${req.applicantId}`} onClick={closeAll} className="text-blue-300 hover:underline">{req.applicantName}</Link> רוצה לבצע: {req.gigTitle}</p>
                  <div className="mt-2 flex gap-2">
                    <button type="button" onClick={() => handleAcceptRequest(req)} disabled={busyRequestKey === aKey || busyRequestKey === dKey} className="rounded-lg bg-emerald-600 px-2.5 py-2 text-xs font-medium text-white disabled:opacity-50">
                      {busyRequestKey === aKey ? "מאשר..." : "אישור"}
                    </button>
                    <button type="button" onClick={() => handleDenyRequest(req)} disabled={busyRequestKey === aKey || busyRequestKey === dKey} className="rounded-lg border border-white/15 px-2.5 py-2 text-xs font-medium text-white/70 disabled:opacity-50">
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
              { href: isAuthenticated ? "/post" : "/auth", label: "פרסום חלתורה", icon: <PlusCircle className="h-4 w-4" /> },
              ...(isAuthenticated ? [
                { href: "/tasks", label: "משימות שלי", icon: <ClipboardList className="h-4 w-4" /> },
                { href: "/messages", label: "הודעות", icon: <MessageSquare className="h-4 w-4" /> },
              ] : []),
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
