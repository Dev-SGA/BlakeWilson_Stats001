import gameStats from "@/data/gameStats.json";

/** Outcome of an offensive 1v1 action judged by what the play produced. */
export type PlayBreakdown = {
  progressivePlays: number;
  lostPlays: number;
  neutralPlays: number;
};

/** Outcome of a defensive 1v1 duel. */
export type DuelBreakdown = {
  won: number;
  lost: number;
  neutral: number;
};

/** A move type inside the Facing 1v1 group (Facing, Get Away, Dribble Opponent). */
export type FacingMove = PlayBreakdown & {
  id: string;
  label: string;
  total: number;
};

export type MatchKind = "baseline" | "session";

export type MatchStats = {
  id: string;
  kind: MatchKind;
  label: string;
  shortLabel: string;
  logo: string;
  touches: {
    total: number;
    videoLink: string;
  };
  offensive1v1: PlayBreakdown & {
    total: number;
    videoLink: string;
  };
  defensive1v1: DuelBreakdown & {
    total: number;
    videoLink: string;
  };
  facing1v1: {
    total: number;
    moves: FacingMove[];
    videoLink: string;
  };
  back1v1: PlayBreakdown & {
    total: number;
    videoLink: string;
  };
  videos?: { label: string; url: string }[];
  games?: number;
  /** Minutes played, when shorter than a full match. */
  minutes?: number;
  /** Numbers projected to a full match. */
  projected?: boolean;
  /** Season numbers divided by the games played. */
  perGame?: boolean;
};

export type StatsReport = {
  meta: {
    title: string;
    subtitle: string;
    session: string;
  };
  player: {
    name: string;
    club: string;
    clubLogo: string;
    photo: string;
  };
  matches: MatchStats[];
};

/** Shape consumed by the PDF export of a single match. */
export type GameStats = {
  meta: StatsReport["meta"] & { fileSlug: string; games?: number };
  player: StatsReport["player"];
  opponentLogo: string;
  touches: MatchStats["touches"];
  offensive1v1: MatchStats["offensive1v1"];
  defensive1v1: MatchStats["defensive1v1"];
  facing1v1: MatchStats["facing1v1"];
  back1v1: MatchStats["back1v1"];
  videos?: { label: string; url: string }[];
};

export function getStatsReport(): StatsReport {
  return gameStats as StatsReport;
}

export type MatchSummary = {
  touches: number;
  offensive1v1: number;
  /** Share of touches that were offensive 1v1 situations. */
  offensive1v1Share: number;
  otherTouches: number;
  offensiveProgressive: number;
  offensiveLost: number;
  offensiveNeutral: number;
  defensive1v1: number;
  defensiveWon: number;
  defensiveLost: number;
  defensiveNeutral: number;
  defensiveWinRate: number;
};

function rate(part: number, total: number): number {
  return total > 0 ? Math.round((part / total) * 100) : 0;
}

const normalizeClipLabel = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

function findClip(
  videos: { label: string; url: string }[] | undefined,
  aliases: string[],
): { label: string; url: string } | undefined {
  if (!videos?.length) return undefined;
  const keys = new Set(aliases.map(normalizeClipLabel));
  return videos.find((video) => keys.has(normalizeClipLabel(video.label)));
}

export function clipUrl(videos: { label: string; url: string }[] | undefined, ...aliases: string[]): string | undefined {
  const url = findClip(videos, aliases)?.url;
  return url ? url : undefined;
}

/** Clip entry for a label — href once the url is filled, hasClip while the upload is still pending. */
export type ClipRef = { href?: string; hasClip: boolean };

export function clipRef(videos: { label: string; url: string }[] | undefined, ...aliases: string[]): ClipRef {
  const clip = findClip(videos, aliases);
  if (!clip) return { hasClip: false };
  return { href: clip.url || undefined, hasClip: true };
}

/** Whole numbers stay as they are; averages show one decimal. */
export function formatCount(value: number): string {
  if (Number.isInteger(value)) return String(value);
  return (Math.round(value * 10) / 10).toFixed(1).replace(/\.0$/, "");
}

/** Average per recorded game, with one decimal when it is not a whole number. */
export function perGame(total: number, games: number): string {
  const value = games > 0 ? total / games : 0;
  const rounded = Math.round(value * 10) / 10;
  return rounded.toFixed(1).replace(/\.0$/, "");
}

export function playTotal(breakdown: PlayBreakdown): number {
  return breakdown.progressivePlays + breakdown.lostPlays + breakdown.neutralPlays;
}

export function duelTotal(breakdown: DuelBreakdown): number {
  return breakdown.won + breakdown.lost + breakdown.neutral;
}

export function matchSummary(match: MatchStats): MatchSummary {
  const touches = match.touches.total;
  const offensive1v1 = match.offensive1v1.total;

  return {
    touches,
    offensive1v1,
    offensive1v1Share: rate(offensive1v1, touches),
    otherTouches: Math.max(touches - offensive1v1, 0),
    offensiveProgressive: match.offensive1v1.progressivePlays,
    offensiveLost: match.offensive1v1.lostPlays,
    offensiveNeutral: match.offensive1v1.neutralPlays,
    defensive1v1: match.defensive1v1.total,
    defensiveWon: match.defensive1v1.won,
    defensiveLost: match.defensive1v1.lost,
    defensiveNeutral: match.defensive1v1.neutral,
    defensiveWinRate: rate(match.defensive1v1.won, match.defensive1v1.won + match.defensive1v1.lost),
  };
}

