import { env } from "./env.js";

export const integrationAvailability = {
  gmail: env.gmailOAuthEnabled,
  googleCalendar: env.googleCalendarOAuthEnabled,
  cloudSync: env.cloudSyncEnabled,
} as const;

export type IntegrationProviderKey = keyof typeof integrationAvailability;

export function isIntegrationAvailable(provider: IntegrationProviderKey): boolean {
  return Boolean(integrationAvailability[provider]);
}
