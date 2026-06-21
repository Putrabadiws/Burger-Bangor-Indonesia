"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeBangorMoveSection } from "@/components/home/HomeBangorMoveSection";
import { HomeCarouselStepper } from "@/components/home/HomeCarouselStepper";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import type { HeroCarouselSection } from "@/components/sections/hero-carousel";
import {
  mapHeroSectionToCarousel,
  normalizeHeroSectionsPayload,
} from "@/lib/api/hero-sections";
import {
  getHeroApiBaseUrl,
  getHeroCsrMissingBaseError,
} from "@/lib/hero-client-fetch";
import { remoteSrcNeedsUnoptimized } from "@/components/sections/hero-carousel";
import {
  CONTACT_US_ENABLED,
  CONTACT_US_HREF,
} from "@/lib/config/outlet-feature";
import type { Product } from "@/lib/types/product";
import type { Promo } from "@/lib/types/promo";
import { cn, formatDate } from "@/lib/utils";
import { MenuProductCard } from "@/components/menu/menu-product-card";
import { CardProductMobile } from "@/components/menu/mobile";
import {
  homeFloatingContact,
  homeBtnOutlineLight,
  homeBtnPrimary,
  homeBtnSecondary,
  homePromoCard,
  homePromoMeta,
  homePromoTitle,
  homeSection,
  homeSectionDesc,
  homeSectionHeader,
  homeSectionTitle,
} from "@/components/home/home-styles";

export type HomeViewProps = {
  siteSlug: string;
  heroClientFetch: boolean;
  initialHeroSections: HeroCarouselSection[];
  products: Product[];
  promos: Promo[];
};

const MENU_PAGE_SIZE = 4;
const HOME_MENU_MAX = 6;
const PROMO_PAGE_SIZE = 4;
/** Toggle: set to true to re-enable the Promo section (mobile + desktop). */
const SHOW_PROMO_SECTION = false;

/**
 * Landing home (responsif): hero, menu, promo, Bangor Move, sponsorship, karir.
 */
