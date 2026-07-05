import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PawRadar — 把雲吸狗變成預約制偶遇",
  description:
    "PawRadar 是 Instagram 寵物生態系中的互動外掛，把寵物動態轉化為 .ics 日曆事件。粉絲按一下就把散步加進日曆 — 無需註冊、無需下載 App。",
  keywords: [
    "PawRadar",
    "寵物",
    "Instagram",
    "日曆",
    "ICS",
    "KOL",
    "散步",
    "雲吸狗",
    "互動外掛",
  ],
  authors: [{ name: "PawRadar" }],
  openGraph: {
    title: "PawRadar — 把雲吸狗變成預約制偶遇",
    description:
      "寄生在 IG 流量上的互動外掛，把寵物動態轉化為日曆事件。零摩擦、原生日曆推播、隱私安全。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PawRadar",
    description: "把雲吸狗變成預約制偶遇 — IG 寵物生態系的互動外掛",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <SonnerToaster position="top-center" richColors />
      </body>
    </html>
  );
}
