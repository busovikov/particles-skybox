/**
 * Advances simulation time independently of the browser's rendering cadence.
 * Call advance on every animation frame, including while paused.
 */
export class SimulationClock {
  constructor({ maxDelta = 1 / 20 } = {}) {
    if (!Number.isFinite(maxDelta) || maxDelta <= 0) {
      throw new RangeError('maxDelta must be a positive, finite number of seconds.');
    }

    this.maxDelta = maxDelta;
    this.reset();
  }

  /** All returned times are seconds; realDelta is capped before scaling. */
  advance(timestampMilliseconds, { timeScale = 1, paused = false } = {}) {
    let realDelta = 0;

    if (Number.isFinite(timestampMilliseconds) && timestampMilliseconds >= 0) {
      if (this.previousTimestamp === null) {
        this.previousTimestamp = timestampMilliseconds;
      } else if (timestampMilliseconds >= this.previousTimestamp) {
        realDelta = Math.min(
          (timestampMilliseconds - this.previousTimestamp) / 1000,
          this.maxDelta,
        );
        this.previousTimestamp = timestampMilliseconds;
      }
    }

    const scale = Number.isFinite(timeScale)
      ? Math.min(1, Math.max(0, timeScale))
      : 0;
    const simulationDelta = paused ? 0 : realDelta * scale;
    this.simulationTime += simulationDelta;

    return { realDelta, simulationDelta, simulationTime: this.simulationTime };
  }

  reset() {
    this.simulationTime = 0;
    this.discardNextDelta();
  }

  /** Drop time spent in a hidden tab without resetting the simulation. */
  discardNextDelta() {
    this.previousTimestamp = null;
  }
}

/** Convert the example's per-frame damping into an elapsed-time multiplier. */
export function dampingFactor(dampingPer60HzStep, simulationDelta) {
  if (!Number.isFinite(simulationDelta) || simulationDelta <= 0) return 1;

  const damping = Number.isFinite(dampingPer60HzStep)
    ? Math.min(1, Math.max(0, dampingPer60HzStep))
    : 0;
  return (1 - damping) ** (simulationDelta * 60);
}
