import type { Metadata } from "next";
import { Geist, Geist_Mono, Prompt } from "next/font/google";
import "./globals.css";
import { Toaster } from "react-hot-toast";
import ChatWidget from "@/component/ChatWidget";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
});

export const metadata: Metadata = {
  title: "เที่ยวตามงบโคราช",
  description: "ค้นพบสถานที่ท่องเที่ยวใหม่ ๆ ในโคราชที่คุณยังไม่ได้สัมผัส",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={prompt.variable} suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <main className="font-sans">{children}</main>
        <ChatWidget />
        <Toaster position="top-right" />
      </body>
    </html>
  );
}