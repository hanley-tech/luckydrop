/**
 * Cinematic 2D camera for the plinko board. Smoothly lerps zoom + focus toward
 * targets and adds decaying screen shake. Used to push in for slow-mo "key
 * moments". World coordinates are the board's own pixel space.
 */

function lerpK(dt: number, tau: number): number {
  // Framerate-independent smoothing factor
  return 1 - Math.exp(-dt / tau);
}

export class Camera {
  private w: number;
  private h: number;

  zoom = 1;
  x: number; // focus point (world coords) mapped to screen center
  y: number;

  private tZoom = 1;
  private tx: number;
  private ty: number;
  private tau = 0.16; // smoothing time constant (s)

  private shakeMag = 0;
  private shakeX = 0;
  private shakeY = 0;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.x = this.tx = w / 2;
    this.y = this.ty = h / 2;
  }

  resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
  }

  /** Push the camera toward a focus point + zoom. tau controls snappiness. */
  focus(x: number, y: number, zoom: number, tau = 0.16): void {
    this.tx = x;
    this.ty = y;
    this.tZoom = zoom;
    this.tau = tau;
  }

  /** Ease back to the full board view. */
  reset(tau = 0.3): void {
    this.tx = this.w / 2;
    this.ty = this.h / 2;
    this.tZoom = 1;
    this.tau = tau;
  }

  shake(mag: number): void {
    this.shakeMag = Math.max(this.shakeMag, mag);
  }

  get isIdle(): boolean {
    return (
      Math.abs(this.zoom - 1) < 0.01 &&
      Math.abs(this.x - this.w / 2) < 1 &&
      Math.abs(this.y - this.h / 2) < 1 &&
      this.shakeMag < 0.5
    );
  }

  update(dt: number): void {
    const k = lerpK(dt, this.tau);
    this.zoom += (this.tZoom - this.zoom) * k;
    this.x += (this.tx - this.x) * k;
    this.y += (this.ty - this.y) * k;

    if (this.shakeMag > 0.5) {
      this.shakeX = (Math.random() - 0.5) * 2 * this.shakeMag;
      this.shakeY = (Math.random() - 0.5) * 2 * this.shakeMag;
      this.shakeMag *= Math.max(0, 1 - 9 * dt);
    } else {
      this.shakeMag = 0;
      this.shakeX = 0;
      this.shakeY = 0;
    }
  }

  /** Apply the camera transform. Pair with end(). */
  begin(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.w / 2 + this.shakeX, this.h / 2 + this.shakeY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-this.x, -this.y);
  }

  end(ctx: CanvasRenderingContext2D): void {
    ctx.restore();
  }
}
