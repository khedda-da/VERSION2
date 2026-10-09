import bcrypt from "bcryptjs"
import { db } from "./database.js"
import { config } from "../config/env.js"
import { initializeSchema } from "./schema.js"

export interface SeedOptions {
  /** Also insert demo branches, halaqat, people and user accounts. */
  demo?: boolean
}

const ROLE_DEFINITIONS = [
  { name: "مسؤول المال", scope: "central" },
  { name: "مسؤول التنظيم", scope: "central" },
  { name: "رئيس الشعبة", scope: "central" },
  { name: "مسؤول الإعلام والاتصال", scope: "central" },
  { name: "مسؤول الشباب", scope: "central" },
  { name: "مسؤول الأحداث الثقافية", scope: "central" },
  { name: "مسؤول الإدارة", scope: "central" },
  { name: "مسؤول مقر", scope: "branch" },
]

/** Roles are required for the app to work, so they are always seeded. */
async function seedRoles(): Promise<void> {
  const existingRoles = await db.query("SELECT COUNT(*) as count FROM roles")
  if (Number((existingRoles[0] as any)?.count ?? 0) > 0) return
  for (const r of ROLE_DEFINITIONS) {
    await db.run("INSERT INTO roles (name, scope, is_active) VALUES (?, ?, 1)", [r.name, r.scope])
  }
}

