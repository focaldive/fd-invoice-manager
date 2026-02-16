import type { Metadata } from "next";
import localFont from "next/font/local";
import { JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { NavigationGuardProvider } from "@/lib/navigation-guard";

const switzer = localFont({
  src: "./fonts/Switzer-Variable.woff2",
  variable: "--font-switzer",
  display: "swap",
  weight: "100 900",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${switzer.variable} ${switzer.className} ${jetbrainsMono.variable} antialiased`}
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
