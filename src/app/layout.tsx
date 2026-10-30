import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { creepster } from "@/lib/fonts";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: { default: "LuckyDrop", template: "%s · LuckyDrop" },
  description: "LuckyDrop — a live multiplayer neon plinko elimination game.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${creepster.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
