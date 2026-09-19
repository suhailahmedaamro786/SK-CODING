import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SK Builder — AI Software Factory",
  description: "Turn ideas into production-ready applications with AI.",
};

export default function RootLayout({ children }: Readonly<{children: React.ReactNode}>) {
  return <html lang="en"><body>{children}</body></html>;
}
