export const MANAGER_EMAIL = "igorcandinho2002@hotmail.com";
export const FITNESS_SALES_EMAIL = "giuliafaria1@gmail.com";

export type UserAccess = {
  name: string;
  role: "manager" | "fitness_sales" | "restricted";
  canAccessSupplements: boolean;
  canAccessFitness: boolean;
};

export function getUserAccess(email?: string | null): UserAccess {
  const normalizedEmail = email?.trim().toLowerCase() ?? "";

  if (normalizedEmail === MANAGER_EMAIL) {
    return {
      name: "Candinho",
      role: "manager",
      canAccessSupplements: true,
      canAccessFitness: true,
    };
  }

  if (normalizedEmail === FITNESS_SALES_EMAIL) {
    return {
      name: "Giulia",
      role: "fitness_sales",
      canAccessSupplements: false,
      canAccessFitness: true,
    };
  }

  return {
    name: "Usuário",
    role: "restricted",
    canAccessSupplements: false,
    canAccessFitness: false,
  };
}
