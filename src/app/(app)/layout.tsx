import { AppLayout } from "@/components/layout/AppLayout";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "@/components/ui/toast";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <AppLayout>{children}</AppLayout>
      <Toaster />
    </SessionProvider>
  );
}
