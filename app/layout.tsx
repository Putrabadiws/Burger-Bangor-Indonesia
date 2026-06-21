import type { Metadata } from "next";

export const dynamic = "force-dynamic";
import localFont from "next/font/local";
import { Providers } from "@/components/layout/providers";
import { MainLayoutChrome } from "@/components/layout/main-layout-chrome";
// import { GoogleAnalytics } from '@next/third-parties/google'
import { GoogleTagManager } from "@/components/analytics/GoogleTagManager";
import { MicrosoftClarity } from "@/components/analytics/MicrosoftClarity";



import "./globals.css";

// const helvetica = localFont({
//   src: "./fonts/helvetica-neue/Helvetica-Neue-65-Medium.ttf",
//   variable: "--font-helvetica",
//   display: "swap",
// });

const helvetica = localFont({
  src: "./fonts/inter/Inter-VariableFont_opsz,wght.ttf",
  variable: "--font-helvetica",
  display: "swap",
});

const futura = localFont({
  src: "./fonts/futura/FuturaPTCondExtraBold.otf",
  variable: "--font-futura",
  display: "swap",
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://burgerbangor.com";
const defaultTitle = "Burger Bangor Indonesia";
const defaultDescription = "Perusahaan Burger Lokal Terbesar di Indonesia";
const ogImage = `${siteUrl}/images/logo/brand_primary.svg`;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: defaultTitle,
    template: "%s | Burger Bangor",
  },
  description: defaultDescription,
  alternates: {
    canonical: siteUrl,
    // languages: {
    //   "en-US": "https://example.com/en-US",
    // },
  },
  openGraph: {
    title: {
      default: defaultTitle,
      template: "%s | Burger Bangor",
    },
    description: defaultDescription,
    url: siteUrl,
    siteName: "Burger Bangor",
    countryName: "Indonesia",
    images: [
      {
        url: ogImage,
        width: 1200,
        height: 630,
        alt: "Burger Bangor Indonesia",
      },
    ],
    locale: "id_ID",
    type: "website",
    emails: "customer.care@burgerbangorindonesia.com",
  },
  twitter: {
    card: "summary_large_image",
    site: "@burgerbangor_",
    creator: "@burgerbangor_",
    title: {
      default: defaultTitle,
      template: "%s | Burger Bangor",
    },
    description: defaultDescription,
    images: [ogImage],
  },
  icons: {
    icon: "/images/logo/brand_primary.svg",
    shortcut: "/images/logo/brand_primary.svg",
    apple: "/images/logo/brand_primary.svg",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  category: "food",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="overflow-x-hidden">
      <head>
        {/* Google Tag Manager */}
        <GoogleTagManager />
        {/* End Google Tag Manager */}
        {/* Microsoft Clarity */}

      </head>
      <body
        className={`${helvetica.className} ${futura.variable} antialiased overflow-x-hidden`}
        suppressHydrationWarning>
        {/* Google Tag Manager (noscript) */}
        {process.env.NEXT_PUBLIC_GTM_ID ? (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${process.env.NEXT_PUBLIC_GTM_ID}`}
              height="0"
              width="0"
              style={{ display: "none", visibility: "hidden" }}
            />
          </noscript>
        ) : null}
        {/* End Google Tag Manager (noscript) */}
        <Providers>{children}</Providers>
        <MainLayoutChrome />
        <MicrosoftClarity />
      </body>
    </html>
  );
}
