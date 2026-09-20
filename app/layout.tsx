import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "SK Builder — AI Software Factory",
  description: "Turn ideas into production-ready applications with AI.",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
