---
name: backend_auth_decisions
description: Backend auth stack decisions - CDK, Cognito, SES sandbox, local-first development
type: project
---

Auth backend uses AWS CDK (TypeScript) with Cognito for auth (not custom JWT). Local-first development — no deployment until tested. No custom domain/API Gateway domain yet.

**Why:** Cognito is leaner for initial launch — handles password hashing, token management, email verification out of the box. CDK chosen to match the reference repo pattern (kheriox-technologies/yt-http-apis-using-aws-cdk).

**How to apply:** Build CDK stacks locally with `cdk synth`, test Lambda handlers with local invocation or integration tests. SES still in sandbox — only verified emails work during dev. User needs AWS CLI configured first.
