# Implementation plan

Work in the existing repository, in focused branches. Review each change before production release.

1. Authenticated data access: carry the request's Supabase client through all user-data queries; inspect actual database policies and verify isolation with two test users.
2. Reliable progress: transactional solve/scheduling, duplicate submission protection, remove completion bypass, explicit overdue recovery.
3. Complete core flows: persistent solved state, network recovery, accurate results, password recovery and login return paths.
4. Daily study UX: personal dashboard, search/filtering, upcoming reviews, continuous review sessions and useful empty states.
5. Durable feedback: saved drafts, attempt history, recoverable AI jobs and feedback history.
6. Learning quality: problem-specific references, question validation/randomization, long-term schedules, confidence and user timezones.
7. Release readiness: mobile/accessibility review, critical-flow tests, monitoring and deployment documentation.

Each change must include relevant validation and a manual review checklist. Keep the current Next.js instructions in AGENTS.md. Do not treat static checks as proof of live database security.
