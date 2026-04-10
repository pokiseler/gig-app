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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
          <p className="text-sm text-neutral-600">יש להתחבר כדי לצפות במשימות.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-white" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
        <h1 className="mb-6 text-3xl font-semibold">ניהול משימות</h1>

        {loading ? <p>טוען משימות...</p> : null}
        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

        {!loading && tasks.length === 0 ? (
          <p className="text-sm text-neutral-600">אין כרגע משימות פעילות.</p>
        ) : null}

        <div className="space-y-4">
          {tasks.map((gig) => {
            const isPending = gig.status === "open";
            const isFreelancer = Boolean(user?._id && gig.freelancer?._id === user._id);
            const isClient = Boolean(user?._id && gig.client?._id === user._id);
            const isBusy = busyTaskId === gig._id;

            return (
              <Card key={gig._id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span>{gig.title}</span>
                    {isPending && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                        ממתין לאישור
                      </span>
                    )}
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  {isPending ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
                      <p className="font-medium text-amber-800">ממתין לאישור הלקוח</p>
                      <p className="mt-1 text-xs text-amber-600">
                        שלחת בקשה לחלתורה זו. תקבל התראה כשהלקוח יאשר או ידחה.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-black/10 bg-neutral-50 p-3 text-sm">
                      <p className="font-medium text-neutral-900">{progressLabel(gig)}</p>
                      <p className="mt-1 text-xs text-neutral-600">
                        ממתין לפרילנסר {"->"} ממתין ללקוח {"->"} הושלם
                      </p>
                    </div>
                  )}

                  <div className="text-xs text-neutral-600">
                    {isPending ? (
                      <>
                        בעל החלתורה:{" "}
                        {gig.author?._id ? (
                          <Link href={`/users/${gig.author._id}`} className="hover:underline">{gig.author.name || "-"}</Link>
                        ) : "-"}
                      </>
                    ) : (
                      <>
                        לקוח:{" "}
                        {gig.client?._id ? (
                          <Link href={`/users/${gig.client._id}`} className="hover:underline">{gig.client.name || "-"}</Link>
                        ) : "-"}
                        {" | "}פרילנסר:{" "}
                        {gig.freelancer?._id ? (
                          <Link href={`/users/${gig.freelancer._id}`} className="hover:underline">{gig.freelancer.name || "-"}</Link>
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
                </CardContent>
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
