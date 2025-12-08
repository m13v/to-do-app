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
  const content = (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        {children}
        <Toaster />
        <WebviewDetector />
      </body>
    </html>
  );

  // Skip ClerkProvider during build if key is missing (static generation)
  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content;
  }

  return <ClerkProvider>{content}</ClerkProvider>;
}
