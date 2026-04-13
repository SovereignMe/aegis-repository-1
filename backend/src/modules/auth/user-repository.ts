import type { AppUser } from '../../models/domain.js';
import { db } from '../../store/governance-store.js';
import { nowIso } from './crypto-helpers.js';

export class AuthUserRepository {
  listAll(): AppUser[] { return db.users; }
  listActive(): AppUser[] { return db.users.filter((item) => item.isActive && !item.deletedAt); }
  hasActiveUsers(): boolean { return this.listActive().length > 0; }
  countActiveUsers(): number { return this.listActive().length; }
  findById(id: string): AppUser | null { return db.users.find((item) => item.id === id) || null; }
  findActiveById(id: string): AppUser | null { return db.users.find((item) => item.id === id && item.isActive && !item.deletedAt) || null; }
  findActiveEnabledById(id: string): AppUser | null { return db.users.find((item) => item.id === id && item.isActive && !item.deletedAt && !item.disabledAt) || null; }
  findActiveByEmail(email: string): AppUser | null {
    const normalized = email.trim().toLowerCase();
    return db.users.find((item) => item.email === normalized && item.isActive && !item.deletedAt) || null;
  }
  emailExists(email: string): boolean {
    const normalized = email.trim().toLowerCase();
    return db.users.some((user) => user.email === normalized && user.isActive && !user.deletedAt);
  }
  save(user: AppUser, options: { prepend?: boolean } = {}) {
    const index = db.users.findIndex((item) => item.id === user.id);
    if (index >= 0) {
      db.users[index] = user;
      return user;
    }
    if (options.prepend) db.users.unshift(user);
    else db.users.push(user);
    return user;
  }
  touch(user: AppUser) {
    user.updatedAt = nowIso();
    return user;
  }
  listAdminsMissingMfa(): AppUser[] {
    return db.users.filter((user) => user.role === 'ADMIN' && user.isActive && !user.deletedAt && !user.disabledAt && !user.mfaEnabled);
  }
}

export const authUserRepository = new AuthUserRepository();
