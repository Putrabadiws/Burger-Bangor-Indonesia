import type { Metadata } from "next";
import { HomeView } from "@/components/home/HomeView";
import { getProducts } from "@/lib/api/products";
import { getPromos } from "@/lib/api/promos";
import { fetchHeroSections } from "@/lib/api/hero-sections";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://burgerbangor.com";

const siteSlug =
  process.env.NEXT_PUBLIC_SITE_SLUG || process.env.SITE_SLUG || "burger-bangor";

/** true = hero di-fetch dari browser (terlihat di Network + console); default SSR */
const heroClientFetch = process.env.NEXT_PUBLIC_HERO_CLIENT_FETCH === "true";

export default async function Home() {
  const [heroSections, productsRes, promosRes] = await Promise.all([
    heroClientFetch ? Promise.resolve([]) : fetchHeroSections(siteSlug),
    getProducts({ page: 1 }).catch(() => ({ data: [] as const })),
    // Promo home: hanya yang aktif dalam window valid_from..valid_until.
    // Section di home auto-hide kalau promos.length === 0.
    getPromos({ active: true, limit: 8 }).catch(() => ({
      data: [],
      meta: { count: 0, limit: 8 },
    })),
  ]);

  const rawProducts = productsRes.data ?? [];
  const products = [...rawProducts]
    .sort((a, b) => {
      if (a.is_featured !== b.is_featured) return a.is_featured ? -1 : 1;
      return a.sort_order - b.sort_order;
    })
    .slice(0, 6);

  const promos = promosRes.data ?? [];

  return (
    <main className="min-h-screen overflow-x-hidden bg-white">
      <HomeView
        siteSlug={siteSlug}
        heroClientFetch={heroClientFetch}
        initialHeroSections={heroSections}
        products={products}
        promos={promos}
      />
    </main>
  );
}

const title_global = "Burger Bangor Indonesia";
const description_global =
  "Burger Bangor adalah burger lokal 100% Australian Beef juicy yang sudah bersertifikasi Halal. Ada 800 lebih outlet yang tersebar di berbagai wilayah Indonesia.";
const images_global = `${siteUrl}/images/logo/brand_primary.webp`;

export const metadata: Metadata = {
  title: title_global,
  description: description_global,
  alternates: { canonical: siteUrl },
  openGraph: {
    title: title_global,
    description: description_global,
    url: siteUrl,
    images: [
      {
        url: images_global,
        alt: "Burger Bangor Indonesia",
      },
    ],
    locale: "id_ID",
    type: "website",
    countryName: "Indonesia",
    siteName: "Burger Bangor Indonesia",
  },
  twitter: {
    card: "summary_large_image",
    site: "@burgerbangor_",
    title: title_global,
    description: description_global,
    images: images_global,
  },
  keywords: ["burger bangor", "burger lokal", "burger indonesia", "kuliner"],
  category: "food",
};
