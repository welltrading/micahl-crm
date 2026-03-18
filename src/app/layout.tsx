import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "מיכל CRM",
  description: "דאשבורד ניהול קמפיינים ולקוחות",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl">
      <body className="antialiased">{children}</body>
    </html>
  );
}
