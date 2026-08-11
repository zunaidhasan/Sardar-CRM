import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider, THEME_STORAGE_KEY } from "@/components/theme-provider";
import { I18nProvider } from "@/components/i18n-provider";
import { I18N_COOKIE_NAME, type Locale } from "@/lib/i18n";
import { PwaRegister } from "@/components/layout/pwa-register";
import { Toaster } from "@/components/ui/sonner";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Sardar CRM",
    template: "%s | Sardar CRM",
  },
  description:
    "Sardar IT's team CRM for Fiverr and Upwork. Bids, follow-ups, order tracking, invoices and analytics for your whole agency in one place.",
  icons: {
    icon: "/sardar-fav.ico",
    apple: "/sardar-fav.png",
  },
  // PWA: installable app metadata (icons + manifest served from app/manifest.ts)
  applicationName: "Sardar CRM",
  appleWebApp: {
    capable: true,
    title: "Sardar CRM",
    statusBarStyle: "black-translucent",
  },
  manifest: "/manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#1c2233",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Render in the saved language (set by the language switcher's cookie) so
  // the server HTML and the client's first render always agree — the client
  // provider starts on exactly this value, so no hydration mismatch and no
  // English flash for saved Bengali users.
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(I18N_COOKIE_NAME)?.value;
  const initialLocale: Locale = cookieLocale === "bn" ? "bn" : "en";

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <head>
        {/* Pre-paint theme script: apply the saved theme before first paint so
            dark-mode users never see a white flash (matches theme-provider's
            storage key). suppressHydrationWarning because browser extensions
            inject their own <script> tags into <head>, which shifts React's
            hydration positions and otherwise logs a (benign) mismatch. */}
        <script
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var s=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=s==="dark"||((!s||s==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);}catch(e){}})();`,
          }}
        />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`} suppressHydrationWarning>
        <ThemeProvider defaultTheme="system">
          <I18nProvider initialLocale={initialLocale}>
            {children}
            <Toaster position="top-right" richColors />
          </I18nProvider>
        </ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
