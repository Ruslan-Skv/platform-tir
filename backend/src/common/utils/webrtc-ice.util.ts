/**
 * Конфигурация ICE-серверов для WebRTC (см. docs/REMOTE-HELP.md, docs/ONLINE-MEETINGS.md).
 * TURN опционален: TURN_URL/TURN_USERNAME/TURN_CREDENTIAL (можно несколько URL через запятую).
 */
export interface IceServerConfig {
  urls: string[];
  username?: string;
  credential?: string;
}

/** STUN/TURN из env + дефолтный STUN Google. */
export function getIceServersFromEnv(): IceServerConfig[] {
  const servers: IceServerConfig[] = [];
  const turnUrl = process.env.TURN_URL;
  if (turnUrl) {
    servers.push({
      urls: turnUrl
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_CREDENTIAL,
    });
  }
  servers.push({ urls: ['stun:stun.l.google.com:19302'] });
  return servers;
}
