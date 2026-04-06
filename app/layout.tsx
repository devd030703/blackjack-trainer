// This file defines the root HTML shell, global fonts, and static metadata for the app.

import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Blackjack Trainer",
  description: "A premium blackjack coaching app for practicing better decisions.",
};

// This function renders the root App Router layout and wraps every page in global styles.
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfairDisplay.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-[var(--bg-dark)] text-[var(--text-primary)]">
        {children}
      </body>
    </html>
  );
}

