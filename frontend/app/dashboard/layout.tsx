import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
