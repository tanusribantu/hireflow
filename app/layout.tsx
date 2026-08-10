import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Hireflow",
  description: "A job recruitment portal for candidates and recruiters.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
