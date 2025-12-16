import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import styles from "./layout.module.css";

export const metadata: Metadata = {
  title: "PostPilot - AI-Powered Social Media",
  description: "Create, schedule, and publish AI-generated content across all your social media platforms.",
  keywords: ["social media", "AI", "scheduler", "cross-posting", "content creation", "automation"],
  authors: [{ name: "PostPilot" }],
  openGraph: {
    title: "PostPilot - AI-Powered Social Media",
    description: "Create, schedule, and publish AI-generated content across all your social media platforms.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light">
      <head>
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body>
        <div className={styles.appContainer}>
          <Sidebar />
          <main className={styles.mainContent}>
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
