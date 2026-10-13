"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import type { Invitation, Location, Membership, Role } from "@/lib/types";
import type { AuditEntry } from "./activity-section";
import { IntegrationsSection } from "./integrations-section";
import { PermissionsTable } from "./permissions-table";
import { PlanSection } from "./plan-section";
import { TeamSection } from "./team-section";

type Tab = "miembros" | "permisos" | "integraciones" | "plan";

export function EquipoTabs({
  members,
  invitations,
  viewerRole,
  viewerId,
  locations,
  invoicesThisMonth,
  activity,
}: {
  members: Membership[];
  invitations: Invitation[];
  viewerRole: Role;
  viewerId: string;
  locations: Location[];
  invoicesThisMonth: number;
  activity: AuditEntry[];
}) {
  const [tab, setTab] = useState<Tab>("miembros");

  return (
    <div className="flex flex-col gap-4">
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "miembros", label: "Miembros" },
          { value: "permisos", label: "Roles y permisos" },
          { value: "integraciones", label: "Integraciones" },
          { value: "plan", label: "Plan y seguridad" },
        ]}
      />
      {tab === "miembros" && (
        <TeamSection members={members} invitations={invitations} viewerRole={viewerRole} viewerId={viewerId} locations={locations} />
      )}
      {tab === "permisos" && <PermissionsTable />}
      {tab === "integraciones" && <IntegrationsSection />}
      {tab === "plan" && (
        <PlanSection membersCount={members.length} locationsCount={locations.length} invoicesThisMonth={invoicesThisMonth} activity={activity} />
      )}
    </div>
  );
}
