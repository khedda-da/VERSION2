import { createApp } from "../src/app.js"
import { initializeSchema } from "../src/db/schema.js"
import { seedDatabase } from "../src/db/seed.js"
import type { Server } from "node:http"

let server: Server
let baseUrl: string
let centralToken = ""
let branchToken = ""
let sheikhToken = ""

async function request(
  path: string,
  options: {
    method?: string
    token?: string
    body?: any
  } = {},
) {
  const headers: Record<string, string> = {}
  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`
  }
  if (options.body) {
    headers["Content-Type"] = "application/json"
  }

  const res = await fetch(`${baseUrl}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const contentType = res.headers.get("content-type") || ""
  if (contentType.includes("application/json")) {
    const json = await res.json()
    return { status: res.status, data: json, headers: res.headers }
  } else {
    const buffer = Buffer.from(await res.arrayBuffer())
    return { status: res.status, buffer, headers: res.headers }
  }
}

async function runTests() {
  console.log("\n=======================================================")
  console.log("   Running Quranic Association Backend Test Suite      ")
  console.log("=======================================================\n")

  // 1. Setup DB and Server
  await initializeSchema()
  await seedDatabase()

  const app = createApp()
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address() as any
      baseUrl = `http://localhost:${addr.port}`
      resolve()
    })
  })

  let passedCount = 0
  let totalCount = 0

  function assert(condition: boolean, testName: string) {
    totalCount++
    if (condition) {
      console.log(`  ✓ [PASS] ${testName}`)
      passedCount++
    } else {
      console.error(`  ✗ [FAIL] ${testName}`)
      process.exitCode = 1
    }
  }

  try {
    // Test 1: Health check
    console.log("--> Testing Health Check...")
    const healthRes = await request("/health")
    assert(healthRes.status === 200 && healthRes.data.status === "healthy", "Health endpoint responds 200 OK")

    // Test 2: Auth - Login Central Admin
    console.log("\n--> Testing Auth & Personas (CDC Section 2 & F13)...")
    const loginCentral = await request("/api/auth/login", {
      method: "POST",
      body: { username: "n.boualam", password: "password" },
    })
    assert(loginCentral.status === 200 && loginCentral.data.success, "Central Admin login succeeds")
    assert(loginCentral.data.data.user.isCentral === true, "Central Admin has isCentral = true")
    centralToken = loginCentral.data.data.token

    // Test 3: Auth - Login Branch Admin
    const loginBranch = await request("/api/auth/login", {
      method: "POST",
      body: { username: "samira.kadri", password: "password" },
    })
    assert(loginBranch.status === 200 && loginBranch.data.data.user.isBranchAdmin === true, "Branch Admin login succeeds with isBranchAdmin = true")
    branchToken = loginBranch.data.data.token

    // Test 4: Auth - Login Sheikh
    const loginSheikh = await request("/api/auth/login", {
      method: "POST",
      body: { username: "sheikh.ahmed", password: "password" },
    })
    assert(loginSheikh.status === 200 && loginSheikh.data.data.user.isTeacher === true, "Sheikh login succeeds with isTeacher = true")
    sheikhToken = loginSheikh.data.data.token

    // Test 5: GET /api/auth/me
    const meRes = await request("/api/auth/me", { token: centralToken })
    assert(meRes.status === 200 && meRes.data.data.username === "n.boualam", "Auth /me returns current profile")

    // Test 6: F1 - Persons Management
    console.log("\n--> Testing F1: Persons Management...")
    const personsRes = await request("/api/persons", { token: centralToken })
    assert(personsRes.status === 200 && personsRes.data.count > 0, "List persons returns records with count")

    // Verify contact constraint (must have phone or email)
    const invalidPerson = await request("/api/persons", {
      method: "POST",
      token: centralToken,
      body: { full_name: "شخص بدون وسيلة اتصال", person_type: "student" },
    })
    assert(invalidPerson.status === 400, "Reject person creation without phone and email")

    // Test 7: F2 & F8 - Branches and Max 3 Admins Limit
    console.log("\n--> Testing F2 & F8: Branches Management and 3 Admins Limit...")
    const branchesRes = await request("/api/branches")
    assert(branchesRes.status === 200 && branchesRes.data.count >= 4, "List branches returns at least 4 branches")

    // Branch 2 already has 2 admins (سميرة قادري, نبيل بوعلام). Let's add a 3rd admin (أحمد بن يوسف).
    const b2 = branchesRes.data.data.find((b: any) => b.name === "المقر الثاني")
    assert(b2 !== undefined, "Branch 'المقر الثاني' found")

    // Find Ahmed Youssef personId
    const ahmedYoussefPerson = personsRes.data.data.find((p: any) => p.full_name === "أحمد بن يوسف")
    const belkacemPerson = personsRes.data.data.find((p: any) => p.full_name === "بلقاسم منصوري")

    // Ensure Ahmed Youssef is removed from Branch 2 if present from previous runs
    await request(`/api/branches/${b2.id}/admins/${ahmedYoussefPerson.id}`, {
      method: "DELETE",
      token: centralToken,
    })

    // Add 3rd admin to Branch 2 -> should SUCCEED
    const add3rdAdmin = await request(`/api/branches/${b2.id}/admins`, {
      method: "POST",
      token: centralToken,
      body: { person_id: ahmedYoussefPerson.id },
    })
    assert(add3rdAdmin.status === 200, "Successfully add 3rd admin to branch (<= 3 allowed)")

    // Try to add a 4th admin to Branch 2 -> MUST FAIL with 400!
    const add4thAdmin = await request(`/api/branches/${b2.id}/admins`, {
      method: "POST",
      token: centralToken,
      body: { person_id: belkacemPerson.id },
    })
    assert(
      add4thAdmin.status === 400 && add4thAdmin.data.message.includes("الحد الأقصى"),
      "Reject 4th admin exceeding branch limit (max 3 enforced)",
    )

    // Cleanup 3rd admin to leave state clean
    await request(`/api/branches/${b2.id}/admins/${ahmedYoussefPerson.id}`, {
      method: "DELETE",
      token: centralToken,
    })

    // Test 8: F3, F4, F5 - Halaqat Management & Linking
    console.log("\n--> Testing F3, F4, F5: Halaqat Management...")
    const halaqatRes = await request("/api/halaqat")
    assert(halaqatRes.status === 200 && halaqatRes.data.count >= 5, "List halaqat returns seeded halaqat")

    const malikHalaqa = halaqatRes.data.data.find((h: any) => h.name === "حلقة الإمام مالك")
    assert(malikHalaqa.sheikh.includes("الشيخ أحمد"), "F4: Sheikh is linked to Halaqa")

    // Test 9: F9, F10, F11, F12 - Students & Advanced Search
    console.log("\n--> Testing F9, F10, F11, F12: Students, Notifications & Advanced Search...")
    // Add new student (F9) to 'حلقة الإمام مالك' -> triggers notification to Sheikh Ahmed (F12)
    const newStudentRes = await request("/api/students", {
      method: "POST",
      token: centralToken,
      body: {
        name: "طالب تجريبي للاختبار",
        phone: "0559 88 77 66",
        email: "test.student@djam3ya.dz",
        birth_date: "2011-05-10",
        gender: "ذكر",
        school_name: "متوسطة الفلاح",
        academic_level: "متوسط",
        branch_name: "المقر الثاني",
        halaqa_name: "حلقة الإمام مالك",
      },
    })
    assert(newStudentRes.status === 201 && newStudentRes.data.success, "F9: Successfully added new student")

    // Verify Sheikh Ahmed received notification (F12)
    const sheikhNotifs = await request("/api/notifications", { token: sheikhToken })
    const receivedStudentNotif = sheikhNotifs.data.data.some(
      (n: any) => n.title.includes("طالب جديد") && n.description.includes("طالب تجريبي"),
    )
    assert(receivedStudentNotif, "F12: Sheikh received automatic notification for student enrollment")

    // F10: Advanced Search tests
    console.log("\n--> Testing F10: Multi-Criteria Advanced Search...")
    // Search by School
    const schoolSearch = await request("/api/students?school=الفلاح")
    assert(schoolSearch.data.count >= 1, "F10: Filter by school name")

    // Search by Level
    const levelSearch = await request("/api/students?level=ثانوي")
    assert(levelSearch.data.count >= 1 && levelSearch.data.data.every((s: any) => s.level === "ثانوي"), "F10: Filter by academic level")

    // Search by Branch
    const branchSearch = await request("/api/students?branch=المقر الثاني")
    assert(branchSearch.data.count >= 1 && branchSearch.data.data.every((s: any) => s.branch === "المقر الثاني"), "F10: Filter by branch")

    // Search by Sheikh
    const sheikhSearch = await request("/api/students?sheikh=الشيخ أحمد")
    assert(sheikhSearch.data.count >= 1 && sheikhSearch.data.data.some((s: any) => s.sheikh.includes("الشيخ أحمد")), "F10: Filter by sheikh")

    // Search by Name
    const nameSearch = await request("/api/students?name=محمد")
    assert(nameSearch.data.count >= 1, "F10: Filter by partial student name")

    // Combined multi-criteria search
    const combinedSearch = await request("/api/students?branch=المقر الثاني&level=ثانوي")
    assert(
      combinedSearch.data.count >= 1 &&
        combinedSearch.data.data.every((s: any) => s.branch === "المقر الثاني" && s.level === "ثانوي"),
      "F10: Combined multi-criteria search (Branch + Level)",
    )

    // F13: Permission Scoping
    console.log("\n--> Testing F13: Scope Enforcement (Branch Admin Scoping)...")
    // Branch 2 admin searches students
    const branchAdminStudents = await request("/api/students", { token: branchToken })
    assert(
      branchAdminStudents.data.data.every((s: any) => s.branch === "المقر الثاني"),
      "F13: Branch Admin can only see students in their branch ('المقر الثاني')",
    )

    // F11: Export Search Results
    console.log("\n--> Testing F11: Export Search Results...")
    // Export to Excel
    const excelRes = await request("/api/students/export?format=xlsx")
    assert(
      excelRes.status === 200 &&
        excelRes.headers.get("content-type")?.includes("spreadsheetml"),
      "F11: Export students to Excel (.xlsx)",
    )

    // Export to CSV
    const csvRes = await request("/api/students/export?format=csv")
    assert(
      csvRes.status === 200 && csvRes.headers.get("content-type")?.includes("text/csv"),
      "F11: Export students to CSV with UTF-8 BOM",
    )

    // Export to PDF
    const pdfRes = await request("/api/students/export?format=pdf")
    assert(
      pdfRes.status === 200 &&
        pdfRes.buffer.subarray(0, 5).toString() === "%PDF-",
      "F11: Export students to PDF (%PDF- header verified)",
    )

    // Test 10: S1 - Administrative Dashboard
    console.log("\n--> Testing S1: Dashboard Statistics & Metrics...")
    const dashRes = await request("/api/dashboard/stats", { token: centralToken })
    assert(dashRes.status === 200 && dashRes.data.data.metrics.totalStudents > 0, "S1: Dashboard metrics returned")
    assert(dashRes.data.data.studentsByBranch.length >= 4, "S1: Students distribution by branch returned")
    assert(dashRes.data.data.studentsByLevel["ثانوي"] > 0, "S1: Students distribution by level returned")

    // Test 11: S2 - Exportable Reports
    console.log("\n--> Testing S2: Administrative Reports...")
    const reportBranch = await request("/api/reports/students-by-branch")
    assert(reportBranch.status === 200 && reportBranch.data.data.length >= 4, "S2: Report students by branch")

    const reportExportPdf = await request("/api/reports/export?type=branch&format=pdf")
    assert(
      reportExportPdf.status === 200 &&
        reportExportPdf.buffer.subarray(0, 5).toString() === "%PDF-",
      "S2: Export report to PDF",
    )

    // Test 12: N2 - Audit Logs
    console.log("\n--> Testing N2: Audit Logs...")
    const auditRes = await request("/api/audit", { token: centralToken })
    assert(auditRes.status === 200 && auditRes.data.count > 0, "N2: Audit logs recorded actions")

    console.log("\n=======================================================")
    console.log(`   Test Suite Finished: ${passedCount}/${totalCount} tests passed!   `)
    console.log("=======================================================\n")
  } finally {
    server.close()
  }
}

runTests().catch((err) => {
  console.error("Test Suite crashed:", err)
  process.exit(1)
})
