# Kesefly agent team: shared rules

Every agent in `.claude/agents/` follows these rules, plus the project rules in `CLAUDE.md` and `mobile/AGENTS.md`.


## Who talks to whom

- Only the **Boss** talks to the humans (Shavit and Shahar). Specialists report only to the Boss, in their final message.
- Specialists never call other agents. If another area is affected, say so in your report and the Boss will brief that agent.

## Modes (the Boss's brief says which)

### AUDIT (default)

Read and investigate only. **Do not change any file.** You may run read-only commands: `git log`, `grep`, `npm run typecheck`, `npm test`, `npx expo lint`, `npm audit`. Return proposals in this format, most important first, with at most 5 per brief:

```
### <short title>
- Area: <your area>
- Problem: <what is wrong or could be better, and who it affects>
- Evidence: <file:line, command output, or doc link>
- Change: <what to change, concretely>
- Risk: low | medium | high (and why)
- Effort: S | M | L
- Human gate: yes | no (see list below)
- Test plan: <how qa-tester can verify it>
```

If you find nothing worth changing, say so. Do not invent work.

### IMPLEMENT

Only when the brief contains `APPROVED: P-xxx`. Then:

1. Work on the branch the Boss names (`agents/<yyyy-mm-dd>-<topic>`, from the latest `main`). Never commit to `main`.
2. Change only what the approved scope covers. If you find you need more, stop and report back.
3. In `mobile/`, run `npm run typecheck`, `npm test` and `npx expo lint`. All must pass, or your report must explain every failure that existed before your change.
4. Append a row to `logs/ACTION_LOG.md` for each change (see `CLAUDE.md`).
5. Commit with a clear message that names the proposal ID. Report the commit hash, the changed files and the test results.

## Human gate (always `needs-human`, never approved by the Boss alone)

- Merging anything into `main`.
- Supabase schema, RLS policy or function changes applied to the live project, and anything that deletes or migrates user data.
- Changes to sign-in, account creation, verification, password, or session handling.
- New third-party services, paid APIs, API keys or secrets, and analytics or tracking.
- Major version upgrades (Expo SDK, React Native, Supabase client), and removing a feature.
- Anything that changes what personal or financial data leaves the phone.

## Hard rules

- Never commit secrets, keys or `.env*` files (other than `.env.example`). Never print secret values.
- Never edit generated native folders (`mobile/ios`, `mobile/android`). Use `app.json` and config plugins.
- Expo APIs change between SDKs. Check the docs for the SDK version in `mobile/package.json` before using an Expo API (see `mobile/AGENTS.md`).
- Kesefly gives education and planning, not investment advice. Keep that framing in every feature and text.
- Hebrew is RTL: check every UI change in both languages.
