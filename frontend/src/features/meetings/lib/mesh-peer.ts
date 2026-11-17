/**
 * Пир mesh-конференции: одно RTCPeerConnection на удалённого участника.
 * Perfect negotiation (MDN): коллизии offer'ов (glare) разрешаются полиролью —
 * polite уступает. Роль детерминирована с обеих сторон сравнением userId.
 * Один исходящий видеотрек на участника: камера ИЛИ экран через replaceTrack.
 */
import type { Socket } from 'socket.io-client';

import { sendMeetingSignal } from '@/shared/api/admin-meetings';

export type MeshSignalMessage =
  | { kind: 'offer'; sdp: string }
  | { kind: 'answer'; sdp: string }
  | { kind: 'ice'; candidate: RTCIceCandidateInit };

export interface MeshPeerEvents {
  onRemoteStream: (remoteUserId: string, stream: MediaStream) => void;
  onStateChange: (remoteUserId: string, state: RTCPeerConnectionState) => void;
}

export interface MeshPeerOptions {
  localUserId: string;
  remoteUserId: string;
  meetingId: string;
  socket: Socket | null;
  iceServers: RTCIceServer[];
  events: MeshPeerEvents;
}

export class MeshPeer {
  readonly pc: RTCPeerConnection;
  readonly polite: boolean;

  private makingOffer = false;
  private ignoreOffer = false;
  private closed = false;
  private remoteStreamId: string | null = null;
  private videoSender: RTCRtpSender | null = null;
  private audioSender: RTCRtpSender | null = null;

  constructor(private readonly opts: MeshPeerOptions) {
    // Уступает ровно один из двух — тот, чей userId лексикографически больше.
    this.polite = opts.localUserId > opts.remoteUserId;
    this.pc = new RTCPeerConnection({ iceServers: opts.iceServers });

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({ kind: 'ice', candidate: event.candidate.toJSON() });
      }
    };

    this.pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (!stream) return;
      // replaceTrack не порождает новых ontrack — стрим один на оба трека
      if (stream.id !== this.remoteStreamId) {
        this.remoteStreamId = stream.id;
        this.opts.events.onRemoteStream(this.opts.remoteUserId, stream);
      }
    };

    this.pc.onconnectionstatechange = () => {
      this.opts.events.onStateChange(this.opts.remoteUserId, this.pc.connectionState);
    };

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) {
          this.send({ kind: 'offer', sdp: this.pc.localDescription.sdp ?? '' });
        }
      } catch (err) {
        console.warn('[meetings] negotiation failed', err);
      } finally {
        this.makingOffer = false;
      }
    };
  }

  /** Локальные треки при создании пира: аудио + опционально видео. */
  setLocalStream(stream: MediaStream | null): void {
    if (this.closed || !stream) return;
    for (const track of stream.getTracks()) {
      const sender = this.addTrackIfNeeded(track, stream);
      if (track.kind === 'video') this.videoSender = sender;
      if (track.kind === 'audio') this.audioSender = sender;
    }
  }

  /**
   * Подмена исходящего видео (камера ↔ экран) без перенегоциации,
   * а при отсутствии видеослота — добавление трека с перенегоциацией.
   */
  async replaceVideoTrack(track: MediaStreamTrack | null, stream: MediaStream): Promise<void> {
    if (this.closed) return;
    if (this.videoSender) {
      await this.videoSender.replaceTrack(track);
      return;
    }
    if (track) {
      this.videoSender = this.pc.addTrack(track, stream);
    }
  }

  /** Лимит битрейта исходящего видео (деградация при большом числе участников). */
  async setVideoMaxBitrate(maxBitrate: number): Promise<void> {
    const sender = this.videoSender;
    if (!sender) return;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = maxBitrate;
      await sender.setParameters(params);
    } catch (err) {
      console.warn('[meetings] setParameters failed', err);
    }
  }

  async handleSignal(message: MeshSignalMessage): Promise<void> {
    if (this.closed) return;
    const { pc } = this;
    try {
      if (message.kind === 'offer') {
        const offerCollision =
          this.makingOffer || (pc.signalingState !== 'stable' && !this.ignoreOffer);
        this.ignoreOffer = !this.polite && offerCollision;
        if (this.ignoreOffer) return;

        // setRemoteDescription сам откатывает незавершённый локальный offer
        await pc.setRemoteDescription({ type: 'offer', sdp: message.sdp });
        await pc.setLocalDescription();
        if (pc.localDescription) {
          this.send({ kind: 'answer', sdp: pc.localDescription.sdp ?? '' });
        }
      } else if (message.kind === 'answer') {
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription({ type: 'answer', sdp: message.sdp });
        }
      } else if (message.kind === 'ice') {
        try {
          await pc.addIceCandidate(message.candidate);
        } catch (err) {
          if (!this.ignoreOffer) throw err;
        }
      }
    } catch (err) {
      console.warn('[meetings] signal error', message.kind, err);
    }
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.pc.close();
    } catch {
      /* пир уже закрыт */
    }
  }

  private addTrackIfNeeded(track: MediaStreamTrack, stream: MediaStream): RTCRtpSender {
    const existing =
      track.kind === 'video' ? this.videoSender : track.kind === 'audio' ? this.audioSender : null;
    if (existing && existing.track !== track) {
      // слот уже занят (например, пир создан входящим offer'ом) — просто подменяем
      void existing.replaceTrack(track);
      return existing;
    }
    if (existing) return existing;
    return this.pc.addTrack(track, stream);
  }

  private send(message: MeshSignalMessage): void {
    sendMeetingSignal(this.opts.socket, this.opts.meetingId, this.opts.remoteUserId, message);
  }
}