function addPlays(left: PlayBreakdown, right: PlayBreakdown): PlayBreakdown {
  return {
    progressivePlays: left.progressivePlays + right.progressivePlays,
    lostPlays: left.lostPlays + right.lostPlays,
    neutralPlays: left.neutralPlays + right.neutralPlays,
  };
}

function addDuels(left: DuelBreakdown, right: DuelBreakdown): DuelBreakdown {
  return {
    won: left.won + right.won,
    lost: left.lost + right.lost,
    neutral: left.neutral + right.neutral,
  };
}

/** Same match shape as the individual games, with every recorded number added together. */
export function seasonMatch(matches: MatchStats[]): MatchStats {
  const moveIds = new Map<string, FacingMove>();
  for (const match of matches) {
    for (const move of match.facing1v1.moves) {
      const current = moveIds.get(move.id);
      moveIds.set(
        move.id,
        current
          ? {
              ...move,
              total: current.total + move.total,
              progressivePlays: current.progressivePlays + move.progressivePlays,
              lostPlays: current.lostPlays + move.lostPlays,
              neutralPlays: current.neutralPlays + move.neutralPlays,
            }
          : { ...move },
      );
    }
  }

  return {
    id: "season",
    kind: "session",
    label: "Season",
    shortLabel: "Season",
    logo: "",
    touches: {
      total: matches.reduce((sum, match) => sum + match.touches.total, 0),
      videoLink: "",
    },
    offensive1v1: {
      ...matches
        .map((match): PlayBreakdown => match.offensive1v1)
        .reduce(addPlays),
      total: matches.reduce((sum, match) => sum + match.offensive1v1.total, 0),
      videoLink: "",
    },
    defensive1v1: {
      ...matches
        .map((match): DuelBreakdown => match.defensive1v1)
        .reduce(addDuels),
      total: matches.reduce((sum, match) => sum + match.defensive1v1.total, 0),
      videoLink: "",
    },
    facing1v1: {
      total: matches.reduce((sum, match) => sum + match.facing1v1.total, 0),
      moves: [...moveIds.values()],
      videoLink: "",
    },
    back1v1: {
      ...matches
        .map((match): PlayBreakdown => match.back1v1)
        .reduce(addPlays),
      total: matches.reduce((sum, match) => sum + match.back1v1.total, 0),
      videoLink: "",
    },
    games: matches.length,
  };
}

function scaleNumbers<T>(value: T, factor: number, round = false): T {
  if (typeof value === "number") return (round ? Math.round(value * factor) : value * factor) as T;
  if (Array.isArray(value)) {
    return value.map((item) => scaleNumbers(item, factor, round)) as T;
  }
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, scaleNumbers(item, factor, round)]),
  ) as T;
}

/** Match numbers projected to a full game, based on the minutes actually played. */
export function projectedMatch(match: MatchStats, targetMinutes = 90): MatchStats {
  const factor = (match.minutes ?? targetMinutes) > 0 ? targetMinutes / (match.minutes ?? targetMinutes) : 1;

  return {
    ...match,
    touches: scaleNumbers(match.touches, factor, true),
    offensive1v1: scaleNumbers(match.offensive1v1, factor, true),
    defensive1v1: scaleNumbers(match.defensive1v1, factor, true),
    facing1v1: scaleNumbers(match.facing1v1, factor, true),
    back1v1: scaleNumbers(match.back1v1, factor, true),
    projected: true,
  };
}

/** Season match with every absolute number divided by the games played. Shares stay the same. */
export function perGameMatch(season: MatchStats): MatchStats {
  const games = season.games ?? 0;
  const factor = games > 0 ? 1 / games : 0;

  return {
    ...season,
    label: `${season.label} · Per game`,
    touches: scaleNumbers(season.touches, factor),
    offensive1v1: scaleNumbers(season.offensive1v1, factor),
    defensive1v1: scaleNumbers(season.defensive1v1, factor),
    facing1v1: scaleNumbers(season.facing1v1, factor),
    back1v1: scaleNumbers(season.back1v1, factor),
    games: undefined,
    perGame: true,
  };
}

export function toGameStats(report: StatsReport, match: MatchStats): GameStats {
  return {
    meta: {
      ...report.meta,
      subtitle: match.label,
      session: match.kind === "baseline" ? "001" : report.meta.session,
      fileSlug: `${report.meta.session}-${match.id}${match.perGame ? "-per-game" : ""}`,
      games: match.games,
    },
    player: report.player,
    opponentLogo: match.logo,
    touches: match.touches,
    offensive1v1: match.offensive1v1,
    defensive1v1: match.defensive1v1,
    facing1v1: match.facing1v1,
    back1v1: match.back1v1,
    videos: match.videos,
  };
}
