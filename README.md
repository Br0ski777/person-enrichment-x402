# Person Enrichment API

[![MCP Server](https://img.shields.io/badge/MCP-server-blue)](https://person-enrichment.api.klymax402.com/mcp)
[![x402](https://img.shields.io/badge/payments-x402-6E56CF)](https://x402.org)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)

Person enrichment from email. Full name, job title, company, LinkedIn, GitHub, Twitter, avatar, location. Ideal for lead research. Pay-per-call via [x402](https://x402.org) (USDC on Base L2) -- no API key, no signup, no rate-limit wall.

Part of the [klymax402](https://klymax402.com) marketplace -- 100 x402 micropayment APIs for AI agents, one wallet, USDC on Base.

## Quickstart -- MCP

Add to your MCP client config (Claude Desktop, Cursor, ElizaOS, etc.):

```json
{
  "mcpServers": {
    "person-enrichment": {
      "url": "https://person-enrichment.api.klymax402.com/mcp"
    }
  }
}
```

## Quickstart -- HTTP (x402)

```bash
curl "https://person-enrichment.api.klymax402.com/api/enrich?email=user@example.com"
# -> 402 Payment Required, with an x402 payment challenge in the response body
```

Any x402-aware client ([`@x402/fetch`](https://www.npmjs.com/package/@x402/fetch), [`x402-agent-tools`](https://www.npmjs.com/package/x402-agent-tools), ATXP) handles the 402 -> sign -> retry cycle automatically.

## Tools

| Tool | Method | Path | Price | Description |
|---|---|---|---|---|
| `person_enrich_from_email` | GET | `/api/enrich` | $0.01 | Enrich a person profile from their email address |

### `person_enrich_from_email`

Enrich a person's profile with additional data from their email address, name, domain, or LinkedIn URL. Alternative to Apollo people-enrich at 5x lower cost. Returns structured JSON with full contact and professional details.

**Parameters**

| Name | Type | Required | Description |
|---|---|---|---|
| `email` | string | yes | Email address to enrich (e.g. john@company.com) |

Example response:

```json
{"fullName":"Jane Smith","jobTitle":"VP Engineering","company":"Acme Corp","linkedin":"https://linkedin.com/in/janesmith","github":"https://github.com/janesmith","location":"San Francisco, CA","avatar":"https://gravatar.com/abc123","domain":"acme.com"}
```

**When to use**: outreach to personalize emails, enrich CRM records, search for people/contacts, or research decision-makers. Essential for sales prospecting, lead qualification, and account mapping. Drop-in replacement for Apollo person enrichment.

**Not for**: email validation (use `email_verify_address`), company data (use `company_enrich_from_domain`), social profiles by username (use `social_lookup_profile`), finding email addresses (use `email_find_by_name`).

## Example agent prompts

- "Enrich a person's profile with additional data from their email address, name, domain, or LinkedIn URL"

## Payment

- Protocol: [x402](https://x402.org) -- HTTP-native pay-per-call, no signup, no API key
- Network: Base L2 (`eip155:8453`)
- Asset: USDC
- Facilitator: Coinbase CDP (primary), PayAI (fallback)
- Also reachable via [ATXP](https://atxp.ai) (OAuth-wrapped x402, RFC 9728 protected-resource metadata)

## Part of klymax402

100 x402 micropayment APIs for AI agents -- one wallet, USDC on Base, zero signup.

- Catalog: https://klymax402.com/llms.txt
- Full API reference: https://klymax402.com/llms-full.txt
- Live stats: https://klymax402.com/stats

## License

MIT
