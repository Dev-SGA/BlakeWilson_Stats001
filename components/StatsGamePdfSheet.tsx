import { BRAND } from "@/lib/brand";
import {
  clipRef,
  formatCount,
  matchSummary,
  perGame,
  type ClipRef,
  type DuelBreakdown,
  type GameStats,
  type PlayBreakdown,
} from "@/lib/stats";

type StatsGamePdfSheetProps = {
  stats: GameStats;
  photoUrl: string;
  logoUrl: string;
  clubLogoUrl: string;
  opponentLogoUrl: string;
};

type PrintTone = "green" | "yellow" | "blue" | "mint" | "grey" | "warn";

function PdfPlay({ clip }: { clip?: ClipRef }) {
  if (!clip?.hasClip) return null;
  const icon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/play-icon.png" alt="" className="spdf-play__icon" width={14} height={14} />
  );
  if (!clip.href) return <span className="spdf-play spdf-play--pending">{icon}</span>;
  return (
    <a className="spdf-play" href={clip.href} data-pdf-link={clip.href} target="_blank" rel="noreferrer" aria-label="Open video">
      {icon}
    </a>
  );
}

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function PdfSide({
  photoUrl,
  logoUrl,
  clubLogoUrl,
  name,
  club,
}: {
  photoUrl: string;
  logoUrl: string;
  clubLogoUrl: string;
  name: string;
  club: string;
}) {
  return (
    <aside className="spdf-side">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={logoUrl} alt="" className="spdf-side__logo" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={photoUrl} alt="" className="spdf-side__photo" />
      <div className="spdf-side__identity">
        <p className="spdf-side__label">Athlete</p>
        <h2 className="spdf-side__name">{name}</h2>
        <p className="spdf-side__club">
          {clubLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={clubLogoUrl} alt="" className="spdf-side__club-logo" />
          ) : null}
          {club}
        </p>
      </div>
      <p className="spdf-side__slogan">{BRAND.slogan}</p>
    </aside>
  );
}

function PdfHeader({ title, subtitle, opponentLogoUrl }: { title: string; subtitle: string; opponentLogoUrl: string }) {
  return (
    <header className="spdf-head">
      <div>
        <p className="spdf-head__eyebrow">{BRAND.legal}</p>
        <h1 className="spdf-head__title">{title}</h1>
      </div>
      <div className="spdf-head__meta">
        <span className="spdf-head__match">
          {opponentLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={opponentLogoUrl} alt="" className="spdf-head__logo" />
          ) : null}
          <span>{subtitle}</span>
        </span>
      </div>
    </header>
  );
}

