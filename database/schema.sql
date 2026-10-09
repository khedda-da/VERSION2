-- =========================================================
-- قاعدة بيانات جمعية تحفيظ القرآن الكريم
-- نوع قاعدة البيانات: PostgreSQL 14+
-- النسخة: 1.2
-- التاريخ: 2026-10-06
-- =========================================================

BEGIN;

CREATE TYPE person_type AS ENUM ('student', 'sheikh', 'both');
CREATE TYPE gender_enum AS ENUM ('male', 'female');
CREATE TYPE academic_level_enum AS ENUM ('primary', 'middle', 'secondary', 'university');
CREATE TYPE role_scope_enum AS ENUM ('central', 'branch');
CREATE TYPE halaqa_role_enum AS ENUM ('teacher', 'student', 'supervisor');

-- 1) المقرات
CREATE TABLE branches (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    location VARCHAR(255),
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2) الأشخاص (جدول موحد)
CREATE TABLE persons (
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

-- 3) الطلاب
CREATE TABLE students (
    id BIGSERIAL PRIMARY KEY,
    person_id BIGINT NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
    school_name VARCHAR(200),
    academic_level academic_level_enum,
    enrollment_date DATE NOT NULL,
    branch_id BIGINT NOT NULL REFERENCES branches(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4) الحلقات
CREATE TABLE halaqat (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    level VARCHAR(80),
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(name, branch_id)
);

-- 5) الأدوار الإدارية
CREATE TABLE roles (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(120) NOT NULL UNIQUE,
    scope role_scope_enum NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- 6) ربط الشخص بالدور (متعدد الأدوار)
CREATE TABLE person_roles (
    id BIGSERIAL PRIMARY KEY,
    person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role_id BIGINT NOT NULL REFERENCES roles(id) ON DELETE RESTRICT,
    branch_id BIGINT REFERENCES branches(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(person_id, role_id, branch_id)
);

-- 7) مسؤولو المقرات
CREATE TABLE branch_admins (
    id BIGSERIAL PRIMARY KEY,
    branch_id BIGINT NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
    person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(branch_id, person_id)
);

-- 8) ربط الشخص بالحلقات (الشيخ/الطالب/المشرف)
CREATE TABLE halaqat_persons (
    id BIGSERIAL PRIMARY KEY,
    halaqa_id BIGINT NOT NULL REFERENCES halaqat(id) ON DELETE CASCADE,
    person_id BIGINT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
    role_in_halaqa halaqa_role_enum NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(halaqa_id, person_id, role_in_halaqa)
);

-- 9) حسابات المستخدمين
CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    person_id BIGINT NOT NULL UNIQUE REFERENCES persons(id) ON DELETE CASCADE,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    last_login TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10) الإشعارات
CREATE TABLE notifications (
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

-- 11) سجل النشاطات (Nice-to-Have)
CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT,
    action VARCHAR(20) NOT NULL,
    changed_by BIGINT REFERENCES users(id),
    old_values JSONB,
    new_values JSONB,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =========================================================
-- الدوال المحفوظة (Triggers)
-- =========================================================

-- تحديث updated_at تلقائياً
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_persons_updated_at
BEFORE UPDATE ON persons
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_students_updated_at
BEFORE UPDATE ON students
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

-- الحد الأقصى للمسؤولين في المقر = 3
CREATE OR REPLACE FUNCTION enforce_branch_admin_limit()
RETURNS TRIGGER AS $$
BEGIN
    IF (
        TG_OP = 'INSERT'
        OR (TG_OP = 'UPDATE' AND OLD.branch_id <> NEW.branch_id)
    ) THEN
        IF (
            SELECT COUNT(*)
            FROM branch_admins
            WHERE branch_id = NEW.branch_id
        ) >= 3 THEN
            RAISE EXCEPTION 'Maximum number of admins per branch is 3';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_branch_admin_limit
BEFORE INSERT OR UPDATE ON branch_admins
FOR EACH ROW
EXECUTE FUNCTION enforce_branch_admin_limit();

-- =========================================================
-- الفهارس المؤشر على الاستعلامات الشائعة
-- =========================================================

CREATE INDEX idx_persons_full_name ON persons(full_name);
CREATE INDEX idx_persons_phone ON persons(phone);
CREATE INDEX idx_persons_email ON persons(email);
CREATE INDEX idx_students_branch_id ON students(branch_id);
CREATE INDEX idx_students_enrollment_date ON students(enrollment_date);
CREATE INDEX idx_students_school_name ON students(school_name);
CREATE INDEX idx_halaqat_branch_id ON halaqat(branch_id);
CREATE INDEX idx_halaqat_persons_person_id ON halaqat_persons(person_id);
CREATE INDEX idx_halaqat_persons_halaqa_id ON halaqat_persons(halaqa_id);
CREATE INDEX idx_person_roles_person_id ON person_roles(person_id);
CREATE INDEX idx_person_roles_role_id ON person_roles(role_id);
CREATE INDEX idx_person_roles_branch_id ON person_roles(branch_id);
CREATE INDEX idx_branch_admins_branch_id ON branch_admins(branch_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_audit_logs_changed_at ON audit_logs(changed_at DESC);

-- =========================================================
-- بيانات تأسيسية (Roles)
-- =========================================================

INSERT INTO roles (name, scope) VALUES
    ('مسؤول المال', 'central'),
    ('مسؤول التنظيم', 'central'),
    ('رئيس الشعبة', 'central'),
    ('مسؤول الإعلام والاتصال', 'central'),
    ('مسؤول الشباب', 'central'),
    ('مسؤول الأحداث الثقافية', 'central'),
    ('مسؤول الإدارة', 'central'),
    ('مسؤول مقر', 'branch');

-- =========================================================
-- عرض مساعد للبحث المتقدم عن الطلاب
-- =========================================================
CREATE VIEW vw_student_search AS
SELECT
    s.id AS student_id,
    p.id AS person_id,
    p.full_name,
    p.phone,
    p.email,
    p.birth_date,
    p.gender,
    s.school_name,
    s.academic_level,
    s.enrollment_date,
    b.id AS branch_id,
    b.name AS branch_name,
    h.id AS halaqa_id,
    h.name AS halaqa_name,
    h.level AS halaqa_level,
    (SELECT string_agg(tp.full_name, ', ' ORDER BY tp.full_name)
     FROM halaqat_persons hp_t
     JOIN persons tp ON tp.id = hp_t.person_id
     WHERE hp_t.halaqa_id = h.id AND hp_t.role_in_halaqa = 'teacher') AS teachers_names
FROM students s
JOIN persons p ON p.id = s.person_id
JOIN branches b ON b.id = s.branch_id
LEFT JOIN halaqat_persons hp_student ON hp_student.person_id = p.id AND hp_student.role_in_halaqa = 'student'
LEFT JOIN halaqat h ON h.id = hp_student.halaqa_id;

COMMIT;
