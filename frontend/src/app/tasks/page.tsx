"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { CalendarClock, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSSE } from "@/hooks/useSSE";
import {
  confirmGigReceipt,
  createReview,
  getMyTasks,
  markGigAsFinished,
  type GigItem,
} from "@/services/api";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewGig, setReviewGig] = useState<GigItem | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const activeTasks = tasks.filter((gig) => gig.status === "in_progress" || gig.status === "open");
  const completedTasks = tasks.filter((gig) => gig.status === "completed");

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
    if (notifications.some((n) => n.event === "gig_request_accepted" || n.event === "gig_request_denied" || n.event === "gig_waiting_client_confirmation")) {
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
      const result = await markGigAsFinished(token, gigId);
      setTasks((prev) => prev.map((item) => (item._id === gigId ? result.gig : item)));
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
      const result = await confirmGigReceipt(token, gigId);
      setTasks((prev) => prev.map((item) => (item._id === gigId ? result.gig : item)));
      if (result.gig?.status === "completed" && result.gig?.freelancer?._id) {
        setReviewGig(result.gig);
        setReviewRating(5);
        setReviewComment("");
        setReviewError("");
        setReviewOpen(true);
      }
      await loadTasks();
    } catch (err) {
      setError(err instanceof Error ? err.message : "אישור קבלה נכשל");
    } finally {
      setBusyTaskId("");
    }
  };

  const onSubmitReview = async () => {
    if (!token || !reviewGig?.freelancer?._id) return;
    setReviewBusy(true);
    setReviewError("");
    try {
      await createReview(token, {
        targetUser: reviewGig.freelancer._id,
        gigId: reviewGig._id,
        gigName: reviewGig.title,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviewOpen(false);
      setReviewGig(null);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "שליחת הביקורת נכשלה");
    } finally {
      setReviewBusy(false);
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

        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="mb-4 w-full bg-white/5 p-1">
            <TabsTrigger value="pending">משימות שממתינות לאישור</TabsTrigger>
            <TabsTrigger value="history">משימות שבוצעו בעבר</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            {!loading && activeTasks.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-10 text-center">
                <div className="text-4xl">🧭</div>
                <p className="mt-3 text-sm font-medium text-white/80">אין לך משימות פעילות כרגע</p>
                <p className="mt-1 text-xs text-white/50">ברגע שתתקבל לחלתורה, היא תופיע כאן.</p>
              </div>
            ) : null}

            <div className="space-y-4">
              {activeTasks.map((gig) => {
                const isPending = gig.status === "open";
                const isFreelancer = Boolean(user?._id && gig.freelancer?._id === user._id);
                const isClient = Boolean(user?._id && gig.client?._id === user._id);
                const isBusy = busyTaskId === gig._id;
                const stampSource = gig.updatedAt || gig.createdAt;
                const stampLabel = gig.updatedAt ? "עודכן ב-" : "נוצר ב-";
                const formattedStamp = stampSource ? format(new Date(stampSource), "dd/MM | HH:mm", { locale: he }) : null;

                return (
                  <div key={gig._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                    <div className="flex flex-col gap-2 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="text-base font-semibold text-white">{gig.title}</h3>
                      {isPending ? (
                        <span className="shrink-0 rounded-full border border-amber-400/20 bg-amber-500/20 px-2.5 py-0.5 text-xs font-medium text-amber-300">
                          ממתין לאישור
                        </span>
                      ) : null}
                    </div>

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

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50">
                        {gig.location?.city ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {gig.location.city}
                          </span>
                        ) : null}
                        {formattedStamp ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            {stampLabel} {formattedStamp}
                          </span>
                        ) : null}
                      </div>

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
          </TabsContent>

          <TabsContent value="history">
            {!loading && completedTasks.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-10 text-center">
                <div className="text-4xl">🏁</div>
                <p className="mt-3 text-sm font-medium text-white/80">עדיין אין משימות שבוצעו</p>
                <p className="mt-1 text-xs text-white/50">כשתשלים חלתורה, היא תופיע כאן בהיסטוריה.</p>
              </div>
            ) : null}

            <div className="space-y-4">
              {completedTasks.map((gig) => {
                const stampSource = gig.updatedAt || gig.createdAt;
                const formattedStamp = stampSource ? format(new Date(stampSource), "dd/MM | HH:mm", { locale: he }) : null;

                return (
                  <div key={gig._id} className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                    <div className="flex flex-col gap-2 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                      <h3 className="text-base font-semibold text-white">{gig.title}</h3>
                      <span className="shrink-0 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-2.5 py-0.5 text-xs font-medium text-emerald-300">
                        הושלם
                      </span>
                    </div>
                    <div className="space-y-3 px-5 py-4">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50">
                        {gig.location?.city ? (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {gig.location.city}
                          </span>
                        ) : null}
                        {formattedStamp ? (
                          <span className="inline-flex items-center gap-1">
                            <CalendarClock className="h-3.5 w-3.5" />
                            עודכן ב- {formattedStamp}
                          </span>
                        ) : null}
                      </div>
                      <div className="text-xs text-white/50">
                        לקוח:{" "}
                        {gig.client?._id ? (
                          <Link href={`/users/${gig.client._id}`} className="text-blue-400/80 hover:underline hover:text-blue-300">{gig.client.name || "-"}</Link>
                        ) : "-"}
                        {" | "}פרילנסר:{" "}
                        {gig.freelancer?._id ? (
                          <Link href={`/users/${gig.freelancer._id}`} className="text-blue-400/80 hover:underline hover:text-blue-300">{gig.freelancer.name || "-"}</Link>
                        ) : "-"}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Dialog open={reviewOpen} onOpenChange={(open) => { if (!open) setReviewOpen(false); }}>
        <DialogContent dir="rtl" className="glass-heavy border border-white/10 text-right sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">איך היה לעבוד עם {reviewGig?.freelancer?.name || "הפרילנסר"}?</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="mb-2 text-sm text-white/60">דירוג</p>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setReviewRating(star)}
                    className={`text-2xl transition-transform hover:scale-110 ${
                      star <= reviewRating ? "text-amber-400" : "text-white/20"
                    }`}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm text-white/60">הערה (אופציונלי)</p>
              <Textarea
                value={reviewComment}
                onChange={(event) => setReviewComment(event.target.value)}
                placeholder="תאר בקצרה את החוויה..."
                rows={3}
                className="resize-none border-white/15 bg-white/5 text-white placeholder:text-white/30"
              />
            </div>
            {reviewError ? <p className="text-sm text-red-400">{reviewError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setReviewOpen(false)} disabled={reviewBusy}>סגור</Button>
              <Button onClick={onSubmitReview} disabled={reviewBusy}>
                {reviewBusy ? "שולח..." : "שלח ביקורת"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
