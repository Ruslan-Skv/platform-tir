/**
 * Захват событий мыши/клавиатуры суперадмина над видео и отправка их
 * сотруднику через DataChannel. Координаты нормализуются к содержимому
 * видео (object-fit: contain), чтобы попасть в те же точки экрана.
 */
import type { ControlMessage } from './control-protocol';

export interface ControlCaptureOptions {
  /** Управление включено — события отправляются и перехватываются локально. */
  isEnabled: () => boolean;
  /** Отправлять перемещение курсора (указатель виден сотруднику) даже без управления. */
  sendCursorAlways?: boolean;
}

const CURSOR_THROTTLE_MS = 50;

export function attachControlCapture(
  container: HTMLElement,
  video: HTMLVideoElement,
  channel: RTCDataChannel,
  options: ControlCaptureOptions
): () => void {
  let lastCursorSent = 0;

  /** Прямоугольник отображаемого содержимого видео с учётом letterboxing. */
  function contentRect(): { left: number; top: number; width: number; height: number } {
    const rect = video.getBoundingClientRect();
    const cw = video.clientWidth || rect.width;
    const ch = video.clientHeight || rect.height;
    const vw = video.videoWidth || cw;
    const vh = video.videoHeight || ch;
    if (!vw || !vh) return { left: rect.left, top: rect.top, width: cw, height: ch };
    const scale = Math.min(cw / vw, ch / vh);
    const width = vw * scale;
    const height = vh * scale;
    return { left: rect.left + (cw - width) / 2, top: rect.top + (ch - height) / 2, width, height };
  }

  function normalize(event: MouseEvent): { x: number; y: number } | null {
    const box = contentRect();
    if (!box.width || !box.height) return null;
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    if (x < -0.02 || y < -0.02 || x > 1.02 || y > 1.02) return null;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  }

  function send(message: ControlMessage): void {
    if (channel.readyState !== 'open') return;
    channel.send(JSON.stringify(message));
  }

  function sendPointer(
    type: 'down' | 'up' | 'click' | 'dblclick' | 'contextmenu',
    event: MouseEvent
  ): void {
    const point = normalize(event);
    if (!point) return;
    send({ t: 'pointer', type, x: point.x, y: point.y, button: event.button });
  }

  const onPointerMove = (event: PointerEvent) => {
    const point = normalize(event);
    if (!point) return;
    if (options.isEnabled()) {
      event.preventDefault();
    }
    const now = Date.now();
    if (now - lastCursorSent < CURSOR_THROTTLE_MS) return;
    lastCursorSent = now;
    if (options.isEnabled() || options.sendCursorAlways !== false) {
      send({ t: 'cursor', x: point.x, y: point.y });
    }
  };

  const swallow = (event: Event) => {
    if (options.isEnabled()) event.preventDefault();
  };

  const onPointerDown = (event: MouseEvent) => {
    if (!options.isEnabled()) return;
    event.preventDefault();
    sendPointer('down', event);
  };
  const onPointerUp = (event: MouseEvent) => {
    if (!options.isEnabled()) return;
    event.preventDefault();
    sendPointer('up', event);
  };
  const onClick = (event: MouseEvent) => {
    if (!options.isEnabled()) return;
    event.preventDefault();
    sendPointer('click', event);
  };
  const onDblClick = (event: MouseEvent) => {
    if (!options.isEnabled()) return;
    event.preventDefault();
    sendPointer('dblclick', event);
  };
  const onContextMenu = (event: MouseEvent) => {
    if (!options.isEnabled()) return;
    event.preventDefault();
    sendPointer('contextmenu', event);
  };

  const onWheel = (event: WheelEvent) => {
    if (!options.isEnabled()) return;
    event.preventDefault();
    const point = normalize(event);
    if (!point) return;
    send({
      t: 'wheel',
      x: point.x,
      y: point.y,
      deltaX: event.deltaX,
      deltaY: event.deltaY,
    });
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (!options.isEnabled()) return;
    // F5/F11 и адресная строка — не пытаемся перехватить
    if (event.key === 'F5' || event.key === 'F11' || event.key === 'F12') return;
    event.preventDefault();
    send({
      t: 'key',
      key: event.key,
      code: event.code,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey,
    });
  };

  container.addEventListener('pointermove', onPointerMove);
  container.addEventListener('pointerdown', onPointerDown);
  container.addEventListener('pointerup', onPointerUp);
  container.addEventListener('click', onClick);
  container.addEventListener('dblclick', onDblClick);
  container.addEventListener('contextmenu', onContextMenu);
  container.addEventListener('wheel', onWheel, { passive: false });
  container.addEventListener('keydown', onKeyDown);
  // выделение текста и drag мешают точным кликам по видео
  container.addEventListener('dragstart', swallow);
  container.addEventListener('selectstart', swallow);

  return () => {
    container.removeEventListener('pointermove', onPointerMove);
    container.removeEventListener('pointerdown', onPointerDown);
    container.removeEventListener('pointerup', onPointerUp);
    container.removeEventListener('click', onClick);
    container.removeEventListener('dblclick', onDblClick);
    container.removeEventListener('contextmenu', onContextMenu);
    container.removeEventListener('wheel', onWheel);
    container.removeEventListener('keydown', onKeyDown);
    container.removeEventListener('dragstart', swallow);
    container.removeEventListener('selectstart', swallow);
  };
}
