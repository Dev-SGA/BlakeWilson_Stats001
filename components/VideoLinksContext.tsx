"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { GameStats } from "@/lib/stats";

type VideoLinksContextValue = {
  offensive1v1VideoLink: string;
  setOffensive1v1VideoLink: (value: string) => void;
  defensive1v1VideoLink: string;
  setDefensive1v1VideoLink: (value: string) => void;
  facing1v1VideoLink: string;
  setFacing1v1VideoLink: (value: string) => void;
  back1v1VideoLink: string;
  setBack1v1VideoLink: (value: string) => void;
  mergeIntoStats: (stats: GameStats) => GameStats;
};

const VideoLinksContext = createContext<VideoLinksContextValue | null>(null);

type VideoLinksProviderProps = {
  initialOffensive1v1VideoLink: string;
  initialDefensive1v1VideoLink: string;
  initialFacing1v1VideoLink: string;
  initialBack1v1VideoLink: string;
  children: ReactNode;
};

export function VideoLinksProvider({
  initialOffensive1v1VideoLink,
  initialDefensive1v1VideoLink,
  initialFacing1v1VideoLink,
  initialBack1v1VideoLink,
  children,
}: VideoLinksProviderProps) {
  const [offensive1v1VideoLink, setOffensive1v1VideoLink] = useState(initialOffensive1v1VideoLink);
  const [defensive1v1VideoLink, setDefensive1v1VideoLink] = useState(initialDefensive1v1VideoLink);
  const [facing1v1VideoLink, setFacing1v1VideoLink] = useState(initialFacing1v1VideoLink);
  const [back1v1VideoLink, setBack1v1VideoLink] = useState(initialBack1v1VideoLink);

  useEffect(() => {
    setOffensive1v1VideoLink(initialOffensive1v1VideoLink);
    setDefensive1v1VideoLink(initialDefensive1v1VideoLink);
    setFacing1v1VideoLink(initialFacing1v1VideoLink);
    setBack1v1VideoLink(initialBack1v1VideoLink);
  }, [
    initialOffensive1v1VideoLink,
    initialDefensive1v1VideoLink,
    initialFacing1v1VideoLink,
    initialBack1v1VideoLink,
  ]);

  const value = useMemo<VideoLinksContextValue>(
    () => ({
      offensive1v1VideoLink,
      setOffensive1v1VideoLink,
      defensive1v1VideoLink,
      setDefensive1v1VideoLink,
      facing1v1VideoLink,
      setFacing1v1VideoLink,
      back1v1VideoLink,
      setBack1v1VideoLink,
      mergeIntoStats(stats) {
        return {
          ...stats,
          offensive1v1: { ...stats.offensive1v1, videoLink: offensive1v1VideoLink },
          defensive1v1: { ...stats.defensive1v1, videoLink: defensive1v1VideoLink },
          facing1v1: { ...stats.facing1v1, videoLink: facing1v1VideoLink },
          back1v1: { ...stats.back1v1, videoLink: back1v1VideoLink },
        };
      },
    }),
    [offensive1v1VideoLink, defensive1v1VideoLink, facing1v1VideoLink, back1v1VideoLink],
  );

  return <VideoLinksContext.Provider value={value}>{children}</VideoLinksContext.Provider>;
}

export function useVideoLinks(): VideoLinksContextValue {
  const ctx = useContext(VideoLinksContext);
  if (!ctx) {
    throw new Error("useVideoLinks must be used within VideoLinksProvider");
  }
  return ctx;
}
