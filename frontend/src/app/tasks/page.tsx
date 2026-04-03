"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/hooks/useAuth";
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
    return "התשלום שוחרר";
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
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe1,_#f3f4ef_45%,_#ecefe8)] text-neutral-900">
        <Navbar />
        <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
          <p className="text-sm text-neutral-600">יש להתחבר כדי לצפות במשימות.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe1,_#f3f4ef_45%,_#ecefe8)] text-neutral-900" dir="rtl">
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
            const isFreelancer = Boolean(user?._id && gig.freelancer?._id === user._id);
            const isClient = Boolean(user?._id && gig.client?._id === user._id);
            const isBusy = busyTaskId === gig._id;

            return (
              <Card key={gig._id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-base">
                    <span>{gig.title}</span>
                    <span className="text-sm font-normal text-neutral-600">25 נקודות</span>
                  </CardTitle>
                </CardHeader>

                <CardContent className="space-y-3">
                  <div className="rounded-lg border border-black/10 bg-neutral-50 p-3 text-sm">
                    <p className="font-medium text-neutral-900">{progressLabel(gig)}</p>
                    <p className="mt-1 text-xs text-neutral-600">
                      ממתין לפרילנסר {"->"} ממתין ללקוח {"->"} התשלום שוחרר
                    </p>
                  </div>

                  <div className="text-xs text-neutral-600">
                    לקוח: {gig.client?.name || "-"} | פרילנסר: {gig.freelancer?.name || "-"}
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
