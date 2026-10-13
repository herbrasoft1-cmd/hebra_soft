import { CommandPalette } from "@/components/ui/command-palette";
import { AppSidebar } from "@/components/ui/app-sidebar";
import { TopBar } from "@/components/ui/top-bar";
import { BottomNav } from "@/components/nav";
import { InstallPrompt, OfflineBanner } from "@/components/pwa";
import { FloatingTimer, TimerProvider } from "@/components/timer";
import { getActiveLocationId } from "@/lib/location";
import { getNotifications } from "@/lib/notifications";
import { getSession } from "@/lib/tenant";
import { ROLE_LABEL } from "@/lib/roles";
import { getIndustryModule } from "@/modules";
import { setActiveLocation } from "./location-actions";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { supabase, user, tenant, role } = await getSession();
  const mod = getIndustryModule(tenant.industry);

  const activeLocationId = await getActiveLocationId();

  const [{ count }, { data: locations }, notifications, { data: myProfile }] = await Promise.all([
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenant.id)
      .neq("status", "enviado"),
    supabase.from("locations").select("id, name").eq("tenant_id", tenant.id).order("name"),
    getNotifications(supabase, tenant.id, role, activeLocationId),
    // Consulta directa en vez de user.user_metadata: el access token de la sesión actual puede
    // llevar un nombre/foto desactualizados justo después de guardarlos (ver migración 0017).
    supabase.rpc("get_my_profile").maybeSingle(),
  ]);

  const profile = myProfile as { full_name: string | null; avatar_url: string | null } | null;
  const userName = profile?.full_name || (user.user_metadata?.full_name as string | undefined) || user.email || "Tú";
  const userAvatarUrl = profile?.avatar_url ?? (user.user_metadata?.avatar_url as string | undefined) ?? null;

  return (
    <TimerProvider>
      <div className="flex min-h-dvh">
        <AppSidebar
          businessName={tenant.name}
          industryLabel={mod.name}
          recipeLabel={mod.recipe.menuLabel}
          role={role}
          userId={user.id}
          userName={userName}
          userAvatarUrl={userAvatarUrl}
          activeOrders={count ?? 0}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <div className="pt-safe" />
          <TopBar
            businessName={tenant.name}
            recipeLabel={mod.recipe.menuLabel}
            locations={locations ?? []}
            activeLocationId={activeLocationId}
            onSetLocation={setActiveLocation}
            userId={user.id}
            userName={userName}
            userAvatarUrl={userAvatarUrl}
            roleLabel={ROLE_LABEL[role]}
            notifications={notifications}
          />
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
