"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
import { useSSE } from "@/hooks/useSSE";
import {
  confirmGigReceipt,
  getMyTasks,
  markGigAsFinished,
  type GigItem,
} from "@/services/api";
import { Button } from "@/components/ui/button";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), {
  ssr: false,
});

const progressLabel = (gig: GigItem) => {
  if (gig.status === "completed") {
    return "החלתורה הושלמה";
  }

  if (gig.freelancerConfirmed && !gig.clientConfirmed) {
    return "ממתין לאישור הלקוח";
  }

  if (!gig.freelancerConfirmed && gig.clientConfirmed) {
    return "ממתין לאישור הפרילנסר";
  }

  return "ממתין לאישור הפרילנסר";
};

export default function TasksPage() {
  const { token, user, isAuthenticated } = useAuth();
  const { notifications } = useSSE(isAuthenticated ? token : null);
  const [tasks, setTasks] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyTaskId, setBusyTaskId] = useState("");

  const loadTasks = useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await getMyTasks(token);
      setTasks(result.gigs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "טעינת המשימות נכשלה");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  // Reload tasks when a request is accepted or denied via SSE
  useEffect(() => {
    if (notifications.some((n) => n.event === "gig_request_accepted" || n.event === "gig_request_denied")) {
      void loadTasks();
    }
  }, [notifications, loadTasks]);

  const onMarkDone = async (gigId: string) => {
    if (!token) {
      return;
    }

    setBusyTaskId(gigId);
    setError("");

    try {
      await markGigAsFinished(token, gigId);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "עדכון סטטוס נכשל");
    } finally {
      setBusyTaskId("");
    }
  };

  const onConfirmReceipt = async (gigId: string) => {
    if (!token) {
      return;
    }

    setBusyTaskId(gigId);
    setError("");

    try {
      await confirmGigReceipt(token, gigId);
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "אישור קבלה נכשל");
    } finally {
      setBusyTaskId("");
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen text-white">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="text-sm text-white/50">יש להתחבר כדי לצפות במשימות.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
        <h1 className="mb-6 text-3xl font-semibold">ניהול משימות</h1>

        {loading ? <p className="text-sm text-white/50">טוען משימות...</p> : null}
        {error ? <p className="mb-4 text-sm text-red-400">{error}</p> : null}

        {!loading && tasks.length === 0 ? (
          <p className="text-sm text-white/50">אין כרגע משימות פעילות.</p>
        ) : null}

        <div className="space-y-4">
          {tasks.map((gig) => {
            const isPending = gig.status === "open";
            const isFreelancer = Boolean(user?._id && gig.freelancer?._id === user._id);
            const isClient = Boolean(user?._id && gig.client?._id === user._id);
            const isBusy = busyTaskId === gig._id;

            return (
              <div key={gig._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                {/* Card header */}
                <div className="flex items-center justify-between gap-2 border-b border-white/8 px-5 py-4">
                  <h3 className="text-base font-semibold text-white">{gig.title}</h3>
                  {isPending && (
                    <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                      ממתין לאישור
                    </span>
                  )}
                </div>

                {/* Card body */}
                <div className="space-y-3 px-5 py-4">
                  {isPending ? (
                    <div className="rounded-xl border border-amber-400/20 bg-amber-500/10 p-3 text-sm">
                      <p className="font-medium text-amber-300">ממתין לאישור הלקוח</p>
                      <p className="mt-1 text-xs text-amber-400/80">
                        שלחת בקשה לחלתורה זו. תקבל התראה כשהלקוח יאשר או ידחה.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
                      <p className="font-medium text-white">{progressLabel(gig)}</p>
                      <p className="mt-1 text-xs text-white/50">
                        ממתין לפרילנסר {"->"} ממתין ללקוח {"->"} הושלם
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-white/50">
                    {isPending ? (
                      <>
                        בעל החלתורה:{" "}
                        {gig.author?._id ? (
                          <Link href={`/users/${gig.author._id}`} className="text-blue-400/80 hover:underline hover:text-blue-300">{gig.author.name || "-"}</Link>
                        ) : "-"}
                      </>
                    ) : (
                      <>
                        לקוח:{" "}
                        {gig.client?._id ? (
                          <Link href={`/users/${gig.client._id}`} className="text-blue-400/80 hover:underline hover:text-blue-300">{gig.client.name || "-"}</Link>
                        ) : "-"}
                        {" | "}פרילנסר:{" "}
                        {gig.freelancer?._id ? (
                          <Link href={`/users/${gig.freelancer._id}`} className="text-blue-400/80 hover:underline hover:text-blue-300">{gig.freelancer.name || "-"}</Link>
                        ) : "-"}
                      </>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isFreelancer && gig.status === "in_progress" && !gig.freelancerConfirmed ? (
                      <Button size="sm" disabled={isBusy} onClick={() => onMarkDone(gig._id)}>
                        {isBusy ? "שולח..." : "סיימתי את העבודה"}
                      </Button>
                    ) : null}

                    {isClient && gig.status === "in_progress" && !gig.clientConfirmed ? (
                      <Button size="sm" disabled={isBusy} onClick={() => onConfirmReceipt(gig._id)}>
                        {isBusy ? "שולח..." : "אישרתי קבלה"}
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
