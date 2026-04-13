export interface JurisdictionHintPack {
  key: string;
  label: string;
  trustName: string;
  hints: string[];
  disclaimer: string;
}
export function getJurisdictionHintPack(jurisdiction?: string | null, trustName?: string | null): JurisdictionHintPack;
