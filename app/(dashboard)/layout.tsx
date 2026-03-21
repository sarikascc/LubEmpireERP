import Sidebar from "@/components/layout/Sidebar";
import React from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen bg-[var(--lub-bg)] overflow-hidden">
      {/* Fixed Sidebar Navigation */}
      <Sidebar />

      {/* Main Content Area - Scrollable */}
      <main className="flex-1 overflow-y-auto">
        {/* Changed padding to pt-4 (top) and px-6 (sides). 
            Removed max-w-7xl to let the list breathe. 
        */}
        <div className="pt-4 px-6 pb-8 w-full">{children}</div>
      </main>
    </div>
  );
}
