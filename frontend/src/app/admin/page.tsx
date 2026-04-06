"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Users, Briefcase, Coins, RefreshCw, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const Navbar = dynamic(() => import("@/components/Navbar").then((m) => m.Navbar), { ssr: false });

const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000/api";

interface AdminStats {
  totalUsers: number;
  totalGigs: number;
  totalEconomyPoints: number;
}

interface AdminUser {
  _id: string;
  name: string;
  email: string;
  role: string;
  balance: number;
}

interface AdminGig {
  _id: string;
  title: string;
  author?: { _id: string; name: string; email: string };
  status: string;
}

type DeleteTarget = { type: "user" | "gig"; id: string; label: string };

export default function AdminDashboardPage() {
  const { token } = useAuth();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsError, setStatsError] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");

  const [gigs, setGigs] = useState<AdminGig[]>([]);
  const [gigsLoading, setGigsLoading] = useState(false);
  const [gigsError, setGigsError] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const authHeaders = useCallback(
    () => ({ Authorization: `Bearer ${token}` }),
    [token],
  );

  const apiGet = useCallback(
    async <T,>(path: string): Promise<T> => {
      const res = await fetch(`${API}${path}`, { headers: authHeaders() });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `שגיאה ${res.status}`);
      }
      return res.json() as Promise<T>;
    },
    [authHeaders],
  );

  const apiDelete = useCallback(
    async (path: string): Promise<void> => {
      const res = await fetch(`${API}${path}`, {
        method: "DELETE",
        headers: authHeaders(),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { message?: string }).message ?? `שגיאה ${res.status}`);
      }
    },
    [authHeaders],
  );

  const fetchStats = useCallback(async () => {
    if (!token) return;
    setStatsLoading(true);
    setStatsError("");
    try {
      const data = await apiGet<AdminStats>("/admin/stats");
      setStats(data);
    } catch (err) {
      setStatsError(err instanceof Error ? err.message : "טעינת הנתונים נכשלה");
    } finally {
      setStatsLoading(false);
    }
  }, [token, apiGet]);

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setUsersLoading(true);
    setUsersError("");
    try {
      const data = await apiGet<AdminUser[]>("/admin/users");
      setUsers(data);
    } catch (err) {
      setUsersError(err instanceof Error ? err.message : "טעינת המשתמשים נכשלה");
    } finally {
      setUsersLoading(false);
    }
  }, [token, apiGet]);

  const fetchGigs = useCallback(async () => {
    if (!token) return;
    setGigsLoading(true);
    setGigsError("");
    try {
      const data = await apiGet<AdminGig[]>("/admin/gigs");
      setGigs(data);
    } catch (err) {
      setGigsError(err instanceof Error ? err.message : "טעינת החלתורות נכשלה");
    } finally {
      setGigsLoading(false);
    }
  }, [token, apiGet]);

  useEffect(() => {
    void fetchStats();
    void fetchUsers();
    void fetchGigs();
  }, [fetchStats, fetchUsers, fetchGigs]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await apiDelete(
        deleteTarget.type === "user"
          ? `/admin/users/${deleteTarget.id}`
          : `/admin/gigs/${deleteTarget.id}`,
      );
      if (deleteTarget.type === "user") {
        setUsers((prev) => prev.filter((u) => u._id !== deleteTarget.id));
        setStats((prev) => prev ? { ...prev, totalUsers: prev.totalUsers - 1 } : prev);
      } else {
        setGigs((prev) => prev.filter((g) => g._id !== deleteTarget.id));
        setStats((prev) => prev ? { ...prev, totalGigs: prev.totalGigs - 1 } : prev);
      }
      setDeleteTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "המחיקה נכשלה");
    } finally {
      setDeleteLoading(false);
    }
  };

  const roleLabel: Record<string, string> = { admin: "מנהל", provider: "נותן שירות", consumer: "מחפש שירות" };
  const statusLabel: Record<string, string> = { open: "פתוח", in_progress: "בתהליך", completed: "הושלם" };
  const statusColor: Record<string, string> = {
    open: "bg-emerald-100 text-emerald-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-neutral-100 text-neutral-600",
  };

  const statCards = [
    { title: 'סה"כ משתמשים', value: stats?.totalUsers, icon: <Users className="h-5 w-5 text-amber-600" />, bg: "bg-amber-50" },
    { title: "חלתורות במערכת", value: stats?.totalGigs, icon: <Briefcase className="h-5 w-5 text-neutral-600" />, bg: "bg-neutral-50" },
    { title: "כלכלת המערכת (נקודות)", value: stats?.totalEconomyPoints, icon: <Coins className="h-5 w-5 text-emerald-600" />, bg: "bg-emerald-50" },
  ];

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe1,_#f3f4ef_45%,_#ecefe8)] text-neutral-900" dir="rtl">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">לוח בקרה</h1>
            <p className="mt-0.5 text-sm text-neutral-500">ניהול מערכת חלתורות</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { void fetchStats(); void fetchUsers(); void fetchGigs(); }}
            disabled={statsLoading || usersLoading || gigsLoading}
            className="flex items-center gap-2 rounded-full border-black/15 bg-white shadow-sm hover:bg-neutral-50"
          >
            <RefreshCw className={`h-4 w-4 ${statsLoading || usersLoading || gigsLoading ? "animate-spin" : ""}`} />
            רענון
          </Button>
        </div>

        <Tabs defaultValue="stats">
          <TabsList className="mb-6 grid w-full grid-cols-3">
            <TabsTrigger value="stats">סטטיסטיקות</TabsTrigger>
            <TabsTrigger value="users">ניהול משתמשים</TabsTrigger>
            <TabsTrigger value="gigs">ניהול חלתורות</TabsTrigger>
          </TabsList>

          {/* ── Stats Tab ── */}
          <TabsContent value="stats">
            {statsError ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{statsError}</p>
            ) : null}
            <div className="grid gap-4 sm:grid-cols-3">
              {statCards.map((card) => (
                <Card key={card.title} className={`shadow-sm ${card.bg}`}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-medium text-neutral-600">{card.title}</CardTitle>
                    {card.icon}
                  </CardHeader>
                  <CardContent>
                    {statsLoading ? (
                      <div className="h-8 w-24 animate-pulse rounded-md bg-black/10" />
                    ) : (
                      <p className="text-3xl font-bold tracking-tight">
                        {card.value?.toLocaleString("he-IL") ?? "—"}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* ── Users Tab ── */}
          <TabsContent value="users">
            {usersError ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{usersError}</p>
            ) : null}
            <Card className="shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="text-right">שם</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">תפקיד</TableHead>
                      <TableHead className="text-right">יתרה</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 5 }).map((__, j) => (
                            <TableCell key={j}>
                              <div className="h-4 animate-pulse rounded bg-black/8 w-24" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : users.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-neutral-500">אין משתמשים</TableCell>
                      </TableRow>
                    ) : (
                      users.map((u) => (
                        <TableRow key={u._id}>
                          <TableCell className="font-medium">{u.name}</TableCell>
                          <TableCell className="text-neutral-600">{u.email}</TableCell>
                          <TableCell>
                            <Badge
                              variant="secondary"
                              className={u.role === "admin" ? "bg-amber-100 text-amber-700" : ""}
                            >
                              {roleLabel[u.role] ?? u.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{(u.balance ?? 0).toLocaleString("he-IL")} נק׳</TableCell>
                          <TableCell className="text-left">
                            {u.role !== "admin" ? (
                              <button
                                type="button"
                                onClick={() => setDeleteTarget({ type: "user", id: u._id, label: u.name })}
                                className="rounded-md p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                                title="מחק משתמש"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>

          {/* ── Gigs Tab ── */}
          <TabsContent value="gigs">
            {gigsError ? (
              <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{gigsError}</p>
            ) : null}
            <Card className="shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-neutral-50">
                      <TableHead className="text-right">כותרת</TableHead>
                      <TableHead className="text-right">מפרסם</TableHead>
                      <TableHead className="text-right">תשלום</TableHead>
                      <TableHead className="text-right">סטטוס</TableHead>
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gigsLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}>
                          {Array.from({ length: 5 }).map((__, j) => (
                            <TableCell key={j}>
                              <div className="h-4 animate-pulse rounded bg-black/8 w-24" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : gigs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-8 text-center text-sm text-neutral-500">אין חלתורות</TableCell>
                      </TableRow>
                    ) : (
                      gigs.map((g) => (
                        <TableRow key={g._id}>
                          <TableCell className="font-medium max-w-[200px] truncate">{g.title}</TableCell>
                          <TableCell className="text-neutral-600">{g.author?.name ?? "—"}</TableCell>
                          <TableCell>30 נק׳</TableCell>
                          <TableCell>
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[g.status] ?? "bg-neutral-100 text-neutral-600"}`}>
                              {statusLabel[g.status] ?? g.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-left">
                            <button
                              type="button"
                              onClick={() => setDeleteTarget({ type: "gig", id: g._id, label: g.title })}
                              className="rounded-md p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600"
                              title="מחק חלתורה"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      {/* Confirm Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent dir="rtl" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>אישור מחיקה</DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === "user"
                ? `האם למחוק את המשתמש "${deleteTarget?.label}"? הפעולה אינה הפיכה.`
                : `האם למחוק את החלתורה "${deleteTarget?.label}"? הפעולה אינה הפיכה.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-row-reverse gap-2 sm:flex-row-reverse">
            <Button
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteLoading}
            >
              {deleteLoading ? "מוחק..." : "מחק"}
            </Button>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleteLoading}>
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


