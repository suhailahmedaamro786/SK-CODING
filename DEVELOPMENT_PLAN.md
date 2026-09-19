# SK Builder Development Plan

This plan follows the SK Builder master specification and is implemented incrementally.

## Phase 1 — Foundation
- [x] Next.js/TypeScript foundation
- [x] Product landing/builder entry
- [x] Architecture documentation
- [x] Modular source boundaries
- [x] Clerk authentication foundation
- [x] Supabase schema/RLS migration
- [ ] Connect real Clerk/Supabase credentials

## Phase 2 — AI
- [ ] Central AI Gateway
- [ ] OpenAI/Gemini/Anthropic/OpenRouter adapters
- [ ] Secure BYOK
- [ ] Provider priority/fallback
- [ ] Usage tracking

## Phase 3 — Product workflow
- [ ] Create project
- [ ] Dynamic requirements interview
- [ ] Structured specification
- [ ] Approval gate
- [ ] Architecture/build plan
- [ ] Ordered tasks
- [ ] Code generation
- [ ] Diff/review workflow
- [ ] Build logs
- [ ] Workspace
- [ ] Preview

## Phase 4 — Integrations
- [ ] GitHub OAuth
- [ ] Repository creation and commits
- [ ] Supabase project connection
- [ ] Generated migrations/RLS
- [ ] Vercel OAuth/deployment

## Phase 5 — Engineering agents
- [ ] Testing Agent
- [ ] Debug Agent with maximum 3 retries
- [ ] Security Agent
- [ ] Continuous editing

## Phase 6 — Platform
- [ ] Credits/rate limits
- [ ] Project memory/context retrieval
- [ ] Production audit

After every major implementation: typecheck, lint, tests where present, production build, then security review.
