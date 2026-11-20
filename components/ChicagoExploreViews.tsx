import { CountLine } from "@/components/CountLine";
import {
  clipRef,
  formatCount,
  type ClipRef,
  type DuelBreakdown,
  type MatchStats,
  type MatchSummary,
  type PlayBreakdown,
} from "@/lib/stats";

type Tone = "positive" | "negative" | "accent" | "recover" | "warn" | "muted";

function percent(value: number, total: number): number {
  return total > 0 ? Math.round((value / total) * 100) : 0;
}

function ClipLabel({ label, clip }: { label: string; clip?: ClipRef }) {
  if (clip?.href) {
    return (
      <a className="clip-link" href={clip.href} target="_blank" rel="noreferrer">
        {label}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/play-icon.png" alt="" className="play-icon" width={14} height={14} />
      </a>
    );
  }
  return (
    <span>
      {label}
      {clip?.hasClip ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src="/brand/play-icon.png" alt="" className="play-icon play-icon--pending" width={14} height={14} />
      ) : null}
    </span>
  );
}

function ClipIcon({ clip }: { clip?: ClipRef }) {
  if (!clip?.hasClip) return null;
  const icon = (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/brand/play-icon.png" alt="" className="play-icon" width={14} height={14} />
  );
  if (!clip.href) return <span className="clip-icon">{icon}</span>;
  return (
    <a className="clip-icon" href={clip.href} target="_blank" rel="noreferrer" aria-label="Open video clip">
      {icon}
    </a>
  );
}

type TriSegment = {
  label: string;
  value: number;
  tone: Tone;
  clip?: ClipRef;
};

