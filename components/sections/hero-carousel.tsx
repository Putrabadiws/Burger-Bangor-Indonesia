"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useNavbar } from "@/contexts/navbar-context";
import {
  type CarouselApi,
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  ThumbsUp,
  ArrowRight,
} from "lucide-react";

export interface HeroProductCard {
  id: string;
  name: string;
  image: string;
  badge?: "hot" | "recommended" | "new";
  href?: string;
}

export interface HeroCarouselSection {
  id: number;
  image?: string;
  video?: string;
  title: string;
  subtitle?: string;
  description?: string;
  buttonText?: string;
  buttonHref?: string;
  productCard?: HeroProductCard;
}

interface HeroCarouselProps {
  sections: HeroCarouselSection[];
  /** Sedang memuat data — tampilkan skeleton walaupun sections masih [] */
  isLoading?: boolean;
  autoPlay?: boolean;
  autoPlayInterval?: number;
}

/** Next Image optimizer jalan di server; di Docker fetch ke 127.0.0.1:8000 mengarah ke container sendiri → gagal. */
export function remoteSrcNeedsUnoptimized(src: string | undefined): boolean {
  if (!src?.startsWith("http")) return false;
  try {
    const { hostname } = new URL(src);
    return (
      hostname === "127.0.0.1" ||
      hostname === "localhost" ||
      hostname === "host.docker.internal"
    );
  } catch {
    return false;
  }
}

export function HeroVideoBackground({
  src,
  imageOverlay,
  title,
  shouldRender,
  isCurrentSlide,
  isFirstSlide,
  unoptimizedImage,
}: {
  src: string;
  imageOverlay?: string;
  title: string;
  shouldRender: boolean;
  isCurrentSlide: boolean;
  isFirstSlide: boolean;
  unoptimizedImage: boolean;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  // Some browsers + Embla timings may ignore/late-start `autoPlay`.
  // To make it deterministic, explicitly call play() when slide is active.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    if (isCurrentSlide) {
      try {
        v.muted = true;
        v.playsInline = true;
        v.preload = "auto";
        v.load();
        const p = v.play();
        if (p && typeof (p as Promise<void>).catch === "function") {
          (p as Promise<void>).catch((e) => {
            if (process.env.NODE_ENV === "development") {
              console.warn("[HeroVideoBackground] play() blocked:", e);
            }
          });
        }
      } catch (e) {
        if (process.env.NODE_ENV === "development") {
          console.warn("[HeroVideoBackground] play() error:", e);
        }
      }
    } else {
      v.pause();
    }
  }, [isCurrentSlide, src]);

  if (!shouldRender) return null;

  return (
    <video
      ref={videoRef}
      src={src}
      loop
      muted
      playsInline
      preload={isFirstSlide ? "auto" : "metadata"}
      className="w-full h-full object-cover">
      {imageOverlay && (
        <Image
          src={imageOverlay}
          alt={title}
          fill
          className="object-cover"
          priority={isFirstSlide}
          loading={isFirstSlide ? "eager" : "lazy"}
          unoptimized={unoptimizedImage}
        />
      )}
    </video>
  );
}

