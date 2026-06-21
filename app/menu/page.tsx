import { Suspense } from "react";
import Link from "next/link";
import {
  getProducts,
  getProductCategories,
} from "@/lib/api/products";
import type { Metadata, ResolvingMetadata } from "next";
import { ProductCard } from "@/components/menu/cardProduct";
import { CardProductMobile } from "@/components/menu/mobile";
import { CategoryFilter } from "@/components/menu/CategoryFilter";
import { ProductSearchBar } from "@/components/menu/ProductSearchBar";
import { ChevronLeft, ChevronRight } from "lucide-react";

const FONT_HAAS = "Haas Grot Text R Trial, Inter, sans-serif";

// Skeleton Components (Tetap sama)
function SearchBarSkeleton() { return <div className="h-12 w-full bg-neutral-100 rounded-xl animate-pulse" />; }
function CategoryFilterSkeleton() { return <div className="flex gap-2 overflow-x-auto">{[1, 2, 3, 4, 5].map((i) => (<div key={i} className="h-12 w-24 sm:w-32 bg-neutral-100 rounded-xl animate-pulse shrink-0" />))}</div>; }
function ProductCardSkeleton() {
  return (
    <div className="flex min-h-[240px] animate-pulse flex-col rounded-xl bg-neutral-50 p-3 shadow-sm sm:min-h-[260px] sm:p-4">
      <div className="mb-2 h-7 w-12 rounded-lg bg-neutral-200" />
      <div className="mx-auto my-2 h-[120px] w-full max-w-[180px] rounded-lg bg-neutral-200 sm:h-[140px]" />
      <div className="mt-auto rounded-lg border border-neutral-light-200 bg-white p-3 sm:p-4">
        <div className="mb-2 h-4 w-3/4 rounded bg-neutral-200" />
        <div className="h-3 w-1/2 rounded bg-neutral-200" />
      </div>
    </div>
  );
}
function ProductsGridSkeleton() { return <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5 lg:gap-6 mb-8">{[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (<ProductCardSkeleton key={i} />))}</div>; }

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; category?: string; search?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page ?? "1");
  const categorySlug = params.category;
  const search = params.search;

  // Fetch categories
  const categories = await getProductCategories();

  // FIX: Menggunakan getProducts dengan parameter category
  const res = await getProducts({ 
    page, 
    search, 
    category: categorySlug 
  });

  const buildMenuHref = (next: {
    page?: number;
    category?: string;
    search?: string;
  }) => {
    const qs = new URLSearchParams();
    if (next.category) qs.set("category", next.category);
    if (next.search) qs.set("search", next.search);
    if (next.page && next.page > 1) qs.set("page", String(next.page));
    const queryString = qs.toString();
    return queryString ? `/menu?${queryString}` : "/menu";
  };

  return (
    <section id="product-section" className="w-full bg-surface-base md:bg-white">
      {/* Audit SEO: H1 + H2 list kategori menu (hardcoded, sr-only).
          Ditempatkan di section-level (di luar md:hidden / hidden md:block wrapper)
          biar single render di DOM (tidak dobel) tapi tetap ke-crawl di mobile + desktop.
          Urutan: H1 dulu baru H2 — wajib untuk audit "Judul pertama harus H1".
          Visible category chips di bawah tetap dynamic dari backend — H2 di sini
          khusus untuk struktur heading SEO sesuai brief audit. */}
      <h1 id="menuheading" className="sr-only">
        Menu Burger Bangor
      </h1>
      <div className="sr-only">
        <h2>Burger</h2>
        <h2>Minuman</h2>
        <h2>Kentang Goreng</h2>
        <h2>Bangor Chicken Nugget</h2>
        <h2>Paket Burger Bangor</h2>
        <h2>Sausage</h2>
        <h2>Side Dish</h2>
      </div>

      <div className="md:hidden px-5 pt-16 pb-10">
        <div className="mb-6 space-y-2.5">
          <p className="text-text-primary text-xl font-bold font-helvetica leading-6">
            Rekomendasi Menu Untuk Setiap Mood Kamu
          </p>
          <p className="text-text-primary text-sm font-normal font-inter leading-5">
            Temukan pilihan menu favorit kami yang cocok dinikmati di berbagai
            suasana dan momen.
          </p>
        </div>

        <div className="mb-5">
          <form action="/menu" method="get" className="w-full">
            {categorySlug ? (
              <input type="hidden" name="category" value={categorySlug} />
            ) : null}
            <input type="hidden" name="page" value="1" />
            <input
              name="search"
              defaultValue={search ?? ""}
              placeholder="Cari Menu"
              className="w-full rounded-xl border border-border-subtle bg-surface-base px-4 py-3 text-xs font-normal font-inter leading-5 text-text-primary placeholder:text-neutral-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/40 focus-visible:border-primary-500"
            />
          </form>
        </div>

        <div className="mb-6 -mx-5 px-5">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide touch-pan-x">
            <Link
              href={buildMenuHref({ search })}
              style={{ fontFamily: FONT_HAAS }}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-xs font-medium transition-colors ${
                !categorySlug
                  ? "bg-primary-500 text-white shadow-sm"
                  : "border border-border-subtle bg-surface-base text-neutral-400"
              }`}
            >
              Semua
            </Link>
            {categories.map((category) => {
              const active = category.slug === categorySlug;
              return (
                <Link
                  key={category.id}
                  href={buildMenuHref({ category: category.slug, search })}
                  style={{ fontFamily: FONT_HAAS }}
                  className={`shrink-0 whitespace-nowrap rounded-lg px-4 py-2.5 text-xs font-medium transition-colors ${
                    active
                      ? "bg-primary-500 text-white shadow-sm"
                      : "border border-border-subtle bg-surface-base text-neutral-400"
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>

        {res.data.length === 0 ? (
          <p className="rounded-2xl border border-border-subtle bg-surface-subtle px-4 py-8 text-center text-sm font-inter text-text-secondary leading-5">
            Tidak ada menu yang cocok. Coba kata kunci lain atau pilih kategori
            lain.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {res.data.map((p) => (
              <CardProductMobile key={p.id} product={p} />
            ))}
          </div>
        )}

        {res.meta.last_page > 1 && (
          <div className="mt-8 flex items-center justify-center gap-4">
            {page > 1 ? (
              <Link
                href={buildMenuHref({
                  page: page - 1,
                  category: categorySlug,
                  search,
                })}
                className="rounded-full border border-border-subtle bg-white p-2.5 text-text-primary shadow-sm transition-colors hover:bg-surface-muted active:bg-neutral-light-100"
                aria-label="Halaman sebelumnya"
              >
                <ChevronLeft className="h-4 w-4" />
              </Link>
            ) : (
              <span
                className="rounded-full border border-border-subtle bg-neutral-light-50 p-2.5 text-neutral-300"
                aria-hidden
              >
                <ChevronLeft className="h-4 w-4" />
              </span>
            )}

            <span className="min-w-[3.5rem] text-center text-xs font-semibold font-inter tabular-nums text-text-primary">
              {page} / {res.meta.last_page}
            </span>

            {page < res.meta.last_page ? (
              <Link
                href={buildMenuHref({
                  page: page + 1,
                  category: categorySlug,
                  search,
                })}
                className="rounded-full border border-border-subtle bg-white p-2.5 text-text-primary shadow-sm transition-colors hover:bg-surface-muted active:bg-neutral-light-100"
                aria-label="Halaman berikutnya"
              >
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : (
              <span
                className="rounded-full border border-border-subtle bg-neutral-light-50 p-2.5 text-neutral-300"
                aria-hidden
              >
                <ChevronRight className="h-4 w-4" />
              </span>
            )}
          </div>
        )}

        <p className="mt-5 text-center text-[10px] font-medium font-inter leading-4 text-text-muted">
          Menampilkan {res.meta.from || 0} sampai {res.meta.to || 0} dari{" "}
          {res.meta.total} menu
        </p>
      </div>

      <div className="hidden md:block">
        <div className="max-w-[1440px] mx-auto px-4 md:px-20 py-20 md:py-22">
          <div className="text-left mb-8 md:mb-12">
            <p className="font-bold text-h2-m sm:text-h1 font-helvetica leading-tight">
              Rekomendasi Menu Untuk Setiap Mood Kamu
            </p>
            <p className="text-secondary-900 text-sm md:text-base">
              Temukan pilihan menu favorit kami yang cocok dinikmati di berbagai
              suasana dan momen.
            </p>
          </div>

          <div className="mb-8 md:mb-10">
            <Suspense fallback={<CategoryFilterSkeleton />}>
              <CategoryFilter categories={categories} />
            </Suspense>
          </div>

          <div className="mb-6 md:mb-8 lg:hidden">
            <Suspense fallback={<SearchBarSkeleton />}>
              <ProductSearchBar />
            </Suspense>
          </div>

          <Suspense fallback={<ProductsGridSkeleton />}>
            <div className="mb-8 grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-3 xl:grid-cols-4 xl:gap-6">
              {res.data.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </Suspense>

          {res.meta.last_page > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              {res.links.prev ? (
                <Link
                  href={`/menu?${new URLSearchParams({
                    ...(categorySlug && { category: categorySlug }),
                    ...(search && { search }),
                    page: (page - 1).toString(),
                  }).toString()}`}
                  className="p-2 rounded-lg border border-neutral-light-200 hover:bg-neutral-50 transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-secondary-900" />
                </Link>
              ) : (
                <button
                  disabled
                  className="p-2 rounded-lg border border-neutral-light-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-secondary-900" />
                </button>
              )}

              {Array.from({ length: res.meta.last_page }, (_, i) => i + 1).map(
                (pageNum) => {
                  const showPage =
                    pageNum === 1 ||
                    pageNum === res.meta.last_page ||
                    (pageNum >= page - 1 && pageNum <= page + 1);
                  if (!showPage) {
                    if (pageNum === page - 2 || pageNum === page + 2) {
                      return (
                        <span key={pageNum} className="px-2 text-secondary-300">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                  return (
                    <Link
                      key={pageNum}
                      href={`/menu?${new URLSearchParams({
                        ...(categorySlug && { category: categorySlug }),
                        ...(search && { search }),
                        page: pageNum.toString(),
                      }).toString()}`}
                      className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                        pageNum === page
                          ? "bg-primary-500 text-white"
                          : "bg-white border border-neutral-light-200 text-secondary-900 hover:bg-neutral-50"
                      }`}
                    >
                      {pageNum}
                    </Link>
                  );
                }
              )}

              {res.links.next ? (
                <Link
                  href={`/menu?${new URLSearchParams({
                    ...(categorySlug && { category: categorySlug }),
                    ...(search && { search }),
                    page: (page + 1).toString(),
                  }).toString()}`}
                  className="p-2 rounded-lg border border-neutral-light-200 hover:bg-neutral-50 transition-colors"
                >
                  <ChevronRight className="w-5 h-5 text-secondary-900" />
                </Link>
              ) : (
                <button
                  disabled
                  className="p-2 rounded-lg border border-neutral-light-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-secondary-900" />
                </button>
              )}
            </div>
          )}

          <div className="mt-6 text-sm opacity-70 text-center">
            Menampilkan {res.meta.from || 0} sampai {res.meta.to || 0} dari{" "}
            {res.meta.total} menu
          </div>
        </div>
      </div>
    </section>
  );
}

// Metadata (Tetap sama)
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://burgerbangor.com";
export async function generateMetadata(_props: unknown, parent: ResolvingMetadata): Promise<Metadata> {
  const url = `${siteUrl}/menu`;
  const previous = await parent;
  const previousOG = previous.openGraph || {};
  return {
    title: "Menu",
    description: "Menu Burger Bangor menghadirkan pilihan burger ayam, burger keju, hingga Spicy Lava yang pedasnya nagih.",
    alternates: { canonical: url },
    openGraph: { ...previousOG, title: "Menu", url, images: [`${siteUrl}/images/logo/brand_primary.svg`] },
    twitter: { card: "summary_large_image", title: "Menu", images: [`${siteUrl}/images/logo/brand_primary.svg`] },
  };
}