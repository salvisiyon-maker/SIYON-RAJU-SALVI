import fs from 'fs';
import path from 'path';
import type { DatabaseSchema } from './types.ts';
import { getSeedData } from './seed.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DB_DIR, 'vitallink_db.json');

class DatabaseEngine {
  private data: DatabaseSchema;
  private isInitialized = false;

  constructor() {
    this.data = this.loadOrInitialize();
  }

  private loadOrInitialize(): DatabaseSchema {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }

      if (fs.existsSync(DB_FILE)) {
        const fileContent = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(fileContent);
        this.isInitialized = true;
        return parsed;
      }
    } catch (err) {
      console.error('Failed reading existing db file, initializing seed:', err);
    }

    const seed = getSeedData();
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf-8');
      this.isInitialized = true;
    } catch (err) {
      console.error('Failed to write initial seed file:', err);
    }
    return seed;
  }

  private save(): void {
    try {
      if (!fs.existsSync(DB_DIR)) {
        fs.mkdirSync(DB_DIR, { recursive: true });
      }
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed saving database:', err);
    }
  }

  public resetToSeed(): DatabaseSchema {
    this.data = getSeedData();
    this.save();
    return this.data;
  }

  public getRawData(): DatabaseSchema {
    return this.data;
  }

  // --- Collection Accessors & CRUD ---

  public get users() {
    return {
      find: (predicate: (u: DatabaseSchema['users'][0]) => boolean) =>
        this.data.users.filter((u) => !u.deleted_at).filter(predicate),
      findOne: (predicate: (u: DatabaseSchema['users'][0]) => boolean) =>
        this.data.users.find((u) => !u.deleted_at && predicate(u)),
      findById: (id: string) =>
        this.data.users.find((u) => !u.deleted_at && u.id === id),
      findByEmail: (email: string) =>
        this.data.users.find((u) => !u.deleted_at && u.email.toLowerCase() === email.toLowerCase().trim()),
      insert: (user: DatabaseSchema['users'][0]) => {
        this.data.users.push(user);
        this.save();
        return user;
      },
      update: (id: string, updates: Partial<DatabaseSchema['users'][0]>) => {
        const index = this.data.users.findIndex((u) => u.id === id);
        if (index === -1) return null;
        this.data.users[index] = {
          ...this.data.users[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.users[index];
      },
      softDelete: (id: string) => {
        const index = this.data.users.findIndex((u) => u.id === id);
        if (index === -1) return false;
        this.data.users[index].deleted_at = new Date().toISOString();
        this.save();
        return true;
      },
    };
  }

  public get patients() {
    return {
      find: (predicate?: (p: DatabaseSchema['patients'][0]) => boolean) => {
        const active = this.data.patients.filter((p) => !p.deleted_at);
        return predicate ? active.filter(predicate) : active;
      },
      findById: (id: string) =>
        this.data.patients.find((p) => !p.deleted_at && p.id === id),
      findByUserId: (userId: string) =>
        this.data.patients.find((p) => !p.deleted_at && p.user_id === userId),
      findByPatientId: (patientId: string) =>
        this.data.patients.find((p) => !p.deleted_at && p.patient_id.toUpperCase().trim() === patientId.toUpperCase().trim()),
      insert: (patient: DatabaseSchema['patients'][0]) => {
        this.data.patients.push(patient);
        this.save();
        return patient;
      },
      update: (id: string, updates: Partial<DatabaseSchema['patients'][0]>) => {
        const index = this.data.patients.findIndex((p) => p.id === id);
        if (index === -1) return null;
        this.data.patients[index] = {
          ...this.data.patients[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.patients[index];
      },
      softDelete: (id: string) => {
        const index = this.data.patients.findIndex((p) => p.id === id);
        if (index === -1) return false;
        this.data.patients[index].deleted_at = new Date().toISOString();
        this.save();
        return true;
      },
    };
  }

  public get doctors() {
    return {
      find: (predicate?: (d: DatabaseSchema['doctors'][0]) => boolean) =>
        predicate ? this.data.doctors.filter(predicate) : this.data.doctors,
      findById: (id: string) => this.data.doctors.find((d) => d.id === id),
      findByUserId: (userId: string) => this.data.doctors.find((d) => d.user_id === userId),
      insert: (doc: DatabaseSchema['doctors'][0]) => {
        this.data.doctors.push(doc);
        this.save();
        return doc;
      },
      update: (id: string, updates: Partial<DatabaseSchema['doctors'][0]>) => {
        const index = this.data.doctors.findIndex((d) => d.id === id);
        if (index === -1) return null;
        this.data.doctors[index] = {
          ...this.data.doctors[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.doctors[index];
      },
    };
  }

  public get nurses() {
    return {
      find: (predicate?: (n: DatabaseSchema['nurses'][0]) => boolean) =>
        predicate ? this.data.nurses.filter(predicate) : this.data.nurses,
      findById: (id: string) => this.data.nurses.find((n) => n.id === id),
      findByUserId: (userId: string) => this.data.nurses.find((n) => n.user_id === userId),
      insert: (nurse: DatabaseSchema['nurses'][0]) => {
        this.data.nurses.push(nurse);
        this.save();
        return nurse;
      },
      update: (id: string, updates: Partial<DatabaseSchema['nurses'][0]>) => {
        const index = this.data.nurses.findIndex((n) => n.id === id);
        if (index === -1) return null;
        this.data.nurses[index] = {
          ...this.data.nurses[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.nurses[index];
      },
    };
  }

  public get departments() {
    return {
      find: (predicate?: (d: DatabaseSchema['departments'][0]) => boolean) =>
        predicate ? this.data.departments.filter(predicate) : this.data.departments,
      findById: (id: string) => this.data.departments.find((d) => d.id === id),
      insert: (dept: DatabaseSchema['departments'][0]) => {
        this.data.departments.push(dept);
        this.save();
        return dept;
      },
      update: (id: string, updates: Partial<DatabaseSchema['departments'][0]>) => {
        const index = this.data.departments.findIndex((d) => d.id === id);
        if (index === -1) return null;
        this.data.departments[index] = {
          ...this.data.departments[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.departments[index];
      },
    };
  }

  public get appointments() {
    return {
      find: (predicate?: (a: DatabaseSchema['appointments'][0]) => boolean) =>
        predicate ? this.data.appointments.filter(predicate) : this.data.appointments,
      findById: (id: string) => this.data.appointments.find((a) => a.id === id),
      insert: (appointment: DatabaseSchema['appointments'][0]) => {
        this.data.appointments.push(appointment);
        this.save();
        return appointment;
      },
      update: (id: string, updates: Partial<DatabaseSchema['appointments'][0]>) => {
        const index = this.data.appointments.findIndex((a) => a.id === id);
        if (index === -1) return null;
        this.data.appointments[index] = {
          ...this.data.appointments[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.appointments[index];
      },
    };
  }

  public get visits() {
    return {
      find: (predicate?: (v: DatabaseSchema['visits'][0]) => boolean) => {
        const active = this.data.visits.filter((v) => !v.deleted_at);
        return predicate ? active.filter(predicate) : active;
      },
      findById: (id: string) =>
        this.data.visits.find((v) => !v.deleted_at && v.id === id),
      insert: (visit: DatabaseSchema['visits'][0]) => {
        this.data.visits.push(visit);
        this.save();
        return visit;
      },
      update: (id: string, updates: Partial<DatabaseSchema['visits'][0]>) => {
        const index = this.data.visits.findIndex((v) => v.id === id);
        if (index === -1) return null;
        this.data.visits[index] = {
          ...this.data.visits[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.visits[index];
      },
      softDelete: (id: string) => {
        const index = this.data.visits.findIndex((v) => v.id === id);
        if (index === -1) return false;
        this.data.visits[index].deleted_at = new Date().toISOString();
        this.save();
        return true;
      },
    };
  }

  public get prescriptions() {
    return {
      find: (predicate?: (p: DatabaseSchema['prescriptions'][0]) => boolean) => {
        const active = this.data.prescriptions.filter((p) => !p.deleted_at);
        return predicate ? active.filter(predicate) : active;
      },
      findById: (id: string) =>
        this.data.prescriptions.find((p) => !p.deleted_at && p.id === id),
      findByVisitId: (visitId: string) =>
        this.data.prescriptions.find((p) => !p.deleted_at && p.visit_id === visitId),
      insert: (rx: DatabaseSchema['prescriptions'][0]) => {
        this.data.prescriptions.push(rx);
        this.save();
        return rx;
      },
      update: (id: string, updates: Partial<DatabaseSchema['prescriptions'][0]>) => {
        const index = this.data.prescriptions.findIndex((p) => p.id === id);
        if (index === -1) return null;
        this.data.prescriptions[index] = {
          ...this.data.prescriptions[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.prescriptions[index];
      },
      softDelete: (id: string) => {
        const index = this.data.prescriptions.findIndex((p) => p.id === id);
        if (index === -1) return false;
        this.data.prescriptions[index].deleted_at = new Date().toISOString();
        this.save();
        return true;
      },
    };
  }

  public get prescriptionItems() {
    return {
      find: (predicate?: (item: DatabaseSchema['prescription_items'][0]) => boolean) =>
        predicate ? this.data.prescription_items.filter(predicate) : this.data.prescription_items,
      findByPrescriptionId: (rxId: string) =>
        this.data.prescription_items.filter((item) => item.prescription_id === rxId),
      insert: (item: DatabaseSchema['prescription_items'][0]) => {
        this.data.prescription_items.push(item);
        this.save();
        return item;
      },
      deleteByPrescriptionId: (rxId: string) => {
        this.data.prescription_items = this.data.prescription_items.filter((i) => i.prescription_id !== rxId);
        this.save();
      },
    };
  }

  public get shifts() {
    return {
      find: (predicate?: (s: DatabaseSchema['shifts'][0]) => boolean) =>
        predicate ? this.data.shifts.filter(predicate) : this.data.shifts,
      findById: (id: string) => this.data.shifts.find((s) => s.id === id),
      insert: (shift: DatabaseSchema['shifts'][0]) => {
        this.data.shifts.push(shift);
        this.save();
        return shift;
      },
      update: (id: string, updates: Partial<DatabaseSchema['shifts'][0]>) => {
        const index = this.data.shifts.findIndex((s) => s.id === id);
        if (index === -1) return null;
        this.data.shifts[index] = {
          ...this.data.shifts[index],
          ...updates,
        };
        this.save();
        return this.data.shifts[index];
      },
      delete: (id: string) => {
        this.data.shifts = this.data.shifts.filter((s) => s.id !== id);
        this.save();
        return true;
      },
    };
  }

  public get tasks() {
    return {
      find: (predicate?: (t: DatabaseSchema['tasks'][0]) => boolean) =>
        predicate ? this.data.tasks.filter(predicate) : this.data.tasks,
      findById: (id: string) => this.data.tasks.find((t) => t.id === id),
      insert: (task: DatabaseSchema['tasks'][0]) => {
        this.data.tasks.push(task);
        this.save();
        return task;
      },
      update: (id: string, updates: Partial<DatabaseSchema['tasks'][0]>) => {
        const index = this.data.tasks.findIndex((t) => t.id === id);
        if (index === -1) return null;
        this.data.tasks[index] = {
          ...this.data.tasks[index],
          ...updates,
          updated_at: new Date().toISOString(),
        };
        this.save();
        return this.data.tasks[index];
      },
    };
  }

  public get notifications() {
    return {
      find: (predicate?: (n: DatabaseSchema['notifications'][0]) => boolean) =>
        predicate ? this.data.notifications.filter(predicate) : this.data.notifications,
      insert: (notif: DatabaseSchema['notifications'][0]) => {
        this.data.notifications.unshift(notif);
        this.save();
        return notif;
      },
      markAsRead: (id: string) => {
        const notif = this.data.notifications.find((n) => n.id === id);
        if (notif) {
          notif.is_read = true;
          this.save();
        }
        return notif;
      },
      markAllAsRead: (userId: string) => {
        this.data.notifications
          .filter((n) => n.user_id === userId)
          .forEach((n) => (n.is_read = true));
        this.save();
      },
    };
  }

  public get auditLogs() {
    return {
      find: (predicate?: (log: DatabaseSchema['audit_logs'][0]) => boolean) => {
        const sorted = [...this.data.audit_logs].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return predicate ? sorted.filter(predicate) : sorted;
      },
      insert: (log: DatabaseSchema['audit_logs'][0]) => {
        this.data.audit_logs.unshift(log);
        this.save();
        return log;
      },
    };
  }
}

export const db = new DatabaseEngine();
