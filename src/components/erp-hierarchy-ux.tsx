"use client";

import { BankMonthFocusUX } from "@/components/bank-month-focus-ux";
import { BudgetConfirmedFlowUX } from "@/components/budget-confirmed-flow-ux";
import { CompanyOperationActiveVisualFix } from "@/components/company-operation-active-visual-fix";
import { FitnessSaleStreamlinedUX } from "@/components/fitness-sale-streamlined-ux";
import { MobileMenuViewportGuard } from "@/components/mobile-menu-viewport-guard";
import { SupplementCanonicalNavigationUX } from "@/components/supplement-canonical-navigation-ux";

export function ErpHierarchyUX() {
  return (
    <>
      <BankMonthFocusUX />
      <BudgetConfirmedFlowUX />
      <FitnessSaleStreamlinedUX />
      <CompanyOperationActiveVisualFix />
      <MobileMenuViewportGuard />
      <SupplementCanonicalNavigationUX />
    </>
  );
}
