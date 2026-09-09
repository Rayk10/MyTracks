"use client";

import { usePathname, useRouter } from "next/navigation";

function HomeIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11.5L12 4l9 7.5" />
      <path d="M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9" />
    </svg>
  );
}
function SearchIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M20 20l-4.5-4.5" />
    </svg>
  );
}
function StarIcon({ color, filled }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={filled ? color : "none"} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l2.6 5.9 6.4.6-4.8 4.3 1.4 6.2L12 16.9 6.4 20l1.4-6.2-4.8-4.3 6.4-.6L12 3z" />
    </svg>
  );
}
function StatsIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10" />
      <path d="M12 20V4" />
      <path d="M20 20v-7" />
    </svg>
  );
}
function PersonIcon({ color }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="3.5" />
      <path d="M4.5 20c1.4-3.5 4.4-5.5 7.5-5.5s6.1 2 7.5 5.5" />
    </svg>
  );
}

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
