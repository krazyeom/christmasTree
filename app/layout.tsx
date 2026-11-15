import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'A little Christmas · ASCII Wonderland',
  description: '문자로 빛나는 작은 크리스마스. 입체 ASCII 트리와 눈, 오르골 캐럴을 만나보세요.',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: '/apple-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
