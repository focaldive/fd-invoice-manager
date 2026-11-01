import type { Metadata } from "next";
import { JetBrains_Mono, Nunito } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { NavigationGuardProvider } from "@/lib/navigation-guard";

// UI font: SF Pro Rounded via @font-face in globals.css (files are local-only,
// gitignored in public/fonts/sf-pro-rounded/). Nunito is the fallback when absent.
const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
});

export const metadata: Metadata = {
  title: "FocalDive Invoice Manager",
  description: "Invoice management system for FocalDive (Pvt) Ltd",
};

// Every route is auth-gated and reads live DB data — render dynamically so the
// production build never needs a reachable Postgres (important for `docker build`).
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Font CSS variables live on <html> so :root-level tokens (--font-rounded) can resolve them.
    <html lang="en" className={`${nunito.variable} ${jetbrainsMono.variable}`}>
      <body
        className="font-sans antialiased"
      >
        <NavigationGuardProvider>
          {children}
        </NavigationGuardProvider>
        <Toaster richColors />
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
