// Run: npm run test:auth   (spawns the real server on a temp, empty SQLite DB)
import { spawn } from "node:child_process"
import os from "node:os"
import path from "node:path"
import fs from "node:fs"

const PORT = 5600 + Math.floor(Math.random() * 300)
const BASE = `http://localhost:${PORT}/api`
const dbFile = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "djam3ya-")), "test.db")
const MAX = 12

const server = spawn("npx", ["tsx", "src/server.ts"], {
  env: { ...process.env, PORT: String(PORT), SQLITE_PATH: dbFile, REGISTER_RATE_LIMIT_MAX: String(MAX), SEED_DEMO_DATA: "false", DATABASE_URL: "" },
  stdio: "ignore",
})

let failed = 0
const check = (name: string, ok: boolean, extra?: unknown) => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : "  -> " + JSON.stringify(extra)}`)
  if (!ok) failed++
}
async function call(method: string, p: string, body?: unknown, token?: string) {
  const res = await fetch(BASE + p, {
    method,
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  return { status: res.status, json: (await res.json().catch(() => null)) as any }
}

async function main() {
  for (let i = 0; i < 60; i++) {
    try { if ((await fetch(`http://localhost:${PORT}/health`)).ok) break } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }

  let r = await call("GET", "/auth/setup-status")
  check("empty DB: needsSetup=true, registrationOpen=false", r.json?.data?.needsSetup === true && r.json?.data?.registrationOpen === false, r.json)

  const reg = { fullName: "Sara Ali", username: "sara.ali", password: "secret123", email: "sara@example.com" }
  r = await call("POST", "/auth/register", reg)
  check("register before setup is refused (403)", r.status === 403, r)

  r = await call("POST", "/auth/setup", { fullName: "Admin One", username: "admin", password: "adminpass1", email: "admin@example.com" })
  check("setup creates first admin + token", r.status === 201 && !!r.json?.data?.token && r.json.data.user.isCentral === true, r)
  const adminToken = r.json?.data?.token

  r = await call("POST", "/auth/setup", { fullName: "X", username: "x.user", password: "password1", email: "x@x.co" })
  check("second setup is refused (403)", r.status === 403, r)

  r = await call("GET", "/auth/setup-status")
  check("after setup: needsSetup=false, registrationOpen=true", r.json?.data?.needsSetup === false && r.json?.data?.registrationOpen === true, r.json)

  r = await call("POST", "/auth/register", reg)
  check("register -> 201 pending, NO token", r.status === 201 && r.json?.data?.pending === true && !r.json?.data?.token, r)

  r = await call("POST", "/auth/register", { ...reg, username: "SARA.ALI", email: "other@example.com" })
  check("duplicate username (case-insensitive) -> 409", r.status === 409, r)
  r = await call("POST", "/auth/register", { ...reg, username: "sara2", email: "SARA@example.com" })
  check("duplicate email -> 409", r.status === 409, r)
  r = await call("POST", "/auth/register", { ...reg, username: "b", email: "b@b.co" })
  check("bad username -> 400", r.status === 400, r)
  r = await call("POST", "/auth/register", { ...reg, username: "okname", email: "n@n.co", password: "short" })
  check("short password -> 400", r.status === 400, r)
  r = await call("POST", "/auth/register", { fullName: "No Contact", username: "nocontact", password: "password1" })
  check("no email/phone -> 400", r.status === 400, r)
  r = await call("POST", "/auth/register", { ...reg, username: "okname2", email: "not-an-email" })
  check("invalid email -> 400", r.status === 400, r)

  r = await call("POST", "/auth/login", { username: "sara.ali", password: "secret123" })
  check("pending user + right password -> 403 (not active)", r.status === 403 && !r.json?.data?.token, r)
  r = await call("POST", "/auth/login", { username: "sara.ali", password: "wrong-password" })
  check("pending user + wrong password -> 401 (no account probing)", r.status === 401, r)
  r = await call("POST", "/auth/login", { username: "admin", password: "adminpass1" })
  check("admin can still log in", r.status === 200 && !!r.json?.data?.token, r)

  r = await call("GET", "/notifications", undefined, adminToken)
  const note = (r.json?.data ?? []).find((n: any) => n.title === "طلب تسجيل جديد")
  check("admin got a 'new registration' notification -> users screen", !!note && note.targetScreen === "users", r.json)

  r = await call("GET", "/users", undefined, adminToken)
  const pending = (r.json?.data ?? []).find((u: any) => u.username === "sara.ali")
  check("registrant listed as inactive in Users page", !!pending && pending.isActive === false, r.json)

  r = await call("GET", "/sheikhs", undefined, adminToken)
  check("registrant NOT listed as a sheikh", !(r.json?.data ?? []).some((s: any) => s.name === "Sara Ali" || s.full_name === "Sara Ali"), r.json)

  r = await call("GET", "/roles", undefined, adminToken)
  const roleId = (r.json?.data ?? []).find((x: any) => x.name === "مسؤول المال")?.roleId
  r = await call("PUT", `/users/${pending.userId}`, { is_active: true, role_id: roleId }, adminToken)
  check("admin approves + assigns role", r.status === 200 && r.json?.data?.isActive === true, r)

  r = await call("POST", "/auth/login", { username: "sara.ali", password: "secret123" })
  check("approved user can log in", r.status === 200 && !!r.json?.data?.token, r)

  let limited = false
  for (let i = 0; i < MAX + 2; i++) {
    const x = await call("POST", "/auth/register", { ...reg, username: `spam${i}`, email: `spam${i}@x.co` })
    if (x.status === 429) { limited = true; break }
  }
  check("registration rate limit kicks in (429)", limited)
}

main()
  .catch((e) => { console.error(e); failed++ })
  .finally(() => {
    server.kill()
    console.log(failed ? `\n${failed} check(s) FAILED` : "\nAll checks passed")
    process.exit(failed ? 1 : 0)
  })
