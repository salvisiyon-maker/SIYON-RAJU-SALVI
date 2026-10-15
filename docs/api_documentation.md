# VitalLink Healthcare REST API Documentation

Base URL: `/api`

Authentication: Bearer JWT in `Authorization` header (`Bearer <accessToken>`).
Data Protection: India DPDP Act / HIPAA Compliance. All data mutations and patient views are recorded in `audit_logs`.

---

## 1. Authentication (`/api/auth`)

### `POST /api/auth/login`
Authenticates a user by role, identifier, and password.
- **Request Body**:
  ```json
  {
    "identifier": "VL-2026-004812", // Patient ID (VL-2026-XXXXXX) or Email address
    "password": "Patient@123",
    "role": "patient", // "admin" | "doctor" | "nurse" | "patient"
    "rememberMe": true
  }
  ```
- **Responses**:
  - `200 OK`: Returns user profile, role IDs, `accessToken` (2h), and `refreshToken` (7d).
  - `401 Unauthorized`: Invalid credentials. Decrements attempts; locks account after 5 failed attempts for 15 minutes.
  - `403 Forbidden`: Account temporarily locked.

### `POST /api/auth/refresh`
Refreshes expired access tokens.
- **Request Body**: `{ "refreshToken": "..." }`
- **Response**: `{ "accessToken": "..." }`

### `POST /api/auth/change-password`
Updates user password (clears `must_change_password` flag).
- **Headers**: `Authorization: Bearer <token>`
- **Request Body**:
  ```json
  {
    "currentPassword": "Temp@123",
    "newPassword": "SecurePassword@2026"
  }
  ```

### `GET /api/auth/me`
Fetches current authenticated profile, role metadata, and unread notification counts.

---

## 2. Patients (`/api/patients`)

### `POST /api/patients`
Registers a new patient (Authorized roles: `admin`, `nurse`).
- **Auto-generates**:
  - Unique non-guessable Patient ID in format: `VL-2026-XXXXXX`
  - Temporary password (e.g. `VL@8241!`)
  - Marks `must_change_password: true`
- **Request Body**:
  ```json
  {
    "fullName": "Ananya Gupta",
    "email": "ananya.gupta@example.com",
    "phone": "+91 98111 22334",
    "dob": "1992-06-18",
    "address": "B-14 Silver Arch, Bandra West, Mumbai",
    "bloodGroup": "B+",
    "allergies": "Penicillin, Peanuts",
    "emergencyContact": "Suresh Gupta",
    "emergencyPhone": "+91 98111 99990"
  }
  ```

### `GET /api/patients`
Search and list patients (Authorized roles: `admin`, `doctor`, `nurse`). Supports `?q=`, `?page=`, `?limit=`.

### `GET /api/patients/:id`
Fetch single patient clinical profile. Patients are strictly isolated to viewing only their own record.

---

## 3. Appointments (`/api/appointments`)

### `GET /api/appointments`
Returns appointment list with doctor, patient, department, and status details. Filter by `?date=`, `?doctorId=`, `?status=`.

### `POST /api/appointments`
Books a new appointment.
- **Double-Booking Prevention**: Automatically validates doctor slot availability and prevents overlapping reservations.
- **Request Body**:
  ```json
  {
    "departmentId": "dept-cardio",
    "doctorId": "doc-priya",
    "date": "2026-10-25",
    "startTime": "10:00",
    "endTime": "10:30",
    "reason": "Follow-up for elevated blood pressure"
  }
  ```

### `PATCH /api/appointments/:id/status`
Transitions appointment status:
`scheduled` → `checked_in` → `in_consultation` → `completed` / `cancelled` / `no_show`.

---

## 4. Clinical Visits (`/api/visits`)

### `GET /api/visits`
Chronological timeline of hospital visits (newest first). Filter by `?startDate=`, `?endDate=`, `?patientId=`.

### `POST /api/visits`
Doctor conducts consultation and issues visit notes and prescriptions.
- Includes **Live Allergy Check** against patient's known allergies.
- Records: symptoms, diagnosis, vitals (BP, pulse, temp, weight, SpO2), internal notes, follow-up date, and multi-drug prescriptions.

### `PATCH /api/visits/:id/vitals`
Nurse triage station records or updates physical vitals.

---

## 5. Prescriptions (`/api/prescriptions`)

### `GET /api/prescriptions`
Returns prescribed medications.

### `GET /api/prescriptions/:id`
Returns full official prescription slip with hospital letterhead, doctor registration number, diagnosis, vitals, medicine table, and signature block for PDF printing.

### `POST /api/prescriptions/check-allergy`
Real-time allergy checker evaluating proposed drug name against patient's known allergies and antibiotic classes (e.g. Penicillin, Sulfa, NSAIDs).

---

## 6. Staff Coordination (`/api/shifts` & `/api/tasks`)

### `GET /api/shifts` & `POST /api/shifts`
Staff roster scheduling for doctors and nurses.

### `GET /api/tasks` & `POST /api/tasks`
Clinical task delegation from doctors to nurses with priority (`urgent`, `high`, `medium`, `low`) and due times.

### `PATCH /api/tasks/:id/status`
Nurses update task status (`pending` → `in_progress` → `completed`).

---

## 7. Reports & Audit (`/api/reports` & `/api/audit-logs`)

### `GET /api/reports/analytics`
Admin metrics: total patients, appointments by department, patients per day 7-day trend, doctor workload distribution.

### `GET /api/reports/export-csv?type=patients|appointments|visits`
Exports downloadable CSV reports.

### `GET /api/audit-logs`
Full audit history recording user ID, action, entity, timestamp, and IP address.