/** Outcome meter with in-bar shares and a three-column readout below. */
function TriSplit({ segments, label }: { segments: TriSegment[]; label: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="stats-viz">
      <div
        className="meter meter--tri"
        role="img"
        aria-label={`${label}: ${segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`}
      >
        {total === 0 ? (
          <span className="meter__seg meter__seg--muted" style={{ flex: "1 1 0" }} />
        ) : (
          segments
            .filter((segment) => segment.value > 0)
            .map((segment) => {
              const share = percent(segment.value, total);
              return (
                <span
                  key={segment.label}
                  className={`meter__seg meter__seg--${segment.tone}`}
                  style={{ flex: `${segment.value} 1 0` }}
                >
                  {share >= 14 ? <span className="meter__pct">{share}%</span> : null}
                </span>
              );
            })
        )}
      </div>
      <ul className="outcome-grid">
        {segments.map((segment) => (
          <li
            key={segment.label}
            className={`outcome-chip outcome-chip--${segment.tone}${segment.value === 0 ? " is-empty" : ""}`}
          >
            <span className="outcome-chip__label">
              <span className={`legend__dot legend__dot--${segment.tone}`} />
              <ClipLabel label={segment.label} clip={segment.clip} />
            </span>
            <span className="outcome-chip__value">
              {formatCount(segment.value)}
              <small>{percent(segment.value, total)}%</small>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Circular gauge for a 0-100 share. */
function RateRing({ value, tone }: { value: number; tone: Tone }) {
  const radius = 25;
  const circumference = 2 * Math.PI * radius;
  const filled = (Math.max(0, Math.min(value, 100)) / 100) * circumference;
  return (
    <svg viewBox="0 0 64 64" className={`rate-ring rate-ring--${tone}`} aria-hidden="true">
      <circle cx={32} cy={32} r={radius} className="rate-ring__track" />
      <circle
        cx={32}
        cy={32}
        r={radius}
        className="rate-ring__fill"
        strokeDasharray={`${filled} ${circumference}`}
        transform="rotate(-90 32 32)"
      />
    </svg>
  );
}

function StatsFigure({
  label,
  value,
  unit,
  games,
}: {
  label: string;
  value: number;
  unit?: string;
  games?: number;
}) {
  return (
    <div className="stats-figure">
      <span className="stats-figure__label">{label}</span>
      {games && unit ? (
        <CountLine value={value} unit={unit} games={games} />
      ) : (
        <span className="stats-figure__value">{formatCount(value)}</span>
      )}
    </div>
  );
}

function RateFigure({
  label,
  rate,
  tone,
  caption,
}: {
  label: string;
  rate: number;
  tone: Tone;
  caption?: string;
}) {
  return (
    <div className={`stats-figure stats-figure--rate stats-figure--${tone}`}>
      <span className="stats-figure__label">{label}</span>
      <div className="stats-figure__rate">
        <RateRing value={rate} tone={tone} />
        <div className="stats-figure__rate-text">
          <span className="stats-figure__value">{rate}%</span>
          {caption ? <span className="stats-figure__caption">{caption}</span> : null}
        </div>
      </div>
    </div>
  );
}

function StatsTriTopic({
  title,
  total,
  totalLabel,
  totalUnit,
  games,
  rate,
  segments,
  clip,
}: {
  title: string;
  total: number;
  totalLabel: string;
  totalUnit: string;
  games?: number;
  rate?: { label: string; value: number; tone: Tone; caption?: string };
  segments: TriSegment[];
  clip?: ClipRef;
}) {
  return (
    <section className="stats-topic">
      <h3 className="stats-topic__title">
        {title}
        <ClipIcon clip={clip} />
      </h3>
      <div className={`stats-topic__panel stats-topic__panel--tri${rate == null ? " stats-topic__panel--pair" : ""}`}>
        <StatsFigure label={totalLabel} value={total} unit={totalUnit} games={games} />
        {rate != null ? <RateFigure label={rate.label} rate={rate.value} tone={rate.tone} caption={rate.caption} /> : null}
        <TriSplit segments={segments} label={`${title} breakdown`} />
      </div>
    </section>
  );
}

/** Metric card with a three-segment outcome meter — used for move types and duel boards. */
export function OutcomeMeter({
  title,
  total,
  totalLabel,
  segments,
  games,
  unit,
  compact = false,
  clip,
  shareOf,
}: {
  title: string;
  total: number;
  totalLabel?: string;
  segments: TriSegment[];
  games?: number;
  unit?: string;
  compact?: boolean;
  clip?: ClipRef;
  /** Parent group this card is a slice of, e.g. a class inside Facing 1v1. */
  shareOf?: { total: number; label: string };
}) {
  const lead = segments[0];
  const leadRate = lead ? percent(lead.value, total) : 0;

  return (
    <div className={`metric-card outcome-card${compact ? " metric-card--sub" : ""}`}>
      <h3 className="metric-card__title">
        {title}
        <ClipIcon clip={clip} />
      </h3>
      <div className="outcome-card__head">
        {games && unit ? (
          <CountLine value={total} unit={unit} games={games} />
        ) : (
          <p className="outcome-card__total">
            <strong>{formatCount(total)}</strong>
            <span>{totalLabel ?? unit ?? "plays"}</span>
            {shareOf && shareOf.total > 0 ? (
              <em className="outcome-card__share">
                {percent(total, shareOf.total)}% of {shareOf.label}
              </em>
            ) : null}
          </p>
        )}
        {lead && total > 0 ? (
          <span className={`outcome-card__rate outcome-card__rate--${lead.tone}`}>
            {leadRate}% {lead.label.toLowerCase()}
          </span>
        ) : null}
      </div>
      <TriSplit segments={segments} label={`${title} breakdown`} />
    </div>
  );
}

function playSegments(breakdown: PlayBreakdown, videos?: MatchStats["videos"], clipPrefix?: string): TriSegment[] {
  const aliases = (outcome: string, fallback: string) => (clipPrefix ? [`${clipPrefix} ${outcome}`] : [fallback]);
  return [
    {
      label: "Progressive",
      value: breakdown.progressivePlays,
      tone: "positive",
      clip: clipRef(videos, ...aliases("Progressive", "Progressive Plays")),
    },
    {
      label: "Lost",
      value: breakdown.lostPlays,
      tone: "negative",
      clip: clipRef(videos, ...aliases("Lost", "Lost Plays")),
    },
    {
      label: "Neutral",
      value: breakdown.neutralPlays,
      tone: "muted",
      clip: clipRef(videos, ...aliases("Neutral", "Neutral Plays")),
    },
  ];
}

function duelSegments(breakdown: DuelBreakdown, videos?: MatchStats["videos"]): TriSegment[] {
  return [
    {
      label: "Won",
      value: breakdown.won,
      tone: "positive",
      clip: clipRef(videos, "Def. 1v1 Won", "Defensive 1v1 Won"),
    },
    {
      label: "Lost",
      value: breakdown.lost,
      tone: "negative",
      clip: clipRef(videos, "Def. 1v1 Lost", "Defensive 1v1 Lost"),
    },
    {
      label: "Neutral",
      value: breakdown.neutral,
      tone: "muted",
      clip: clipRef(videos, "Def. 1v1 Neutral", "Defensive 1v1 Neutral"),
    },
  ];
}

function StatsPercentTopic({
  title,
  total,
  totalLabel,
  totalUnit,
  games,
  rate,
  rateLabel,
  rateTone,
  rateCaption,
}: {
  title: string;
  total: number;
  totalLabel: string;
  totalUnit: string;
  games?: number;
  rate: number;
  rateLabel: string;
  rateTone: Tone;
  rateCaption: string;
}) {
  return (
    <section className="stats-topic">
      <h3 className="stats-topic__title">{title}</h3>
      <div className="stats-topic__panel stats-topic__panel--duo">
        <StatsFigure label={totalLabel} value={total} unit={totalUnit} games={games} />
        <RateFigure label={rateLabel} rate={rate} tone={rateTone} caption={rateCaption} />
      </div>
    </section>
  );
}

export function StatsHeroSideboard({
  summary,
  games,
}: {
  summary: MatchSummary;
  games?: number;
  videos?: MatchStats["videos"];
}) {
  return (
    <div className="stats-board-v2">
      <StatsPercentTopic
        title="Possessions"
        total={summary.possessions}
        totalLabel="Total possessions"
        totalUnit="possessions"
        games={games}
        rate={summary.offensive1v1Share}
        rateLabel="Ended in offensive 1v1"
        rateTone="accent"
        rateCaption={`${formatCount(summary.offensive1v1)} of ${formatCount(summary.possessions)} possessions`}
      />
      <StatsPercentTopic
        title="Offensive 1v1"
        total={summary.offensive1v1}
        totalLabel="Total duels"
        totalUnit="duels"
        games={games}
        rate={summary.offensiveProgressiveShare}
        rateLabel="Progressive rate"
        rateTone="positive"
        rateCaption={`${formatCount(summary.offensiveProgressive)} of ${formatCount(summary.offensive1v1)} progressive`}
      />
      <StatsPercentTopic
        title="Defensive 1v1"
        total={summary.defensive1v1}
        totalLabel="Total duels"
        totalUnit="duels"
        games={games}
        rate={summary.defensiveWinRate}
        rateLabel="Win rate"
        rateTone="positive"
        rateCaption={`${formatCount(summary.defensiveWon)} of ${formatCount(summary.defensive1v1)} won`}
      />
    </div>
  );
}

export function FacingBoard({
  facing,
  games,
  videos,
}: {
  facing: MatchStats["facing1v1"];
  games?: number;
  videos?: MatchStats["videos"];
}) {
  return (
    <div className="moves-board">
      <StatsTriTopic
        title="Facing 1v1"
        total={facing.total}
        totalLabel="Total plays"
        totalUnit="plays"
        games={games}
        rate={{
          label: "Progressive rate",
          value: percent(facing.progressivePlays, facing.total),
          tone: "positive",
          caption: `${formatCount(facing.progressivePlays)} of ${formatCount(facing.total)}`,
        }}
        segments={playSegments(facing, videos)}
      />
      <div className="move-children">
        <span className="move-children__rail" aria-hidden="true" />
        <div className="move-children__list">
          <p className="move-children__caption">Classes</p>
          {facing.classes.map((move) => (
            <OutcomeMeter
              key={move.id}
              title={move.label}
              total={move.total}
              segments={playSegments(move, videos, move.label)}
              games={games}
              unit="plays"
              compact
              shareOf={{ total: facing.total, label: "Facing 1v1" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function BackBoard({
  back,
  games,
  videos,
}: {
  back: MatchStats["back1v1"];
  games?: number;
  videos?: MatchStats["videos"];
}) {
  return (
    <div className="moves-board">
      <OutcomeMeter
        title="Back 1v1"
        total={back.total}
        clip={clipRef(videos, "Back 1v1")}
        segments={playSegments(back, videos)}
        games={games}
        unit="plays"
      />
    </div>
  );
}

export function DefensiveBoard({
  defensive,
  games,
  videos,
}: {
  defensive: MatchStats["defensive1v1"];
  games?: number;
  videos?: MatchStats["videos"];
}) {
  return (
    <div className="moves-board">
      <OutcomeMeter
        title="Defensive 1v1"
        total={defensive.total}
        totalLabel="duels"
        segments={duelSegments(defensive, videos)}
        games={games}
        unit="duels"
      />
    </div>
  );
}
