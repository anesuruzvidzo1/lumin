"use client";

import { useEffect, useRef } from "react";

import type { VisualizationSpec } from "vega-embed";

interface VegaChartProps {
  spec: Record<string, unknown>;
}

export function VegaChart({ spec }: VegaChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return;
    }

    let cancelled = false;
    let finalize: (() => void) | undefined;
    const isDark = document.documentElement.classList.contains("dark");

    import("vega-embed")
      .then(async ({ default: embed }) => {
        if (cancelled) {
          return;
        }
        const result = await embed(el, spec as unknown as VisualizationSpec, {
          actions: false,
          theme: isDark ? "dark" : "vox",
          config: {
            background: "transparent",
            view: { stroke: "transparent" },
          },
        });
        if (cancelled) {
          result.finalize();
          return;
        }
        finalize = () => result.finalize();
      })
      .catch(() => {
        // Chart render failures are non-critical — the text response is still visible
      });

    return () => {
      cancelled = true;
      finalize?.();
    };
  }, [spec]);

  return <div ref={containerRef} className="mt-4 -ml-1 overflow-x-auto" />;
}
