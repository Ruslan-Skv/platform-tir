'use client';

import React, { useEffect, useRef, useState } from 'react';

import styles from './Snowfall.module.css';

interface Flake {
  x: number;
  y: number;
  radius: number;
  /** Скорость падения, px/сек. */
  speed: number;
  swayAmplitude: number;
  swayPhase: number;
  swaySpeed: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  /** Крупная снежинка рисуется спрайтом-кристаллом, мелкая — точкой. */
  crystal: boolean;
  spriteIndex: number;
}

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';
const MAX_FLAKES = 130;
/** Доля крупных снежинок-кристаллов. */
const CRYSTAL_SHARE = 0.45;
/** Размер спрайта-кристалла, px (рисуется один раз, дальше только drawImage). */
const SPRITE_SIZE = 64;
const SPRITE_VARIANTS = 4;
/** Ширина колонки карты сугробов, px. */
const PILE_COLUMN_WIDTH = 4;
/** Интервал «оседания» сугробов, мс. */
const PILE_SETTLE_INTERVAL = 200;
/** Скорость равномерного роста слоя снега внизу, px/сек (рост замедляется по мере наполнения). */
const PILE_BASE_RISE_PER_SECOND = 0.035;
/** Максимальная высота сугробов — доля высоты экрана (не меньше 24px). */
const PILE_MAX_RATIO = 0.1;

