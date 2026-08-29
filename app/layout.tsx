import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  metadataBase: new URL('https://manufacturer-boss-simulator.stepparo2003.chatgpt.site'),
  title: 'Manufacturer Owner Decision Simulator',
  description: 'Make four timed decisions under input-price volatility and reveal your management radar.',
  openGraph: {
    title: 'Manufacturer Owner Decision Simulator',
    description: 'Four timed decisions. One factory to protect.',
    type: 'website',
    images: [{ url: '/og.png', width: 1983, height: 793, alt: 'We need you to decide for the factory' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Manufacturer Owner Decision Simulator',
    description: 'Four timed decisions. One factory to protect.',
    images: ['/og.png'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
