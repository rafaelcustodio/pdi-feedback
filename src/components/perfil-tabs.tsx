"use client";

import { useState, type ReactNode } from "react";
import type { MyFullProfile } from "@/app/(dashboard)/perfil/actions";
import { PerfilData } from "@/components/perfil-data";

interface PerfilTabsProps {
  nineBoxContent: ReactNode;
  profile: MyFullProfile | null;
}

const TABS = [
  { key: "perfil", label: "Perfil" },
  { key: "ninebox", label: "Nine Box" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function PerfilTabs({ nineBoxContent, profile }: PerfilTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("perfil");

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 dark:text-gray-400 dark:hover:border-gray-600 dark:hover:text-gray-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab content */}
      <div className="mt-6">
        {activeTab === "perfil" && (
          profile ? (
            <PerfilData profile={profile} />
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Não foi possível carregar os dados do perfil.</p>
          )
        )}
        {activeTab === "ninebox" && nineBoxContent}
      </div>
    </div>
  );
}
