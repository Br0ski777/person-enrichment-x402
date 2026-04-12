import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "person-enrichment",
  slug: "person-enrichment",
  description: "Person enrichment from email: name, title, company, social profiles, avatar.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/enrich",
      price: "$0.01",
      description: "Enrich a person profile from their email address",
      toolName: "person_enrich_from_email",
      toolDescription: "Use this when you need to find information about a person from their email address. Returns: full name, job title, company, LinkedIn URL, GitHub URL, Twitter handle, location, bio, avatar URL, domain. Aggregates public data sources. Ideal for sales prospecting, lead research, CRM enrichment. Do NOT use for email validation — use email_verify_address. Do NOT use for company data — use company_enrich_from_domain. Do NOT use for social profiles — use social_lookup_profile.",
      inputSchema: {
        type: "object",
        properties: {
          email: { type: "string", description: "Email address to enrich (e.g. john@company.com)" },
        },
        required: ["email"],
      },
    },
  ],
};
