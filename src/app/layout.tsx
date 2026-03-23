import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import clsx from "clsx";
import { AuthProvider } from "@/contexts/AuthContext";

const dmSans = DM_Sans({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Insights on Ancestry",
  description: "Affordable ancestry modeling services",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={clsx(dmSans.className, "antialiased")} style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}>
        <div className="fixed inset-0 grid-bg opacity-30 pointer-events-none z-0" />
        <div className="relative z-10">
          <AuthProvider>
            {children}
          </AuthProvider>
        </div>
      </body>
    </html>
  );
}
