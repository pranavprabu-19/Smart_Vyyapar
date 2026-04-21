"use client";

import { Search } from "lucide-react";
import { useCommandPalette } from "@/lib/command-palette-context";
import { cn } from "@/lib/utils";

export function DashboardSearchBar() {
  const palette = useCommandPalette();

  return (
    <button
      type="button"
      onClick={() => palette?.toggle()}
      className={cn(
        "flex h-10 w-full items-center gap-3 rounded-md border border-input bg-background px-3 py-2 text-left text-sm text-muted-foreground",
        "ring-offset-background transition-colors hover:bg-muted/50 hover:border-primary/30",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      aria-label="Open search (⌘K)"
    >
      <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span className="flex-1 truncate">Search navigation, actions… (⌘K)</span>
    </button>
  );
}
