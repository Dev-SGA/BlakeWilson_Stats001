import { HeatmapPitch } from "@/components/HeatmapBoard";
import { BRAND } from "@/lib/brand";
import {
  clipRef,
  finalThirdCount,
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

type Tone = "green" | "amber" | "grey" | "blue";

type Segment = { label: string; short?: string; value: number; tone: Tone; clip?: ClipRef };

const TOTAL_PAGES = 3;

function pct(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

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
      <div className="bw-photo" data-pdf-bg={photoUrl} style={{ backgroundImage: `url("${photoUrl}")` }} />
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

function PdfHeader({
  title,
  section,
  subtitle,
  opponentLogoUrl,
}: {
  title: string;
  section: string;
  subtitle: string;
  opponentLogoUrl: string;
}) {
  return (
    <header className="spdf-head">
      <div>
        <p className="spdf-head__eyebrow">{BRAND.legal}</p>
        <h1 className="spdf-head__title">{title}</h1>
      </div>
      <div className="bw-head__side">
        <span className="bw-head__section">{section}</span>
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

function PdfFoot({ stats, page }: { stats: GameStats; page: number }) {
  return (
    <footer className="spdf-foot">
      <span>{BRAND.name}</span>
      <span>
        {stats.player.name} · {stats.meta.subtitle} · {page}/{TOTAL_PAGES}
      </span>
    </footer>
  );
}

function Meter({ segments }: { segments: Segment[] }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);
  return (
    <div className="bw-meter">
      {total === 0 ? (
        <span className="bw-meter__seg bw-tone--grey" style={{ width: "100%" }} />
      ) : (
        segments
          .filter((segment) => segment.value > 0)
          .map((segment) => (
            <span key={segment.label} className={`bw-meter__seg bw-tone--${segment.tone}`} style={{ width: `${(segment.value / total) * 100}%` }} />
          ))
      )}
    </div>
  );
}

function Legend({ segments, layout }: { segments: Segment[]; layout: "list" | "tiles" }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  if (layout === "tiles") {
    return (
      <ul className="bw-tiles">
        {segments.map((segment) => (
          <li key={segment.label} className="bw-tile">
            <span className={`bw-tile__value bw-text--${segment.tone}`}>{formatCount(segment.value)}</span>
            <span className="bw-tile__label">
              <span className={`bw-dot bw-tone--${segment.tone}`} />
              {segment.short ?? segment.label}
              <PdfPlay clip={segment.clip} />
            </span>
            <span className="bw-tile__pct">{pct(segment.value, total)}%</span>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <ul className="bw-legend">
      {segments.map((segment) => (
        <li key={segment.label}>
          <span className={`bw-dot bw-tone--${segment.tone}`} />
          <span className="bw-legend__label">
            {segment.label}
            <PdfPlay clip={segment.clip} />
          </span>
          <strong className={`bw-text--${segment.tone}`}>
            {formatCount(segment.value)} · {pct(segment.value, total)}%
          </strong>
        </li>
      ))}
    </ul>
  );
}

type CardProps = {
  title: string;
  total: number;
  unit: string;
  accent: "off" | "def";
  segments: Segment[];
  badge?: string;
  note?: string;
  layout?: "list" | "tiles";
  nested?: boolean;
  compact?: boolean;
  clip?: ClipRef;
  children?: React.ReactNode;
};

function OutcomeCard({ title, total, unit, accent, segments, badge, note, layout = "list", nested = false, compact = false, clip, children }: CardProps) {
  return (
    <section className={`bw-card bw-card--${accent}${nested ? " bw-card--nested" : ""}${compact ? " bw-card--compact" : ""}`}>
      {compact ? (
        <div className="bw-card__head">
          <div className="bw-card__titles">
            <h3 className="bw-card__title">
              {title}
              <PdfPlay clip={clip} />
            </h3>
            {nested && badge ? <span className="bw-card__sub">{badge}</span> : null}
          </div>
          <div className="bw-kpi bw-kpi--inline">
            {!nested && badge ? <span className="bw-badge">{badge}</span> : null}
            <span className="bw-kpi__value">{formatCount(total)}</span>
            <span className="bw-kpi__unit">{unit}</span>
          </div>
        </div>
      ) : (
        <>
          <div className="bw-card__head">
            <h3 className="bw-card__title">
              {title}
              <PdfPlay clip={clip} />
            </h3>
            {badge ? <span className="bw-badge">{badge}</span> : null}
          </div>
          <div className="bw-kpi">
            <span className="bw-kpi__value">{formatCount(total)}</span>
            <span className="bw-kpi__unit">{unit}</span>
            {note ? <span className="bw-kpi__note">{note}</span> : null}
          </div>
        </>
      )}
      {children}
      <Meter segments={segments} />
      <Legend segments={segments} layout={layout} />
    </section>
  );
}

function playSegments(breakdown: PlayBreakdown, videos?: GameStats["videos"], clipPrefix?: string): Segment[] {
  const aliases = (outcome: string, fallback: string) => (clipPrefix ? [`${clipPrefix} ${outcome}`] : [fallback]);
  return [
    { label: "Progressive Plays", short: "Progressive", value: breakdown.progressivePlays, tone: "green", clip: clipRef(videos, ...aliases("Progressive", "Progressive Plays")) },
    { label: "Lost Plays", short: "Lost", value: breakdown.lostPlays, tone: "amber", clip: clipRef(videos, ...aliases("Lost", "Lost Plays")) },
    { label: "Neutral Plays", short: "Neutral", value: breakdown.neutralPlays, tone: "grey", clip: clipRef(videos, ...aliases("Neutral", "Neutral Plays")) },
  ];
}

function duelSegments(breakdown: DuelBreakdown, videos?: GameStats["videos"]): Segment[] {
  return [
    { label: "Won", value: breakdown.won, tone: "green", clip: clipRef(videos, "Def. 1v1 Won", "Defensive 1v1 Won") },
    { label: "Lost", value: breakdown.lost, tone: "amber", clip: clipRef(videos, "Def. 1v1 Lost", "Defensive 1v1 Lost") },
    { label: "Neutral", value: breakdown.neutral, tone: "grey", clip: clipRef(videos, "Def. 1v1 Neutral", "Defensive 1v1 Neutral") },
  ];
}

function perGameNote(value: number, games?: number): string | undefined {
  return games ? `${perGame(value, games)} per game` : undefined;
}

function WonRing({ won, total }: { won: number; total: number }) {
  const rate = pct(won, total);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const filled = (rate / 100) * circumference;

  return (
    <div className="bw-ring">
      <svg width="150" height="150" viewBox="0 0 150 150" aria-hidden="true">
        <circle cx="75" cy="75" r={radius} fill="none" stroke="#e0a82e" strokeWidth="16" />
        <circle
          cx="75"
          cy="75"
          r={radius}
          fill="none"
          stroke="#1f8a4c"
          strokeWidth="16"
          strokeDasharray={`${filled} ${circumference - filled}`}
          transform="rotate(-90 75 75)"
        />
      </svg>
      <div className="bw-ring__center">
        <span className="bw-ring__value">{rate}%</span>
        <span className="bw-ring__label">Won rate</span>
      </div>
    </div>
  );
}

function HeatmapCard({ heatmap }: { heatmap: GameStats["heatmap"] }) {
  const all = [...heatmap.firstHalf, ...heatmap.secondHalf];
  const periods = [
    { label: "All", points: all },
    { label: "1st H", points: heatmap.firstHalf },
    { label: "2nd H", points: heatmap.secondHalf },
  ];

  return (
    <section className="bw-card bw-card--map">
      <div className="bw-card__head">
        <h3 className="bw-card__title">Heatmap</h3>
        <span className="bw-badge">
          {all.length} possessions · {finalThirdCount(all)} final third
        </span>
      </div>
      <div className="bw-maps">
        {periods.map((period) => (
          <figure key={period.label} className="bw-map">
            <HeatmapPitch points={period.points} className="bw-pitch" />
            <figcaption className="bw-map__caption">
              <strong>{period.label}</strong>
              <span>
                {period.points.length} possessions · {finalThirdCount(period.points)} final third
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}

function SummaryPage(props: StatsGamePdfSheetProps) {
  const { stats } = props;
  const summary = matchSummary({
    id: stats.meta.fileSlug,
    kind: "session",
    label: stats.meta.subtitle,
    shortLabel: stats.meta.subtitle,
    logo: stats.opponentLogo,
    possessions: stats.possessions,
    offensive1v1: stats.offensive1v1,
    defensive1v1: stats.defensive1v1,
    facing1v1: stats.facing1v1,
    back1v1: stats.back1v1,
    heatmap: stats.heatmap,
    videos: stats.videos,
  });
  const games = stats.meta.games;

  return (
    <article className="stats-pdf" aria-hidden="true">
      <PdfSide photoUrl={props.photoUrl} logoUrl={props.logoUrl} clubLogoUrl={props.clubLogoUrl} name={stats.player.name} club={stats.player.club} />
      <div className="spdf-main">
        <PdfHeader title={stats.meta.title} section="Summary" subtitle={stats.meta.subtitle} opponentLogoUrl={props.opponentLogoUrl} />
        <div className="bw-body">
          <div className="bw-grid3">
            <OutcomeCard
              title="Possessions"
              total={summary.possessions}
              unit="possessions"
              accent="off"
              badge={`${summary.offensive1v1Share}% Offensive 1v1`}
              note={perGameNote(summary.possessions, games)}
              segments={[
                { label: "Offensive 1v1", value: summary.offensive1v1, tone: "blue" },
                { label: "Other possessions", value: summary.otherPossessions, tone: "grey" },
              ]}
            />
            <OutcomeCard
              title="Offensive 1v1"
              total={summary.offensive1v1}
              unit="plays"
              accent="off"
              note={perGameNote(summary.offensive1v1, games)}
              segments={playSegments({
                progressivePlays: summary.offensiveProgressive,
                lostPlays: summary.offensiveLost,
                neutralPlays: summary.offensiveNeutral,
              })}
            />
            <OutcomeCard
              title="Defensive 1v1"
              total={summary.defensive1v1}
              unit="duels"
              accent="def"
              badge={`${summary.defensiveWinRate}% won`}
              note={perGameNote(summary.defensive1v1, games)}
              segments={duelSegments({ won: summary.defensiveWon, lost: summary.defensiveLost, neutral: summary.defensiveNeutral })}
            />
          </div>
          <HeatmapCard heatmap={stats.heatmap} />
        </div>
        <PdfFoot stats={stats} page={1} />
      </div>
    </article>
  );
}

function OffensivePage(props: StatsGamePdfSheetProps) {
  const { stats } = props;
  const { facing1v1, back1v1, offensive1v1 } = stats;
  const games = stats.meta.games;

  return (
    <article className="stats-pdf" aria-hidden="true">
      <PdfSide photoUrl={props.photoUrl} logoUrl={props.logoUrl} clubLogoUrl={props.clubLogoUrl} name={stats.player.name} club={stats.player.club} />
      <div className="spdf-main">
        <PdfHeader title={stats.meta.title} section="Offensive 1v1" subtitle={stats.meta.subtitle} opponentLogoUrl={props.opponentLogoUrl} />
        <div className="bw-body">
          <div className="bw-stack">
            <OutcomeCard
              title="Facing 1v1"
              total={facing1v1.total}
              unit="plays"
              accent="off"
              compact
              layout="tiles"
              note={perGameNote(facing1v1.total, games)}
              segments={playSegments(facing1v1, stats.videos)}
            />
            <div className="bw-children">
              <p className="bw-children__caption">Facing 1v1 classes</p>
              <div className="bw-children__row">
                {facing1v1.classes.map((item) => (
                  <OutcomeCard
                    key={item.id}
                    nested
                    compact
                    title={item.label}
                    total={item.total}
                    unit="plays"
                    accent="off"
                    layout="tiles"
                    badge={`${pct(item.total, facing1v1.total)}% of Facing`}
                    segments={playSegments(item, stats.videos, item.label)}
                  />
                ))}
              </div>
            </div>
            <OutcomeCard
              title="Back 1v1"
              total={back1v1.total}
              clip={clipRef(stats.videos, "Back 1v1")}
              unit="plays"
              accent="off"
              compact
              layout="tiles"
              note={perGameNote(back1v1.total, games)}
              segments={playSegments(back1v1, stats.videos)}
            />
          </div>
        </div>
        <PdfFoot stats={stats} page={2} />
      </div>
    </article>
  );
}

function DefensivePage(props: StatsGamePdfSheetProps) {
  const { stats } = props;
  const { defensive1v1 } = stats;
  const segments = duelSegments(defensive1v1, stats.videos);
  const games = stats.meta.games;

  return (
    <article className="stats-pdf" aria-hidden="true">
      <PdfSide photoUrl={props.photoUrl} logoUrl={props.logoUrl} clubLogoUrl={props.clubLogoUrl} name={stats.player.name} club={stats.player.club} />
      <div className="spdf-main">
        <PdfHeader title={stats.meta.title} section="Defensive 1v1" subtitle={stats.meta.subtitle} opponentLogoUrl={props.opponentLogoUrl} />
        <div className="bw-body">
          <section className="bw-card bw-card--def bw-card--fill">
            <div className="bw-defense">
              <WonRing won={defensive1v1.won} total={defensive1v1.total} />
              <div className="bw-defense__figures">
                <div className="bw-kpi">
                  <span className="bw-kpi__value">{formatCount(defensive1v1.total)}</span>
                  <span className="bw-kpi__unit">duels</span>
                  {perGameNote(defensive1v1.total, games) ? (
                    <span className="bw-kpi__note">{perGameNote(defensive1v1.total, games)}</span>
                  ) : null}
                </div>
                <Meter segments={segments} />
              </div>
            </div>
            <Legend segments={segments} layout="tiles" />
          </section>
        </div>
        <PdfFoot stats={stats} page={3} />
      </div>
    </article>
  );
}

export function StatsGamePdfSheet(props: StatsGamePdfSheetProps) {
  return (
    <>
      <SummaryPage {...props} />
      <OffensivePage {...props} />
      <DefensivePage {...props} />
    </>
  );
}
