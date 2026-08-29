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
  title: '制造商老板决策模拟器',
  description: '在原材料价格波动中完成四次限时决策，获得你的经营能力雷达图。',
  openGraph: {
    title: '制造商老板决策模拟器',
    description: '四次限时决策，守住你的工厂。',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '制造商老板决策模拟器',
    description: '四次限时决策，守住你的工厂。',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
