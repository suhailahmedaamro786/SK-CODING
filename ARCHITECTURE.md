# SK Builder Architecture

## Product
SK Builder is an AI Software Factory that turns a natural-language idea into a structured specification, implementation plan, generated application, and eventually a deployed production application.

## Core flow
Authentication → Create Project → AI Requirements Interview → Project Specification → Architecture Plan → UI/UX Plan → Database Plan → Code Generation → Testing → GitHub → Supabase → Vercel → Live Application → Continuous AI Editing.

## Current implementation phase
Prompt 00–03: repository foundation, modular boundaries, Clerk authentication foundation, and Supabase schema/RLS.

## Application boundaries
- app/: Next.js routes and UI.
- components/: reusable presentation components.
- features/: product features.
- lib/: shared utilities.
- server/: server-only application services.
- ai/: provider-independent AI gateway and agents.
- integrations/: GitHub, Vercel, Supabase and Clerk adapters.
- types/: shared domain types.
- config/: non-secret configuration.
- supabase/migrations/: database schema and RLS.

## Security
Clerk is the authentication authority. Protected server operations derive identity from Clerk. Supabase service-role credentials are server-only. Provider API keys are never client-side. User-owned records carry an ownership key and have RLS policies.

## AI boundary
Application features depend on a provider-independent AI Gateway. Provider adapters are replaceable and fallback is handled centrally.

## Delivery boundary
GitHub is the source-control integration, Supabase is the application-data integration, and Vercel is the target deployment platform.
