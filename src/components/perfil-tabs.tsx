"use client";

import { useState, type ReactNode } from "react";

interface PerfilTabsProps {
  nineBoxContent: ReactNode;
}

const TABS = [
  { key: "perfil", label: "Perfil" },
  { key: "ninebox", label: "Nine Box" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export function PerfilTabs({ nineBoxContent }: PerfilTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("perfil");

  return (
    <div className="mt-6">
      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`whitespace-nowrap border-b-2 px-1 py-3 text-sm font-medium ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
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
          <p className="text-gray-600">Informações do seu perfil.</p>
        )}
        {activeTab === "ninebox" && nineBoxContent}
      </div>
    </div>
  );
}
