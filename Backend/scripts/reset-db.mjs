// Usage: npm run db:reset
// Moves the built-in SQLite database (and its -wal/-shm files) into data/backups/
// so the next start is empty and the /setup page appears. Nothing is deleted.
import fs from "node:fs"
import path from "node:path"
import dotenv from "dotenv"
import { fileURLToPath } from "node:url"

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
dotenv.config({ path: path.join(root, ".env") })

if (/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL || "")) {
  console.error("DATABASE_URL points to PostgreSQL. Empty the tables there yourself; nothing was changed.")
  process.exit(1)
}

const dbPath = path.resolve(process.env.SQLITE_PATH || path.join(root, "data", "quran_association.db"))
const files = [dbPath, `${dbPath}-wal`, `${dbPath}-shm`].filter((f) => fs.existsSync(f))

if (!files.length) {
  console.log(`No database at ${dbPath}. It is already empty: open /setup.`)
  process.exit(0)
}

const backupDir = path.join(path.dirname(dbPath), "backups")
fs.mkdirSync(backupDir, { recursive: true })
const stamp = new Date().toISOString().replace(/[:.]/g, "-")
for (const f of files) {
  const target = path.join(backupDir, `${stamp}-${path.basename(f)}`)
  fs.renameSync(f, target)
  console.log(`Moved ${path.basename(f)} -> ${path.relative(root, target)}`)
}
console.log("Done. Restart the backend and open /setup to create the first administrator.")
