/**
 * app/layout.tsx
 *
 * The root layout — this wraps every page in the app.
 * In Next.js App Router, layout.tsx is a Server Component by default,
 * which means it runs on the server and doesn't need 'use client'.
 *
 * This file is responsible for:
 * - Loading and applying Google Fonts
 * - Setting page metadata (title, description shown in browser tabs)
 * - Providing the HTML/body shell that all pages render inside
 */

import type { Metadata } from 'next'
import { Playfair_Display, Inter } from 'next/font/google'
import './globals.css'

/**
 * Playfair Display — our display/heading font.
 * Used for the app title, card ranks, and decorative headings.
 * Elegant serif that evokes a premium casino feel.
 *
 * `variable` creates a CSS custom property (--font-playfair) that
 * we reference in globals.css as part of the --font-display token.
 */
const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  // Load all weights we need: 400 (body), 700 (bold headings)
  weight: ['400', '700'],
  display: 'swap', // Show text immediately using fallback font while loading
})

/**
 * Inter — our UI/body font.
 * Clean, highly readable sans-serif for buttons, labels, and body text.
 * Used as the default font for all non-heading text.
 */
const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

/**
 * Page metadata — shown in browser tabs and used by search engines.
 * Next.js automatically injects this as <title> and <meta> tags.
 */
export const metadata: Metadata = {
  title: 'Blackjack Trainer — Master Basic Strategy',
  description:
    'An interactive blackjack trainer that teaches you basic strategy through coaching, drills, and performance tracking.',
}

/**
 * RootLayout wraps the entire app.
 * `children` is the current page component (app/page.tsx in our case).
 *
 * We apply both font CSS variable classes to <html> so that the
 * custom properties (--font-playfair, --font-inter) are available
 * everywhere in the document.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${inter.variable} h-full`}
    >
      {/*
        The body uses min-h-full to fill the viewport.
        bg-bg-dark and text-text-primary reference our custom theme tokens
        defined in globals.css @theme block.
      */}
      <body className="min-h-full bg-bg-dark text-text-primary antialiased">
        {children}
      </body>
    </html>
  )
}
