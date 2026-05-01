/**
 * Shared top navigation bar used across all authenticated pages.
 * Renders a nav strip containing the logo, nav links, actions, and profile dropdown.
 * On mobile, nav links and actions collapse into a hamburger menu.
 */

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, Menu, X } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface NavLink {
  label: string;
  href: string;
}

interface NavBarProps {
  links: NavLink[];
  /** Buttons/actions rendered to the left of the profile icon in the nav strip. */
  actions?: React.ReactNode;
}

export default function NavBar({ links, actions }: NavBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [profileOpen, setProfileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <div>
      {/* Nav strip */}
      <nav className="bg-white/90 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-brand-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-md shadow-brand-primary/20">
                <LayoutDashboard className="w-[18px] h-[18px] text-white" />
              </div>
              <span className="font-bold text-2xl tracking-tight">SpendWise</span>
            </div>

            {/* Desktop: nav links + actions + profile */}
            <div className="hidden md:flex items-center gap-6">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium px-4 py-2 rounded-lg transition-all ${
                      isActive
                        ? "bg-[#064E3B]/10 text-[#064E3B]"
                        : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              <div className="flex items-center gap-4">
                {actions}

                {/* Profile dropdown */}
                <div ref={profileRef} className="relative">
                  <button
                    onClick={() => setProfileOpen((o) => !o)}
                    className="flex items-center gap-2 pl-4 border-l border-slate-200 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0 0 21.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 0 0 3.065 7.097A9.716 9.716 0 0 0 12 21.75a9.716 9.716 0 0 0 6.685-2.653Zm-12.54-1.285A7.486 7.486 0 0 1 12 15a7.486 7.486 0 0 1 5.855 2.812A8.224 8.224 0 0 1 12 20.25a8.224 8.224 0 0 1-5.855-2.438ZM15.75 9a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
                      <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                      <button
                        onClick={() => { setProfileOpen(false); router.push("/settings"); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Settings
                      </button>
                      <button
                        onClick={() => authClient.signOut().then(() => router.push("/"))}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      >
                        Sign out
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Mobile: hamburger toggle */}
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden flex items-center justify-center w-11 h-11 rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
            >
              {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-md">
            <div className="max-w-6xl mx-auto px-6 py-3 flex flex-col gap-1">
              {links.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`text-sm font-medium px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? "bg-[#064E3B]/10 text-[#064E3B]"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}

              {actions && (
                <div className="pt-1 pb-1 flex flex-col gap-1">
                  {actions}
                </div>
              )}

              <div className="border-t border-slate-100 mt-1 pt-2 flex flex-col gap-1">
                <button
                  onClick={() => { setMenuOpen(false); router.push("/settings"); }}
                  className="text-left text-sm font-medium px-4 py-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  Settings
                </button>
                <button
                  onClick={() => authClient.signOut().then(() => router.push("/"))}
                  className="text-left text-sm font-medium px-4 py-3 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-all"
                >
                  Sign out
                </button>
              </div>
            </div>
          </div>
        )}
      </nav>
    </div>
  );
}
