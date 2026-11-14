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

function ExploreBar({
  primary,
  secondary,
  primaryTone,
  secondaryTone,
  label,
}: {
  primary: number;
  secondary: number;
  primaryTone: Tone;
  secondaryTone: Tone;
  label: string;
}) {
  const total = primary + secondary;
  const primaryPct = total > 0 ? (primary / total) * 100 : 0;

  return (
    <div className="stats-bar" role="img" aria-label={label}>
      {total === 0 ? (
        <span className="stats-bar__seg stats-bar__seg--muted" style={{ width: "100%" }} />
      ) : (
        <>
          <span className={`stats-bar__seg stats-bar__seg--${primaryTone}`} style={{ width: `${primaryPct}%` }} />
          <span className={`stats-bar__seg stats-bar__seg--${secondaryTone}`} style={{ width: `${100 - primaryPct}%` }} />
        </>
      )}
    </div>
  );
}

function StatsSplit({
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  primaryTone,
  secondaryTone,
  primaryClip,
  secondaryClip,
  showShare = true,
}: {
  primary: number;
  secondary: number;
  primaryLabel: string;
  secondaryLabel: string;
  primaryTone: Tone;
  secondaryTone: Tone;
  primaryClip?: ClipRef;
  secondaryClip?: ClipRef;
  showShare?: boolean;
}) {
  const total = primary + secondary;
  const primaryPct = percent(primary, total);
  const secondaryPct = total > 0 ? 100 - primaryPct : 0;
  const figure = (value: number, share: number) => (showShare ? `${formatCount(value)} · ${share}%` : formatCount(value));

  return (
    <div className="stats-viz">
      <ExploreBar
        primary={primary}
        secondary={secondary}
        primaryTone={primaryTone}
        secondaryTone={secondaryTone}
        label={`${primaryLabel} ${primary}. ${secondaryLabel} ${secondary}.`}
      />
      <ul className="stats-viz__legend">
        <li>
          <span className={`legend__dot legend__dot--${primaryTone}`} />
          <ClipLabel label={primaryLabel} clip={primaryClip} />
          <strong>{figure(primary, primaryPct)}</strong>
        </li>
        <li>
          <span className={`legend__dot legend__dot--${secondaryTone}`} />
          <ClipLabel label={secondaryLabel} clip={secondaryClip} />
          <strong>{figure(secondary, secondaryPct)}</strong>
        </li>
      </ul>
    </div>
  );
}

type TriSegment = {
  label: string;
  value: number;
  tone: Tone;
  clip?: ClipRef;
};

