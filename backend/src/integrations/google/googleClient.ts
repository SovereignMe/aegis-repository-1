export interface GoogleConnectionState {
  provider: "gmail" | "googleCalendar";
  connected: boolean;
  scopes: string[];
  accountEmail?: string;
  available: boolean;
  reason?: string;
}

export class GoogleClientPlaceholder {
  getConnectionState(provider: "gmail" | "googleCalendar"): GoogleConnectionState {
    return {
      provider,
      connected: false,
      scopes: [],
      available: false,
      reason: `${provider} is intentionally hidden until secure OAuth and least-privilege scopes are implemented.`,
    };
  }
}
