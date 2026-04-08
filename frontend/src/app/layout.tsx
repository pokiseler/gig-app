import type { Metadata } from "next";
import { Heebo, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import "./globals.css";

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["latin", "hebrew"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "חלתורה",
  description: "חלתורה - שוק חלתורות קהילתי למציאת עזרה ושירותים בעברית מלאה",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="he"
      dir="rtl"
      suppressHydrationWarning
      className={`${heebo.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body suppressHydrationWarning className="app-gradient min-h-full flex flex-col text-white">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