function TriSplit({ segments, label }: { segments: TriSegment[]; label: string }) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0);

  return (
    <div className="stats-viz">
      <div
        className="meter"
        role="img"
        aria-label={label ?? segments.map((segment) => `${segment.label}: ${segment.value}`).join(". ")}
      >
        {total === 0 ? (
          <span className="meter__seg meter__seg--muted" style={{ width: "100%" }} />
        ) : (
          segments.map((segment) => (
            <span
              key={segment.label}
              className={`meter__seg meter__seg--${segment.tone}`}
              style={{ width: `${percent(segment.value, total)}%` }}
            />
          ))
        )}
      </div>
      <ul className="stats-viz__legend">
        {segments.map((segment) => (
          <li key={segment.label}>
            <span className={`legend__dot legend__dot--${segment.tone}`} />
            <ClipLabel label={segment.label} clip={segment.clip} />
            <strong>
              {formatCount(segment.value)} · {percent(segment.value, total)}%
            </strong>
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatsFigure({
  label,
  value,
  unit,
  games,
  rate,
}: {
  label: string;
  value: number;
  unit?: string;
  games?: number;
  rate?: boolean;
}) {
  return (
    <div className={`stats-figure${rate ? " stats-figure--rate" : ""}`}>
      <span className="stats-figure__label">{label}</span>
      {games && unit ? (
        <CountLine value={value} unit={unit} games={games} />
      ) : (
        <span className="stats-figure__value">{rate ? `${value}%` : formatCount(value)}</span>
      )}
    </div>
  );
}

function StatsRateTopic({
  title,
  total,
  totalLabel,
  totalUnit,
  games,
  rate,
  rateLabel,
  primary,
  secondary,
  primaryLabel,
  secondaryLabel,
  primaryTone,
  secondaryTone,
  primaryClip,
  secondaryClip,
  showShare = true,
}: {
  title: string;
  total: number;
  totalLabel: string;
  totalUnit: string;
  games?: number;
  rate: number;
  rateLabel: string;
  primary: number;
  secondary: number;
  primaryLabel: string;
  secondaryLabel: string;
  primaryTone: Tone;
  secondaryTone: Tone;
  primaryClip?: ClipRef;
  secondaryClip?: ClipRef;
  showShare?: boolean;
}) {
  return (
    <section className="stats-topic">
      <h3 className="stats-topic__title">{title}</h3>
      <div className="stats-topic__panel">
        <StatsFigure label={totalLabel} value={total} unit={totalUnit} games={games} />
        <StatsFigure label={rateLabel} value={rate} rate />
        <StatsSplit
          primary={primary}
          secondary={secondary}
          primaryLabel={primaryLabel}
          secondaryLabel={secondaryLabel}
          primaryTone={primaryTone}
          secondaryTone={secondaryTone}
          primaryClip={primaryClip}
          secondaryClip={secondaryClip}
          showShare={showShare}
        />
      </div>
    </section>
  );
}

function StatsTriTopic({
  title,
  total,
  totalLabel,
  totalUnit,
  games,
  rate,
  rateLabel,
  segments,
}: {
  title: string;
  total: number;
  totalLabel: string;
  totalUnit: string;
  games?: number;
  rate?: number;
  rateLabel?: string;
  segments: TriSegment[];
}) {
  return (
    <section className="stats-topic">
      <h3 className="stats-topic__title">{title}</h3>
      <div className={`stats-topic__panel${rate == null ? " stats-topic__panel--pair" : ""}`}>
        <StatsFigure label={totalLabel} value={total} unit={totalUnit} games={games} />
        {rate != null ? <StatsFigure label={rateLabel ?? ""} value={rate} rate /> : null}
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
}: {
  title: string;
  total: number;
  totalLabel?: string;
  segments: TriSegment[];
  games?: number;
  unit?: string;
  compact?: boolean;
}) {
  return (
    <div className={`metric-card${compact ? " metric-card--sub" : ""}`}>
      <h3 className="metric-card__title">{title}</h3>
      {games && unit ? (
        <CountLine value={total} unit={unit} games={games} />
      ) : (
        <p className="metric-card__headline">
          <span>
            {formatCount(total)} {totalLabel ?? "plays"}
          </span>
        </p>
      )}
      <TriSplit segments={segments} label={`${title} breakdown`} />
    </div>
  );
}

function playSegments(breakdown: PlayBreakdown, videos?: MatchStats["videos"]): TriSegment[] {
  return [
    {
      label: "Progressive Plays",
      value: breakdown.progressivePlays,
      tone: "positive",
      clip: clipRef(videos, "Progressive Plays"),
    },
    {
      label: "Lost Plays",
      value: breakdown.lostPlays,
      tone: "negative",
      clip: clipRef(videos, "Lost Plays"),
    },
    { label: "Neutral Plays", value: breakdown.neutralPlays, tone: "muted" },
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
    { label: "Neutral", value: breakdown.neutral, tone: "muted" },
  ];
}

export function StatsHeroSideboard({
  summary,
  games,
  videos,
}: {
  summary: MatchSummary;
  games?: number;
  videos?: MatchStats["videos"];
}) {
  return (
    <div className="stats-board-v2">
      <StatsRateTopic
        title="Touches"
        total={summary.touches}
        totalLabel="Total touches"
        totalUnit="touches"
        games={games}
        rate={summary.offensive1v1Share}
        rateLabel="Offensive 1v1"
        primary={summary.offensive1v1}
        secondary={summary.otherTouches}
        primaryLabel="Offensive 1v1"
        secondaryLabel="Other touches"
        primaryTone="accent"
        secondaryTone="muted"
        showShare={false}
      />
      <StatsTriTopic
        title="Offensive 1v1"
        total={summary.offensive1v1}
        totalLabel="Offensive 1v1"
        totalUnit="plays"
        games={games}
        segments={[
          {
            label: "Progressive Plays",
            value: summary.offensiveProgressive,
            tone: "positive",
            clip: clipRef(videos, "Progressive Plays"),
          },
          {
            label: "Lost Plays",
            value: summary.offensiveLost,
            tone: "negative",
            clip: clipRef(videos, "Lost Plays"),
          },
          { label: "Neutral Plays", value: summary.offensiveNeutral, tone: "muted" },
        ]}
      />
      <StatsTriTopic
        title="Defensive 1v1"
        total={summary.defensive1v1}
        totalLabel="Defensive 1v1"
        totalUnit="duels"
        games={games}
        rate={summary.defensiveWinRate}
        rateLabel="Won rate"
        segments={[
          {
            label: "Won",
            value: summary.defensiveWon,
            tone: "positive",
            clip: clipRef(videos, "Def. 1v1 Won", "Defensive 1v1 Won"),
          },
          {
            label: "Lost",
            value: summary.defensiveLost,
            tone: "negative",
            clip: clipRef(videos, "Def. 1v1 Lost", "Defensive 1v1 Lost"),
          },
          { label: "Neutral", value: summary.defensiveNeutral, tone: "muted" },
        ]}
      />
    </div>
  );
}

export function FacingBoard({
  facing,
  offensiveTotal,
  games,
  videos,
}: {
  facing: MatchStats["facing1v1"];
  offensiveTotal: number;
  games?: number;
  videos?: MatchStats["videos"];
}) {
  return (
    <div className="moves-board">
      <StatsTriTopic
        title="Facing 1v1"
        total={facing.total}
        totalLabel="Facing 1v1"
        totalUnit="plays"
        games={games}
        rate={percent(facing.total, offensiveTotal)}
        rateLabel="of Off. 1v1"
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
              segments={playSegments(move, videos)}
              games={games}
              unit="plays"
              compact
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
