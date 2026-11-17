/** Протокол канала управления «суперадмин → сотрудник». Координаты нормализованы 0..1. */

export type ControlMessage =
  | { t: 'mode'; control: boolean }
  | { t: 'cursor'; x: number; y: number }
  | {
      t: 'pointer';
      type: 'down' | 'up' | 'click' | 'dblclick' | 'contextmenu';
      x: number;
      y: number;
      button: number;
    }
  | { t: 'wheel'; x: number; y: number; deltaX: number; deltaY: number }
  | {
      t: 'key';
      key: string;
      code: string;
      ctrl: boolean;
      shift: boolean;
      alt: boolean;
      meta: boolean;
    };

/** Сигнальные сообщения WebRTC, ходят через сокет help:signal. */
export type RemoteHelpSignal =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'ice'; candidate: RTCIceCandidateInit };

export function isControlMessage(value: unknown): value is ControlMessage {
  if (typeof value !== 'object' || value === null) return false;
  const t = (value as { t?: unknown }).t;
  return t === 'mode' || t === 'cursor' || t === 'pointer' || t === 'wheel' || t === 'key';
}
