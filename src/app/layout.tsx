import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RankMukhyam — Kerala PSC Preparation",
  description: "Daily practice system for Kerala PSC aspirants. Topic-wise tests, previous year questions, performance analytics, and leaderboards.",
  keywords: ["Kerala PSC", "PSC preparation", "LDC", "LGS", "Degree Level", "Kerala PSC questions", "PSC mock test"],
  manifest: "/manifest.json",
  icons: { icon: "/favicon.ico" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#020617",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Noto+Sans+Malayalam:wght@400;500;600;700&family=Outfit:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased gradient-surface">
        {children}
      </body>
    </html>
  );
}
