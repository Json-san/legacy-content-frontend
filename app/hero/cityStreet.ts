import gsap from "gsap";

/**
 * Static line-art street: a skyline of varied buildings drawn once per
 * resize onto an offscreen canvas, with a thin stream of cars gliding along
 * the road and random micro-events (a window lights up, a door swings open,
 * someone peeks out) firing on their own timers. Base skyline is a single
 * drawImage per frame; only the handful of active events/cars are redrawn
 * on top, so the render loop stays cheap even though nothing needs sprite
 * slicing anymore.
 */

const config = {
  roadHeight: 86,
  buildingMinWidth: 78,
  buildingMaxWidth: 158,
  buildingMinHeightFrac: 0.14,
  buildingMaxHeightFrac: 0.36,
  /** Buildings within this fraction of the horizontal center are scaled down
   * (valley shape) so the hero copy + CTA always sit in clear air, never
   * crowded against a roofline. */
  centerValleyWidth: 0.42,
  centerValleyMinScale: 0.45,
  crowdTopMargin: 72,
  windowCell: 34,
  eventMinGap: 1.1,
  eventMaxGap: 2.8,
  carMinGap: 2.2,
  carMaxGap: 5.5,
  carSpeedMin: 55,
  carSpeedMax: 110,
};

function randomRange(min: number, max: number) {
  return min + Math.random() * (max - min);
}
function pick<T>(arr: T[]): T {
  return arr[(Math.random() * arr.length) | 0];
}

type WindowRect = { x: number; y: number; w: number; h: number; lit: boolean };
type Building = {
  x: number;
  y: number; // top
  width: number;
  height: number;
  roof: "flat" | "peak" | "tank";
  door: { x: number; y: number; w: number; h: number };
  windows: WindowRect[];
};

const stage = { width: 0, height: 0 };
let skylineCanvas: HTMLCanvasElement | null = null;
let buildings: Building[] = [];
let roadY = 0;

function drawBuilding(c: CanvasRenderingContext2D, b: Building) {
  c.lineWidth = 2.4;
  c.strokeStyle = "#111111";
  c.fillStyle = "#ffffff";

  c.beginPath();
  c.rect(b.x, b.y, b.width, b.height);
  c.fill();
  c.stroke();

  if (b.roof === "peak") {
    c.beginPath();
    c.moveTo(b.x - 4, b.y);
    c.lineTo(b.x + b.width / 2, b.y - b.width * 0.28);
    c.lineTo(b.x + b.width + 4, b.y);
    c.closePath();
    c.fill();
    c.stroke();
  } else if (b.roof === "tank") {
    const tw = b.width * 0.22;
    c.beginPath();
    c.rect(b.x + b.width * 0.6, b.y - 22, tw, 22);
    c.fill();
    c.stroke();
  }

  // door — two panels, drawn closed (opening happens dynamically per frame)
  c.beginPath();
  c.rect(b.door.x, b.door.y, b.door.w, b.door.h);
  c.stroke();
  c.beginPath();
  c.moveTo(b.door.x + b.door.w / 2, b.door.y);
  c.lineTo(b.door.x + b.door.w / 2, b.door.y + b.door.h);
  c.stroke();

  // windows (unlit outline only — lit state is drawn dynamically per frame)
  c.lineWidth = 1.6;
  for (const w of b.windows) {
    c.strokeRect(w.x, w.y, w.w, w.h);
  }
}

