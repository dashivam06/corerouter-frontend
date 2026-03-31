import { AuthGate } from "@/components/dashboard/auth-gate";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminRoleGate } from "@/components/admin/admin-role-gate";
import type { ReactNode } from "react";

export default function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <AuthGate>
      <AdminRoleGate>
        <div className="min-h-screen bg-zinc-50 text-zinc-950 [font-family:var(--font-montserrat)]">
          <AdminSidebar />
          <main className="pl-[240px]">
            <div className="mx-auto w-full max-w-[1600px] px-8 py-10 lg:px-10">
              {children}
            </div>
          </main>
        </div>
      </AdminRoleGate>
    </AuthGate>
  );
}

