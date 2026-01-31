export type NotificationSoundType = 'beep' | 'ding' | 'chime' | 'bell' | 'custom';

interface SoundPreset {
  frequency: number;
  type: OscillatorType;
  duration: number;
  gain?: number;
}

const SOUND_PRESETS: Record<Exclude<NotificationSoundType, 'custom'>, SoundPreset> = {
  beep: { frequency: 800, type: 'sine', duration: 0.15, gain: 0.3 },
  ding: { frequency: 880, type: 'sine', duration: 0.2, gain: 0.25 },
  chime: { frequency: 523, type: 'sine', duration: 0.25, gain: 0.2 },
  bell: { frequency: 660, type: 'triangle', duration: 0.3, gain: 0.2 },
};

/**
 * Воспроизводит звук уведомления.
 * При type='custom' и customSoundUrl — загружает и воспроизводит аудиофайл.
 * Иначе — синтезирует звук через Web Audio API.
 */
export function playNotificationSound(
  volumePercent = 70,
  type: NotificationSoundType = 'beep',
  customSoundUrl?: string | null
): void {
  try {
    if (type === 'custom' && customSoundUrl) {
      const audio = new Audio(customSoundUrl);
      audio.volume = volumePercent / 100;
      audio.play().catch(() => {});
      return;
    }

    const preset =
      SOUND_PRESETS[(type as Exclude<NotificationSoundType, 'custom'>) ?? 'beep'] ??
      SOUND_PRESETS.beep;
    const audioContext = new (
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    )();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = preset.frequency;
    oscillator.type = preset.type;
    gainNode.gain.value = (volumePercent / 100) * (preset.gain ?? 0.3);

    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + preset.duration);
  } catch {
    // Игнорируем ошибки (например, автоигра заблокирована браузером)
  }
}