function buildStreet() {
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(stage.width * devicePixelRatio));
  canvas.height = Math.max(1, Math.round(stage.height * devicePixelRatio));
  const c = canvas.getContext("2d")!;
  c.scale(devicePixelRatio, devicePixelRatio);
  c.lineJoin = "round";
  c.lineCap = "round";

  roadY = stage.height - config.roadHeight;

  // curb line
  c.strokeStyle = "rgba(17, 17, 17, 0.35)";
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(0, roadY);
  c.lineTo(stage.width, roadY);
  c.stroke();

  // dashed lane divider, between the two car lanes
  const laneY = roadY + config.roadHeight * 0.5;
  c.save();
  c.strokeStyle = "rgba(17, 17, 17, 0.5)";
  c.lineWidth = 2.5;
  c.setLineDash([16, 14]);
  c.beginPath();
  c.moveTo(0, laneY);
  c.lineTo(stage.width, laneY);
  c.stroke();
  c.restore();

  buildings = [];
  let x = -20;
  while (x < stage.width + 20) {
    const width = randomRange(config.buildingMinWidth, config.buildingMaxWidth);
    let height =
      stage.height * randomRange(config.buildingMinHeightFrac, config.buildingMaxHeightFrac);

    // valley bias: buildings near the horizontal center shrink toward the
    // CTA/copy column so the skyline dips instead of crowding the hero.
    const centerX = x + width / 2;
    const distFromCenter = Math.abs(centerX - stage.width / 2) / (stage.width / 2);
    const valleyHalfWidth = config.centerValleyWidth;
    if (distFromCenter < valleyHalfWidth) {
      const t = distFromCenter / valleyHalfWidth; // 0 at center, 1 at valley edge
      const scale = config.centerValleyMinScale + t * (1 - config.centerValleyMinScale);
      height *= scale;
    }
    // never shrink below a floor that still fits a door + a row of windows
    height = Math.max(height, 80);

    const y = roadY - height;

    const cols = Math.max(1, Math.floor((width - 20) / config.windowCell));
    const rows = Math.max(1, Math.floor((height - 50) / config.windowCell));
    const padX = (width - cols * config.windowCell) / 2;
    const padY = 16;

    const windows: WindowRect[] = [];
    for (let r = 0; r < rows; r++) {
      for (let col = 0; col < cols; col++) {
        windows.push({
          x: x + padX + col * config.windowCell + 5,
          y: y + padY + r * config.windowCell + 5,
          w: config.windowCell - 12,
          h: config.windowCell - 14,
          lit: false,
        });
      }
    }

    const doorW = Math.min(30, width * 0.24);
    const doorH = Math.min(40, height * 0.5);
    const building: Building = {
      x,
      y,
      width,
      height,
      roof: pick(["flat", "flat", "peak", "tank"]),
      door: { x: x + width / 2 - doorW / 2, y: roadY - doorH, w: doorW, h: doorH },
      windows,
    };
    buildings.push(building);
    drawBuilding(c, building);

    x += width + randomRange(6, 22);
  }

  skylineCanvas = canvas;

  const tallest = buildings.reduce((m, b) => Math.min(m, b.y), stage.height);
  document.documentElement.style.setProperty(
    "--crowd-top",
    `${Math.max(0, tallest - config.crowdTopMargin)}px`,
  );
}

// ---------- random window/door/peek events ----------

type ActiveEvent = { render(ctx: CanvasRenderingContext2D): void };
let activeEvents: ActiveEvent[] = [];
let eventTimer: gsap.core.Tween | null = null;

function triggerWindowLight() {
  const b = pick(buildings);
  if (!b.windows.length) return;
  const w = pick(b.windows);
  if (w.lit) return;
  w.lit = true;
  const state = { on: 0 };
  gsap.to(state, {
    on: 1,
    duration: 0.5,
    ease: "power2.out",
    onComplete: () => {
      gsap.delayedCall(randomRange(2.5, 7), () => {
        gsap.to(state, {
          on: 0,
          duration: 0.6,
          ease: "power2.in",
          onComplete: () => {
            w.lit = false;
          },
        });
      });
    },
  });
  activeEvents.push({
    render(ctx) {
      if (state.on <= 0) return;
      ctx.save();
      ctx.globalAlpha = state.on * 0.92;
      ctx.fillStyle = "#111111";
      ctx.fillRect(w.x, w.y, w.w, w.h);
      ctx.restore();
    },
  });
}

function triggerDoorOpen() {
  const b = pick(buildings);
  const d = b.door;
  const state = { slide: 0 }; // 0 = closed, 1 = fully open
  const tl = gsap.timeline();
  tl.to(state, { slide: 1, duration: 0.5, ease: "power2.out" });
  tl.to(state, { slide: 0, duration: 0.45, ease: "power2.in", delay: 0.9 });

  const evt: ActiveEvent = {
    render(ctx) {
      if (state.slide <= 0.01) return;
      const halfW = d.w / 2;

      ctx.save();
      ctx.beginPath();
      ctx.rect(d.x, d.y, d.w, d.h);
      ctx.clip();

      // dark doorway interior, revealed as the two panels slide apart
      ctx.fillStyle = "#111111";
      ctx.fillRect(d.x, d.y, d.w, d.h);

      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = "#111111";
      ctx.lineWidth = 1.6;

      // left panel slides toward the left edge
      ctx.save();
      ctx.translate(-state.slide * halfW, 0);
      ctx.fillRect(d.x, d.y, halfW, d.h);
      ctx.strokeRect(d.x, d.y, halfW, d.h);
      ctx.restore();

      // right panel slides toward the right edge
      ctx.save();
      ctx.translate(state.slide * halfW, 0);
      ctx.fillRect(d.x + halfW, d.y, halfW, d.h);
      ctx.strokeRect(d.x + halfW, d.y, halfW, d.h);
      ctx.restore();

      ctx.restore();
    },
  };
  activeEvents.push(evt);
  tl.eventCallback("onComplete", () => {
    activeEvents = activeEvents.filter((e) => e !== evt);
  });
}

