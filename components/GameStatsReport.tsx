"use client";

import { useEffect, useMemo, useState } from "react";
import { AthleteProfileCard } from "@/components/AthleteProfileCard";
import { ExportPdfButton } from "@/components/ExportPdfButton";
import { VideoLinksProvider } from "@/components/VideoLinksContext";
import { SgaBrand } from "@/components/SgaBrand";
import { SgaCornerBrand } from "@/components/SgaCornerBrand";
import {
  BackBoard,
  DefensiveBoard,
  FacingBoard,
  StatsHeroSideboard,
} from "@/components/ChicagoExploreViews";
import { HeatmapBoard } from "@/components/HeatmapBoard";
import { TopicsBoard, type Topic } from "@/components/TopicsBoard";
import { BRAND } from "@/lib/brand";
import {
  matchSummary,
  perGameMatch,
  projectedMatch,
  seasonMatch,
  toGameStats,
  type GameStats,
  type MatchStats,
  type StatsReport,
} from "@/lib/stats";

type GameStatsReportProps = {
  report: StatsReport;
};

type SeasonMode = "total" | "perGame";

function SeasonModeToggle({ mode, onChange }: { mode: SeasonMode; onChange: (mode: SeasonMode) => void }) {
  const items: { id: SeasonMode; label: string }[] = [
    { id: "total", label: "Total" },
    { id: "perGame", label: "Per game" },
  ];

  return (
    <div className="match-nav__pills season-mode" role="group" aria-label="Season numbers">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`match-nav__pill${item.id === mode ? " is-active" : ""}`}
          aria-pressed={item.id === mode}
          onClick={() => onChange(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MatchSwitcher({
  matches,
  activeId,
  onChange,
  children,
}: {
  matches: MatchStats[];
  activeId: string;
  onChange: (id: string) => void;
  children?: React.ReactNode;
}) {
  const index = matches.findIndex((match) => match.id === activeId);

  return (
    <div className="match-nav">
      <div className="match-nav__session" role="group" aria-label="Matches">
        <button
          type="button"
          className="match-nav__arrow"
          onClick={() => onChange(matches[index - 1].id)}
          disabled={index <= 0}
          aria-label="Previous match"
        >
          <span aria-hidden="true">‹</span>
        </button>
        <div className="match-nav__pills">
          {matches.map((match) => (
            <button
              key={match.id}
              type="button"
              className={`match-nav__pill${match.id === activeId ? " is-active" : ""}`}
              aria-pressed={match.id === activeId}
              onClick={() => onChange(match.id)}
            >
              {match.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.logo} alt="" className="club-logo club-logo--pill" />
              ) : null}
              {match.shortLabel}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="match-nav__arrow"
          onClick={() => onChange(matches[index + 1].id)}
          disabled={index < 0 || index === matches.length - 1}
          aria-label="Next match"
        >
          <span aria-hidden="true">›</span>
        </button>
      </div>
      {children}
    </div>
  );
}

function buildTopics(match: MatchStats): Topic[] {
  const { games, videos } = match;
  const summary = matchSummary(match);

  return [
    {
      id: "stats",
      title: "Stats",
      phase: "stats",
      content: (
        <div className="stats-stack">
          <StatsHeroSideboard summary={summary} games={games} videos={videos} />
          <section className="stats-topic">
            <h3 className="stats-topic__title">Heatmap</h3>
            <HeatmapBoard heatmap={match.heatmap} />
          </section>
        </div>
      ),
    },
    {
      id: "facing-1v1",
      title: "Facing 1v1",
      phase: "offensive",
      content: (
        <FacingBoard
          facing={match.facing1v1}
          offensiveTotal={match.offensive1v1.total}
          games={games}
          videos={videos}
        />
      ),
    },
    {
      id: "back-1v1",
      title: "Back 1v1",
      phase: "offensive",
      content: <BackBoard back={match.back1v1} games={games} videos={videos} />,
    },
    {
      id: "defensive-1v1",
      title: "Defensive 1v1",
      phase: "defensive",
      content: <DefensiveBoard defensive={match.defensive1v1} games={games} videos={videos} />,
    },
  ];
}

export function GameStatsReport({ report }: GameStatsReportProps) {
  const { player, meta, matches } = report;
  const [seasonMode, setSeasonMode] = useState<SeasonMode>("total");
  const options = useMemo(() => {
    const season = seasonMatch(matches);
    return [...matches, seasonMode === "perGame" ? perGameMatch(season) : { ...season, games: undefined }];
  }, [matches, seasonMode]);
  const initialMatchId = matches.find((match) => match.kind === "session")?.id ?? matches[0]?.id ?? "";
  const [matchId, setMatchId] = useState(initialMatchId);
  const match = options.find((item) => item.id === matchId) ?? options[0];
  const [projected, setProjected] = useState(false);
  useEffect(() => setProjected(false), [match.id]);
  const displayMatch = match.minutes && projected ? projectedMatch(match) : match;
  const exportStats: GameStats = useMemo(() => toGameStats(report, displayMatch), [report, displayMatch]);
  const topics = useMemo(() => buildTopics(displayMatch), [displayMatch]);

  return (
    <VideoLinksProvider
      initialOffensive1v1VideoLink={match.offensive1v1.videoLink}
      initialDefensive1v1VideoLink={match.defensive1v1.videoLink}
      initialFacing1v1VideoLink={match.facing1v1.videoLink}
      initialBack1v1VideoLink={match.back1v1.videoLink}
    >
      <SgaCornerBrand />

      <div className="shell">
        <header className="report-header">
          <SgaBrand />
          <div className="report-header__intro">
            <p className="report-header__eyebrow">{BRAND.legal}</p>
            <h1 className="report-header__title">{meta.title}</h1>
            <p className="report-header__meta">
              {match.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={match.logo} alt="" className="club-logo club-logo--meta" />
              ) : null}
              {match.label}
            </p>
          </div>
        </header>

        <div className="report-grid">
          <AthleteProfileCard name={player.name} club={player.club} clubLogo={player.clubLogo} photoSrc={player.photo}>
            <ExportPdfButton stats={exportStats} />
          </AthleteProfileCard>

          <main className="report-main">
            <div className="view-panel">
              <MatchSwitcher matches={options} activeId={match.id} onChange={setMatchId}>
                {match.id === "season" ? <SeasonModeToggle mode={seasonMode} onChange={setSeasonMode} /> : null}
              </MatchSwitcher>
              <TopicsBoard
                topics={topics}
                minutes={match.minutes}
                projected={projected}
                onProjectedChange={setProjected}
              />
            </div>
          </main>
        </div>

        <footer className="footer">
          <p className="footer__slogan">{BRAND.slogan}</p>
          <p className="footer__rights">All rights reserved.</p>
        </footer>
      </div>
    </VideoLinksProvider>
  );
}
