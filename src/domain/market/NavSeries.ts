/**
 * Pure statistics over a dated value series — a fund's NAV history, an index
 * level, a spot price.
 *
 * This is the quantitative half of market context, and it is deliberately the
 * half that comes first. "The market is low because of the war" is two claims:
 * a number (how far below its high) and a story (why). The number is checkable
 * and is what a decision can be sized against; the story is neither. So the app
 * computes the number here, from a real series, and never asks a model for it.
 *
 * Nothing in this module reaches the network. Fetching lives in
 * `src/data/market/`, behind `MarketDataPort`.
 */

export interface SeriesPoint {
  date: Date;
  value: number;
}

export interface SeriesTrend {
  /** Most recent observation in the series, and the day it is dated. */
  latest: number;
  latestOn: Date;
  /** Highest and lowest observation inside the window. */
  high: number;
  highOn: Date;
  low: number;
  lowOn: Date;
  /**
   * How far the latest value sits below the window's high, as a negative
   * percentage (0 when the latest value *is* the high).
   *
   * This is the figure the "is this a dip?" question actually turns on, and it
   * is not the same as the window return: a series can be up over a year and
   * still be well off a high it set in between.
   */
  drawdownPercent: number;
  /** Change from the first observation in the window to the latest. */
  returnPercent: number;
  /** Observations the window actually contained, for honesty about coverage. */
  observations: number;
  /** Calendar span the observations cover, which may be shorter than asked. */
  windowDays: number;
}

/** Ascending by date, with unusable points dropped rather than coerced to 0. */
export function normaliseSeries(points: SeriesPoint[]): SeriesPoint[] {
  return points
    .filter(point => Number.isFinite(point.value) && !Number.isNaN(point.date.getTime()))
    .slice()
    .sort((left, right) => left.date.getTime() - right.date.getTime());
}

function percentChange(from: number, to: number): number {
  // A zero or negative base has no meaningful percentage against it, and a NAV
  // series should never contain one. Reporting 0 beats reporting Infinity.
  if (from <= 0) return 0;
  return ((to - from) / from) * 100;
}

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Trend over the `windowDays` ending at the series' own last observation.
 *
 * The window is anchored to the last observation rather than to `today` on
 * purpose: NAV series lag by a day or more, and anchoring to the clock would
 * silently shorten the window every weekend. `asOf` on the caller's side is
 * what tells the user how stale the data is.
 *
 * Returns undefined for an empty series — no data is a state to report, not a
 * zero to quote.
 */
export function computeSeriesTrend(
  points: SeriesPoint[],
  windowDays = 365
): SeriesTrend | undefined {
  const series = normaliseSeries(points);
  if (series.length === 0) return undefined;

  const last = series[series.length - 1];
  const cutoff = last.date.getTime() - windowDays * 24 * 60 * 60 * 1000;
  // The last point is always in scope, so `window` is never empty.
  const window = series.filter(point => point.date.getTime() >= cutoff);

  let high = window[0];
  let low = window[0];
  for (const point of window) {
    // `>` not `>=`, so the *earliest* day that set the high is reported. A high
    // set nine months ago and matched last week is a different situation from
    // one set last week, and the earlier date is the one that says so.
    if (point.value > high.value) high = point;
    if (point.value < low.value) low = point;
  }

  const spanMs = last.date.getTime() - window[0].date.getTime();

  return {
    latest: last.value,
    latestOn: last.date,
    high: high.value,
    highOn: high.date,
    low: low.value,
    lowOn: low.date,
    drawdownPercent: round(percentChange(high.value, last.value)),
    returnPercent: round(percentChange(window[0].value, last.value)),
    observations: window.length,
    windowDays: Math.round(spanMs / (24 * 60 * 60 * 1000)),
  };
}