function triggerPeek() {
  const b = pick(buildings);
  if (!b.windows.length) return;
  const w = pick(b.windows);
  const state = { rise: 0 };
  const tl = gsap.timeline();
  tl.to(state, { rise: 1, duration: 0.45, ease: "power2.out" });
  tl.to(state, { rise: 0, duration: 0.4, ease: "power2.in", delay: 0.8 });

  const evt: ActiveEvent = {
    render(ctx) {
      if (state.rise <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.rect(w.x, w.y, w.w, w.h);
      ctx.clip();
      const headR = Math.min(w.w, w.h) * 0.28;
      const cx = w.x + w.w / 2;
      const cy = w.y + w.h + headR - state.rise * (headR * 2.6);
      ctx.fillStyle = "#111111";
      ctx.beginPath();
      ctx.arc(cx, cy, headR, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy + headR * 1.6, headR * 1.3, Math.PI, 0);
      ctx.fill();
      ctx.restore();
    },
  };
  activeEvents.push(evt);
  tl.eventCallback("onComplete", () => {
    activeEvents = activeEvents.filter((e) => e !== evt);
  });
}

const eventTriggers = [triggerWindowLight, triggerWindowLight, triggerDoorOpen, triggerPeek];

function scheduleNextEvent() {
  eventTimer = gsap.delayedCall(randomRange(config.eventMinGap, config.eventMaxGap), () => {
    if (buildings.length) pick(eventTriggers)();
    scheduleNextEvent();
  });
}

// ---------- cars ----------

type CarKind = "sedan" | "van" | "pickup" | "sport" | "bus";

type Car = {
  x: number;
  y: number;
  w: number;
  h: number;
  dir: 1 | -1;
  kind: CarKind;
  tween: gsap.core.Tween;
};

const carDrawers: Record<CarKind, (ctx: CanvasRenderingContext2D, w: number, h: number) => void> = {
  // low, sloped cabin
  sedan(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -h * 0.5);
    ctx.lineTo(-w * 0.28, -h);
    ctx.lineTo(w * 0.2, -h);
    ctx.lineTo(w / 2, -h * 0.5);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w * 0.15, -h);
    ctx.lineTo(-w * 0.15, -h * 0.5);
    ctx.stroke();
  },
  // tall boxy body, flat roof
  van(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -h * 1.35);
    ctx.lineTo(w * 0.1, -h * 1.35);
    ctx.lineTo(w * 0.1, -h * 0.7);
    ctx.lineTo(w / 2, -h * 0.7);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.strokeRect(-w * 0.42, -h * 1.15, w * 0.4, h * 0.4);
  },
  // open bed at the rear, cab up front
  pickup(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w / 2, -h * 0.42);
    ctx.lineTo(-w * 0.1, -h * 0.42);
    ctx.lineTo(-w * 0.1, -h);
    ctx.lineTo(w * 0.18, -h);
    ctx.lineTo(w * 0.3, -h * 0.42);
    ctx.lineTo(w / 2, -h * 0.42);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-w * 0.1, -h * 0.42);
    ctx.lineTo(-w * 0.1, -h);
    ctx.stroke();
  },
  // long low wedge
  sport(ctx, w, h) {
    ctx.beginPath();
    ctx.moveTo(-w / 2, 0);
    ctx.lineTo(-w * 0.46, -h * 0.32);
    ctx.lineTo(-w * 0.1, -h * 0.78);
    ctx.lineTo(w * 0.3, -h * 0.78);
    ctx.lineTo(w / 2, -h * 0.2);
    ctx.lineTo(w / 2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  },
  // long rectangular body with a couple of large windows
  bus(ctx, w, h) {
    ctx.beginPath();
    ctx.rect(-w / 2, -h * 1.5, w, h * 1.5);
    ctx.fill();
    ctx.stroke();
    const windows = 2;
    const gap = w * 0.06;
    const winW = (w * 0.8 - gap * (windows - 1)) / windows;
    for (let i = 0; i < windows; i++) {
      ctx.strokeRect(-w * 0.4 + i * (winW + gap), -h * 1.24, winW, h * 0.5);
    }
  },
};

