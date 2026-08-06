export type SalesOpportunity = {
  customer_id: string;
  customer_name: string;
  phone: string | null;
  city: string | null;
  opportunity_group: string;
  opportunity_subtype: string;
  recommended_product_id: string | null;
  recommended_product_name: string | null;
  recommended_product_price: number | string | null;
  source_product_name: string | null;
  last_relevant_purchase_at: string | null;
  expected_action_on: string | null;
  days_to_action: number | null;
  priority: string;
  confidence: string;
  opportunity_score: number;
  reason: string;
  recommended_action: string;
  last_feedback_status?: string | null;
  feedback_next_action_on?: string | null;
  feedback_at?: string | null;
};

export type ProductSalesTarget = {
  product_id: string;
  product_name: string;
  product_price: number | string | null;
  candidate_customers: number;
  high_priority_customers: number;
  medium_priority_customers: number;
  best_score: number;
  opportunity_groups: string[] | null;
};
