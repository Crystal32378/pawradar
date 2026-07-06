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
  title: "PawRadar — 快來遇見你的狗狗大寶貝！",
  description:
    "Columbia 校友狗聚的互動外掛：把散步變成日曆連結，鄰居粉絲按一下就加入日曆。無需註冊、無需下載 App。",
  keywords: [
    "PawRadar",
    "Columbia",
    "校友",
    "狗聚",
    "寵物",
    "日曆",
    "ICS",
    "散步",
    "互動外掛",
  ],
  authors: [{ name: "PawRadar" }],
  openGraph: {
    title: "PawRadar — 快來遇見你的狗狗大寶貝！",
    description:
      "Columbia 校友狗聚互動外掛，把散步變成日曆連結。零摩擦、原生日曆推播、隱私安全。",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PawRadar",
    description: "快來遇見你的狗狗大寶貝 — Columbia 校友狗聚互動外掛",
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