const carSizes: Record<CarKind, { h: [number, number]; wMul: number }> = {
  sedan: { h: [16, 20], wMul: 2.1 },
  van: { h: [15, 18], wMul: 1.7 },
  pickup: { h: [16, 19], wMul: 2.3 },
  sport: { h: [14, 17], wMul: 2.5 },
  bus: { h: [17, 20], wMul: 2.4 },
};

const carKinds: CarKind[] = ["sedan", "sedan", "van", "pickup", "sport", "bus"];

let cars: Car[] = [];
let carTimer: gsap.core.Tween | null = null;

function renderCar(ctx: CanvasRenderingContext2D, car: Car) {
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.scale(car.dir, 1);
  ctx.strokeStyle = "#111111";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = 2;

  carDrawers[car.kind](ctx, car.w, car.h);

  ctx.fillStyle = "#111111";
  ctx.beginPath();
  ctx.arc(-car.w * 0.28, 2, car.h * 0.2, 0, Math.PI * 2);
  ctx.arc(car.w * 0.28, 2, car.h * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function spawnCar() {
  const dir: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
  const kind = pick(carKinds);
  const size = carSizes[kind];
  const h = randomRange(size.h[0], size.h[1]);
  const w = h * size.wMul;
  const lane = Math.random() > 0.5 ? roadY + config.roadHeight * 0.32 : roadY + config.roadHeight * 0.78;
  const startX = dir === 1 ? -w : stage.width + w;
  const endX = dir === 1 ? stage.width + w : -w;
  const duration = Math.abs(endX - startX) / randomRange(config.carSpeedMin, config.carSpeedMax);

  const car: Car = { x: startX, y: lane, w, h, dir, kind, tween: null as unknown as gsap.core.Tween };
  car.tween = gsap.to(car, {
    x: endX,
    duration,
    ease: "none",
    onComplete: () => {
      cars = cars.filter((c) => c !== car);
    },
  });
  cars.push(car);
}

function scheduleNextCar() {
  carTimer = gsap.delayedCall(randomRange(config.carMinGap, config.carMaxGap), () => {
    spawnCar();
    scheduleNextCar();
  });
}

// ---------- render loop / lifecycle ----------

let canvasEl: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;

function render() {
  if (!canvasEl || !ctx || !skylineCanvas) return;
  // eslint-disable-next-line no-self-assign
  canvasEl.width = canvasEl.width;
  ctx.save();
  ctx.drawImage(skylineCanvas, 0, 0, canvasEl.width, canvasEl.height);
  ctx.scale(devicePixelRatio, devicePixelRatio);
  activeEvents.forEach((e) => e.render(ctx!));
  cars.forEach((car) => renderCar(ctx!, car));
  ctx.restore();
}

function resize() {
  if (!canvasEl) return;
  stage.width = canvasEl.clientWidth;
  stage.height = canvasEl.clientHeight;
  canvasEl.width = Math.round(stage.width * devicePixelRatio);
  canvasEl.height = Math.round(stage.height * devicePixelRatio);

  activeEvents = [];
  buildStreet();
}

export function initCityStreet(canvas: HTMLCanvasElement, onReady?: () => void) {
  canvasEl = canvas;
  ctx = canvas.getContext("2d");

  resize();
  gsap.ticker.add(render);
  window.addEventListener("resize", resize);
  scheduleNextEvent();
  scheduleNextCar();
  onReady?.();

  return () => {
    gsap.ticker.remove(render);
    window.removeEventListener("resize", resize);
    eventTimer?.kill();
    carTimer?.kill();
    cars.forEach((c) => c.tween.kill());
    cars = [];
    activeEvents = [];
    buildings = [];
    skylineCanvas = null;
    canvasEl = null;
    ctx = null;
  };
}
