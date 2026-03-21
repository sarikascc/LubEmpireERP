"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/actions/auth";
import { useState } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Shadcn imports

export default function Sidebar() {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  // Menu groups upgraded with SVG icons
  const menuGroups = [
    {
      label: "Overview",
      items: [
        {
          name: "Dashboard",
          href: "/",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Materials",
      items: [
        {
          name: "Raw Materials",
          href: "/materials/raw-materials",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
              />
            </svg>
          ),
        },
        {
          name: "Boxes",
          href: "/materials/boxes",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="w-5 h-5"
            >
              <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
              <path d="m7 16.5-4.74-2.85" />
              <path d="m7 16.5 5-3" />
              <path d="M7 16.5v5.17" />
              <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
              <path d="m17 16.5-5-3" />
              <path d="m17 16.5 4.74-2.85" />
              <path d="M17 16.5v5.17" />
              <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
              <path d="M12 8 7.26 5.15" />
              <path d="m12 8 4.74-2.85" />
              <path d="M12 13.5V8" />
            </svg>
          ),
        },
        {
          name: "Stickers",
          href: "/materials/stickers",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 6h.008v.008H6V6z"
              />
            </svg>
          ),
        },
        {
          name: "Caps",
          href: "/materials/caps",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
          ),
        },
        {
          name: "Bottles/Buckets",
          href: "/materials/bottles_buckets",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Production",
      items: [
        {
          name: "Finished Products",
          href: "/finished-products",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Accounting",
      items: [
        {
          name: "Orders",
          href: "/accounting/orders",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z"
              />
            </svg>
          ),
        },
        {
          name: "Transactions",
          href: "/accounting/entries",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
              />
            </svg>
          ),
        },
      ],
    },
    {
      label: "Reports",
      items: [
        {
          name: "Report",
          href: "/reports/report",
          icon: (
            <svg
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              className="w-5 h-5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ),
        },
      ],
    },
  ];

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-64 bg-white border-r border-gray-200 h-full flex flex-col shadow-sm flex-shrink-0">
        {/* Logo Area */}
        <div className="py-1 px-4 border-b border-gray-100 flex items-center justify-center">
          <Link href="/">
            <Image
              src="/logo.svg"
              alt="Lubempire"
              width={150}
              height={45}
              className="object-contain"
              priority
            />
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-6 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {menuGroups.map((group) => (
            <div key={group.label}>
              <h3 className="px-3 text-sm font-bold text-gray-500 uppercase tracking-wider mb-2">
                {group.label}
              </h3>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                  return (
                    <li key={item.name}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Link
                            href={item.href}
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-md text-base font-medium transition-all ${
                              isActive
                                ? "bg-[var(--lub-gold)] text-white shadow-sm"
                                : "text-black hover:bg-gray-100 hover:text-[var(--lub-gold)]"
                            }`}
                          >
                            {item.icon}
                            {item.name}
                          </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p>Go to {item.name}</p>
                        </TooltipContent>
                      </Tooltip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        {/* Profile & Logout Accordion Area */}
        <div className="border-t border-gray-100 bg-gray-50/50">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[var(--lub-dark)] text-white flex items-center justify-center font-bold text-lg shadow-sm">
                    L
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-bold text-black leading-tight">
                      Admin
                    </p>
                    <p className="text-xs text-gray-500 font-medium">
                      Lubempire System
                    </p>
                  </div>
                </div>

                {/* Dynamic Chevron Icon based on state */}
                {isProfileOpen ? (
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p>
                {isProfileOpen ? "Close Profile Menu" : "Open Profile Menu"}
              </p>
            </TooltipContent>
          </Tooltip>

          {/* Expandable Logout Area */}
          {isProfileOpen && (
            <div className="px-4 pb-4 pt-2 border-t border-gray-100">
              <Tooltip>
                <TooltipTrigger asChild>
                  <form action={signOut} className="w-full">
                    <button
                      type="submit"
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 rounded-md shadow-sm text-sm font-bold text-red-600 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                        />
                      </svg>
                      Sign Out
                    </button>
                  </form>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p>Securely log out</p>
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>
      </aside>
    </TooltipProvider>
  );
}
