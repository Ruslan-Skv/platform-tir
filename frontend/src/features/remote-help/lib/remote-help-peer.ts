/**
 * WebRTC-пир сеанса удалённой помощи.
 * Сотрудник (worker) — инициатор: захватывает экран и шлёт offer,
 * суперадмин (helper) отвечает. Канал данных «control» создаёт сотрудник.
 */
import type { Socket } from 'socket.io-client';

import { getRemoteHelpIceServers, sendRemoteHelpSignal } from '@/shared/api/admin-remote-help';

import type { RemoteHelpSignal } from './control-protocol';

export interface RemoteHelpPeerEvents {
  /** Поток с экраном сотрудника (на стороне суперадмина). */
  onRemoteStream?: (stream: MediaStream) => void;
  /** Канал управления открыт (у сотрудника — сразу, у суперадмина — по ondatachannel). */
  onControlChannel?: (channel: RTCDataChannel) => void;
  onStateChange?: (state: RTCPeerConnectionState) => void;
}

export class RemoteHelpPeer {
  readonly pc: RTCPeerConnection;
  private controlChannel: RTCDataChannel | null = null;
  private closed = false;

  private constructor(
    private readonly sessionId: string,
    private readonly socket: Socket | null,
    private readonly events: RemoteHelpPeerEvents
  ) {
    this.pc = new RTCPeerConnection({ iceServers: [] });
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.send({ kind: 'ice', candidate: event.candidate.toJSON() });
      }
    };
    this.pc.ontrack = (event) => {
      const [stream] = event.streams;
      if (stream) this.events.onRemoteStream?.(stream);
    };
    this.pc.ondatachannel = (event) => {
      if (event.channel.label === 'control') {
        this.controlChannel = event.channel;
        this.events.onControlChannel?.(event.channel);
      }
    };
    this.pc.onconnectionstatechange = () => {
      this.events.onStateChange?.(this.pc.connectionState);
    };
  }

  static async create(
    sessionId: string,
    socket: Socket | null,
    events: RemoteHelpPeerEvents = {}
  ): Promise<RemoteHelpPeer> {
    const iceServers = await getRemoteHelpIceServers().catch(() => []);
    const peer = new RemoteHelpPeer(sessionId, socket, events);
    try {
      peer.pc.setConfiguration({ iceServers });
    } catch {
      // конфигурация опциональна — соединение попробует host-кандидатов
    }
    return peer;
  }

  /** Сторона сотрудника: начать трансляцию экрана. */
  async startWorker(stream: MediaStream): Promise<void> {
    const channel = this.pc.createDataChannel('control', { ordered: true });
    this.controlChannel = channel;
    channel.onopen = () => this.events.onControlChannel?.(channel);

    for (const track of stream.getTracks()) {
      this.pc.addTrack(track, stream);
    }

    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    this.send({ kind: 'offer', sdp: offer.sdp ?? '' });
  }

  getControlChannel(): RTCDataChannel | null {
    return this.controlChannel;
  }

  getSessionId(): string {
    return this.sessionId;
  }

  async handleSignal(message: RemoteHelpSignal): Promise<void> {
    if (this.closed) return;
    try {
      if (message.kind === 'offer') {
        await this.pc.setRemoteDescription({ type: 'offer', sdp: message.sdp });
        const answer = await this.pc.createAnswer();
        await this.pc.setLocalDescription(answer);
        this.send({ kind: 'answer', sdp: answer.sdp ?? '' });
      } else if (message.kind === 'answer') {
        if (this.pc.signalingState === 'have-local-offer') {
          await this.pc.setRemoteDescription({ type: 'answer', sdp: message.sdp });
        }
      } else if (message.kind === 'ice') {
        await this.pc.addIceCandidate(message.candidate);
      }
    } catch (err) {
      console.warn('[remote-help] signal error', message.kind, err);
    }
  }

  send(message: RemoteHelpSignal): void {
    sendRemoteHelpSignal(this.socket, this.sessionId, message);
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    try {
      this.controlChannel?.close();
    } catch {
      /* канал уже закрыт */
    }
    try {
      this.pc.close();
    } catch {
      /* пир уже закрыт */
    }
  }
}
