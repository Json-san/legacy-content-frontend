import { apiRequest } from "../../lib/api-client";

export type RuleType =
  | "PROHIBITED_PHRASE"
  | "REQUIRED_PHRASE"
  | "REQUIRED_DISCLOSURE"
  | "MAX_LENGTH"
  | "MIN_LENGTH"
  | "REGEX"
  | "KEYWORD"
  | "FORMATTING"
  | "SEMANTIC";

export type Severity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export type Rule = {
  id: string;
  organization_id: string;
  name: string;
  description: string;
  type: RuleType;
  severity: Severity;
  configuration: Record<string, unknown>;
  enabled: boolean;
  version: number;
  created_at: string;
  updated_at: string;
};

export type RuleCreatePayload = {
  name: string;
  description?: string;
  type: RuleType;
  severity: Severity;
  configuration: Record<string, unknown>;
  enabled?: boolean;
};

export type RuleUpdatePayload = Partial<
  Pick<RuleCreatePayload, "name" | "description" | "severity" | "configuration" | "enabled">
>;

export function listRules(organizationId: string, token: string): Promise<Rule[]> {
  return apiRequest<Rule[]>(`/api/v1/organizations/${organizationId}/rules`, { token });
}

export function createRule(
  organizationId: string,
  token: string,
  payload: RuleCreatePayload,
): Promise<Rule> {
  return apiRequest<Rule>(`/api/v1/organizations/${organizationId}/rules`, {
    method: "POST",
    token,
    body: payload,
  });
}

export function updateRule(
  organizationId: string,
  token: string,
  ruleId: string,
  payload: RuleUpdatePayload,
): Promise<Rule> {
  return apiRequest<Rule>(`/api/v1/organizations/${organizationId}/rules/${ruleId}`, {
    method: "PATCH",
    token,
    body: payload,
  });
}

/** Disables the rule (soft — the backend never hard-deletes a rule, so history stays intact). */
export function disableRule(organizationId: string, token: string, ruleId: string): Promise<Rule> {
  return apiRequest<Rule>(`/api/v1/organizations/${organizationId}/rules/${ruleId}`, {
    method: "DELETE",
    token,
  });
}
