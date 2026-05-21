import type { Metadata } from "next";
import "./globals.css";
import { Nav } from "@/components/ui";

export const metadata: Metadata = {
  title: "AFS Lead Engine",
  description: "Daily B2B lead discovery, routing & outreach — AFS Trade",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
      </body>
    </html>
  );
}
