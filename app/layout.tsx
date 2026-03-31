import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "CaseGen",
  description: "Generate structured case study drafts from your design notes",
  manifest: "/manifest.json",
  icons: [
    {
      rel: "icon",
      url: "/icons/icon-192.png",
      sizes: "192x192",
      type: "image/png",
    },
    {
      rel: "icon",
      url: "/icons/icon-512.png",
      sizes: "512x512",
      type: "image/png",
    },
    {
      rel: "apple-touch-icon",
      url: "/icons/icon-192.png",
      sizes: "192x192",
    },
  ],
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  themeColor: "#09090b",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta name="application-name" content="CaseGen" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="CaseGen" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#09090b" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} bg-slate-950 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

