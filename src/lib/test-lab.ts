import type { TestLabOperation } from "./types";

export function parseTestLabOperation(value: string): TestLabOperation | null {
  return value === "supplements" || value === "fitness" ? value : null;
}

export function testLabOperationLabel(operation: TestLabOperation) {
  return operation === "fitness" ? "Candinho Fitness" : "Candinho Suplementos";
}

export function testLabBaseHref(operation: TestLabOperation) {
  return `/teste/${operation}`;
}
