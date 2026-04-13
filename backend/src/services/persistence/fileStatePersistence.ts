import fs from "node:fs/promises";
import type { GovernanceState } from "../../models/domain.js";

export async function loadStateFromFile(stateFile: string, normalizeState: (state: GovernanceState) => GovernanceState): Promise<GovernanceState | null> {
  try {
    const raw = await fs.readFile(stateFile, "utf8");
    return normalizeState(JSON.parse(raw) as GovernanceState);
  } catch {
    return null;
  }
}

export async function persistStateToFile(stateFile: string, state: GovernanceState, ensureDir: (targetPath: string) => Promise<void>) {
  await ensureDir(stateFile);
  await fs.writeFile(stateFile, JSON.stringify(state, null, 2), "utf8");
}