export function HomeView({
  siteSlug,
  heroClientFetch,
  initialHeroSections,
  products,
  promos,
}: HomeViewProps) {
  const missingBaseError = heroClientFetch
    ? getHeroCsrMissingBaseError()
    : null;

  const [csrSections, setCsrSections] = useState<HeroCarouselSection[] | null>(
    () => {
      if (!heroClientFetch) return initialHeroSections;
      if (missingBaseError) return [];
      return null;
    },
  );
  const [csrError, setCsrError] = useState<string | null>(
    () => missingBaseError,
  );

  useEffect(() => {
    if (!heroClientFetch || missingBaseError) {
      if (missingBaseError) {
        console.error("[HomeView]", missingBaseError);
      }
      return;
    }
    const base = getHeroApiBaseUrl();
    const url = `${base}/sites/${encodeURIComponent(siteSlug)}/hero-sections`;
    const ac = new AbortController();
    fetch(url, { signal: ac.signal, headers: { Accept: "application/json" } })
      .then(async (res) => {
        const text = await res.text();
        if (!res.ok)
          throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        const parsed = JSON.parse(text) as unknown;
        const items = normalizeHeroSectionsPayload(parsed);
        setCsrSections(items.map(mapHeroSectionToCarousel));
        setCsrError(null);
      })
      .catch((e: unknown) => {
        if (e instanceof Error && e.name === "AbortError") return;
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[HomeView] hero CSR:", msg);
        setCsrError(msg);
        setCsrSections([]);
      });
    return () => ac.abort();
  }, [heroClientFetch, siteSlug, missingBaseError]);

  const heroSections = heroClientFetch
    ? (csrSections ?? [])
    : initialHeroSections;
  const heroLoading = heroClientFetch && csrSections === null;

  const [menuPage, setMenuPage] = useState(0);
  const [promoPage, setPromoPage] = useState(0);
  const [menuApi, setMenuApi] = useState<CarouselApi | null>(null);

  const menuItems = useMemo(() => {
    if (products.length > 0) return products.slice(0, HOME_MENU_MAX);
    return Array.from({ length: HOME_MENU_MAX }).map((_, i) => ({
      id: i,
      name: "Jelata Burger",
      slug: "menu",
      is_featured: true,
      featured_image: null,
      alt_featured_image: null,
    })) as Product[];
  }, [products]);

  const menuPageCount = Math.max(
    1,
    Math.ceil(menuItems.length / MENU_PAGE_SIZE),
  );

  const scrollToMenuPage = useCallback(
    (page: number) => {
      menuApi?.scrollTo(page * MENU_PAGE_SIZE);
      setMenuPage(page);
    },
    [menuApi],
  );

  useEffect(() => {
    if (!menuApi) return;

    const onSelect = () => {
      const snap = menuApi.selectedScrollSnap();
      setMenuPage(
        Math.min(menuPageCount - 1, Math.floor(snap / MENU_PAGE_SIZE)),
      );
    };

    onSelect();
    menuApi.on("select", onSelect);
    menuApi.on("reInit", onSelect);
    return () => {
      menuApi.off("select", onSelect);
      menuApi.off("reInit", onSelect);
    };
  }, [menuApi, menuPageCount]);

  const promoPageCount = Math.max(
    1,
    Math.ceil(promos.length / PROMO_PAGE_SIZE),
  );
  const promoSlice = promos.slice(
    promoPage * PROMO_PAGE_SIZE,
    promoPage * PROMO_PAGE_SIZE + PROMO_PAGE_SIZE,
  );

  return (
    <div className="relative w-full bg-white">
      <h1 className="sr-only">Burger Bangor Indonesia</h1>
      {process.env.NODE_ENV === "development" && csrError ? (
        <p
          className="bg-amber-100 px-4 py-2 font-mono text-sm text-amber-950"
          role="status"
        >
          Hero CSR: {csrError}
        </p>
      ) : null}

      <HomeHero
        sections={heroSections}
        isLoading={heroLoading}
        autoPlay
        autoPlayInterval={15000}
      />

      {CONTACT_US_ENABLED ? (
        <div className={homeFloatingContact}>
          <Button asChild variant="default" size="lg">
            <Link href={CONTACT_US_HREF}>
              <Phone className="size-5 md:hidden" aria-hidden />
              <span className="font-inter text-sm font-semibold md:text-base">
                <span className="md:hidden">Hubungi Kami</span>
                <span className="hidden md:inline">Kontak Kami</span>
              </span>
            </Link>
          </Button>
        </div>
      ) : null}

      {/* Menu — Pilih Yang Bikin Ngiler */}
      <section className={homeSection} aria-labelledby="home-menu-heading">
        <div className={homeSectionHeader}>
          <h2 id="home-menu-heading" className={homeSectionTitle}>
            Menu Burger Bangor
          </h2>
          <p className={homeSectionDesc}>
            Burger halal dengan daging sapi Australia, ayam crispy, hot dog,
            sampai side dish, semua ada. Tinggal pilih yang paling cocok sama
            mood kamu hari ini.
          </p>
        </div>

        <div className="w-full min-w-0 self-stretch">
          <Carousel
            setApi={setMenuApi}
            opts={{
              align: "start",
              containScroll: "trimSnaps",
              dragFree: true,
            }}
            className="w-full"
          >
            <CarouselContent className="-ml-3 md:-ml-5">
              {menuItems.map((p) => {
                return (
                  <CarouselItem key={p.id} className="basis-auto pl-3 md:pl-5">
                    <CardProductMobile
                      product={p}
                      className="w-[160px] shrink-0 md:hidden"
                    />
                    <MenuProductCard
                      product={p}
                      className="hidden w-[220px] shrink-0 md:flex"
                    />
                  </CarouselItem>
                );
              })}
            </CarouselContent>
          </Carousel>
        </div>
        <HomeCarouselStepper
          count={menuPageCount}
          active={menuPage}
          onSelect={scrollToMenuPage}
          aria-label="Menu carousel"
        />

        <Link href="/menu" className={cn(homeBtnPrimary, "w-full md:w-auto")}>
          Lihat Semua Menu
        </Link>
      </section>

      {/* Promo — gated by SHOW_PROMO_SECTION flag + auto-hide kalau backend
          tidak mengembalikan promo aktif. Source: /sites/{slug}/promos?active=1. */}
      {SHOW_PROMO_SECTION && promos.length > 0 ? (
        <section
          className={cn(homeSection, "md:mt-2")}
          aria-labelledby="home-promo-heading"
        >
          <div className={homeSectionHeader}>
            <h2 id="home-promo-heading" className={homeSectionTitle}>
              Promo Hari Ini, Jangan Sampai Kelewat
            </h2>
            <p className={homeSectionDesc}>
              Ada promo yang sayang banget kalau dilewatin. Cek penawaran
              terbaru sebelum kehabisan, ya!
            </p>
          </div>

          <>
            <div className="flex w-full gap-3 overflow-x-auto pb-1 md:justify-start md:overflow-hidden md:gap-5 md:pb-0">
              {promoSlice.map((p) => (
                <Link
                  key={p.id}
                  href={`/promo/${p.slug}`}
                  className={homePromoCard}
                >
                  <div className="relative h-40 w-full overflow-hidden rounded-lg bg-neutral-light-100 md:h-[225px]">
                    {p.image ? (
                      <Image
                        src={p.image}
                        alt={p.title}
                        fill
                        className="object-cover"
                        sizes="384px"
                        unoptimized={remoteSrcNeedsUnoptimized(p.image)}
                      />
                    ) : null}
                  </div>
                  <div className="flex flex-col gap-0.5 p-2.5">
                    <p className={homePromoTitle}>{p.title}</p>
                    <p className={homePromoMeta}>
                      {p.valid_until
                        ? `Berlaku hingga ${formatDate(p.valid_until)}`
                        : (p.description ?? "").slice(0, 80)}
                    </p>
                  </div>
                </Link>
              ))}
            </div>

            <HomeCarouselStepper
              count={promoPageCount}
              active={promoPage}
              onSelect={setPromoPage}
              aria-label="Promo carousel"
            />
          </>
        </section>
      ) : null}

      {/* Bangor Move + Sponsor */}
      <div className={cn(homeSection, "items-start gap-5 md:gap-10")}>
        <HomeBangorMoveSection />

        <div className="flex w-full flex-col gap-5 rounded-[20px] bg-primary-500 p-8 md:h-[445px] md:flex-row md:items-center md:gap-10 md:p-10">
          <div className="flex flex-1 flex-col gap-5 md:gap-10">
            <div className="flex flex-col gap-2 md:gap-5">
              <h2 className="ds-h4 font-bold text-white max-md:font-helvetica max-md:text-h3-m max-md:leading-8">
                Sponsorship Burger Bangor
              </h2>
              <p className="font-inter text-b3 font-medium text-white md:ds-body-md">
                Cari tahu bagaimana Burger Bangor bisa mendukung event kamu
                melalui program Bangor Sponsorship.
              </p>
            </div>
            <Link href="/contact" className={homeBtnSecondary}>
              Pelajari Selengkapnya
            </Link>
          </div>
          <div className="relative hidden min-h-[280px] flex-1 self-end overflow-hidden rounded-xl md:block md:h-[340px]">
            <Image
              src="/images/about/booth.webp"
              alt="Bangor Sponsorship"
              fill
              className="object-cover object-[center_70%]"
              sizes="580px"
            />
          </div>
        </div>
      </div>

      {/* Karir — full-bleed bg; konten tetap max 1440px */}
      <section
        className="w-full bg-secondary-500 text-white"
        aria-labelledby="home-career-heading"
      >
        <div
          className={cn(
            homeSection,
            "flex-col md:flex-row md:items-start md:gap-10",
          )}
        >
          <div className="relative h-[182px] w-full overflow-hidden rounded-xl md:hidden">
            <Image
              src="/images/career/landing-page.webp"
              alt="Karir Burger Bangor"
              fill
              className="object-cover"
              sizes="100vw"
            />
          </div>
          <div className="relative hidden h-[395px] min-w-0 flex-1 overflow-hidden rounded-xl md:block">
            <Image
              src="/images/career/landing-page.webp"
              alt="Karir Burger Bangor"
              fill
              className="object-cover"
              sizes="620px"
            />
          </div>
          <div className="flex w-full flex-1 flex-col justify-center gap-5 py-0 md:gap-10 md:py-4">
            <div className="flex flex-col gap-1 md:gap-5">
              <h2
                id="home-career-heading"
                className="ds-h4 font-bold text-white max-md:font-helvetica max-md:text-h3-m max-md:leading-8"
              >
                Karir Burger Bangor
              </h2>
              <p className="font-inter text-b3 text-white/90 md:ds-body-md md:text-white">
                Kami percaya mimpi besar butuh ruang untuk bertumbuh. Di Burger
                Bangor, kami mencari orang-orang yang berani melangkah, terbuka
                pada tantangan, dan siap berkembang bersama. Setiap individu
                punya peran penting, setiap ide didengar, dan setiap kontribusi
                adalah bagian dari perjalanan besar menuju masa depan yang terus
                kami bangun bersama. Ini bukan sekadar tempat bekerja, tapi
                tempat untuk menciptakan cerita dan meninggalkan jejak.
              </p>
            </div>
            <Link href="/career/list" className={homeBtnOutlineLight}>
              Lihat Semua Lowongan Kerja
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