// Skeleton Loading Component
function HeroSkeleton() {
  return (
    <div className="relative min-h-screen overflow-hidden w-full bg-neutral-900 animate-pulse">
      <div className="absolute inset-0 bg-linear-to-br from-neutral-800 to-neutral-900" />
      <div className="absolute bottom-0 left-0 right-0 z-10">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 xl:px-20 py-22 flex flex-col xl:flex-row xl:justify-between xl:items-end gap-6 xl:gap-0">
          <div className="space-y-4 flex-1">
            <div className="h-4 bg-white/10 rounded w-32 animate-pulse" />
            <div className="h-16 md:h-24 bg-white/10 rounded w-3/4 animate-pulse" />
            <div className="h-4 bg-white/10 rounded w-full max-w-xl animate-pulse" />
            <div className="h-4 bg-white/10 rounded w-4/5 max-w-xl animate-pulse" />
          </div>
          <div className="h-12 bg-white/10 rounded w-32 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

export default function HeroCarousel({
  sections,
  isLoading = false,
  autoPlay = true,
  autoPlayInterval = 5000,
}: HeroCarouselProps) {
  const { setHasHeroSection } = useNavbar();
  const [api, setApi] = useState<CarouselApi | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedSlides, setLoadedSlides] = useState<Set<number>>(new Set([0]));

  // Set context ketika component mount
  useEffect(() => {
    setHasHeroSection(true);
    return () => {
      setHasHeroSection(false);
    };
  }, [setHasHeroSection]);

  // Track current slide and preload adjacent slides
  useEffect(() => {
    if (!api) return;

    const handleSelect = () => {
      const newIndex = api.selectedScrollSnap();
      setCurrentIndex(newIndex);

      // Preload adjacent slides for smoother transitions
      setLoadedSlides((prev) => {
        const next = new Set(prev);
        const prevIndex = (newIndex - 1 + sections.length) % sections.length;
        const nextIndex = (newIndex + 1) % sections.length;
        next.add(prevIndex);
        next.add(newIndex);
        next.add(nextIndex);
        return next;
      });
    };

    handleSelect();
    api.on("select", handleSelect);
    api.on("reInit", handleSelect);

    return () => {
      api.off("select", handleSelect);
      api.off("reInit", handleSelect);
    };
  }, [api, sections.length]);

  // Auto-play functionality
  useEffect(() => {
    if (!api || !autoPlay || sections.length <= 1) return;

    const interval = setInterval(() => {
      const nextIndex = (currentIndex + 1) % sections.length;
      api.scrollTo(nextIndex);
    }, autoPlayInterval);

    return () => clearInterval(interval);
  }, [api, autoPlay, autoPlayInterval, currentIndex, sections.length]);

  const goToSlide = useCallback(
    (index: number) => {
      api?.scrollTo(index);
    },
    [api]
  );

  const goToPrevious = useCallback(() => {
    api?.scrollPrev();
  }, [api]);

  const goToNext = useCallback(() => {
    api?.scrollNext();
  }, [api]);

  // Memoize sections to prevent unnecessary re-renders
  const memoizedSections = useMemo(() => sections, [sections]);

  if (isLoading) {
    return (
      <section id="hero-carousel" aria-labelledby="hero-carousel-heading">
        <h1 id="hero-carousel-heading" className="sr-only">
          Burger Bangor Indonesia
        </h1>
        <HeroSkeleton />
      </section>
    );
  }

  // Data sudah selesai di-load tapi tidak ada slide (CMS kosong / parse gagal)
  if (memoizedSections.length === 0) {
    return (
      <section id="hero-carousel" aria-labelledby="hero-carousel-heading">
        <h1 id="hero-carousel-heading" className="sr-only">
          Burger Bangor Indonesia
        </h1>
        <HeroSkeleton />
      </section>
    );
  }

  return (
    <section id="hero-carousel" aria-labelledby="hero-carousel-heading">
      <h1 id="hero-carousel-heading" className="sr-only">
        Burger Bangor Indonesia
      </h1>

      <div className="relative min-h-screen overflow-hidden w-full">
        <Carousel
          setApi={setApi}
          opts={{
            align: "start",
            loop: true,
            skipSnaps: false,
          }}
          className="w-full h-full">
          <CarouselContent className="ml-0 h-full">
            {memoizedSections.map((section, index) => {
              const isFirstSlide = index === 0;
              const isCurrentSlide = currentIndex === index;
              // Pastikan slide yang sedang aktif selalu dirender,
              // walaupun loadedSlides belum sempat preload.
              const shouldLoad = loadedSlides.has(index) || isCurrentSlide;

              return (
                <CarouselItem
                  key={section.id}
                  className="basis-full pl-0 h-screen">
                  <div className="relative w-full h-full">
                    {/* Background Image or Video */}
                    <div className="absolute inset-0 z-0">
                      {shouldLoad ? (
                        section.video ? (
                          <HeroVideoBackground
                            src={section.video}
                            imageOverlay={section.image}
                            title={section.title}
                            shouldRender={shouldLoad}
                            isCurrentSlide={isCurrentSlide}
                            isFirstSlide={isFirstSlide}
                            unoptimizedImage={remoteSrcNeedsUnoptimized(
                              section.image
                            )}
                          />
                        ) : section.image ? (
                          <Image
                            src={section.image}
                            alt={section.title}
                            fill
                            className="object-cover"
                            priority={isFirstSlide}
                            loading={isFirstSlide ? "eager" : "lazy"}
                            quality={isFirstSlide ? 90 : 75}
                            sizes="100vw"
                            unoptimized={remoteSrcNeedsUnoptimized(
                              section.image
                            )}
                          />
                        ) : null
                      ) : (
                        // Placeholder while loading
                        <div className="w-full h-full bg-neutral-900 animate-pulse" />
                      )}

                      {/* Gradient Overlay */}
                      <div className="absolute inset-0 bg-black/30" />
                    </div>

                    {/* Product Card - Top Right */}
                    {section.productCard && shouldLoad && (
                      <div className="absolute top-20 md:top-30 right-4 md:right-8  xl:right-30 z-20 max-w-[calc(100%-2rem)]">
                        {section.productCard.href ? (
                          <Link
                            href={section.productCard.href}
                            className="group relative block bg-neutral-50 backdrop-blur-sm rounded-2xl p-4 md:p-5 shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105 w-[140px] md:w-[160px] xl:w-[180px]">
                            {/* Badge */}
                            {section.productCard.badge && (
                              <div className="absolute -top-2 -left-2 z-10">
                                {section.productCard.badge === "hot" ? (
                                  <div className="bg-danger-500 p-1.5 rounded-lg flex items-center gap-1 text-white">
                                    <Flame className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="text-[10px] md:text-xs font-semibold">
                                      Hot
                                    </span>
                                  </div>
                                ) : section.productCard.badge ===
                                  "recommended" ? (
                                  <div className="bg-primary-500 p-1.5 rounded-lg">
                                    <ThumbsUp className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                  </div>
                                ) : (
                                  <div className="bg-accent-700 p-1.5 rounded-lg">
                                    <span className="text-white text-[10px] md:text-xs font-semibold uppercase">
                                      New
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Product Image */}
                            <div className="relative w-full aspect-square mb-3">
                              <Image
                                src={section.productCard.image}
                                alt={section.productCard.name}
                                fill
                                className="object-contain rounded-lg"
                                sizes="(max-width: 768px) 140px, (max-width: 1024px) 160px, 180px"
                                loading={isFirstSlide ? "eager" : "lazy"}
                                unoptimized={remoteSrcNeedsUnoptimized(
                                  section.productCard.image
                                )}
                              />
                            </div>

                            {/* Product Name */}
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs md:text-sm font-semibold text-secondary-900 line-clamp-1 flex-1">
                                {section.productCard.name}
                              </p>
                              <ArrowRight className="w-4 h-4 text-secondary-400 group-hover:text-primary-500 transition-colors shrink-0" />
                            </div>
                          </Link>
                        ) : (
                          <div className="relative bg-white/95 backdrop-blur-sm rounded-2xl p-4 md:p-5 shadow-xl w-[140px] md:w-[160px] xl:w-[180px]">
                            {/* Badge */}
                            {section.productCard.badge && (
                              <div className="absolute -top-2 -left-2 z-10">
                                {section.productCard.badge === "hot" ? (
                                  <div className="bg-danger-500 p-1.5 rounded-lg flex items-center gap-1 text-white">
                                    <Flame className="w-3 h-3 md:w-4 md:h-4" />
                                    <span className="text-[10px] md:text-xs font-semibold">
                                      Hot
                                    </span>
                                  </div>
                                ) : section.productCard.badge ===
                                  "recommended" ? (
                                  <div className="bg-primary-50000 p-1.5 rounded-lg">
                                    <ThumbsUp className="w-3 h-3 md:w-4 md:h-4 text-white" />
                                  </div>
                                ) : (
                                  <div className="bg-accent-700 p-1.5 rounded-lg">
                                    <span className="text-white text-[10px] md:text-xs font-semibold uppercase">
                                      New
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Product Image */}
                            <div className="relative w-full aspect-square mb-3">
                              <Image
                                src={section.productCard.image}
                                alt={section.productCard.name}
                                fill
                                className="object-contain rounded-lg"
                                sizes="(max-width: 768px) 140px, (max-width: 1024px) 160px, 180px"
                                loading={isFirstSlide ? "eager" : "lazy"}
                                unoptimized={remoteSrcNeedsUnoptimized(
                                  section.productCard.image
                                )}
                              />
                            </div>

                            {/* Product Name */}
                            <p className="text-xs md:text-sm font-semibold text-secondary-900 line-clamp-1">
                              {section.productCard.name}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="absolute bottom-0 left-0 right-0 z-10">
                      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 md:px-12 xl:px-20 py-22 flex flex-col xl:flex-row xl:justify-between xl:items-end gap-6 xl:gap-0">
                        <div className="space-y-4">
                          {section.subtitle && (
                            <p className="text-b1 md:text-h5 font-medium tracking-wider uppercase opacity-90 text-neutral-light-50">
                              {section.subtitle}
                            </p>
                          )}
                          <h2 className="text-h2-m md:text-h1 font-futura uppercase font-bold text-neutral-light-50">
                            {section.title
                              .split("<br />")
                              .map((line, index, array) => (
                                <React.Fragment key={index}>
                                  {line}
                                  {index < array.length - 1 && <br />}
                                </React.Fragment>
                              ))}
                          </h2>
                          {section.description && (
                            <p className="max-w-xl md:max-w-xl text-b1 font-regular text-neutral-light-50 text-justify">
                              {section.description}
                            </p>
                          )}
                        </div>
                        {section.buttonText && section.buttonHref && (
                          <div className="xl:self-end">
                            <Button asChild className="w-full xl:w-auto">
                              <Link href={section.buttonHref}>
                                {section.buttonText}
                              </Link>
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CarouselItem>
              );
            })}
          </CarouselContent>
        </Carousel>

        {/* Navigation Buttons */}
        {sections.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-4 md:left-8 top-1/2 -translate-y-1/2 z-20 flex size-16 items-center justify-center  text-white transition-all hover:scale-125 disabled:opacity-50 cursor-pointer"
              aria-label="Previous slide">
              <ChevronLeft className="w-13 sm:w-16 h-13 sm:h-16" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-4 md:right-8 top-1/2 -translate-y-1/2 z-20 flex size-16 items-center justify-center  text-white transition-all hover:scale-125 disabled:opacity-50 cursor-pointer"
              aria-label="Next slide">
              <ChevronRight className="w-13 sm:w-16 h-13 sm:h-16" />
            </button>
          </>
        )}

        {/* Pagination Indicators */}
        {sections.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
            {sections.map((_, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`h-1 rounded-full transition-all ${
                  index === currentIndex
                    ? "w-8 bg-primary-500"
                    : "w-2 bg-white/60 hover:bg-white/80"
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
