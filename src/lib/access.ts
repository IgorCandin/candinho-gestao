export const MANAGER_EMAIL = "igorcandinho2002@hotmail.com";
export const FITNESS_SALES_EMAIL = "giuliafaria1@gmail.com";

export type AccessRole = "admin" | "operator" | "sales" | "partner" | "restricted";

export type UserAccess = {
  id: string | null;
  email: string | null;
  name: string;
  role: AccessRole;
  active: boolean;
  canAccessSupplements: boolean;
  canAccessFitness: boolean;
  canManageUsers: boolean;
  canAccessBank: boolean;
  canAccessMarketing: boolean;
  canWriteSupplements: boolean;
  canWriteFitness: boolean;
  canWriteBank: boolean;
  canWriteMarketing: boolean;
};

export type UserPermissionRow = {
  id: string;
  email: string;
  full_name: string;
  role: Exclude<AccessRole, "restricted">;
  active: boolean;
  can_access_supplements: boolean;
  can_write_supplements: boolean;
  can_access_fitness: boolean;
  can_write_fitness: boolean;
  can_access_bank: boolean;
  can_write_bank: boolean;
  can_access_marketing: boolean;
  can_write_marketing: boolean;
  can_manage_users: boolean;
  last_sign_in_at: string | null;
  created_at: string;
  updated_at: string;
};

export function getFallbackUserAccess(email?: string | null): UserAccess {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";

  if (normalizedEmail === MANAGER_EMAIL) {
    return {
      id: null,
      email: normalizedEmail,
      name: "Candinho",
      role: "admin",
      active: true,
      canAccessSupplements: true,
      canAccessFitness: true,
      canManageUsers: true,
      canAccessBank: true,
      canAccessMarketing: true,
      canWriteSupplements: true,
      canWriteFitness: true,
      canWriteBank: true,
      canWriteMarketing: true,
    };
  }

  if (normalizedEmail === FITNESS_SALES_EMAIL) {
    return {
      id: null,
      email: normalizedEmail,
      name: "Giulia",
      role: "operator",
      active: true,
      canAccessSupplements: false,
      canAccessFitness: true,
      canManageUsers: false,
      canAccessBank: false,
      canAccessMarketing: false,
      canWriteSupplements: false,
      canWriteFitness: true,
      canWriteBank: false,
      canWriteMarketing: false,
    };
  }

  return {
    id: null,
    email: normalizedEmail || null,
    name: "Usuário",
    role: "restricted",
    active: false,
    canAccessSupplements: false,
    canAccessFitness: false,
    canManageUsers: false,
    canAccessBank: false,
    canAccessMarketing: false,
    canWriteSupplements: false,
    canWriteFitness: false,
    canWriteBank: false,
    canWriteMarketing: false,
  };
}

export function normalizeUserAccess(row: Record<string, unknown> | null | undefined, email?: string | null): UserAccess {
  if (!row) return getFallbackUserAccess(email);
  const role = typeof row.role === "string" && ["admin", "operator", "sales", "partner"].includes(row.role)
    ? row.role as Exclude<AccessRole, "restricted">
    : "restricted";
  const active = Boolean(row.active);

  return {
    id: typeof row.id === "string" ? row.id : null,
    email: typeof row.email === "string" ? row.email : email ?? null,
    name: typeof row.full_name === "string" && row.full_name.trim() ? row.full_name : "Usuário",
    role,
    active,
    canAccessSupplements: active && Boolean(row.can_access_supplements),
    canAccessFitness: active && Boolean(row.can_access_fitness),
    canManageUsers: active && Boolean(row.can_manage_users),
    canAccessBank: active && Boolean(row.can_access_bank),
    canAccessMarketing: active && Boolean(row.can_access_marketing),
    canWriteSupplements: active && Boolean(row.can_write_supplements),
    canWriteFitness: active && Boolean(row.can_write_fitness),
    canWriteBank: active && Boolean(row.can_write_bank),
    canWriteMarketing: active && Boolean(row.can_write_marketing),
  };
}
