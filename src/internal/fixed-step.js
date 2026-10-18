/** Keep physics steps stable while interpolation follows every rendered frame. */
export class FixedStepSimulation {
  constructor({ step = 1 / 120, maxSteps = 6 } = {}) {
    if (!Number.isFinite(step) || step <= 0) {
      throw new RangeError('step must be a positive, finite number of seconds.');
    }
    if (!Number.isSafeInteger(maxSteps) || maxSteps < 1) {
      throw new RangeError('maxSteps must be a positive, safe integer.');
    }

    this.step = step;
    this.maxSteps = maxSteps;
    this.reset();
  }

  /**
   * Advance with already-scaled simulation time, never wall-clock timestamps.
   * Render between the previous and current physics states using alpha.
   * A pause preserves that exact interpolated position without building debt.
   */
  advance(simulationDeltaSeconds) {
    let steps = 0;

    if (Number.isFinite(simulationDeltaSeconds) && simulationDeltaSeconds > 0) {
      const accumulated = this.accumulator + simulationDeltaSeconds;
      // Allow for rounding at exact step boundaries (for example, 144 Hz).
      const boundaryTolerance = 1e-10;
      const availableSteps = Math.floor(accumulated / this.step + boundaryTolerance);

      if (availableSteps > 0) {
        steps = Math.min(this.maxSteps, availableSteps);
        // Drop only complete excess steps, preserving the interpolation phase.
        this.accumulator = accumulated % this.step;
        if (this.accumulator / this.step >= 1 - boundaryTolerance) {
          this.accumulator = 0;
        }
      } else {
        this.accumulator = accumulated;
      }
    }

    return {
      steps,
      alpha: this.accumulator / this.step,
      stepDelta: this.step,
    };
  }

  reset() {
    this.accumulator = 0;
  }
}
