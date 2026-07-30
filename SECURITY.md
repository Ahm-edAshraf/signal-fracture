# SECURITY.md — Signal Fracture

## Scope

Signal Fracture is a fictional exercise engine. It must not present itself as a real emergency dispatcher or operational control system.

## Mandatory disclaimer

Every participant message begins:

> EXERCISE — FICTIONAL SCENARIO — NOT A REAL EMERGENCY

The landing page and README repeat this.

## Prohibited use

Reject requests to:

- dispatch real emergency services;
- control real infrastructure;
- plan real violence or sabotage;
- provide operational instructions for weapons;
- impersonate authorities;
- conduct harassment or stalking;
- send unsolicited bulk messages;
- use real sensitive facility data.

## Data minimization

Store:

- opaque alias;
- conversation/connection identifiers;
- channel;
- fictional decisions;
- synthetic facts;
- timestamps;
- safe audit metadata.

Do not publicly expose:

- email address;
- Discord/Telegram ID;
- raw private message;
- token;
- full sender payload.

## Role authentication

- Join codes are random, signed/hashed, expiring, and single-role.
- Inbound conversation is bound to role after join.
- User-supplied role/session IDs are not trusted.
- A participant cannot answer another role's inject.
- Operator controls require server-side secret/authentication.

## Model safety

Model output is untrusted.

- strict Zod parsing;
- exact allowed decisions supplied;
- no generated code execution;
- no generated database queries;
- no state transition authority;
- no hidden reasoning storage;
- fail closed;
- prompt content separated from system instructions.

## Delivery safety

- stable idempotency keys;
- bounded retry;
- no duplicate consequence;
- no false delivery;
- no cold outreach;
- no fallback channel without prior link and disclosure.

## Logs

Allowed:

- opaque IDs;
- channel;
- status;
- latency;
- error code;
- synthetic choice.

Forbidden:

- API keys;
- tokens;
- raw addresses;
- full private text;
- hidden prompts;
- direct contact data.

## Dashboard

- public-safe aliases;
- HTML escaped;
- no raw participant content;
- guarded reset;
- no client-side operator secret;
- demo tenant only;
- optional noindex.

## Incident response

If a secret leaks:

1. revoke;
2. rotate;
3. remove from Git history;
4. inspect unauthorized activity;
5. rerun scanner.

If private data appears publicly:

1. stop deployment;
2. preserve safe audit metadata;
3. delete exposed demo data;
4. fix query/redaction;
5. retest.

## Public repo review

Before publication:

- inspect entire Git history;
- scan secrets;
- inspect screenshots/video;
- remove real participant data;
- use synthetic fixtures;
- document limitations.
