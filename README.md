# VitalLink: End-to-End Healthcare Appointment & Staff Coordination

VitalLink is a production-grade, full-stack hospital management web application designed to streamline healthcare appointments, staff coordination, visit records, vitals triage, and multi-drug prescriptions.

---

## 🚀 Key Features

1. **Open Website & Public Account Registration**:
   - Anyone can register a personal account directly from the **"Create New Account (Open)"** tab.
   - Self-service registration is available for **Patients**, **Doctors**, **Nurses**, and **Administrators**.
   - Upon patient registration, the system auto-generates a unique non-guessable Patient ID in `VL-2026-XXXXXX` format and logs them in immediately.
   - **Instant 1-Click Guest Exploration**: Browse any portal with one click without typing credentials via the "Just Browsing?" exploration bar.

2. **Role-Based Access Control (RBAC)**:
   - **Administrator**: Staff management (doctors, nurses), department coordination, shift scheduling, patient registration, analytics, audit log inspection, and CSV report export.
   - **Doctor**: Appointment queue, patient medical history, clinical consultation notes, vitals review, follow-up scheduling, task delegation to nurses, and **real-time medicine allergy warnings**.
   - **Nurse**: Patient check-in station, physical vitals recording (BP, Pulse, Temp, Weight, SpO2), quick patient registration with printable ID card slips, and clinical task tracker.
   - **Patient**: Login with unique Patient ID (`VL-2026-XXXXXX`) or email, chronological visit timeline, expandable medicine plans, appointment booking and cancellation, **"Download Prescription as PDF"**, and digital health ID card.

2. **Patient Registration & Unique ID**:
   - Auto-generates unique, non-guessable Patient IDs in the standard format: `VL-2026-XXXXXX`.
   - Generates a temporary password with mandatory first-login password update.
   - Printable patient slip with barcode mockup and emergency contact details.

3. **Clinical Prescriptions & Allergy Detection**:
   - Stores medicine name, dosage, frequency, duration, instructions ("After food", "Before sleep"), and doctor's advice.
   - **Intelligent Allergy Warning Engine**: Cross-references prescribed drug names and antibiotic classes (e.g. Penicillin, Sulfa, NSAIDs) against documented patient allergies.
   - Official prescription slip printable with hospital letterhead, doctor registration number, vitals, diagnosis, and signature block.

4. **Staff Coordination & Audit Logs**:
   - Doctor-to-nurse clinical task assignment with priority levels (`urgent`, `high`, `medium`, `low`) and due times.
   - Shift scheduling and staff roster management.
   - Immutable audit logs tracking who viewed or edited patient medical records (India DPDP Act & HIPAA compliance).
   - Multi-language support (English, हिन्दी Hindi, मराठी Marathi) and Dark/Light mode.

---

## 🔑 Demo Accounts

Quick 1-click login buttons are available directly on the login screen for testing:

| Role | Name / Title | Identifier (Email or Patient ID) | Password |
|---|---|---|---|
| **Admin** | Dr. Vikramaditya Rathore | `admin@vitallink.com` | `Admin@123` |
| **Doctor** | Dr. Priya Sharma (Cardiology) | `dr.priya@vitallink.com` | `Doctor@123` |
| **Doctor** | Dr. Rajesh Kulkarni (Gen. Med) | `dr.rajesh@vitallink.com` | `Doctor@123` |
| **Nurse** | Nurse Sunita Patil (ICU) | `nurse.sunita@vitallink.com` | `Nurse@123` |
| **Nurse** | Nurse Rahul Deshmukh (OPD) | `nurse.rahul@vitallink.com` | `Nurse@123` |
| **Patient** | Ananya Gupta (Allergic: Penicillin) | `VL-2026-004812` (or `ananya.gupta@example.com`) | `Patient@123` |
| **Patient** | Rohan Mehta (Allergic: Sulfa) | `VL-2026-009134` (or `rohan.mehta@example.com`) | `Patient@123` |
| **Patient (New)** | Sneha Joshi (First-time login) | `VL-2026-007255` (or `sneha.joshi@example.com`) | `Temp@123` |

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, React Router DOM, Axios, Lucide Icons
- **Backend**: Node.js 22, Express REST API, tsx
- **Database**: PostgreSQL DDL (`src/server/db/schema.sql`) with zero-config relational file persistence (`data/vitallink_db.json`)
- **Authentication**: JWT access tokens (2h) + refresh tokens (7d), bcrypt password hashing, account lockout protection (5 failed attempts = 15m lock)
- **Validation**: Zod schema validation on every API endpoint

---

## 📦 Installation & Setup

1. **Clone & Install Dependencies**:
   ```bash
   npm install
   ```

2. **Environment Variables**:
   ```bash
   cp .env.example .env
   ```

3. **Seed Database with Demo Records**:
   ```bash
   npm run seed
   ```

4. **Run Development Server (Port 3000)**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your browser.

5. **Run Automated Test Suite**:
   ```bash
   npm run test
   ```

6. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

---

## 🧪 Automated Tests

The test suite validates:
- Password hashing and demo credentials verification
- Role-based authorization matrix (RBAC)
- Patient ID generation format (`VL-2026-XXXXXX`)
- Doctor appointment slot double-booking prevention
- Drug allergy cross-reactivity detection engine

Run tests via:
```bash
node --test
```