function randomBetween(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

/** Детерминированный ГПСЧ, чтобы варианты кристаллов были разными, но стабильными. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Шестиугольный кристалл: главный луч + боковые ветви, с мягким свечением. */
function createSnowflakeSprite(variant: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = SPRITE_SIZE;
  canvas.height = SPRITE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const center = SPRITE_SIZE / 2;
  const armLength = SPRITE_SIZE * 0.42;
  const armWidth = SPRITE_SIZE * 0.045;
  const rand = mulberry32(variant * 7919 + 17);
  const branches = [0.32, 0.55, 0.78].map((t) => ({ t, len: 0.26 + rand() * 0.16 }));

  ctx.strokeStyle = '#fff';
  ctx.fillStyle = '#fff';
  ctx.lineCap = 'round';
  ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
  ctx.shadowBlur = 3;

  for (let i = 0; i < 6; i += 1) {
    const angle = (i * Math.PI) / 3;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    ctx.lineWidth = armWidth;
    ctx.beginPath();
    ctx.moveTo(center, center);
    ctx.lineTo(center + dx * armLength, center + dy * armLength);
    ctx.stroke();

    for (const { t, len } of branches) {
      const bx = center + dx * armLength * t;
      const by = center + dy * armLength * t;
      const branchLength = armLength * len * (1.15 - t);
      ctx.lineWidth = armWidth * 0.7;
      for (const side of [-1, 1]) {
        const branchAngle = angle + (side * Math.PI) / 3;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(
          bx + Math.cos(branchAngle) * branchLength,
          by + Math.sin(branchAngle) * branchLength
        );
        ctx.stroke();
      }
    }
  }

  // серединка
  ctx.beginPath();
  ctx.arc(center, center, armWidth * 1.6, 0, Math.PI * 2);
  ctx.fill();
  return canvas;
}

function createFlake(
  width: number,
  height: number,
  spawnAnywhere: boolean,
  spriteCount: number
): Flake {
  const crystal = Math.random() < CRYSTAL_SHARE;
  return {
    x: Math.random() * width,
    y: spawnAnywhere ? Math.random() * height : -8,
    radius: crystal ? randomBetween(1.9, 3.4) : randomBetween(0.8, 1.8),
    speed: randomBetween(18, 52),
    swayAmplitude: randomBetween(10, 30),
    swayPhase: Math.random() * Math.PI * 2,
    swaySpeed: randomBetween(0.4, 1.1),
    opacity: randomBetween(0.55, 1),
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: randomBetween(0.3, 1.1) * (Math.random() < 0.5 ? -1 : 1),
    crystal,
    spriteIndex: Math.floor(Math.random() * spriteCount),
  };
}

/**
 * Новогоднее украшение: падающий снег с накоплением внизу экрана.
 * Крупные снежинки — вращающиеся кристаллы (спрайты), мелкие — точки.
 * Внизу экрана снег накапливается: равномерный слой растёт со временем,
 * в местах приземления появляются бугорки, которые плавно «оседают».
 * Canvas на весь экран с pointer-events: none — прокрутке и кликам не мешает.
 * При prefers-reduced-motion не рендерится.
 */
export function Snowfall() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [motionAllowed, setMotionAllowed] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setMotionAllowed(!media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    if (!motionAllowed) return;
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!canvas || !context) return;

    const sprites = Array.from({ length: SPRITE_VARIANTS }, (_, i) => createSnowflakeSprite(i));

    let width = 0;
    let height = 0;
    let flakes: Flake[] = [];
    /** Локальные бугорки поверх равномерного слоя. */
    let bumps = new Float32Array(0);
    let bumpsSettled = new Float32Array(0);
    /** Равномерный слой снега, px. */
    let baseSnow = 0;
    let maxPile = 0;
    let lastSettleAt = 0;
    let frameId = 0;
    let lastTime = performance.now();

    const columnAt = (x: number) =>
      Math.min(bumps.length - 1, Math.max(0, Math.floor(x / PILE_COLUMN_WIDTH)));

    /** Высота сугроба в колонке — без жёсткого потолка: рост останавливается
     *  плавным насыщением, поэтому верх сохраняет форму дюн, а не прямую линию. */
    const pileHeightAt = (column: number) => baseSnow + bumps[column];

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);

      const columns = Math.max(1, Math.ceil(width / PILE_COLUMN_WIDTH));
      const nextBumps = new Float32Array(columns);
      if (bumps.length > 0) {
        // переносим уже выпавший снег при изменении ширины (например, поворот экрана)
        for (let i = 0; i < columns; i += 1) {
          const position = (i / (columns - 1 || 1)) * (bumps.length - 1);
          nextBumps[i] = bumps[Math.round(position)] ?? 0;
        }
      }
      bumps = nextBumps;
      bumpsSettled = new Float32Array(columns);
      maxPile = Math.max(24, Math.round(height * PILE_MAX_RATIO));
      baseSnow = Math.min(baseSnow, maxPile);

      const target = Math.min(MAX_FLAKES, Math.max(40, Math.floor(width / 10)));
      flakes = Array.from({ length: target }, () =>
        createFlake(width, height, true, sprites.length)
      );
    };

    /** Приземление снежинки: бугорок в точке падения с расползанием на соседей.
     *  Чем выше зрелость покрова (baseSnow → maxPile), тем меньше добавка —
     *  «уплотнение»: сугробы перестают расти, сохраняя форму. */
    const deposit = (column: number, amount: number) => {
      const room = Math.max(0, 1 - baseSnow / maxPile);
      for (let k = -1; k <= 1; k += 1) {
        const i = column + k;
        if (i < 0 || i >= bumps.length) continue;
        const weight = k === 0 ? 0.5 : 0.25;
        bumps[i] += amount * weight * room;
      }
    };

    /** Осыпание: острые бугорки плавно растекаются, сугробы становятся округлыми. */
    const settlePile = () => {
      const n = bumps.length;
      for (let i = 0; i < n; i += 1) {
        const left = bumps[i > 0 ? i - 1 : i];
        const right = bumps[i < n - 1 ? i + 1 : i];
        const average = (left + 2 * bumps[i] + right) / 4;
        bumpsSettled[i] = bumps[i] + (average - bumps[i]) * 0.35;
      }
      const swap = bumps;
      bumps = bumpsSettled;
      bumpsSettled = swap;
    };

    const drawPile = () => {
      if (bumps.length === 0) return;
      context.fillStyle = '#fff';
      context.globalAlpha = 0.95;
      context.beginPath();
      context.moveTo(0, height + 1);
      context.lineTo(0, height - pileHeightAt(0));
      let prevX = 0;
      let prevY = height - pileHeightAt(0);
      for (let i = 1; i < bumps.length; i += 1) {
        const x = i * PILE_COLUMN_WIDTH;
        const y = height - pileHeightAt(i);
        // сглаживаем сугробы кривыми через середины отрезков
        context.quadraticCurveTo(prevX, prevY, (prevX + x) / 2, (prevY + y) / 2);
        prevX = x;
        prevY = y;
      }
      context.lineTo(width, prevY);
      context.lineTo(width, height + 1);
      context.closePath();
      context.fill();
    };

    const draw = (time: number) => {
      frameId = requestAnimationFrame(draw);
      if (document.hidden) {
        lastTime = time;
        return;
      }
      const dt = Math.min((time - lastTime) / 1000, 0.05);
      lastTime = time;

      // равномерный слой растёт с насыщением: чем ближе к maxPile, тем медленнее
      baseSnow += PILE_BASE_RISE_PER_SECOND * dt * Math.max(0, 1 - baseSnow / maxPile);
      if (time - lastSettleAt >= PILE_SETTLE_INTERVAL) {
        lastSettleAt = time;
        settlePile();
      }

      context.clearRect(0, 0, width, height);
      drawPile();

      context.fillStyle = '#fff';
      for (const flake of flakes) {
        flake.y += flake.speed * dt;
        flake.swayPhase += flake.swaySpeed * dt;
        flake.rotation += flake.rotationSpeed * dt;
        const x = flake.x + Math.sin(flake.swayPhase) * flake.swayAmplitude;
        const surfaceY = height - pileHeightAt(columnAt(x));
        if (flake.y + flake.radius >= surfaceY) {
          deposit(columnAt(x), flake.radius * 2.2);
          Object.assign(flake, createFlake(width, height, false, sprites.length));
          continue;
        }
        context.globalAlpha = flake.opacity;
        if (flake.crystal) {
          const size = flake.radius * 3;
          context.save();
          context.translate(x, flake.y);
          context.rotate(flake.rotation);
          context.drawImage(sprites[flake.spriteIndex], -size / 2, -size / 2, size, size);
          context.restore();
        } else {
          context.beginPath();
          context.arc(x, flake.y, flake.radius, 0, Math.PI * 2);
          context.fill();
        }
      }
      context.globalAlpha = 1;
    };

    resize();
    window.addEventListener('resize', resize);
    frameId = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', resize);
    };
  }, [motionAllowed]);

  if (!motionAllowed) return null;
  return <canvas ref={canvasRef} className={styles.canvas} aria-hidden="true" />;
}
