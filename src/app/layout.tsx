import type { Metadata } from "next";
import { Manrope, Bebas_Neue } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const bebas = Bebas_Neue({
  variable: "--font-bebas",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OJAJA Cinemas — Book Movies Online",
    template: "%s | OJAJA Cinemas",
  },
  description:
    "OJAJA Cinemas — showtimes, seat booking, and private hall reservations across Ile-Ife, Lagos & Akure.",
  metadataBase: new URL("https://ojaja.reachcinema.io"),
  openGraph: {
    title: "OJAJA Cinemas",
    description: "Book movie tickets, browse showtimes, and reserve private screenings.",
    siteName: "OJAJA Cinemas",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${manrope.variable} ${bebas.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies any saved theme before first paint, avoiding a flash of the wrong theme.
            Deliberately a plain server-rendered script (not a Client Component) — React 19
            flags <script> elements created by client-rendered code as inert, since browsers
            only execute scripts encountered during HTML parsing, not ones patched in via JS. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{var t=localStorage.getItem('theme');if(t==='light'){document.documentElement.setAttribute('data-theme','light');}}catch(e){}})();",
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
