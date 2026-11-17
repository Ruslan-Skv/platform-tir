/**
 * Локальная запись собрания: тайлы видео рисуются на canvas, аудио всех
 * участников микшируется через WebAudio → MediaRecorder → скачиваемый WebM.
 * Серверной записи нет (нет SFU) — файл остаётся у записывающего.
 */

export interface RecorderTile {
  el: HTMLVideoElement | null;
  label: string;
}

export type RecorderTilesGetter = () => RecorderTile[];

const VIDEO_MIME_CANDIDATES = [
  'video/webm;codecs=vp9,opus',
  'video/webm;codecs=vp8,opus',
  'video/webm',
];

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === 'undefined') return undefined;
  return VIDEO_MIME_CANDIDATES.find((type) => MediaRecorder.isTypeSupported(type));
}

export class MeetingRecorder {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private audioCtx: AudioContext | null = null;
  private audioDest: MediaStreamAudioDestinationNode | null = null;
  private audioSources = new Map<string, MediaStreamAudioSourceNode>();
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private drawTimer: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly getTiles: RecorderTilesGetter) {}

  get active(): boolean {
    return this.recorder?.state === 'recording';
  }

  /** Добавить аудио потока в микс (вызывать для локального и каждого удалённого). */
  addStreamAudio(key: string, stream: MediaStream | null): void {
    if (!stream || !this.audioCtx || !this.audioDest) return;
    if (this.audioSources.has(key)) return;
    if (stream.getAudioTracks().length === 0) return;
    const source = this.audioCtx.createMediaStreamSource(stream);
    source.connect(this.audioDest);
    this.audioSources.set(key, source);
  }

  removeStreamAudio(key: string): void {
    const source = this.audioSources.get(key);
    if (!source) return;
    try {
      source.disconnect();
    } catch {
      /* уже отключён */
    }
    this.audioSources.delete(key);
  }

  start(width = 1280, height = 720): void {
    if (this.recorder) return;
    const mimeType = pickMimeType();
    if (!mimeType) throw new Error('Браузер не поддерживает запись WebM');

    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) throw new Error('Не удалось инициализировать canvas');

    this.audioCtx = new AudioContext();
    this.audioDest = this.audioCtx.createMediaStreamDestination();

    const canvasStream = this.canvas.captureStream(25);
    const audioTrack = this.audioDest.stream.getAudioTracks()[0];
    const mixed = new MediaStream([...canvasStream.getVideoTracks(), audioTrack].filter(Boolean));

    this.chunks = [];
    this.recorder = new MediaRecorder(mixed, { mimeType, videoBitsPerSecond: 1_500_000 });
    this.recorder.ondataavailable = (event) => {
      if (event.data.size > 0) this.chunks.push(event.data);
    };
    this.recorder.start(2_000);

    this.drawTimer = setInterval(() => this.draw(), 200);
    this.draw();
  }

  /** Остановить и получить файл (пустой blob, если запись не велась). */
  async stop(): Promise<Blob | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === 'inactive') {
      this.teardown();
      return null;
    }
    const blob = await new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(this.chunks, { type: recorder.mimeType }));
      recorder.stop();
    });
    this.teardown();
    return blob;
  }

  private draw(): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    const tiles = this.getTiles().filter((t) => t.el && t.el.readyState >= 2);
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#0f1115';
    ctx.fillRect(0, 0, width, height);

    const count = Math.max(1, tiles.length);
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);
    const cellW = Math.floor(width / cols);
    const cellH = Math.floor(height / rows);

    tiles.forEach((tile, index) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      const x = col * cellW;
      const y = row * cellH;
      const video = tile.el as HTMLVideoElement;

      // object-fit: contain
      const vw = video.videoWidth || 16;
      const vh = video.videoHeight || 9;
      const scale = Math.min(cellW / vw, cellH / vh);
      const drawW = Math.floor(vw * scale);
      const drawH = Math.floor(vh * scale);
      const dx = x + Math.floor((cellW - drawW) / 2);
      const dy = y + Math.floor((cellH - drawH) / 2);
      try {
        ctx.drawImage(video, dx, dy, drawW, drawH);
      } catch {
        /* кадр ещё недоступен */
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
      ctx.fillRect(
        x + 8,
        y + cellH - 36,
        Math.min(cellW - 16, ctx.measureText(tile.label).width + 20),
        28
      );
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textBaseline = 'middle';
      ctx.fillText(tile.label, x + 18, y + cellH - 22);
    });
  }

  private teardown(): void {
    if (this.drawTimer) {
      clearInterval(this.drawTimer);
      this.drawTimer = null;
    }
    for (const source of this.audioSources.values()) {
      try {
        source.disconnect();
      } catch {
        /* уже отключён */
      }
    }
    this.audioSources.clear();
    this.recorder = null;
    void this.audioCtx?.close().catch(() => undefined);
    this.audioCtx = null;
    this.audioDest = null;
    this.canvas = null;
    this.ctx = null;
  }
}

/** Скачивание готовой записи. */
export function downloadRecording(blob: Blob, title: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const date = new Date().toISOString().slice(0, 16).replace('T', '_').replace(':', '-');
  a.href = url;
  a.download = `meeting_${
    title
      .replace(/[^\wа-яА-ЯёЁ -]/g, '')
      .trim()
      .replace(/\s+/g, '_') || 'record'
  }_${date}.webm`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
