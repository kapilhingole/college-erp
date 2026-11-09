# Apex Institute College ERP System

An interconnected, data-integrity-first Enterprise Resource Planning (ERP) platform designed for universities and collegiate institutions.

---

## 🏛️ System Architecture & Technology Stack

- **Architecture**: Modular Monolith with ACID-compliant relational transactions
- **Backend**: Node.js & Express with TypeScript
- **Database & ORM**: Relational Database with **Prisma ORM** (Configured with SQLite for instant, zero-dependency local execution & automated testing; drop-in production ready for PostgreSQL with migrations)
- **Security & RBAC**: JWT (JSON Web Tokens) with bcrypt password hashing, HTTP Security Headers via Helmet, strict CORS policy, API Rate Limiting (`express-rate-limit`), input validation via Zod schemas, and parameterized queries via Prisma
- **Frontend**: React 18, Vite, Tailwind CSS, Lucide Icons, React Router
- **Reporting & Analytics**: Automated Excel (`.xlsx`) and PDF generation (`pdfkit`)
- **Automated Testing**: 21 unit & integration tests across 5 core calculation suites (`vitest`)

---

## 🔑 User Personas & Default Seed Credentials

All demo accounts come pre-configured in `backend/prisma/seed.ts`:

| Persona | Role | Email | Password | Features / Focus |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | `SUPER_ADMIN` | `superadmin@college.edu` | `SuperAdmin@123` | Full system governance, all modules, backups, audit trails |
| **Academic Admin**| `ADMIN` | `admin@college.edu` | `Admin@123` | Admissions, fee structures, exam cycles, library, timetable |
| **Faculty (HOD)** | `FACULTY` | `turing@college.edu` | `Faculty@123` | Schedule, bulk attendance, syllabus, marks entry, workload |
| **Faculty (Prof)**| `FACULTY` | `hopper@college.edu` | `Faculty@123` | Teaching schedule, attendance recording, syllabus |
| **Regular Student**| `STUDENT` | `john.doe@student.college.edu` | `Student@123` | 90% attendance, partial fee paid, borrowed books |
| **Defaulter Student**| `STUDENT` | `jane.smith@student.college.edu`| `Student@123` | **60% attendance (&lt;75% Alert Trigger)** & overdue fee dues |

---

## 📦 The 12 Enterprise Modules

1. **Student Management**: Admissions, roll number generation, semester promotion, batch/section allocation, profiles.
2. **Faculty Management**: Onboarding, employee IDs, departmental mapping, weekly teaching load tracking (max vs actual).
3. **Admin Management**: Role-based access control, security rate limiting, credential management, immutable audit logs.
4. **Attendance Management**: Lecture session creation, single-click bulk attendance marking, cumulative percentage calculation, and **mandatory &lt;75% statutory low attendance alerts**.
5. **Academics & Examination**: Syllabus cataloging, credit hours, exam cycles, marks entry, and **automated letter grades (O, A+, A, B+, B, C, F) & 10-point GPA/SGPA/CGPA grading calculation**.
6. **Timetable Management**: Weekly scheduling grid with **ACID collision prevention engine** detecting faculty double-booking, room overlap, and section conflicts.
7. **Fees Management**: Component structures (tuition, lab, library, exam), invoice generation, **live dues tracking with late fee penalties**, and payment logging with digital receipts.
8. **Department Management**: Organizational tree: College $\rightarrow$ Departments $\rightarrow$ Programs $\rightarrow$ Batches $\rightarrow$ Sections.
9. **Library Management**: Book inventory catalog, lending circulation, 4-book limit, and **daily overdue fine calculations**.
10. **Notices & Announcements**: Notice board with audience filtering (`ALL`, `STUDENT`, `FACULTY`, `ADMIN`) and department scoping.
11. **Dashboards**: Personalized portals tailored for each persona:
    - *Student Portal*: Attendance gauge with &lt;75% warning alert, fee dues, today's schedule, library borrowings.
    - *Faculty Portal*: Today's teaching schedule, weekly workload meter, assigned subjects, quick attendance action.
    - *Admin Executive Portal*: Overall metrics, collection rate %, defaulter counts, library circulation, audit trail stream.
12. **Reports & Analytics**: Standardized Excel (`.xlsx`) export for Attendance & Fee defaulters, and certified PDF Report Card / Transcript and Payment Receipt generation.

---

## 🚀 Running the System

### 1. Install & Setup
```bash
# Backend Setup
cd backend
npm install
npx prisma generate
npx prisma db push
npm run prisma:seed

# Frontend Setup
cd ../frontend
npm install
```

### 2. Run Automated Test Suite
```bash
cd backend
npm test
```
*Runs all 21 automated tests covering grading formulas, fee balance & penalty calculations, timetable conflict detection, attendance threshold alerts, and library overdue calculations.*

### 3. Start Backend & Frontend Dev Servers
```bash
# Terminal 1: Backend API (port 5000)
cd backend
npm run dev

# Terminal 2: Frontend App (port 5173)
cd frontend
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

## 🛡️ Database Backup Routine
To perform an automated timestamped backup:
```bash
node scripts/backup.js
```
Backups are archived in the `backups/` directory with file verification.

