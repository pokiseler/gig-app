"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Star } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, createReview, type GigItem, type ReviewItem, type AuthUser } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), { ssr: false });

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id;
  const { user: currentUser, token, isAuthenticated } = useAuth();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<GigItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Review modal
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewBusy, setReviewBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState(false);

  const isOwner = Boolean(currentUser?._id && userId && currentUser._id === userId);
  const canReview = isAuthenticated && !isOwner;
  const avatarSrc = user?.avatarUrl
    ? `${user.avatarUrl}${user.avatarUrl.includes("?") ? "&" : "?"}v=${encodeURIComponent(user.updatedAt || "")}`
    : "";

  useEffect(() => {
    if (!userId) {
      return;
    }

    getUserProfile(userId)
      .then((result) => {
        setUser(result.user);
        setRequests(result.requests || []);
        setReviews(result.reviews || []);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת הפרופיל נכשלה"))
      .finally(() => setLoading(false));
  }, [userId]);

  const openReviewModal = () => {
    setReviewRating(5);
    setReviewComment("");
    setReviewError("");
    setReviewSuccess(false);
    setReviewOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!token || !userId) return;
    setReviewBusy(true);
    setReviewError("");
    try {
      const res = await createReview(token, {
        targetUser: userId,
        rating: reviewRating,
        comment: reviewComment.trim(),
      });
      setReviews((prev) => [res.review, ...prev]);
      setReviewSuccess(true);
      setTimeout(() => setReviewOpen(false), 1200);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "שליחת הביקורת נכשלה");
    } finally {
      setReviewBusy(false);
    }
  };

  return (
    <div className="profile-font min-h-screen text-white" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
        {loading ? <p>טוען פרופיל...</p> : null}
        {error ? <p className="text-red-400">{error}</p> : null}

        {user ? (
          <Card className="glass-heavy border-white/10 shadow-none">
            <CardHeader>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-4">
                  {user.avatarUrl ? (
                    <Image
                      src={avatarSrc}
                      alt={user.name}
                      width={80}
                      height={80}
                      unoptimized
                      className="h-20 w-20 rounded-2xl object-cover ring-1 ring-white/20"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-500/20 text-2xl font-semibold text-blue-300">
                      {user.name.slice(0, 1)}
                    </div>
                  )}

                  <div>
                    <CardTitle className="text-white">{user.name}</CardTitle>
                    <p className="mt-1 text-sm text-white/50">{user.email}</p>
                    {user.bio ? <p className="mt-3 max-w-2xl text-sm text-white/70">{user.bio}</p> : null}
                    {user.skills?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.skills.map((skill) => (
                          <Badge key={skill} variant="secondary" className="bg-white/10 text-white/70 border-white/10">{skill}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start">
                  <Badge className="inline-flex items-center gap-1 bg-amber-400/15 text-amber-300 border border-amber-400/30">
                    ⭐ {(user.averageRating || 0).toFixed(1)} ({user.totalReviews || 0})
                  </Badge>
                  {isOwner && (
                    <Badge className={`inline-flex items-center gap-1 border ${
                      (user.usageQuota?.performedThisMonth ?? 0) >= 4
                        ? "border-red-400/30 bg-red-400/10 text-red-300"
                        : "border-blue-400/30 bg-blue-400/10 text-blue-300"
                    }`}>
                      {(user.usageQuota?.performedThisMonth ?? 0)} / 4 חלתורות החודש
                    </Badge>
                  )}
                  {isOwner ? (
                    <Link
                      href="/profile/edit"
                      className="inline-flex h-9 items-center rounded-xl border border-white/15 bg-white/5 px-3 text-sm font-medium text-white transition hover:bg-white/10"
                    >
                      עריכת פרופיל
                    </Link>
                  ) : null}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="requests">
                <TabsList className="mb-4 grid w-full grid-cols-2">
                  <TabsTrigger value="requests">בקשות</TabsTrigger>
                  <TabsTrigger value="reviews">ביקורות</TabsTrigger>
                </TabsList>

                <TabsContent value="requests">
                  <div className="space-y-3">
                    {requests.map((gig) => (
                      <div key={gig._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="font-medium text-white">{gig.title}</p>
                      </div>
                    ))}
                    {requests.length === 0 ? <p className="text-sm text-white/40">אין כרגע בקשות פעילות.</p> : null}
                  </div>
                </TabsContent>

                <TabsContent value="reviews">
                  {canReview && (
                    <div className="mb-4 flex justify-end">
                      <button
                        type="button"
                        onClick={openReviewModal}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/20"
                      >
                        <Star className="h-4 w-4" />
                        השאר ביקורת
                      </button>
                    </div>
                  )}
                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review._id} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <p className="font-medium text-white">
                          {"⭐".repeat(Math.round(review.rating))} {review.rating.toFixed(1)} מאת {review.reviewer?.name}
                        </p>
                        {review.comment ? <p className="mt-1 text-sm text-white/60">{review.comment}</p> : null}
                      </div>
                    ))}
                    {reviews.length === 0 ? <p className="text-sm text-white/40">עדיין אין ביקורות.</p> : null}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : null}
      </main>

      {/* ── Leave a Review Modal ── */}
      <Dialog open={reviewOpen} onOpenChange={(o) => { if (!o) setReviewOpen(false); }}>
        <DialogContent dir="rtl" className="glass-heavy border border-white/10 text-right sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">השאר ביקורת על {user?.name}</DialogTitle>
          </DialogHeader>

          {reviewSuccess ? (
            <p className="py-6 text-center text-sm font-medium text-emerald-400">הביקורת נשמרה! תודה.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {/* Star picker */}
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

              {/* Comment */}
              <div>
                <p className="mb-2 text-sm text-white/60">הערה (אופציונלי)</p>
                <Textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="שתף את החוויה שלך..."
                  rows={3}
                  className="resize-none border-white/15 bg-white/5 text-white placeholder:text-white/30 focus:border-blue-400/50"
                />
              </div>

              {reviewError && <p className="text-sm text-red-400">{reviewError}</p>}

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={reviewBusy}
                className="w-full rounded-xl bg-gradient-to-l from-blue-600 to-blue-500 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-900/30 hover:opacity-90 disabled:opacity-60"
              >
                {reviewBusy ? "שולח..." : "שלח ביקורת"}
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