export async function seedDatabase(options: SeedOptions = {}): Promise<void> {
  const demo = options.demo ?? config.seedDemoData

  console.log("[Seed] Checking existing data...")
  await seedRoles()

  if (!demo) {
    console.log("[Seed] Demo data disabled. The first user is created from the setup page.")
    return
  }

  const existingUsers = await db.query("SELECT COUNT(*) as count FROM users")
  if (Number((existingUsers[0] as any)?.count ?? 0) > 0) {
    console.log("[Seed] Database already contains data. Skipping demo seed.")
    return
  }

  console.log("[Seed] Seeding demo data for Quranic Association...")

  // 2. Branches (4 active branches)
  const branches = [
    { name: "المقر الأول", location: "الجزائر الوسطى", phone: "021 23 45 67" },
    { name: "المقر الثاني", location: "وهران", phone: "041 33 22 11" },
    { name: "المقر الثالث", location: "قسنطينة", phone: "031 99 88 77" },
    { name: "المقر الرابع", location: "سطيف", phone: "036 55 44 33" },
  ]

  const branchIds: Record<string, number> = {}
  for (const b of branches) {
    const res = await db.run(
      "INSERT INTO branches (name, location, phone, is_active) VALUES (?, ?, ?, 1)",
      [b.name, b.location, b.phone],
    )
    branchIds[b.name] = res.lastInsertRowid
  }

  // 3. Halaqat
  const halaqat = [
    { name: "حلقة الإمام مالك", level: "ثانوي", branch: "المقر الثاني" },
    { name: "حلقة البخاري", level: "متوسط", branch: "المقر الأول" },
    { name: "حلقة النووي", level: "ابتدائي", branch: "المقر الثاني" },
    { name: "حلقة ابن الجزري", level: "جامعي", branch: "المقر الثالث" },
    { name: "حلقة القرطبي", level: "متوسط", branch: "المقر الأول" },
  ]

  const halaqaIds: Record<string, number> = {}
  for (const h of halaqat) {
    const res = await db.run(
      "INSERT INTO halaqat (name, level, branch_id, is_active) VALUES (?, ?, ?, 1)",
      [h.name, h.level, branchIds[h.branch]],
    )
    halaqaIds[h.name] = res.lastInsertRowid
  }

  // Common password hash for test accounts: "password123" and "password"
  const passwordHash = await bcrypt.hash("password", 10)

  // 4. Persons & Users
  // Key Personnel:
  // - نبيل بوعلام (Central Admin: مسؤول التنظيم)
  // - سميرة قادري (Branch Admin: مسؤول مقر - المقر الثاني)
  // - أحمد بن يوسف (Branch Admin: مسؤول مقر - المقر الأول)
  // - بلقاسم منصوري (Central: مسؤول المال)
  // - الشيخ أحمد (Sheikh: teaches in multiple halaqat)
  // - الشيخ ياسين (Sheikh: teaches in حلقة البخاري)
  // - الشيخ محمد (Sheikh: teaches in حلقة النووي)

  async function createPersonAndUser(
    fullName: string,
    phone: string,
    email: string,
    birthDate: string,
    gender: "male" | "female",
    personType: "student" | "sheikh" | "both",
    username?: string,
  ): Promise<number> {
    const res = await db.run(
      `INSERT INTO persons (full_name, phone, email, birth_date, gender, person_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [fullName, phone, email, birthDate, gender, personType],
    )
    const personId = res.lastInsertRowid

    if (username) {
      await db.run(
        `INSERT INTO users (person_id, username, password_hash, is_active)
         VALUES (?, ?, ?, 1)`,
        [personId, username, passwordHash],
      )
    }
    return personId
  }

  // Create Admins & Sheikhs
  const pNabil = await createPersonAndUser(
    "نبيل بوعلام",
    "0550 11 22 33",
    "n.boualam@djam3ya.dz",
    "1985-05-12",
    "male",
    "both", // Can be teacher or student as well
    "n.boualam",
  )

  const pSamira = await createPersonAndUser(
    "سميرة قادري",
    "0555 44 33 22",
    "samira@djam3ya.dz",
    "1990-08-20",
    "female",
    "both",
    "samira.kadri",
  )

  const pAhmedYoussef = await createPersonAndUser(
    "أحمد بن يوسف",
    "0552 99 88 77",
    "ahmed.youssef@djam3ya.dz",
    "1988-11-03",
    "male",
    "both",
    "ahmed.youssef",
  )

  const pBelkacem = await createPersonAndUser(
    "بلقاسم منصوري",
    "0554 12 34 56",
    "b.mansouri@djam3ya.dz",
    "1978-02-14",
    "male",
    "both",
    "b.mansouri",
  )

  const pSheikhAhmed = await createPersonAndUser(
    "الشيخ أحمد",
    "0551 12 34 56",
    "sheikh.ahmed@djam3ya.dz",
    "1975-04-10",
    "male",
    "sheikh",
    "sheikh.ahmed",
  )

  const pSheikhYassine = await createPersonAndUser(
    "الشيخ ياسين",
    "0552 23 45 67",
    "sheikh.yassine@djam3ya.dz",
    "1982-09-18",
    "male",
    "sheikh",
    "sheikh.yassine",
  )

  const pSheikhMohamed = await createPersonAndUser(
    "الشيخ محمد",
    "0553 34 56 78",
    "sheikh.mohamed@djam3ya.dz",
    "1980-01-25",
    "male",
    "sheikh",
    "sheikh.mohamed",
  )

  // 5. Assign Roles
  const rolesRows = await db.query("SELECT id, name, scope FROM roles")
  const roleMap: Record<string, number> = {}
  rolesRows.forEach((r: any) => {
    roleMap[r.name] = Number(r.id)
  })

  // نبيل: مسؤول التنظيم (central)
  await db.run(
    "INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, NULL)",
    [pNabil, roleMap["مسؤول التنظيم"]],
  )
  // بلقاسم: مسؤول المال (central)
  await db.run(
    "INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, NULL)",
    [pBelkacem, roleMap["مسؤول المال"]],
  )
  // سميرة: مسؤول مقر (المقر الثاني)
  await db.run(
    "INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, ?)",
    [pSamira, roleMap["مسؤول مقر"], branchIds["المقر الثاني"]],
  )
  // أحمد بن يوسف: مسؤول مقر (المقر الأول)
  await db.run(
    "INSERT INTO person_roles (person_id, role_id, branch_id) VALUES (?, ?, ?)",
    [pAhmedYoussef, roleMap["مسؤول مقر"], branchIds["المقر الأول"]],
  )

  // 6. Branch Admins (max 3 per branch)
  // المقر الأول: أحمد بن يوسف
  await db.run(
    "INSERT INTO branch_admins (branch_id, person_id) VALUES (?, ?)",
    [branchIds["المقر الأول"], pAhmedYoussef],
  )
  // المقر الثاني: سميرة قادري، نبيل بوعلام (2 admins)
  await db.run(
    "INSERT INTO branch_admins (branch_id, person_id) VALUES (?, ?)",
    [branchIds["المقر الثاني"], pSamira],
  )
  await db.run(
    "INSERT INTO branch_admins (branch_id, person_id) VALUES (?, ?)",
    [branchIds["المقر الثاني"], pNabil],
  )

  // 7. Assign Sheikhs to Halaqat (F4: one sheikh -> multiple halaqat across branches)
  // الشيخ أحمد teaches: حلقة الإمام مالك (المقر الثاني), حلقة ابن الجزري (المقر الثالث), حلقة القرطبي (المقر الأول)
  await db.run(
    "INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa) VALUES (?, ?, 'teacher')",
    [halaqaIds["حلقة الإمام مالك"], pSheikhAhmed],
  )
  await db.run(
    "INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa) VALUES (?, ?, 'teacher')",
    [halaqaIds["حلقة ابن الجزري"], pSheikhAhmed],
  )
  await db.run(
    "INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa) VALUES (?, ?, 'teacher')",
    [halaqaIds["حلقة القرطبي"], pSheikhAhmed],
  )

  // الشيخ ياسين teaches: حلقة البخاري (المقر الأول)
  await db.run(
    "INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa) VALUES (?, ?, 'teacher')",
    [halaqaIds["حلقة البخاري"], pSheikhYassine],
  )

  // الشيخ محمد teaches: حلقة النووي (المقر الثاني)
  await db.run(
    "INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa) VALUES (?, ?, 'teacher')",
    [halaqaIds["حلقة النووي"], pSheikhMohamed],
  )

  // 8. Students
  const initialStudents = [
    {
      name: "محمد أمين بن علي",
      phone: "0556 43 28 19",
      email: "mohamed.amine@email.dz",
      birthDate: "2009-03-14",
      gender: "male" as const,
      school: "ثانوية ابن خلدون",
      level: "secondary" as const,
      enrollmentDate: "2025-09-12",
      branch: "المقر الثاني",
      halaqa: "حلقة الإمام مالك",
    },
    {
      name: "ياسين بن صالح",
      phone: "0551 22 33 44",
      email: "yassine@email.dz",
      birthDate: "2012-07-20",
      gender: "male" as const,
      school: "متوسطة الأمير عبد القادر",
      level: "middle" as const,
      enrollmentDate: "2025-09-08",
      branch: "المقر الأول",
      halaqa: "حلقة البخاري",
    },
    {
      name: "أحمد عبد القادر",
      phone: "0553 77 88 99",
      email: "ahmed.kader@email.dz",
      birthDate: "2015-11-05",
      gender: "male" as const,
      school: "ابتدائية النور",
      level: "primary" as const,
      enrollmentDate: "2025-09-02",
      branch: "المقر الثاني",
      halaqa: "حلقة النووي",
    },
    {
      name: "عبد الرحمن قادري",
      phone: "0558 11 44 77",
      email: "abderrahmane@email.dz",
      birthDate: "2006-01-18",
      gender: "male" as const,
      school: "جامعة وهران 1",
      level: "university" as const,
      enrollmentDate: "2025-08-28",
      branch: "المقر الثالث",
      halaqa: "حلقة ابن الجزري",
    },
    {
      name: "أنس بوشارب",
      phone: "0555 99 66 33",
      email: "anes@email.dz",
      birthDate: "2010-09-12",
      gender: "male" as const,
      school: "ثانوية العقيد لطفي",
      level: "secondary" as const,
      enrollmentDate: "2025-08-21",
      branch: "المقر الثاني",
      halaqa: "حلقة الإمام مالك",
    },
    {
      name: "فاطمة الزهراء منصوري",
      phone: "0554 44 55 66",
      email: "fatima@email.dz",
      birthDate: "2011-04-15",
      gender: "female" as const,
      school: "متوسطة الخوارزمي",
      level: "middle" as const,
      enrollmentDate: "2025-09-15",
      branch: "المقر الأول",
      halaqa: "حلقة القرطبي",
    },
    {
      name: "مريم بوعلام",
      phone: "0557 33 22 11",
      email: "maryam@email.dz",
      birthDate: "2016-06-30",
      gender: "female" as const,
      school: "ابتدائية النجاح",
      level: "primary" as const,
      enrollmentDate: "2025-09-18",
      branch: "المقر الثاني",
      halaqa: "حلقة النووي",
    },
  ]

  for (const s of initialStudents) {
    const pId = await createPersonAndUser(
      s.name,
      s.phone,
      s.email,
      s.birthDate,
      s.gender,
      "student",
    )

    await db.run(
      `INSERT INTO students (person_id, school_name, academic_level, enrollment_date, branch_id)
       VALUES (?, ?, ?, ?, ?)`,
      [pId, s.school, s.level, s.enrollmentDate, branchIds[s.branch]],
    )

    if (s.halaqa && halaqaIds[s.halaqa]) {
      await db.run(
        `INSERT INTO halaqat_persons (halaqa_id, person_id, role_in_halaqa)
         VALUES (?, ?, 'student')`,
        [halaqaIds[s.halaqa], pId],
      )
    }
  }

  // 9. Initial Notifications (F12)
  const users = await db.query<{ id: number; username: string }>(
    "SELECT id, username FROM users",
  )
  const userMap: Record<string, number> = {}
  users.forEach((u) => {
    userMap[u.username] = Number(u.id)
  })

  if (userMap["sheikh.ahmed"]) {
    await db.run(
      `INSERT INTO notifications (user_id, title, body, type, is_read, related_entity_type)
       VALUES (?, ?, ?, 'student_added', 0, 'student')`,
      [
        userMap["sheikh.ahmed"],
        "أضيف طالب جديد إلى حلقتك",
        "محمد أمين بن علي انضم إلى حلقة الإمام مالك",
      ],
    )
  }

  if (userMap["n.boualam"]) {
    await db.run(
      `INSERT INTO notifications (user_id, title, body, type, is_read, related_entity_type)
       VALUES (?, ?, ?, 'system', 0, 'branch')`,
      [
        userMap["n.boualam"],
        "تحديث في الهرم الإداري",
        "تم تعيين مسؤولي المقرات بنجاح",
      ],
    )
  }

  // 10. Initial Audit Log (N2)
  const adminUserId = userMap["n.boualam"] || 1
  await db.run(
    `INSERT INTO audit_logs (table_name, record_id, action, changed_by, old_values, new_values)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      "branches",
      branchIds["المقر الأول"],
      "CREATE",
      adminUserId,
      null,
      JSON.stringify({ name: "المقر الأول", location: "الجزائر الوسطى" }),
    ],
  )

  console.log("[Seed] Database seeded successfully!")
}

if (process.argv[1]?.includes("seed.ts")) {
  initializeSchema()
    .then(() => seedDatabase({ demo: true }))
    .then(() => {
      console.log("Seed script completed.")
      process.exit(0)
    })
    .catch((err) => {
      console.error("Seed script failed:", err)
      process.exit(1)
    })
}
