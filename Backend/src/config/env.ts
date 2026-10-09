import dotenv from "dotenv"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, "../../.env") })

export const config = {
  port: parseInt(process.env.PORT || "5000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  jwtSecret: process.env.JWT_SECRET || "djam3ya_default_super_secret_key_2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "*",
  databaseUrl: process.env.DATABASE_URL || "",
  /** Secret code required to create the first admin and to add new accounts. */
  accountCode: process.env.ACCOUNT_CODE || "asa elhadjadj",
  seedDemoData: process.env.SEED_DEMO_DATA === "true",
  isProduction: process.env.NODE_ENV === "production",
}
