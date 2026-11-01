/**
 * Split Conformal Prediction calibrator.
 *
 * Uses absolute residuals as nonconformity scores and computes
 * adaptive prediction intervals that widen when the model's
 * estimated sigma (uncertainty) is larger than the calibration baseline.
 */
export class ConformalCalibrator {
  private quantile: number = 0;
  private baseSigma: number = 1;
  private alpha: number = 0.1;
  private coverage: number = 0;
  private scores: number[] = [];

  /**
   * Calibrate from training residuals.
   * @param residuals  Array of (actual − predicted) values.
   * @param alpha      Mis-coverage rate (default 0.10 → 90 % intervals).
   */
  calibrate(residuals: number[], alpha: number = 0.1): void {
    this.alpha = alpha;

    if (residuals.length === 0) {
      this.quantile = 0;
      this.baseSigma = 1;
      this.coverage = 0;
      this.scores = [];
      return;
    }

    // Nonconformity scores = |residual|
    this.scores = residuals.map(Math.abs).sort((a, b) => a - b);

    // (1 − α) quantile  (ceiling-style index for finite-sample validity)
    const idx = Math.min(
      Math.ceil((1 - alpha) * (this.scores.length + 1)) - 1,
      this.scores.length - 1,
    );
    this.quantile = this.scores[Math.max(0, idx)];

    // Base sigma = median absolute residual (used to normalise sigma ratios)
    const mid = Math.floor(this.scores.length / 2);
    this.baseSigma =
      this.scores.length % 2 === 0
        ? (this.scores[mid - 1] + this.scores[mid]) / 2
        : this.scores[mid];
    if (this.baseSigma === 0) this.baseSigma = 1e-6;

    // Empirical coverage on calibration set
    let covered = 0;
    for (const s of this.scores) {
      if (s <= this.quantile) covered++;
    }
    this.coverage = covered / this.scores.length;
  }

  /**
   * Compute prediction interval.
   * The width scales with sigma / baseSigma so that higher uncertainty
   * (e.g. from corrupted data) produces wider intervals.
   *
   * Intervals are clamped to the physical bounds [0, 0.60] for soil moisture.
   */
  getInterval(
    mean: number,
    sigma: number,
  ): { lower: number; upper: number; width: number } {
    const scale = this.baseSigma > 0 ? sigma / this.baseSigma : 1;
    const halfWidth = this.quantile * scale;
    const lower = Math.max(0, mean - halfWidth);
    const upper = Math.min(0.60, mean + halfWidth);
    return { lower, upper, width: upper - lower };
  }

  /** Empirical coverage probability on the calibration set. */
  getCoverage(): number {
    return this.coverage;
  }

  /** The (1 − α) quantile of the nonconformity scores. */
  getQuantile(): number {
    return this.quantile;
  }
}
