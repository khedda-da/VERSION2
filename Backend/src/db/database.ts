import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { DatabaseSync } from "node:sqlite"
import pg from "pg"
import { config } from "../config/env.js"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export interface DbResult {
  lastInsertRowid: number
  changes: number
}

export interface IDatabase {
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  get<T = any>(sql: string, params?: any[]): Promise<T | null>
  run(sql: string, params?: any[]): Promise<DbResult>
  exec(sql: string): Promise<void>
  isPostgres: boolean
  close(): Promise<void>
}

class SqliteDatabase implements IDatabase {
  private db: DatabaseSync
  public isPostgres = false

  constructor(filePath: string) {
    const dir = path.dirname(filePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    this.db = new DatabaseSync(filePath)
    this.db.exec("PRAGMA foreign_keys = ON;")
    this.db.exec("PRAGMA journal_mode = WAL;")
  }

  private convertPlaceholders(sql: string): string {
    // Converts $1, $2, ... to ?
    return sql.replace(/\$\d+/g, "?")
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const converted = this.convertPlaceholders(sql)
    const stmt = this.db.prepare(converted)
    const rows = stmt.all(...params) as T[]
    return rows.map((r) => ({ ...(r as any) }))
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const converted = this.convertPlaceholders(sql)
    const stmt = this.db.prepare(converted)
    const row = stmt.get(...params) as T | undefined
    return row ? { ...(row as any) } : null
  }

  async run(sql: string, params: any[] = []): Promise<DbResult> {
    const converted = this.convertPlaceholders(sql)
    const stmt = this.db.prepare(converted)
    const info = stmt.run(...params)
    return {
      lastInsertRowid: Number(info.lastInsertRowid),
      changes: Number(info.changes),
    }
  }

  async exec(sql: string): Promise<void> {
    this.db.exec(sql)
  }

  async close(): Promise<void> {
    this.db.close()
  }
}

class PostgresDatabase implements IDatabase {
  private pool: pg.Pool
  public isPostgres = true

  constructor(connectionString: string) {
    this.pool = new pg.Pool({ connectionString })
  }

  private convertPlaceholders(sql: string): string {
    // Converts ? to $1, $2, etc. if needed
    let index = 1
    return sql.replace(/\?/g, () => `$${index++}`)
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    const converted = this.convertPlaceholders(sql)
    const res = await this.pool.query(converted, params)
    return res.rows as T[]
  }

  async get<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    const rows = await this.query<T>(sql, params)
    return rows.length > 0 ? rows[0] : null
  }

  async run(sql: string, params: any[] = []): Promise<DbResult> {
    let converted = this.convertPlaceholders(sql)
    // If it's an INSERT and doesn't have RETURNING id, add it for Postgres
    const isInsert = /^\s*INSERT\s+INTO/i.test(converted)
    if (isInsert && !/RETURNING/i.test(converted)) {
      converted += " RETURNING id"
    }
    const res = await this.pool.query(converted, params)
    const lastId = res.rows.length > 0 && res.rows[0].id ? Number(res.rows[0].id) : 0
    return {
      lastInsertRowid: lastId,
      changes: res.rowCount ?? 0,
    }
  }

  async exec(sql: string): Promise<void> {
    await this.pool.query(sql)
  }

  async close(): Promise<void> {
    await this.pool.end()
  }
}

let dbInstance: IDatabase | null = null

export function getDatabase(): IDatabase {
  if (!dbInstance) {
    if (
      config.databaseUrl &&
      (config.databaseUrl.startsWith("postgres://") ||
        config.databaseUrl.startsWith("postgresql://"))
    ) {
      console.log("[Database] Connecting to PostgreSQL...")
      dbInstance = new PostgresDatabase(config.databaseUrl)
    } else {
      const isVercel = Boolean(process.env.VERCEL)
      const dbPath = isVercel
        ? path.resolve("/tmp/quran_association.db")
        : path.resolve(__dirname, "../../data/quran_association.db")
      console.log(`[Database] Using SQLite at: ${dbPath}`)
      dbInstance = new SqliteDatabase(dbPath)
    }
  }
  return dbInstance
}

export const db = {
  query: <T = any>(sql: string, params?: any[]) => getDatabase().query<T>(sql, params),
  get: <T = any>(sql: string, params?: any[]) => getDatabase().get<T>(sql, params),
  run: (sql: string, params?: any[]) => getDatabase().run(sql, params),
  exec: (sql: string) => getDatabase().exec(sql),
  isPostgres: () => getDatabase().isPostgres,
}
