import AuthenticatedLayout from "@/app/components/AuthenticatedLayout";

export default function TransactionsLayout({ children }: { children: React.ReactNode }) {
  return <AuthenticatedLayout>{children}</AuthenticatedLayout>;
}
