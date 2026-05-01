import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Orbitron } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ShellNav } from "@/components/shell-nav";
import { TelemetryFooter } from "@/components/telemetry-footer";
import { MotionBoot } from "@/components/motion-boot";
import { getEnv } from "@/lib/env";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
});

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
});

export const metadata: Metadata = {
  title: "SRI Command",
  description: "Supplier Risk Intelligence — composite index over Open Supply Hub disclosures",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let oshSync: "ACTIVE" | "DEMO" = "DEMO";
  try {
    const e = getEnv();
    oshSync = e.OSH_API_TOKEN ? "ACTIVE" : "DEMO";
  } catch {
    oshSync = "DEMO";
  }

  return (
    <html lang="en" data-theme="stark" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${jetbrains.variable} ${orbitron.variable} min-h-dvh antialiased`}
      >
        <ThemeProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:border focus:border-[var(--accent)] focus:bg-[var(--bg-panel)] focus:px-3 focus:py-2 focus:text-sm focus:text-[var(--fg)]"
          >
            Skip to main content
          </a>
          <div className="crt-overlay" aria-hidden />
          <div className="vignette" aria-hidden />
          <ShellNav />
          <main id="main-content" className="mx-auto max-w-[1600px] px-4 pb-24 pt-6" tabIndex={-1}>
            {children}
          </main>
          <TelemetryFooter oshSync={oshSync} />
          <MotionBoot />
        </ThemeProvider>
      </body>
    </html>
  );
}
