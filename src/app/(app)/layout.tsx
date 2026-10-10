import { BottomNav, Sidebar } from "@/components/nav";
import { InstallPrompt, OfflineBanner } from "@/components/pwa";
import { FloatingTimer, TimerProvider } from "@/components/timer";
import { getSession } from "@/lib/tenant";
import { getIndustryModule } from "@/modules";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { tenant, role } = await getSession();
  const mod = getIndustryModule(tenant.industry);

  return (
    <TimerProvider>
      <div className="flex min-h-dvh">
        <Sidebar businessName={tenant.name} recipeLabel={mod.recipe.menuLabel} role={role} />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="pt-safe" />
          <OfflineBanner />
          <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-6 pb-40 md:px-8 md:pt-8 md:pb-12">{children}</main>
        </div>
      </div>
      <FloatingTimer />
      <BottomNav recipeLabel={mod.recipe.menuLabel} role={role} />
      <InstallPrompt />
    </TimerProvider>
  );
}
