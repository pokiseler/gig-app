"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PlusCircle, Search, Zap, Shield, Star, ArrowLeft } from "lucide-react";
import { NavbarClientOnly } from "@/components/NavbarClientOnly";
import { RecentWantedGrid } from "@/components/RecentWantedGrid";
import { useAuth } from "@/hooks/useAuth";
import { getGigs, type GigItem } from "@/services/api";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getGigs({ postType: "WANTED", sortBy: "createdAt", order: "desc", limit: 6 })
      .then((result) => setItems(result.gigs || []))
      .finally(() => setLoading(false));
  }, []);

const helpHref = isAuthenticated ? "/post" : "/auth";
const browseHref = isAuthenticated ? "/gigs" : "/auth";

  return (
    <div
      dir="rtl"
      className="min-h-screen text-white"
    >
      <NavbarClientOnly />

      {/* ── Hero ── */}
      <section className="mx-auto w-full max-w-4xl px-4 pb-10 pt-14 text-center sm:px-6 sm:pb-14 sm:pt-20">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-400/20 bg-blue-500/10 px-4 py-1.5 text-xs font-medium text-blue-300 shadow-sm backdrop-blur-sm">
          <Zap className="h-3.5 w-3.5" />
          פלטפורמת החלתורות של ישראל
        </span>

        <h1 className="text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl md:text-6xl">
          מצאו עזרה.{" "}
          <span className="bg-gradient-to-l from-blue-400 to-cyan-300 bg-clip-text text-transparent">
            תרוויחו יותר.
          </span>
        </h1>

        <p className="mx-auto mt-5 max-w-xl text-base text-white/50 sm:text-lg">
          חלתורה מחברת בין שכנים לשירותים מהירים — בלי ביורוקרטיה, בלי עמלות גבוהות.
        </p>
      </section>

      {/* ── CTA Cards ── */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-6 sm:px-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Card: צריך עזרה */}
          <Link
            href={helpHref}
            className="group relative flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-blue-400/30 hover:bg-white/10 hover:shadow-xl hover:shadow-blue-900/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 shadow-lg shadow-amber-200/60 transition-transform duration-300 group-hover:scale-110">
              <PlusCircle className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">אני צריך עזרה</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                פרסם בקשה וקבל הצעות ממומחים בסביבתך תוך דקות
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-blue-400">
              פרסם עכשיו
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </span>
          </Link>

          {/* Card: מחפש חלתורה */}
          <Link
            href={browseHref}
            className="group relative flex flex-col items-center gap-5 rounded-3xl border border-white/10 bg-white/5 p-8 text-center shadow-lg backdrop-blur-md transition-all duration-300 hover:scale-[1.02] hover:border-white/20 hover:bg-white/10 hover:shadow-xl hover:shadow-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-neutral-700 to-neutral-900 shadow-lg shadow-neutral-400/30 transition-transform duration-300 group-hover:scale-110">
              <Search className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">אני מחפש חלתורה</h2>
              <p className="mt-2 text-sm leading-relaxed text-white/50">
                גלה הזדמנויות עבודה קרובות אליך והתחל להרוויח היום
              </p>
            </div>
            <span className="mt-auto flex items-center gap-1.5 text-sm font-semibold text-white/70">
              גלה חלתורות
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
            </span>
          </Link>
        </div>
      </section>

      {/* ── Trust strip ── */}
      <section className="mx-auto w-full max-w-3xl px-4 pb-12 sm:px-6">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-10">
          {[
            { icon: <Shield className="h-4 w-4 text-emerald-400" />, label: "תשלום מאובטח" },
            { icon: <Star className="h-4 w-4 text-amber-400" />, label: "נותני שירות מדורגים" },
            { icon: <Zap className="h-4 w-4 text-blue-400" />, label: "מענה תוך דקות" },
          ].map(({ icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-white/40">
              {icon}
              {label}
            </div>
          ))}
        </div>
      </section>

      {/* ── Recent Gigs ── */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16 sm:px-6 sm:pb-20">
        <div className="mb-6 flex items-baseline justify-between">
          <h2 className="text-xl font-bold text-white sm:text-2xl">
            🔥 חלתורות חמות מהתנור
          </h2>
          <Link href="/gigs" className="text-sm font-medium text-blue-400 hover:underline">
            לכל הבקשות
          </Link>
        </div>
        <RecentWantedGrid items={items} loading={loading} />
      </section>
    </div>
  );
}
