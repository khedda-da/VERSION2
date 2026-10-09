import { db } from "./database.js"

export async function initializeSchema(): Promise<void> {
  const isPg = db.isPostgres()

  if (isPg) {
    // PostgreSQL schema execution
    await db.exec(`
      DO $$ BEGIN
        CREATE TYPE person_type AS ENUM ('student', 'sheikh', 'both');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE gender_enum AS ENUM ('male', 'female');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE academic_level_enum AS ENUM ('primary', 'middle', 'secondary', 'university');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE role_scope_enum AS ENUM ('central', 'branch');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      DO $$ BEGIN
        CREATE TYPE halaqa_role_enum AS ENUM ('teacher', 'student', 'supervisor');
      EXCEPTION WHEN duplicate_object THEN null; END $$;

      CREATE TABLE IF NOT EXISTS branches (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL UNIQUE,
        location VARCHAR(255),
        phone VARCHAR(20),
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS persons (
        id BIGSERIAL PRIMARY KEY,
        full_name VARCHAR(200) NOT NULL,
        phone VARCHAR(20),
        email VARCHAR(255),
        birth_date DATE,
        gender gender_enum,
        person_type person_type NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        CONSTRAINT chk_person_contact CHECK (phone IS NOT NULL OR email IS NOT NULL)
      );

      CREATE TABLE IF NOT EXISTS students (
        id BIGSERIAL PRIMARY KEY,
        person_id BIGINT NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
        school_name VARCHAR(200),
        academic_level academic_level_enum,
        enrollment_date DATE NOT NULL,
        branch_id BIGINT NOT NULL REFERENCES branches(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS halaqat (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        level VARCHAR(80),
        branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(name, branch_id)
      );

      CREATE TABLE IF NOT EXISTS roles (
        id BIGSERIAL PRIMARY KEY,
        name VARCHAR(120) NOT NULL UNIQUE,
        scope role_scope_enum NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE
      );

      CREATE TABLE IF NOT EXISTS person_roles (
        id BIGSERIAL PRIMARY KEY,
        person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        branch_id BIGINT REFERENCES branches(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(person_id, role_id, branch_id)
      );

      CREATE TABLE IF NOT EXISTS branch_admins (
        id BIGSERIAL PRIMARY KEY,
        branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(branch_id, person_id)
      );

      CREATE TABLE IF NOT EXISTS halaqat_persons (
        id BIGSERIAL PRIMARY KEY,
        halaqa_id BIGINT NOT NULL REFERENCES halaqat(id) ON DELETE CASCADE,
        person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        role_in_halaqa halaqa_role_enum NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(halaqa_id, person_id, role_in_halaqa)
      );

      CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        person_id BIGINT NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
        username VARCHAR(100) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        last_login TIMESTAMPTZ,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(200) NOT NULL,
        body TEXT NOT NULL,
        type VARCHAR(50) NOT NULL DEFAULT 'info',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        related_entity_type VARCHAR(50),
        related_entity_id BIGINT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id BIGSERIAL PRIMARY KEY,
        table_name VARCHAR(100) NOT NULL,
        record_id BIGINT,
        action VARCHAR(20) NOT NULL,
        changed_by BIGINT REFERENCES users(id),
        old_values JSONB,
        new_values JSONB,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Branch admin limit trigger
      CREATE OR REPLACE FUNCTION enforce_branch_admin_limit()
      RETURNS TRIGGER AS $$
      BEGIN
        IF (TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND OLD.branch_id <> NEW.branch_id)) THEN
          IF (SELECT COUNT(*) FROM branch_admins WHERE branch_id = NEW.branch_id) >= 3 THEN
            RAISE EXCEPTION 'Maximum number of admins per branch is 3';
          END IF;
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_branch_admin_limit ON branch_admins;
      CREATE TRIGGER trg_branch_admin_limit
      BEFORE INSERT OR UPDATE ON branch_admins
      FOR EACH ROW EXECUTE FUNCTION enforce_branch_admin_limit();
    `)
  } else {
    // SQLite schema execution
    await db.exec(`
      CREATE TABLE IF NOT EXISTS branches (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        location TEXT,
        phone TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        full_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        birth_date TEXT,
        gender TEXT CHECK(gender IN ('male', 'female', NULL)),
        person_type TEXT NOT NULL CHECK(person_type IN ('student', 'sheikh', 'both')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now')),
        CHECK (phone IS NOT NULL OR email IS NOT NULL)
      );

      CREATE TABLE IF NOT EXISTS students (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
        school_name TEXT,
        academic_level TEXT CHECK(academic_level IN ('primary', 'middle', 'secondary', 'university', NULL)),
        enrollment_date TEXT NOT NULL,
        branch_id INTEGER NOT NULL REFERENCES branches(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS halaqat (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        level TEXT,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(name, branch_id)
      );

      CREATE TABLE IF NOT EXISTS roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        scope TEXT NOT NULL CHECK(scope IN ('central', 'branch')),
        is_active INTEGER NOT NULL DEFAULT 1
      );

      CREATE TABLE IF NOT EXISTS person_roles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        role_id INTEGER NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
        branch_id INTEGER REFERENCES branches(id),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(person_id, role_id, branch_id)
      );

      CREATE TABLE IF NOT EXISTS branch_admins (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        branch_id INTEGER NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
        person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(branch_id, person_id)
      );

      CREATE TABLE IF NOT EXISTS halaqat_persons (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        halaqa_id INTEGER NOT NULL REFERENCES halaqat(id) ON DELETE CASCADE,
        person_id INTEGER NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
        role_in_halaqa TEXT NOT NULL CHECK(role_in_halaqa IN ('teacher', 'student', 'supervisor')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(halaqa_id, person_id, role_in_halaqa)
      );

      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        person_id INTEGER NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
        username TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        last_login TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT NOT NULL,
        body TEXT NOT NULL,
        type TEXT NOT NULL DEFAULT 'info',
        is_read INTEGER NOT NULL DEFAULT 0,
        related_entity_type TEXT,
        related_entity_id INTEGER,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        table_name TEXT NOT NULL,
        record_id INTEGER,
        action TEXT NOT NULL,
        changed_by INTEGER REFERENCES users(id),
        old_values TEXT,
        new_values TEXT,
        changed_at TEXT NOT NULL DEFAULT (datetime('now'))
      );

      -- Trigger to enforce maximum 3 admins per branch
      CREATE TRIGGER IF NOT EXISTS trg_branch_admin_limit_insert
      BEFORE INSERT ON branch_admins
      BEGIN
        SELECT
          CASE
            WHEN (SELECT COUNT(*) FROM branch_admins WHERE branch_id = NEW.branch_id) >= 3
            THEN RAISE(ABORT, 'Maximum number of admins per branch is 3')
          END;
      END;

      CREATE TRIGGER IF NOT EXISTS trg_branch_admin_limit_update
      BEFORE UPDATE OF branch_id ON branch_admins
      BEGIN
        SELECT
          CASE
            WHEN (SELECT COUNT(*) FROM branch_admins WHERE branch_id = NEW.branch_id) >= 3
            THEN RAISE(ABORT, 'Maximum number of admins per branch is 3')
          END;
      END;

      -- Indices for query performance
      CREATE INDEX IF NOT EXISTS idx_persons_full_name ON persons(full_name);
      CREATE INDEX IF NOT EXISTS idx_persons_phone ON persons(phone);
      CREATE INDEX IF NOT EXISTS idx_persons_email ON persons(email);
      CREATE INDEX IF NOT EXISTS idx_students_branch_id ON students(branch_id);
      CREATE INDEX IF NOT EXISTS idx_students_enrollment_date ON students(enrollment_date);
      CREATE INDEX IF NOT EXISTS idx_students_school_name ON students(school_name);
      CREATE INDEX IF NOT EXISTS idx_halaqat_branch_id ON halaqat(branch_id);
      CREATE INDEX IF NOT EXISTS idx_halaqat_persons_person_id ON halaqat_persons(person_id);
      CREATE INDEX IF NOT EXISTS idx_halaqat_persons_halaqa_id ON halaqat_persons(halaqa_id);
      CREATE INDEX IF NOT EXISTS idx_person_roles_person_id ON person_roles(person_id);
      CREATE INDEX IF NOT EXISTS idx_person_roles_role_id ON person_roles(role_id);
      CREATE INDEX IF NOT EXISTS idx_person_roles_branch_id ON person_roles(branch_id);
      CREATE INDEX IF NOT EXISTS idx_branch_admins_branch_id ON branch_admins(branch_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
    `)
  }

  console.log("[Database] Schema initialized successfully.")
}
