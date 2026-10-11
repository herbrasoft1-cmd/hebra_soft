"use client";

import { useState } from "react";
import { Tabs } from "@/components/ui/tabs";
import type { Invitation, Location, Membership, Role } from "@/lib/types";
import { PermissionsTable } from "./permissions-table";
import { TeamSection } from "./team-section";

type Tab = "miembros" | "permisos";

export function EquipoTabs({
  members,
  invitations,
  viewerRole,
  viewerId,
  locations,
}: {
  members: Membership[];
  invitations: Invitation[];
  viewerRole: Role;
  viewerId: string;
  locations: Location[];
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
        ]}
      />
      {tab === "miembros" ? (
        <TeamSection members={members} invitations={invitations} viewerRole={viewerRole} viewerId={viewerId} locations={locations} />
      ) : (
        <PermissionsTable />
      )}
    </div>
  );
}
