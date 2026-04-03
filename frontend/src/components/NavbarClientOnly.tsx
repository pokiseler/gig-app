"use client";

import dynamic from "next/dynamic";

export const NavbarClientOnly = dynamic(
  () => import("@/components/Navbar").then((m) => m.Navbar),
  {
    ssr: false,
    loading: () => <div className="sticky top-0 z-50 h-[57px] border-b border-black/10 bg-white/80" />,
  },
);