function SummaryMeter({
  segments,
}: {
  segments: { label: string; value: string; share: number; tone: PrintTone; clip?: ClipRef }[];
}) {
  const total = segments.reduce((sum, segment) => sum + segment.share, 0);

  return (
    <div className="spdf-summary-meter">
      <div className="spdf-pressure__track">
        {total === 0 ? (
          <span className="spdf-pressure__seg spdf-pressure__seg--grey" style={{ width: "100%" }} />
        ) : (
          segments.map((segment) => (
            <span
              key={segment.label}
              className={`spdf-pressure__seg spdf-pressure__seg--${segment.tone}`}
              style={{ width: `${(segment.share / total) * 100}%` }}
            />
          ))
        )}
      </div>
      <ul className="spdf-pressure__legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className={`spdf-pressure__dot spdf-pressure__dot--${segment.tone}`} />
            <span>
              {segment.label}
              <PdfPlay clip={segment.clip} />
            </span>
            <strong className={`spdf-tone spdf-tone--${segment.tone}`}>{segment.value}</strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SummaryStatCard({
  title,
  total,
  totalLabel,
  rate,
  rateLabel,
  perGameLabel,
  segments,
}: {
  title: string;
  total: number;
  totalLabel: string;
  rate?: number;
  rateLabel?: string;
  perGameLabel?: string;
  segments: { label: string; value: string; share: number; tone: PrintTone; clip?: ClipRef }[];
}) {
  return (
    <section className="spdf-section spdf-section--build-up spdf-section--summary">
      <h3 className="spdf-section__title">{title}</h3>
      <div className={`spdf-summary-kpis${rate == null ? " spdf-summary-kpis--single" : ""}`}>
        <div className="spdf-summary-kpi">
          <span className="spdf-summary-kpi__value">{formatCount(total)}</span>
          <span className="spdf-summary-kpi__label">{totalLabel}</span>
          {perGameLabel ? <span className="spdf-summary-kpi__per">{perGameLabel}</span> : null}
        </div>
        {rate != null ? (
          <div className="spdf-summary-kpi spdf-summary-kpi--rate">
            <span className="spdf-summary-kpi__value">{rate}%</span>
            <span className="spdf-summary-kpi__label">{rateLabel}</span>
          </div>
        ) : null}
      </div>
      <SummaryMeter segments={segments} />
    </section>
  );
}

function playSegments(breakdown: PlayBreakdown, videos?: GameStats["videos"]) {
  return [
    {
      label: "Progressive Plays",
      value: `${formatCount(breakdown.progressivePlays)} · ${pct(breakdown.progressivePlays, breakdown.progressivePlays + breakdown.lostPlays + breakdown.neutralPlays)}%`,
      share: breakdown.progressivePlays,
      tone: "green" as PrintTone,
      clip: clipRef(videos, "Progressive Plays"),
    },
    {
      label: "Lost Plays",
      value: `${formatCount(breakdown.lostPlays)} · ${pct(breakdown.lostPlays, breakdown.progressivePlays + breakdown.lostPlays + breakdown.neutralPlays)}%`,
      share: breakdown.lostPlays,
      tone: "yellow" as PrintTone,
      clip: clipRef(videos, "Lost Plays"),
    },
    {
      label: "Neutral Plays",
      value: `${formatCount(breakdown.neutralPlays)} · ${pct(breakdown.neutralPlays, breakdown.progressivePlays + breakdown.lostPlays + breakdown.neutralPlays)}%`,
      share: breakdown.neutralPlays,
      tone: "grey" as PrintTone,
    },
  ];
}

function duelSegments(breakdown: DuelBreakdown, videos?: GameStats["videos"]) {
  const total = breakdown.won + breakdown.lost + breakdown.neutral;
  return [
    {
      label: "Won",
      value: `${formatCount(breakdown.won)} · ${pct(breakdown.won, total)}%`,
      share: breakdown.won,
      tone: "green" as PrintTone,
      clip: clipRef(videos, "Def. 1v1 Won", "Defensive 1v1 Won"),
    },
    {
      label: "Lost",
      value: `${formatCount(breakdown.lost)} · ${pct(breakdown.lost, total)}%`,
      share: breakdown.lost,
      tone: "yellow" as PrintTone,
      clip: clipRef(videos, "Def. 1v1 Lost", "Defensive 1v1 Lost"),
    },
    {
      label: "Neutral",
      value: `${formatCount(breakdown.neutral)} · ${pct(breakdown.neutral, total)}%`,
      share: breakdown.neutral,
      tone: "grey" as PrintTone,
    },
  ];
}

function PdfSection({
  title,
  kpi,
  unit,
  aside,
  children,
  footer,
  size = "md",
  className,
  panelOnly,
}: {
  title: string;
  kpi: number;
  unit: string;
  aside?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "md" | "lg";
  className?: string;
  panelOnly?: boolean;
}) {
  return (
    <section
      className={`spdf-section spdf-section--build-up spdf-section--${size}${panelOnly ? " spdf-section--panel-only" : ""}${className ? ` ${className}` : ""}`}
    >
      <div className="spdf-section__top">
        <p className="spdf-section__phase">1v1 Report</p>
        <h3 className="spdf-section__title">{title}</h3>
      </div>
      <div className="spdf-section__content">
        {panelOnly ? null : (
          <div className={`spdf-section__kpi${aside ? " spdf-section__kpi--aside" : ""}`}>
            <span className="spdf-section__value">{formatCount(kpi)}</span>
            {aside ? <span className="spdf-section__aside">{aside}</span> : null}
            <span className="spdf-section__unit">{unit}</span>
          </div>
        )}
        <div className="spdf-section__panel">{children}</div>
      </div>
      {footer ? <div className="spdf-section__footer">{footer}</div> : null}
    </section>
  );
}

function MovePanel({
  title,
  total,
  breakdown,
  videos,
}: {
  title: string;
  total: number;
  breakdown: PlayBreakdown;
  videos?: GameStats["videos"];
}) {
  return (
    <div className="spdf-pass-panel">
      <div className="spdf-pass-panel__head">
        <p className="spdf-pass-panel__title">{title}</p>
        <span className="spdf-pass-panel__total">{formatCount(total)} plays</span>
      </div>
      <SummaryMeter segments={playSegments(breakdown, videos)} />
    </div>
  );
}

function SummaryPdfPage({
  stats,
  photoUrl,
  logoUrl,
  clubLogoUrl,
  opponentLogoUrl,
}: StatsGamePdfSheetProps) {
  const summary = matchSummary({
    id: stats.meta.fileSlug,
    kind: "session",
    label: stats.meta.subtitle,
    shortLabel: stats.meta.subtitle,
    logo: stats.opponentLogo,
    touches: stats.touches,
    offensive1v1: stats.offensive1v1,
    defensive1v1: stats.defensive1v1,
    facing1v1: stats.facing1v1,
    back1v1: stats.back1v1,
    videos: stats.videos,
  });
  const games = stats.meta.games;

  return (
    <article className="stats-pdf" aria-hidden="true">
      <PdfSide
        photoUrl={photoUrl}
        logoUrl={logoUrl}
        clubLogoUrl={clubLogoUrl}
        name={stats.player.name}
        club={stats.player.club}
      />
      <div className="spdf-main spdf-main--stats">
        <PdfHeader title={stats.meta.title} subtitle={stats.meta.subtitle} opponentLogoUrl={opponentLogoUrl} />
        <div className="spdf-summary">
          <SummaryStatCard
            title="Touches"
            total={summary.touches}
            totalLabel="Total touches"
            rate={summary.offensive1v1Share}
            rateLabel="Offensive 1v1"
            perGameLabel={games ? `${perGame(summary.touches, games)} per game` : undefined}
            segments={[
              {
                label: "Offensive 1v1",
                value: formatCount(summary.offensive1v1),
                share: summary.offensive1v1,
                tone: "blue",
              },
              {
                label: "Other touches",
                value: formatCount(summary.otherTouches),
                share: summary.otherTouches,
                tone: "grey",
              },
            ]}
          />
          <SummaryStatCard
            title="Offensive 1v1"
            total={summary.offensive1v1}
            totalLabel="Offensive 1v1"
            perGameLabel={games ? `${perGame(summary.offensive1v1, games)} per game` : undefined}
            segments={playSegments(
              {
                progressivePlays: summary.offensiveProgressive,
                lostPlays: summary.offensiveLost,
                neutralPlays: summary.offensiveNeutral,
              },
              stats.videos,
            )}
          />
          <SummaryStatCard
            title="Defensive 1v1"
            total={summary.defensive1v1}
            totalLabel="Defensive 1v1"
            rate={summary.defensiveWinRate}
            rateLabel="Won rate"
            perGameLabel={games ? `${perGame(summary.defensive1v1, games)} per game` : undefined}
            segments={duelSegments(
              {
                won: summary.defensiveWon,
                lost: summary.defensiveLost,
                neutral: summary.defensiveNeutral,
              },
              stats.videos,
            )}
          />
        </div>
        <footer className="spdf-foot">
          <span>{BRAND.name}</span>
          <span>
            {stats.player.name} · {stats.meta.subtitle}
          </span>
        </footer>
      </div>
    </article>
  );
}

export function StatsGamePdfSheet({ stats, photoUrl, logoUrl, clubLogoUrl, opponentLogoUrl }: StatsGamePdfSheetProps) {
  const { player, meta, facing1v1, back1v1, defensive1v1 } = stats;

  return (
    <>
      <SummaryPdfPage
        stats={stats}
        photoUrl={photoUrl}
        logoUrl={logoUrl}
        clubLogoUrl={clubLogoUrl}
        opponentLogoUrl={opponentLogoUrl}
      />
      <article className="stats-pdf stats-pdf--page1" aria-hidden="true">
        <PdfSide photoUrl={photoUrl} logoUrl={logoUrl} clubLogoUrl={clubLogoUrl} name={player.name} club={player.club} />

        <div className="spdf-main">
          <PdfHeader title={meta.title} subtitle={meta.subtitle} opponentLogoUrl={opponentLogoUrl} />

          <div className="spdf-stack">
            <PdfSection title="Facing 1v1" kpi={facing1v1.total} unit="Total" size="lg" panelOnly>
              <div className="spdf-pass-results-app__pair">
                {facing1v1.moves.map((move) => (
                  <MovePanel
                    key={move.id}
                    title={move.label}
                    total={move.total}
                    breakdown={move}
                    videos={stats.videos}
                  />
                ))}
              </div>
            </PdfSection>

            <PdfSection title="Back 1v1" kpi={back1v1.total} unit="Total">
              <MovePanel title="Back 1v1" total={back1v1.total} breakdown={back1v1} videos={stats.videos} />
            </PdfSection>

            <PdfSection title="Defensive 1v1" kpi={defensive1v1.total} unit="Total">
              <div className="spdf-pass-panel">
                <div className="spdf-pass-panel__head">
                  <p className="spdf-pass-panel__title">Defensive 1v1</p>
                  <span className="spdf-pass-panel__total">{formatCount(defensive1v1.total)} duels</span>
                </div>
                <SummaryMeter segments={duelSegments(defensive1v1, stats.videos)} />
              </div>
            </PdfSection>
          </div>

          <footer className="spdf-foot">
            <span>{BRAND.name}</span>
            <span>
              {player.name} · {meta.subtitle}
            </span>
          </footer>
        </div>
      </article>
    </>
  );
}
