import { db } from "../store/governance-store.js";
import { runBackupRestoreDrill } from "../services/backup-drill.service.js";

await db.init();
const result = await runBackupRestoreDrill();
console.log(JSON.stringify(result, null, 2));
