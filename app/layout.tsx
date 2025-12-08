import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@/components/ui/sonner"
import WebviewDetector from "@/components/WebviewDetector";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Intelli-Todo",
  description: "A smart to-do list powered by AI.",
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

// Force dynamic rendering - skip static generation that fails without Clerk keys at build time
export const dynamic = 'force-dynamic';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          {children}
          <Toaster />
          <WebviewDetector />
        </body>
      </html>
    </ClerkProvider>
  );
}
