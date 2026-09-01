"use client";

import Link from "next/link";
import { MapPin, Calendar, Users, Play } from "lucide-react";

const searchItems = [
  {
    icon: MapPin,
    title: "โคราช (Korat)",
    subtitle: "Choose the destination",
  },
  {
    icon: Calendar,
    title: "Check in",
    subtitle: "Add date",
  },
  {
    icon: Calendar,
    title: "Check out",
    subtitle: "Add date",
  },
  {
    icon: Users,
    title: "Visitors",
    subtitle: "Add guests",
  },
];

export default function SearchBar() {
  return (
    <div className="w-full max-w-5xl mx-auto bg-white/90 backdrop-blur-2xl border border-white/60 rounded-4xl md:rounded-full shadow-[0_20px_40px_-15px_rgba(0,0,0,0.08)] p-2.5 flex flex-col md:flex-row items-center justify-between gap-2 transition-all duration-500 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,0.12)]">

      {/* Search Fields */}
      <div className="flex-1 w-full flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-neutral-100">
        {searchItems.map((item, index) => {
          const Icon = item.icon;

          return (
            <div
              key={index}
              className="group flex-1 px-6 py-3.5 flex items-center gap-4 cursor-pointer hover:bg-neutral-50/80 rounded-full transition-colors"
            >
              <div className="p-2.5 bg-neutral-100/80 rounded-full text-neutral-500 group-hover:bg-white group-hover:text-neutral-900 group-hover:shadow-sm transition-all duration-300">
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex flex-col items-start">
                <p className="text-sm font-bold text-neutral-900">
                  {item.title}
                </p>
                <p className="text-xs text-neutral-500 font-medium mt-0.5">
                  {item.subtitle}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Search Action */}
      <Link
        href="/accommodations"
        className="w-full md:w-16 md:h-16 py-4 md:py-0 rounded-full bg-neutral-900 text-white flex items-center justify-center hover:bg-black hover:scale-[1.03] active:scale-95 transition-all duration-300 shrink-0 shadow-lg"
      >
        <span className="md:hidden font-medium mr-2">
          ค้นหาที่พัก
        </span>

        <Play className="w-5 h-5 fill-white ml-1" />
      </Link>

    </div>
  );
}