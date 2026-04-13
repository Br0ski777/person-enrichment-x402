import type { ApiConfig } from "./shared";

export const API_CONFIG: ApiConfig = {
  name: "person-enrichment",
  slug: "person-enrichment",
  description: "Person enrichment from email. Full name, job title, company, LinkedIn, GitHub, Twitter, avatar, location. Ideal for lead research.",
  version: "1.0.0",
  routes: [
    {
      method: "GET",
      path: "/api/enrich",
      price: "$0.01",
      description: "Enrich a person profile from their email address",
      toolName: "person_enrich_from_email",
      toolDescription: `Use this when you need to find information about a person from their email address. Returns a structured JSON profile aggregated from public data sources.

1. fullName (string) -- first and last name
2. jobTitle (string) -- current role / position
3. company (string) -- current employer
4. linkedin (string) -- LinkedIn profile URL
5. github (string) -- GitHub profile URL
6. twitter (string) -- Twitter/X handle
7. location (string) -- city, state, country
8. bio (string) -- professional summary
9. avatar (string) -- profile picture URL
10. domain (string) -- company domain

Example output: {"fullName":"Jane Smith","jobTitle":"VP Engineering","company":"Acme Corp","linkedin":"https://linkedin.com/in/janesmith","github":"https://github.com/janesmith","location":"San Francisco, CA","avatar":"https://gravatar.com/abc123","domain":"acme.com"}

Use this BEFORE outreach to personalize emails, enrich CRM records, or research decision-makers. Essential for sales prospecting, lead qualification, and account mapping.

Do NOT use for email validation -- use email_verify_address instead. Do NOT use for company data -- use company_enrich_from_domain instead. Do NOT use for social profiles by username -- use social_lookup_profile instead. Do NOT use for finding email addresses -- use email_find_by_name instead.`,
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
