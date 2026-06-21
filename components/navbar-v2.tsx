"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { ChevronDown, Mail, MapPin, Menu, X } from "lucide-react";
import { useNavbar } from "@/contexts/navbar-context";
import {
  NAV_ITEMS,
  type NavItem,
  type NavLinkItem,
  isNavItemActive,
  isNavLinkActive,
} from "@/lib/config/nav-items";
import { cn } from "@/lib/utils";

/** CTA outlet → /outlet; data dari Care API (`lib/config/outlet-feature.ts`). */
import {
  CONTACT_US_ENABLED,
  CONTACT_US_HREF,
  OUTLET_FINDER_ENABLED,
} from "@/lib/config/outlet-feature";

type NavVisualState = {
  transparentOverHero: boolean;
  solidHeroHover: boolean;
  isAtTop: boolean;
};

function navLabelClass(isActive: boolean, visual: NavVisualState) {
  const { transparentOverHero, solidHeroHover, isAtTop } = visual;
  return cn(
    "text-[13px] font-medium tracking-wide transition-colors lg:text-[14px]",
    transparentOverHero &&
      (isActive ? "text-white" : "text-white/80 group-hover:text-white"),
    solidHeroHover &&
      (isActive ? "text-black" : "text-black/60 group-hover:text-black"),
    !transparentOverHero &&
      !solidHeroHover &&
      isAtTop &&
      (isActive ? "text-black" : "text-black/60 group-hover:text-black"),
    !transparentOverHero &&
      !solidHeroHover &&
      !isAtTop &&
      (isActive ? "text-white" : "text-white/75 group-hover:text-white"),
  );
}

function navIndicatorClass(isActive: boolean, visual: NavVisualState) {
  const { transparentOverHero, solidHeroHover, isAtTop } = visual;
  return cn(
    "absolute -bottom-0.5 left-0 right-0 h-[1.5px] origin-left transition-transform duration-300",
    transparentOverHero || (!isAtTop && !solidHeroHover) ? "bg-white" : "bg-black",
    isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100",
  );
}

function NavLink({
  href,
  label,
  external,
  isActive,
  visual,
  className,
  onNavigate,
}: {
  href: string;
  label: string;
  external?: boolean;
  isActive: boolean;
  visual: NavVisualState;
  className?: string;
  onNavigate?: () => void;
}) {
  const content = (
    <>
      <span className={navLabelClass(isActive, visual)}>{label}</span>
      <span className={navIndicatorClass(isActive, visual)} />
    </>
  );

  if (external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn("group relative shrink-0 py-1", className)}
        onClick={onNavigate}
      >
        {content}
      </a>
    );
  }

  return (
    <Link
      href={href}
      className={cn("group relative shrink-0 py-1", className)}
      onClick={onNavigate}
    >
      {content}
    </Link>
  );
}

