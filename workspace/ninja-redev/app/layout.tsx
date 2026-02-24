import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ninja RE Model — 6719 N Lamar BLVD",
  description: "Real Estate Financial Model — Austin, TX",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
