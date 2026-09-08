"use client";

import { usePathname, useRouter } from "next/navigation";

const TABS = [
  { key: "home", path: "/home", icon: "⌂" },
  { key: "ratings", path: "/ratings", icon: "★" },
  { key: "stats", path: "/stats", icon: "📊" },
  { key: "profile", path: "/profile", icon: "👤" },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 px-4 pb-3 max-w-md mx-auto z-10">
      <div className="flex items-center justify-around bg-zinc-900/95 backdrop-blur rounded-full px-3 py-2 shadow-lg">
        {TABS.map((tab) => {
          const active = pathname === tab.path;
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center"
            >
              {active ? (
                <div className="w-11 h-11 rounded-full bg-mtgold flex items-center justify-center -mt-3 shadow-[0_4px_16px_rgba(242,194,48,0.5)]">
                  <span className="text-black">{tab.icon}</span>
                </div>
              ) : (
                <span className="text-zinc-500 text-lg">{tab.icon}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
