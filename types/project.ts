export type ProjectStatus = "draft" | "planning" | "building" | "ready" | "failed" | "archived";

export interface ProjectSpecification {
  productType?: string;
  targetUsers?: string[];
  businessPurpose?: string;
  pages?: string[];
  features?: string[];
  authentication?: string[];
  databaseRequirements?: string[];
  payments?: string[];
  integrations?: string[];
  designStyle?: string;
  branding?: Record<string, string>;
  responsiveRequirements?: string[];
  accessibilityRequirements?: string[];
  deploymentRequirements?: string[];
}
