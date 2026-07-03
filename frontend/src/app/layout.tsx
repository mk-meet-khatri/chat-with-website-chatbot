import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'WebMind — Chat with any Website',
  description: 'Submit a URL to trigger a scoped crawl and index its content to query it with citations.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
