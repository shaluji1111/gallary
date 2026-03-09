import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: "Sourav's Wedding Gallery",
  description: "A beautiful collection of memories from Sourav's wedding celebration",
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
