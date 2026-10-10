import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Roomly | A little space for your next big idea",
  description: "Roomly is a shared-space booking application. Meet, focus, and create in a space that fits your day.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
