"use client";

import { usePathname, useRouter } from "next/navigation";
import { HomeIcon, SearchIcon, StarIcon, StatsIcon, PersonIcon } from "@/components/icons";

const TABS = [
  { key: "home", path: "/home", Icon: HomeIcon },
  { key: "search", path: "/search", Icon: SearchIcon },
  { key: "ratings", path: "/ratings", Icon: StarIcon },
  { key: "stats", path: "/stats", Icon: StatsIcon },
  { key: "profile", path: "/profile", Icon: PersonIcon },
];

export default function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="fixed bottom-0 left-0 right-0 px-4 pb-3 max-w-md mx-auto z-10">
      <div className="flex items-center justify-around bg-zinc-900/95 backdrop-blur rounded-full px-3 py-2 shadow-lg">
        {TABS.map((tab) => {
          const active = pathname === tab.path || pathname.startsWith(tab.path + "/");
          const Icon = tab.Icon;
          return (
            <button
              key={tab.key}
              onClick={() => router.push(tab.path)}
              className="flex flex-col items-center"
            >
              {active ? (
                <div
                  key={pathname}
                  className="mt-scale w-11 h-11 rounded-full bg-mtgold flex items-center justify-center -mt-3 shadow-[0_4px_18px_rgba(242,194,48,0.55)]"
                >
                  <Icon color="#0a0a0a" filled />
                </div>
              ) : (
                <Icon color="#71717a" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
