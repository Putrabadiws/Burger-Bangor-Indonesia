"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useNavbar } from "@/contexts/navbar-context";
import type { CarouselApi } from "@/components/ui/carousel";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  HeroVideoBackground,
  remoteSrcNeedsUnoptimized,
  type HeroCarouselSection,
} from "@/components/sections/hero-carousel";
import { HomeCarouselStepper } from "@/components/home/HomeCarouselStepper";
import { homeBtnPrimary } from "@/components/home/home-styles";

type Props = {
  sections: HeroCarouselSection[];
  isLoading?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
};

const FALLBACK_SLIDE: HeroCarouselSection = {
  id: 0,
  title: "BURGER BANGOR 24/7",
  description:
    "Lapar di mana saja? Tenang, Burger Bangor siap 24 jam! Dari pagi hingga malam, burger juicy, ayam spicy, dan menu favorit kami selalu ada untuk menemani kamu.",
  buttonText: "Lihat Menu",
  buttonHref: "/menu",
};

/** Figma hero carousel: 1440×650, px-80, gradient top 26% h 74% (proportional to Figma's 170/650 & 483/650) */
const HERO_SECTION_CLASS =
  "relative h-[100dvh] w-full overflow-hidden bg-black md:h-[100dvh]";

const HERO_SLIDE_CLASS =
  "relative h-[100dvh] w-full md:h-[100dvh]";

const HERO_FRAME_CLASS =
  "relative z-10 mx-auto flex h-full w-full max-w-[1440px] flex-col items-start justify-end gap-2.5 px-5 pb-20 pt-28 md:gap-2.5 md:px-20 md:pb-20 md:pt-[140px]";

const HERO_GRADIENT_CLASS =
  "pointer-events-none absolute inset-x-0 top-[45%] z-[1] h-[55%] bg-gradient-to-b from-black/0 to-black md:top-[26%] md:h-[74%]";

function HeroSkeleton() {
  return (
    <div className={HERO_SECTION_CLASS}>
      <div className={`${HERO_FRAME_CLASS} animate-pulse`}>
        <div className={HERO_GRADIENT_CLASS} />
        <div className="relative flex w-full flex-col gap-5">
          <div className="h-8 w-2/3 rounded bg-white/10 md:h-[52px]" />
          <div className="h-6 w-full rounded bg-white/10 md:h-8" />
        </div>
      </div>
    </div>
  );
}

export function HomeHero({
  sections,
  isLoading = false,
  autoPlay = true,
  autoPlayInterval = 15000,
}: Props) {
  const { setHasHeroSection } = useNavbar();
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(new Set([0]));

  const memoized = useMemo(
    () => (sections.length > 0 ? sections : [FALLBACK_SLIDE]),
    [sections],
  );

  useEffect(() => {
    setHasHeroSection(true);
    return () => setHasHeroSection(false);
  }, [setHasHeroSection]);

  useEffect(() => {
    if (!api) return;
    const onSelect = () => {
      const idx = api.selectedScrollSnap();
      setCurrentIndex(idx);
      setLoadedSlides((prev) => {
        const next = new Set(prev);
        next.add(idx);
        next.add((idx - 1 + memoized.length) % memoized.length);
        next.add((idx + 1) % memoized.length);
        return next;
      });
    };
    onSelect();
    api.on("select", onSelect);
    api.on("reInit", onSelect);
    return () => {
      api.off("select", onSelect);
      api.off("reInit", onSelect);
    };
  }, [api, memoized.length]);

  useEffect(() => {
    if (!api || !autoPlay || memoized.length <= 1) return;
    const t = setInterval(() => api.scrollNext(), autoPlayInterval);
    return () => clearInterval(t);
  }, [api, autoPlay, autoPlayInterval, memoized.length]);

  const goTo = useCallback((i: number) => api?.scrollTo(i), [api]);

  if (isLoading) {
    return (
      <section aria-label="Hero">
        <HeroSkeleton />
      </section>
    );
  }

  return (
    <section aria-label="Hero" className={HERO_SECTION_CLASS}>
      <Carousel
        setApi={setApi}
        opts={{ align: "start", loop: true, skipSnaps: false }}
        className="h-full w-full"
      >
        <CarouselContent className="ml-0 h-full">
          {memoized.map((section, index) => {
            const isFirst = index === 0;
            const isCurrent = currentIndex === index;
            const shouldLoad = loadedSlides.has(index) || isCurrent;

            return (
              <CarouselItem key={section.id} className="basis-full pl-0">
                <div className={HERO_SLIDE_CLASS}>
                  <div className="absolute inset-0 z-0">
                    {shouldLoad ? (
                      section.video ? (
                        <HeroVideoBackground
                          src={section.video}
                          imageOverlay={section.image}
                          title={section.title}
                          shouldRender={shouldLoad}
                          isCurrentSlide={isCurrent}
                          isFirstSlide={isFirst}
                          unoptimizedImage={remoteSrcNeedsUnoptimized(
                            section.image,
                          )}
                        />
                      ) : section.image ? (
                        <Image
                          src={section.image}
                          alt={section.title}
                          fill
                          className="object-cover"
                          priority={isFirst}
                          loading={isFirst ? "eager" : "lazy"}
                          sizes="100vw"
                          unoptimized={remoteSrcNeedsUnoptimized(section.image)}
                        />
                      ) : (
                        <div className="h-full w-full bg-dark-900" />
                      )
                    ) : (
                      <div className="h-full w-full animate-pulse bg-dark-900" />
                    )}
                  </div>

                  <div className={HERO_GRADIENT_CLASS} />

                  <div className={HERO_FRAME_CLASS}>
                    <div className="flex w-full max-w-[1280px] flex-col items-start gap-3 md:gap-5">
                      <p className="w-full font-helvetica text-h2-m font-bold leading-8 text-white md:text-5xl md:leading-[52px]">
                        {section.title.split("<br />").map((line, i, arr) => (
                          <React.Fragment key={i}>
                            {line}
                            {i < arr.length - 1 ? <br /> : null}
                          </React.Fragment>
                        ))}
                      </p>
                      {section.description ? (
                        <p className="w-full font-inter text-b3 font-medium text-white md:ds-body-2xl-md md:leading-normal">
                          {section.description}
                        </p>
                      ) : null}
                      {section.buttonText && section.buttonHref ? (
                        <Link
                          href={section.buttonHref}
                          className={`${homeBtnPrimary} mt-1 md:mt-0`}
                        >
                          {section.buttonText}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>
      </Carousel>

      {memoized.length > 1 ? (
        <HomeCarouselStepper
          count={memoized.length}
          active={currentIndex}
          onSelect={goTo}
          className="pointer-events-auto absolute bottom-16 left-1/2 z-20 -translate-x-1/2 md:bottom-[50px]"
          aria-label="Hero slides"
        />
      ) : null}
    </section>
  );
}
