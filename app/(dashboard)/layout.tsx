import { UserSidebar } from "@/components/layout/user-sidebar";
import { AuthGate } from "@/components/dashboard/auth-gate";

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGate>
      <div className="min-h-screen bg-zinc-50 text-zinc-950 [font-family:var(--font-montserrat)]">
        <UserSidebar />
        <main className="pl-[240px]">
          <div className="mx-auto w-full max-w-[1600px] px-8 py-10 lg:px-10">
            {children}
          </div>
        </main>
      </div>
    </AuthGate>
  );
}
