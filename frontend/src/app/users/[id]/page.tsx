"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Phone } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserProfile, createReview, type GigItem, type ReviewItem, type AuthUser } from "@/services/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), { ssr: false });

export default function UserProfilePage() {
  const params = useParams<{ id: string }>();
  const userId = params?.id;
  const { user: currentUser, token } = useAuth();

  const [user, setUser] = useState<AuthUser | null>(null);
  const [requests, setRequests] = useState<GigItem[]>([]);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isOwner = Boolean(currentUser?._id && userId && currentUser._id === userId);

  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewGigId, setReviewGigId] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [reviewSuccess, setReviewSuccess] = useState("");

  const completedGigs = requests.filter((g) => g.status === "completed");

  async function submitReview(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !userId) return;
    setReviewSubmitting(true);
    setReviewError("");
    setReviewSuccess("");
    try {
      await createReview(token, {
        targetUser: userId,
        gigId: reviewGigId,
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });
      setReviewSuccess("הביקורת נשלחה בהצלחה!");
      setReviewComment("");
      setReviewRating(5);
      const result = await getUserProfile(userId);
      setUser(result.user);
      setRequests(result.requests || []);
      setReviews(result.reviews || []);
    } catch (err) {
      setReviewError(err instanceof Error ? err.message : "שליחת הביקורת נכשלה");
    } finally {
      setReviewSubmitting(false);
    }
  }
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
        setReviewGigId("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "טעינת הפרופיל נכשלה"))
      .finally(() => setLoading(false));
  }, [userId]);

  return (
    <div className="profile-font min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe1,_#f3f4ef_45%,_#ecefe8)] text-neutral-900" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 sm:py-14">
        {loading ? <p>טוען פרופיל...</p> : null}
        {error ? <p className="text-red-700">{error}</p> : null}

        {user ? (
          <Card className="shadow-sm">
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
                      className="h-20 w-20 rounded-2xl object-cover ring-1 ring-black/10"
                    />
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-neutral-200 text-2xl font-semibold text-neutral-700">
                      {user.name.slice(0, 1)}
                    </div>
                  )}

                  <div>
                    <CardTitle>{user.name}</CardTitle>
                    <p className="mt-1 text-sm text-neutral-600">{user.email}</p>
                    {user.phone ? (
                      <p className="mt-1 flex items-center gap-1 text-sm text-neutral-600">
                        <Phone className="h-3.5 w-3.5" />
                        {user.phone}
                      </p>
                    ) : null}
                    {user.bio ? <p className="mt-3 max-w-2xl text-sm text-neutral-700">{user.bio}</p> : null}
                    {user.skills?.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {user.skills.map((skill) => (
                          <Badge key={skill} variant="secondary">{skill}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 self-start">
                  <Badge className="bg-amber-100 text-amber-700">
                    ⭐ {(user.averageRating || 0).toFixed(1)} ({user.totalReviews || 0})
                  </Badge>
                  {isOwner ? (
                    <Link
                      href="/profile/edit"
                      className="inline-flex h-9 items-center rounded-md border border-black/15 bg-white px-3 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50"
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
                      <div key={gig._id} className="rounded-lg border border-black/10 bg-white p-3">
                        <p className="font-medium">{gig.title}</p>
                        <p className="text-sm text-neutral-600">30 נקודות</p>
                      </div>
                    ))}
                    {requests.length === 0 ? <p className="text-sm text-neutral-500">אין כרגע בקשות פעילות.</p> : null}
                  </div>
                </TabsContent>

                <TabsContent value="reviews">
                  {!isOwner && currentUser ? (
                    <form onSubmit={submitReview} className="mb-5 rounded-xl border border-black/10 bg-white p-4 space-y-3">
                      <p className="font-semibold text-sm">כתוב ביקורת</p>

                      {completedGigs.length > 0 ? (
                        <div>
                          <label className="block text-xs text-neutral-600 mb-1">בחר משימה קשורה</label>
                          <select
                            value={reviewGigId}
                            onChange={(e) => setReviewGigId(e.target.value)}
                            required
                            className="w-full rounded-md border border-black/15 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/30"
                          >
                            <option value="">-- בחר --</option>
                            {completedGigs.map((g) => (
                              <option key={g._id} value={g._id}>{g.title}</option>
                            ))}
                          </select>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-xs text-neutral-600 mb-1">מזהה משימה (ID)</label>
                          <input
                            type="text"
                            value={reviewGigId}
                            onChange={(e) => setReviewGigId(e.target.value)}
                            required
                            placeholder="הכנס ID של משימה"
                            className="w-full rounded-md border border-black/15 bg-neutral-50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black/30"
                          />
                        </div>
                      )}

                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">דירוג</label>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setReviewRating(star)}
                              className={`text-2xl transition ${star <= reviewRating ? "text-amber-400" : "text-neutral-300"}`}
                            >
                              ★
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-neutral-600 mb-1">תגובה (אופציונלי)</label>
                        <textarea
                          value={reviewComment}
                          onChange={(e) => setReviewComment(e.target.value)}
                          rows={3}
                          placeholder="ספר על החוויה שלך..."
                          className="w-full rounded-md border border-black/15 bg-neutral-50 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-black/30"
                        />
                      </div>

                      {reviewError ? <p className="text-xs text-red-600">{reviewError}</p> : null}
                      {reviewSuccess ? <p className="text-xs text-green-600">{reviewSuccess}</p> : null}

                      <button
                        type="submit"
                        disabled={reviewSubmitting || !reviewGigId}
                        className="inline-flex h-9 items-center rounded-md bg-neutral-900 px-4 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:opacity-50"
                      >
                        {reviewSubmitting ? "שולח..." : "שלח ביקורת"}
                      </button>
                    </form>
                  ) : null}

                  <div className="space-y-3">
                    {reviews.map((review) => (
                      <div key={review._id} className="rounded-lg border border-black/10 bg-white p-3">
                        <p className="font-medium">⭐ {review.rating.toFixed(1)} מאת {review.reviewer?.name}</p>
                        <p className="text-sm text-neutral-600">{review.comment}</p>
                      </div>
                    ))}
                    {reviews.length === 0 ? <p className="text-sm text-neutral-500">עדיין אין ביקורות.</p> : null}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : null}
      </main>
    </div>
  );
}
