import Link from "next/link";
import { NavbarClientOnly } from "@/components/NavbarClientOnly";
import { RecentWantedGrid } from "@/components/RecentWantedGrid";

export default function Home() {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8efe1,_#f3f4ef_45%,_#ecefe8)] text-neutral-900">
      <NavbarClientOnly />

      <main className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:px-6 sm:py-16 md:grid-cols-2">
        <section className="space-y-6">
          <p className="inline-flex rounded-full border border-black/10 bg-white px-4 py-1 text-sm shadow-sm">
            פלטפורמת שירותים קהילתית
          </p>
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl md:text-5xl">
            מצאו עזרה במהירות או פרסמו שירות מקצועי בתוך דקות.
          </h1>
          <p className="max-w-xl text-lg text-neutral-700">
            חלתורה מחברת בין אנשים שצריכים שירות לבין אנשים שיכולים לבצע אותו,
            עם ממשק נקי, מהיר ונוח בעברית מלאה.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/gigs"
              className="rounded-xl bg-black px-5 py-3 text-sm font-medium text-white transition hover:-translate-y-0.5 hover:bg-neutral-800"
            >
              מעבר לחלתורות
            </Link>
            <Link
              href="/auth"
              className="rounded-xl border border-black/15 bg-white px-5 py-3 text-sm font-medium transition hover:-translate-y-0.5 hover:bg-neutral-50"
            >
              התחברות והרשמה
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">מה אפשר לעשות כאן?</h2>
          <ul className="space-y-3 text-sm text-neutral-700">
            <li>לפרסם שירותים שאתם מציעים לקהילה</li>
            <li>לבקש עזרה בצורה ממוקדת לפי עיר וקטגוריה</li>
            <li>לסנן ולמיין תוצאות לפי תאריך וקטגוריה</li>
            <li>לצפות בפרופילים, דירוגים וביקורות</li>
          </ul>
        </section>
      </main>

      <section className="mx-auto w-full max-w-6xl px-4 pb-12 sm:px-6 sm:pb-16" dir="rtl">
        <RecentWantedGrid />
      </section>
    </div>
  );
}
