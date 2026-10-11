import { CommandPalette } from "@/components/ui/command-palette";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { TopBar } from "@/components/ui/top-bar";
import { BottomNav } from "@/components/nav";
import { InstallPrompt, OfflineBanner } from "@/components/pwa";
import { FloatingTimer, TimerProvider } from "@/components/timer";
import { getSession } from "@/lib/tenant";
import { getIndustryModule } from "@/modules";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, tenant, role } = await getSession();
  const mod = getIndustryModule(tenant.industry);

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenant.id)
    .neq("status", "enviado");

  const userName = (user.user_metadata?.full_name as string | undefined) || user.email || "Tú";

  return (
    <TimerProvider>
      <div className="flex min-h-dvh">
        <AppSidebar
          businessName={tenant.name}
          industryLabel={mod.name}
          recipeLabel={mod.recipe.menuLabel}
          role={role}
          userName={userName}
          activeOrders={count ?? 0}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="pt-safe" />
          <TopBar businessName={tenant.name} recipeLabel={mod.recipe.menuLabel} />
          <OfflineBanner />
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-5 pb-40 md:px-8 md:pb-10">{children}</main>
        </div>
      </div>
      <FloatingTimer />
      <BottomNav recipeLabel={mod.recipe.menuLabel} role={role} />
      <InstallPrompt />
      <CommandPalette recipeLabel={mod.recipe.menuLabel} role={role} />
    </TimerProvider>
  );
}