function NavDropdownDesktop({
  item,
  pathname,
  visual,
}: {
  item: Extract<NavItem, { type: "dropdown" }>;
  pathname: string;
  visual: NavVisualState;
}) {
  const [open, setOpen] = useState(false);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isActive = isNavItemActive(pathname, item);

  const clearCloseTimer = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  }, []);

  const handleMouseEnter = useCallback(() => {
    clearCloseTimer();
    setOpen(true);
  }, [clearCloseTimer]);

  const handleMouseLeave = useCallback(() => {
    clearCloseTimer();
    closeTimerRef.current = setTimeout(() => setOpen(false), 120);
  }, [clearCloseTimer]);

  useEffect(() => clearCloseTimer, [clearCloseTimer]);

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        className="group relative flex items-center gap-1 py-1"
      >
        <span className={navLabelClass(isActive, visual)}>{item.label}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 transition-transform duration-200",
            navLabelClass(isActive, visual),
            open && "rotate-180",
          )}
        />
        <span className={navIndicatorClass(isActive, visual)} />
      </button>

      {open ? (
        <div role="menu" className="absolute left-0 top-full z-[110] pt-2">
          <div className="min-w-[240px] overflow-hidden rounded-lg border border-neutral-light-200 bg-white py-2 shadow-lg">
            {item.items.map((child) => (
              <DropdownLink
                key={child.href}
                child={child}
                pathname={pathname}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DropdownLink({
  child,
  pathname,
  onNavigate,
  className,
}: {
  child: NavLinkItem;
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  const active = !child.external && isNavLinkActive(pathname, child.href);
  const linkClass = cn(
    "block px-4 py-2.5 text-sm font-medium transition-colors",
    active
      ? "bg-primary-50 text-primary-700"
      : "text-dark-500 hover:bg-neutral-light-50",
    className,
  );

  if (child.external) {
    return (
      <a
        href={child.href}
        target="_blank"
        rel="noopener noreferrer"
        role="menuitem"
        className={linkClass}
        onClick={onNavigate}
      >
        {child.label}
      </a>
    );
  }

  return (
    <Link
      href={child.href}
      role="menuitem"
      className={linkClass}
      onClick={onNavigate}
    >
      {child.label}
    </Link>
  );
}

export default function NavbarV2() {
  const pathname = usePathname();
  const { hasHeroSection } = useNavbar();
  const [visible, setVisible] = useState(true);
  const lastScrollRef = useRef(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expandedMobileDropdown, setExpandedMobileDropdown] = useState<
    string | null
  >(null);
  const [isAtTop, setIsAtTop] = useState(true);
  const [isNavbarHovered, setIsNavbarHovered] = useState(false);
  const mobileNavRef = useRef<HTMLDivElement>(null);

  /** Mobile: selalu transparan saat mentok atas (semua halaman). */
  const mobileTransparentAtTop = isAtTop && !mobileOpen;
  const mobileLightNavAtTop = mobileTransparentAtTop && !hasHeroSection;

  /** Desktop: transparan di atas; hover → solid putih. */
  const desktopTransparentAtTop =
    isAtTop && !isNavbarHovered && !mobileOpen;
  const solidHeroHover = isAtTop && isNavbarHovered && !mobileOpen;
  const transparentOverHero = hasHeroSection && desktopTransparentAtTop;

  const navVisual: NavVisualState = {
    transparentOverHero,
    solidHeroHover,
    isAtTop,
  };

  const desktopLogoSrc = transparentOverHero
    ? "/images/logo/typograph_white.svg"
    : solidHeroHover || (isAtTop && !hasHeroSection)
      ? "/images/logo/typograph_black.svg"
      : "/images/logo/typograph_white.svg";

  const mobileLogoSrc = mobileLightNavAtTop
    ? "/images/logo/typograph_black.svg"
    : "/images/logo/typograph_white.svg";

  const mobileIconClass = mobileLightNavAtTop
    ? "text-secondary-900"
    : "text-white";

  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  const closeMobileMenu = useCallback(() => {
    setMobileOpen(false);
    setExpandedMobileDropdown(null);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsAtTop(currentScrollY <= 10);
      const last = lastScrollRef.current;
      if (currentScrollY > last && currentScrollY > 80) {
        if (!mobileOpen) setVisible(false);
      } else {
        setVisible(true);
      }
      lastScrollRef.current = currentScrollY;
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  const ctaOutlet = useCallback(
    (className: string) => (
      <Link
        href="/outlet"
        className={className}
        onClick={closeMobileMenu}
      >
        <MapPin size={16} className="md:size-3.5" />
        Temukan Outlet
      </Link>
    ),
    [closeMobileMenu],
  );

  const ctaContactLink = useCallback(
    (className: string) => (
      <Link
        href={CONTACT_US_HREF}
        className={className}
        onClick={closeMobileMenu}
      >
        <Mail size={16} className="md:size-3.5" />
        Hubungi Kami
      </Link>
    ),
    [closeMobileMenu],
  );

  const ctaContactExternal = useCallback(
    (className: string) => (
      <a
        href={CONTACT_US_HREF}
        className={className}
        onClick={closeMobileMenu}
        rel="noopener noreferrer"
      >
        <Mail size={16} className="md:size-3.5" />
        Hubungi Kami
      </a>
    ),
    [closeMobileMenu],
  );

  const renderMobileCta = () => {
    const outletMobileClass =
      "flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-primary-500 py-4 text-sm font-bold text-white transition-colors active:scale-95 hover:bg-primary-600";
    const contactMobileClass =
      "flex w-full items-center justify-center gap-2 rounded-full border border-transparent bg-white py-4 text-sm font-bold text-black transition-colors active:scale-95 hover:border-primary-500 hover:bg-primary-500 hover:text-white";
    if (OUTLET_FINDER_ENABLED) return ctaOutlet(outletMobileClass);
    if (CONTACT_US_ENABLED && CONTACT_US_HREF.startsWith("/"))
      return ctaContactLink(contactMobileClass);
    if (CONTACT_US_ENABLED) return ctaContactExternal(contactMobileClass);
    return (
      <span
        className={`${contactMobileClass} cursor-default opacity-60`}
        aria-disabled="true"
      >
        <Mail size={16} />
        Hubungi Kami
      </span>
    );
  };

  const renderDesktopCta = () => {
    const outletCtaClass = cn(
      "navbar-outlet-cta",
      transparentOverHero && "navbar-outlet-cta--overlay",
    );
    const contactCtaSolid =
      "inline-flex items-center justify-center gap-2 rounded-full border border-white bg-secondary-900 px-7 py-2.5 text-[13px] font-bold !text-white transition-all duration-300 hover:bg-white hover:!text-secondary-900";
    const contactCtaOverlay =
      "inline-flex items-center justify-center gap-2 rounded-full border border-white bg-white/10 px-7 py-2.5 text-[13px] font-bold !text-white backdrop-blur-sm transition-all duration-300 hover:bg-white hover:!text-secondary-900";
    const contactBase = transparentOverHero ? contactCtaOverlay : contactCtaSolid;
    if (OUTLET_FINDER_ENABLED) {
      return (
        <Link href="/outlet" className={outletCtaClass}>
          <MapPin size={14} />
          Temukan Outlet
        </Link>
      );
    }
    if (CONTACT_US_ENABLED && CONTACT_US_HREF.startsWith("/")) {
      return (
        <Link href={CONTACT_US_HREF} className={contactBase}>
          <Mail size={14} />
          Hubungi Kami
        </Link>
      );
    }
    if (CONTACT_US_ENABLED) {
      return (
        <a href={CONTACT_US_HREF} className={contactBase} rel="noopener noreferrer">
          <Mail size={14} />
          Hubungi Kami
        </a>
      );
    }
    return (
      <span className={`${contactBase} cursor-default opacity-60`} aria-disabled="true">
        <Mail size={14} />
        Hubungi Kami
      </span>
    );
  };

  return (
    <header
      onMouseEnter={() => setIsNavbarHovered(true)}
      onMouseLeave={() => setIsNavbarHovered(false)}
      className={`fixed left-0 right-0 z-[150] transition-all duration-500 ${
        isAtTop ? "top-0" : "top-4"
      } ${visible ? "translate-y-0" : "-translate-y-[150%]"}`}
    >
      <div
        className={`mx-auto transition-all duration-500 ease-in-out ${
          isAtTop ? "w-full max-w-full px-0" : "w-[92%] max-w-[1100px] px-0"
        }`}
      >
        <div ref={mobileNavRef} className="relative md:hidden">
          {mobileOpen ? (
            <button
              type="button"
              aria-label="Tutup menu navigasi"
              className="fixed inset-0 z-[140] bg-black/40 md:hidden"
              onClick={closeMobileMenu}
            />
          ) : null}

          <div
            className={cn(
              "relative z-[160] flex items-center justify-between px-6 py-3.5 transition-all duration-500",
              mobileTransparentAtTop &&
                "border-transparent bg-transparent backdrop-blur-none",
              !mobileTransparentAtTop &&
                "rounded-full border border-white/15 bg-black/70 shadow-xl backdrop-blur-lg",
            )}
          >
            <Link
              href="/"
              onClick={closeMobileMenu}
              className="flex shrink-0 items-center"
            >
              <Image
                src={mobileLogoSrc}
                alt="Burger Bangor"
                width={140}
                height={40}
                className="h-7 w-auto object-contain"
                priority
              />
            </Link>

            <button
              type="button"
              aria-expanded={mobileOpen}
              aria-controls="navbar-v2-mobile-panel"
              onClick={() => setMobileOpen(!mobileOpen)}
              className={cn(
                "p-1 transition-transform active:scale-90",
                mobileIconClass,
              )}
            >
              {mobileOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>

          {mobileOpen ? (
            <div
              id="navbar-v2-mobile-panel"
              className="fixed inset-x-0 top-[52px] z-[145] mx-auto max-h-[calc(100dvh-52px)] w-full overflow-y-auto px-4 pb-6 pt-3 md:hidden"
            >
              <div className="mx-auto w-full rounded-[2rem] border border-white/15 bg-[#121212] p-6 shadow-2xl backdrop-blur-2xl">
                <div className="flex flex-col gap-2">
                  {NAV_ITEMS.map((item) => {
                    if (item.type === "link") {
                      const isActive = isNavLinkActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={closeMobileMenu}
                          className={cn(
                            "block w-full rounded-xl px-2 py-3 text-lg font-semibold !text-white transition-colors",
                            isActive ? "bg-white/10" : "hover:bg-white/5",
                          )}
                        >
                          {item.label}
                        </Link>
                      );
                    }

                    const isExpanded = expandedMobileDropdown === item.label;
                    const isActive = isNavItemActive(pathname, item);

                    return (
                      <div key={item.label} className="flex flex-col">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedMobileDropdown(
                              isExpanded ? null : item.label,
                            )
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-xl px-2 py-3 text-left text-lg font-semibold !text-white transition-colors",
                            isActive ? "bg-white/10" : "hover:bg-white/5",
                          )}
                        >
                          {item.label}
                          <ChevronDown
                            className={cn(
                              "size-5 transition-transform",
                              isExpanded && "rotate-180",
                            )}
                          />
                        </button>
                        {isExpanded ? (
                          <div className="mb-1 ml-2 flex flex-col gap-0.5 border-l border-white/15 pl-3">
                            {item.items.map((child) => (
                              <DropdownLink
                                key={child.href}
                                child={child}
                                pathname={pathname}
                                onNavigate={closeMobileMenu}
                                className="!rounded-lg !bg-transparent !px-2 !py-2.5 !text-base !font-medium !text-white/90 hover:!bg-white/10"
                              />
                            ))}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                  <div className="my-3 h-px w-full bg-white/10" />
                  {renderMobileCta()}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        <nav
          className={cn(
            "mx-auto hidden w-full items-center justify-between gap-6 px-8 py-3.5 transition-all duration-500 ease-in-out md:flex lg:gap-10",
            desktopTransparentAtTop &&
              !solidHeroHover &&
              "border-transparent bg-transparent shadow-none backdrop-blur-none",
            solidHeroHover &&
              "border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur-md",
            !desktopTransparentAtTop &&
              !solidHeroHover &&
              !isAtTop &&
              "rounded-full border border-white/35 bg-black/60 shadow-2xl backdrop-blur-lg",
          )}
        >
          <Link
            href="/"
            className="flex shrink-0 items-center transition-transform hover:scale-105"
          >
            <Image
              src={desktopLogoSrc}
              alt="Burger Bangor"
              width={140}
              height={40}
              className="h-9 w-auto object-contain md:h-10"
              priority
            />
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-center gap-4 lg:gap-7">
            {NAV_ITEMS.map((item) => {
              if (item.type === "link") {
                return (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    label={item.label}
                    isActive={isNavLinkActive(pathname, item.href)}
                    visual={navVisual}
                  />
                );
              }
              return (
                <NavDropdownDesktop
                  key={item.label}
                  item={item}
                  pathname={pathname}
                  visual={navVisual}
                />
              );
            })}
          </div>

          {renderDesktopCta()}
        </nav>
      </div>
    </header>
  );
}
