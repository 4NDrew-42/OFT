"use client";

import { useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { getSystemStatusProxy } from "@/lib/orionClient";

function cls(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(" ");
}

export default function SystemStatusChip() {
  const { data: session } = useSession();
  const sub = session?.user?.email || undefined;

  const q = useQuery({
    queryKey: ["system-status"],
    queryFn: async () => {
      if (!sub) throw new Error("no_sub");
      return getSystemStatusProxy(sub);
    },
    enabled: !!sub,
    staleTime: 60_000, // 1 minute
    refetchInterval: 120_000, // 2 minutes - much more reasonable for system status
    retry: (failureCount, error: any) => {
      // Don't retry on 429 rate limit errors
      if (error?.message?.includes('429')) return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  const status = q.data?.status as "healthy" | "degraded" | "down" | undefined;
  const color = useMemo(() => {
    return status === "healthy" ? "bg-emerald-500" : status === "degraded" ? "bg-amber-500" : status === "down" ? "bg-rose-500" : "bg-gray-400";
  }, [status]);

  useEffect(() => {
    if (q.error) console.warn("system-status error", q.error);
  }, [q.error]);

  return (
    <span className={cls("inline-flex items-center gap-2 rounded-full border px-2 py-1 text-xs", q.isLoading && "opacity-70")}
      title={status ? `System ${status}` : "System status"}>
      <span className={cls("h-2 w-2 rounded-full", color)} />
      <span className="hidden sm:inline">{status ?? "status"}</span>
    </span>
  );
}

