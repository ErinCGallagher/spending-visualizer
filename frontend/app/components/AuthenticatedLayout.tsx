/**
 * Shared layout for authenticated views — renders the NavBar above page content.
 */

import Link from "next/link";
import NavBar from "@/app/components/NavBar";
import PageTransition from "@/app/components/PageTransition";

const NAV_LINKS = [
  { label: "Dashboards", href: "/dashboard" },
  { label: "Transactions", href: "/transactions" },
];

export default function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <NavBar
        links={NAV_LINKS}
        actions={
          <Link
            href="/upload"
            className="flex items-center gap-2 bg-[#064E3B] hover:bg-[#053d2f] text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path d="M3 3.5A1.5 1.5 0 0 1 4.5 2h6.879a1.5 1.5 0 0 1 1.06.44l4.122 4.12A1.5 1.5 0 0 1 17 7.622V16.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 16.5v-13Z" />
            </svg>
            Import transactions
          </Link>
        }
      />
      <PageTransition>{children}</PageTransition>
    </>
  );
}
