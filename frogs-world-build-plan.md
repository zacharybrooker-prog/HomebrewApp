# Frogs World — TTRPG Companion App: Engineering Build Plan

**Audience:** an autonomous coding agent (or team of agents) executing the build.
**Status:** definitive plan. Where a decision was needed it has been made and marked **[DECISION]**. Where an agent has latitude it is marked **[AGENT CHOICE]** with constraints.
**Working product name:** Frogs World (placeholder; trademark-clean).

---

## 0. How to use this document

- Build in the **phase order** in §13. Do not skip ahead; later phases assume earlier ones exist.
- Every phase has **acceptance criteria**. A phase is "done" only when all criteria pass in automated tests + a manual smoke test.
- Treat §7 (Data Model), §8 (Effect Engine), and §9 (Sync & Authority) as the contract. All modules conform to them. If a module seems to need a schema change, update §7 first.
- **License gate (§16) is non-negotiable.** Any dependency outside the allowed-license set is rejected in CI.

---

## 1. Product summary

A system-agnostic (not tied to any one RPG ruleset) companion app for tabletop role-playing games. A **DM** runs a campaign; **players** each use their own device. The DM authors all content (no bundled ruleset content). Core capabilities:

1. **Initiative & combat tracker** with per-combatant steppers, monster management, and round-counted conditions.
2. **In-world time, calendar, and phase/cycle system** that drives visual theming and time-based effects.
3. **Random event tables** (weather, enemies) authored in a visual editor, auto-applying configured effects.
4. **Player character sheets** (DM-defined stat fields, HP, inventory, currency, statuses) with player edit + DM edit/lock.
5. **DM management tools**: monster/NPC library, encounter assembly, campaign notes, maps, image handouts, reveal-to-player.
6. **A unifying Effect engine** used by events, phases, statuses, and items.
7. **Two networking modes**: free offline LAN play (DM device hosts) and premium online play (cloud).

---

## 2. Confirmed decisions (read-back — correct anything wrong before agents start)

- **D-1. Networking topology.** One codebase. **Players are browser/PWA clients.** The **DM hosts**: in local mode the DM's installed app (desktop or mobile) runs a LAN sync server + discovery; in online mode the cloud replaces the local host and provides storage. Same sync layer behind both.
- **D-2. Offline-first.** Local LAN play must work with **zero internet**.
- **D-3. Tiers.** Free = unlimited **local** campaigns, LAN play, basic Gregorian calendar + 4 day-phases, no cloud, no in-app dice. Premium = online play, in-app dice, fully custom calendar, custom phases/cycles, **5 cloud campaign saves**, cloud-stored import/export.
- **D-4. Content.** Purely homebrew, system-agnostic. **No ruleset content is bundled.** The DM authors everything.
- **D-5. Authority.** Players may write only their own character; all shared state (combat, time, scene) is DM-authoritative; conflicts resolve DM-wins (enforced server/host-side, see §9).
- **D-6. Effect system.** One Effect primitive used everywhere (§8).
- **D-7. Scope.** Nothing is cut. Maps, handouts, reveal-to-player, and item-effects-on-equip all ship (sequenced late, §13).
- **D-8. Stat fields.** DM-defined per-campaign schema; types: number, text, toggle, gauge (current/max). HP is a built-in gauge always present.
- **D-9. Durations.** Two independent clocks: **rounds** (combat) and **time-blocks** (6-hour in-world units). A status uses one, the other, or manual.
- **D-10. Stack.** TypeScript everywhere; React + Vite + Tailwind; Yjs (CRDT) sync; Tauri (desktop host) + Capacitor (mobile host) + PWA (players); Node + Fastify + Postgres + Valkey/NATS backend. All permissive-licensed (§5, §16).

---

## 3. Glossary

- **Campaign** — a single game world owned by one DM, joined by players.
- **Participant** — a connected user in a campaign session; role is `dm` or `player`.
- **Character** — a player-controlled sheet. One per player (DM may control extras).
- **Combatant** — an entry in the initiative order (a character or a monster instance).
- **Monster/NPC template** — a reusable DM-authored stat block.
- **Status** — a buff/debuff applied to a character or combatant, optionally timed.
- **Effect** — the atomic state-change primitive (§8).
- **Time-block** — the smallest in-world time unit = **6 hours**. A standard day = 4 blocks.
- **Phase** — a recurring slice of the day mapped to time-blocks (night/sunrise/day/sunset), each with a theme.
- **Cycle** — a longer recurring period (moon, season) with named sub-phases (premium).
- **Event table** — a weighted list of authored events in a category (`weather` | `enemies`).
- **Pack** — an exportable/importable JSON bundle (event tables, monsters, schema, etc.).

---

## 4. High-level architecture

```
            ┌─────────────────────────── CAMPAIGN (one Yjs document) ──────────────────────────┐
            │  Subdocs scoped for authority: shared, per-character, dm-private                  │
            └──────────────────────────────────────────────────────────────────────────────────┘
                         ▲                                   ▲                         ▲
            sync provider │ (one interface, two backends)     │                         │
        ┌────────────────┴───────────────┐        ┌──────────┴───────────┐   ┌─────────┴──────────┐
        │  LOCAL MODE (free, offline)     │        │  ONLINE MODE (premium)│   │  PERSISTENCE        │
        │  DM host = LAN ws server + mDNS │        │  Cloud ws cluster      │   │  IndexedDB (client) │
        │  Players join via QR / code     │        │  Accounts, Postgres,   │   │  Host file (desktop)│
        │  (installed app also auto-lists)│        │  Valkey/NATS fan-out   │   │  Postgres (cloud)   │
        └─────────────────────────────────┘        └────────────────────────┘   └─────────────────────┘
```

**Client roles**
- **Player client** — browser/PWA. Never hosts. Joins by QR/short-code (universal) or, if using the installed app on the same LAN, may pick from an auto-discovered list.
- **DM client** — same app, with host capability. Desktop host = Tauri (Rust runs the LAN server + mDNS). Mobile host = Capacitor with native plugins (local HTTP/WS server + NSD/Bonjour). Online, the DM does not host; the cloud does, so the DM may use a plain browser online.

**Single source of truth.** Per D-5, the host (local) or the cloud server (online) is authoritative for shared state and validates every write (§9). Yjs handles merge/transport; the authority layer handles *permission*.

---

## 5. Definitive tech stack (all permissive licenses)

| Layer | Choice | License | Notes |
|---|---|---|---|
| Language | TypeScript | Apache-2.0 | `strict: true` everywhere |
| Monorepo | pnpm workspaces + Turborepo | MIT | one repo, many packages |
| Frontend | React 18 + Vite | MIT | |
| Styling | Tailwind CSS + CSS variables for theming | MIT | tokens drive phase theming |
| UI primitives | Radix UI | MIT | accessible, unstyled |
| Client state (local UI) | Zustand | MIT | not for synced state |
| Synced state | **Yjs** (CRDT) + `y-indexeddb` | MIT | one Y.Doc per campaign, subdocs per scope |
| Validation | Zod | MIT | shared schemas, runtime guards |
| Desktop host | **Tauri 2** (Rust) | MIT/Apache-2.0 | LAN server + mDNS + file storage |
| Mobile host/client | **Capacitor** + custom native plugins | MIT | iOS/Android; plugins for LAN server + mDNS |
| PWA | Vite PWA plugin (Workbox) | MIT | installable players |
| Backend API/WS | Node + Fastify + `ws` | MIT | stateless, horizontally scalable |
| Database | PostgreSQL | PostgreSQL (permissive) | accounts, cloud saves, Yjs update log |
| Pub/sub & cache | **Valkey** (preferred) or **NATS** | BSD-3 / Apache-2.0 | **NOT Redis** — Redis core is SSPL/AGPL since 2024 (§16) |
| Object storage | S3-compatible (MinIO self-host or any S3) | Apache-2.0 / service | maps & handout images |
| Auth | JWT (access) + refresh tokens; Argon2id hashing | MIT | stateless access tokens |
| Billing | Stripe SDK | MIT SDK (paid service, no upfront cost) | subscription → tier entitlement |
| Dice (premium) | MIT-licensed dice-notation parser | MIT | verify at install (§16) |
| QR | MIT QR generate + scan libs | MIT | join flow |
| Testing | Vitest (unit), Playwright (e2e) | MIT/Apache-2.0 | |
| Lint/format | ESLint + Prettier | MIT | |

**[AGENT CHOICE]** Exact minor libraries may vary, but every one must pass the §16 license gate, and the categories above are fixed.

---

## 6. Scalability design (online mode)

Designed so a viral spike degrades gracefully, not catastrophically.

1. **Stateless nodes.** API and WebSocket nodes hold no durable state; any node can serve any request. Scale horizontally behind a load balancer.
2. **Room fan-out.** Each campaign is a "room." A node subscribes to that room's channel on **Valkey/NATS**; Yjs updates received from one client are persisted, then published to the channel; all nodes holding clients in that room relay to their sockets. This removes the need for sticky sessions and lets one campaign's clients live on different nodes.
3. **Durable Yjs.** Append synced updates to a Postgres `yjs_updates` table (campaign_id, update bytea, seq). Periodically compact into a snapshot (`yjs_snapshots`) and prune. On client (re)connect, server sends snapshot + updates-since-seq.
4. **Cold data.** Account, subscription, membership, and campaign metadata in normalized Postgres tables. Read replicas if read load demands.
5. **Assets.** Map/handout images go to object storage; serve via CDN; never through the WS layer.
6. **Backpressure & limits.** Per-connection message rate limits; per-campaign update-size caps; reject oversized binary; disconnect abusive clients.
7. **Observability.** Structured logs, per-room metrics (connections, update rate), health/readiness endpoints for the LB.
8. **Local mode is unaffected** — it never touches the cloud; the DM host is a single-room server.

---

## 7. Data model (the contract)

Define all of this in `packages/shared` as Zod schemas + inferred TS types. Synced collections live in the campaign Y.Doc; account/billing live in Postgres.

### 7.1 Account & billing (Postgres, online only)
- **User**: `id, email (unique), passwordHash, displayName, tier ('free'|'premium'), createdAt`.
- **Subscription**: `userId, stripeCustomerId, status, currentPeriodEnd, tier`. Tier on User is derived from active subscription.
- **RefreshToken**: `id, userId, hash, expiresAt, revokedAt`.
- **CloudCampaign**: `id, ownerUserId, name, snapshotRef, updatedAt`. Enforce ≤5 per premium user; 0 for free.
- **Membership**: `campaignId, userId|anonId, role ('dm'|'player'), characterId?, joinedAt`. (Online memberships in Postgres; local memberships in the Y.Doc.)

### 7.2 Campaign (Y.Doc root)
- **Campaign**: `id, name, createdAt, settings, calendarConfig, themeConfig`.
- **Subdoc scopes** (for authority, §9): `shared`, `character:{id}` (one per character), `dm` (DM-private).

### 7.3 Characters & sheet schema (in `shared` + `character:{id}`)
- **StatFieldDef** (campaign-level template): `id, label, type ('number'|'text'|'toggle'|'gauge'), defaultValue, group?, order`.
- **CurrencyDef** (campaign-level): `id, name, abbreviation, order`.
- **Character** (`character:{id}`): `id, name, ownerParticipantId, locked (bool), hp {current,max}, statValues {fieldId: value}, currencies {currencyId: number}, statuses [StatusInstance], inventory [Item], avatarRef?`.
- **Item**: `id, name, description, quantity (default 1), equipped (bool), effectsOnEquip [Effect]` (effects applied while equipped, removed on unequip).

### 7.4 Statuses (buffs/debuffs)
- **StatusDef** (optional reusable, campaign-level): `id, name, description?, color?, icon?, duration {mode:'rounds'|'time'|'manual', amount?}, effects [Effect]`.
- **StatusInstance** (on a character/combatant): `id, defId?, nameSnapshot, color?, remaining? (number, in the duration's unit), effects [Effect]`. Effects are active while the status is; engine applies on add, reverses on removal/expiry.

### 7.5 Monsters / NPCs & encounters (`dm` scope)
- **MonsterTemplate**: `id, name, hp {current,max}, statValues {fieldId:value}, statuses [StatusInstance], notes?`.
- **Encounter**: `id, name, entries [{templateId, count}], notes?`. "Send to combat" instantiates combatants.

### 7.6 Combat (`shared`, DM-authoritative)
- **CombatState**: `active (bool), round (int ≥1), turnIndex (int), combatants [Combatant]`.
- **Combatant**: `id, source ('character'|'monster'), refId, label (e.g. "Goblin 2"), initiative (number), hp {current,max}, statuses [StatusInstance]`.
- Players may set/adjust **only their own character's** `initiative`; DM may adjust any via stepper.

### 7.7 Time, calendar, phases, cycles (`shared`)
- **TimeState**: `blocks (int — count of 6h blocks since campaign epoch)`. Derive date/phase/cycle from this + config.
- **CalendarConfig**: free preset = Gregorian `{ daysPerWeek:7, weekdays[], months:[{name,days}], blocksPerDay:4 }`. **Premium custom**: editable months/weekdays/lengths (still 6h blocks; `blocksPerDay` configurable).
- **PhaseDef** (4 built-ins, free): `night, sunrise, day, sunset`, each `{ blockIndexes:[…], theme }`. DM may remap which block index = which phase.
- **CycleDef** (premium): `id, name, totalBlocks, subPhases:[{ name, lengthBlocks, theme?, effects:[Effect] }]`. Multiple cycles run concurrently. Engine computes current sub-phase via `(blocks - offset) mod totalBlocks`.
- **ThemeConfig / Theme**: `{ palette: {…CSS-variable tokens}, backgroundRef? }`. Applied by active phase/sub-phase (§11 themes are free for the 4 day-phases; custom-phase themes are premium).

### 7.8 Random events (`dm` scope; results post to `shared` feed)
- **EventTable**: `id, category ('weather'|'enemies'), name, entries [EventEntry], scope? { cycleId?, subPhaseName?, phase? }` (scope = premium).
- **EventEntry**: `id, label, weight (number), description?, effects [Effect], monsters? [{templateId, count}]` (enemies entries may load combatants).
- **EventResult** (broadcast): `id, tableId, entryId, rolledAt, appliedEffectIds[]`.

### 7.9 DM extras (`dm` + reveal-controlled `shared`)
- **Note**: `id, title, body (markdown), tags?, visibility ('dm'|'shared')`.
- **Handout**: `id, type ('image'|'text'), assetRef?|body?, revealed (bool), revealedTo? [participantId]`.
- **MapDoc**: `id, name, assetRef, pins [{x,y,label,color}], revealed (bool)`. **Fog-of-war is an explicit stretch sub-feature** inside Phase 9 — ship image + pins + reveal first.

### 7.10 Dice (premium, `shared` feed)
- **RollLog entry**: `id, actorId, expression (e.g. "2d6+3"), mode? ('adv'|'dis'), result, breakdown[], rolledAt`. Broadcast to the table feed.

---

## 8. The Effect engine (single primitive)

**One module** in `packages/shared/effects`. Everything that "does something" emits Effects; the engine applies them. No feature applies state changes directly.

### 8.1 Effect shape
```ts
type Effect = {
  id: string;
  type: 'apply_status' | 'remove_status' | 'modify_stat' | 'modify_hp' | 'notify' | 'set_theme';
  target: EffectTarget;        // who/what
  payload: EffectPayload;      // per-type (Zod-discriminated union)
};

type EffectTarget =
  | { kind: 'all_players' }
  | { kind: 'players'; ids: string[] }
  | { kind: 'combatants'; ids: string[] }
  | { kind: 'self' }           // resolves to the emitting entity
  | { kind: 'scene' };         // campaign-wide (e.g. theme)
```

### 8.2 Payloads by type
- **apply_status**: `{ statusDefId?: string; inline?: StatusInstance }`
- **remove_status**: `{ statusName: string }`
- **modify_stat**: `{ fieldId: string; op: 'set'|'delta'; value: number }`
- **modify_hp**: `{ op: 'damage'|'heal'|'set'; amount: number }`
- **notify**: `{ message: string; severity: 'info'|'warning'|'danger' }`
- **set_theme**: `{ themeRef: string }` (override until cleared)

### 8.3 Engine API
```ts
applyEffects(effects: Effect[], ctx: EffectContext): EffectMutation[]
revertEffects(effects: Effect[], ctx: EffectContext): EffectMutation[]  // for un-equip / status expiry
resolveTargets(target: EffectTarget, ctx: EffectContext): EntityRef[]
```
- **Pure resolution, transactional apply.** `applyEffects` computes mutations, then commits them to the Y.Doc inside one transaction so peers see an atomic change.
- **Reversibility.** Status- and equip-driven effects must be revertible. Store enough on the StatusInstance/Item to reverse `modify_stat`/`modify_hp` deltas. (`set` ops snapshot the prior value.)
- **Permission.** The engine runs only on the authoritative side for shared targets; player-self effects run locally then validate (§9).

### 8.4 Triggers (who calls the engine)
- **Event fired & confirmed** → apply entry's effects; if `monsters`, instantiate combatants into CombatState.
- **Status added** → apply effects; **status expires/removed** → revert.
- **Phase/sub-phase entered** (time advance) → apply that phase's effects; reverting on leaving is configurable per effect (default: theme overrides clear, stat modifiers from phases are one-shot unless wrapped in a status).
- **Item equipped** → apply `effectsOnEquip`; **unequipped** → revert.

**Acceptance:** a single integration test wires one Effect through an event, a status, a phase, and an item, asserting identical resulting mutations and correct reversal.

---

## 9. Sync & authority

### 9.1 Transport
- One **Y.Doc per campaign**, partitioned into subdocs: `shared`, `dm`, and `character:{id}` per character.
- Providers implement a common `SyncProvider` interface: `LocalProvider` (LAN ws to DM host) and `CloudProvider` (ws to cloud cluster). Plus `y-indexeddb` for local durability on every client; plus host file persistence (desktop) and Postgres persistence (cloud).

### 9.2 Permission model (enforced on the authoritative side)
CRDT merges everything by default, so **the host/server must gate writes** — Yjs does transport, this layer does permission:
- A client may push updates to `character:{id}` **only if** it owns that character (and the character is not `locked` by the DM, except DM pushes).
- Only the **DM** may push to `shared` (combat, time, events feed) and `dm`.
- The authoritative side validates each incoming update's origin against role + ownership. **Unauthorized updates are dropped and not relayed**, and the offending client is sent the authoritative state to correct its local copy.
- **Conflict policy:** DM-wins on shared state. For a character, owner-wins unless DM has locked it (then DM-wins).

**[AGENT NOTE]** Implement permission by (a) tagging each origin with `{participantId, role}` and (b) per-subdoc relay gating. Do not rely on client-side checks alone.

### 9.3 Join flows
- **Local (free):** DM starts host → host advertises via mDNS and shows a **QR + 4–6 char code** encoding `http(s)://<lan-ip>:<port>/join?c=CODE`. Players scan/enter → browser connects → pick character or create one (DM approves). Installed-app players on the same LAN may instead pick the host from an **auto-discovered list** (mDNS browse). Browser players always use QR/code.
- **Online (premium):** DM (logged in) opens campaign → invite code/link → players (logged in) join via cloud. Accounts required for all online participants; only the DM needs premium.

### 9.4 Offline/reconnect
- Clients keep working from IndexedDB while disconnected (player can edit own sheet). On reconnect, Yjs merges; the authority layer re-validates and corrects any disallowed divergence.

---

## 10. Feature modules

Each module: **purpose / data / UI / behavior / acceptance**. All conform to §7–§9.

### 10.1 Character sheets
- **Data:** §7.3.
- **UI:** sheet view per character. Sections: identity (name/avatar), HP gauge, stat fields (rendered by type), currency row, statuses (read-only list for players; DM-editable), inventory list with equip toggles. DM gets a campaign **schema editor** (add/reorder/remove StatFieldDef and CurrencyDef).
- **Behavior:** players edit their own sheet live; HP and gauges have +/- steppers and direct entry; DM can edit any sheet and toggle **lock** (whole-sheet; locked = player read-only). Equip toggle applies/reverts item effects via the engine.
- **Acceptance:** player edits sync live to DM; DM lock blocks player writes (verified by the authority layer, not just UI); schema change propagates to all characters; equipping an item with a `modify_stat` effect changes the stat and unequipping reverts it exactly.

### 10.2 Initiative & combat tracker
- **Data:** §7.6.
- **UI:** ordered list sorted by `initiative` desc (stable on ties, DM-reorderable). Each row: label, initiative stepper, HP gauge, status chips. Controls: start/end combat, next turn, next round (round counter), add monster (from template or ad-hoc), duplicate (auto-number "Goblin 1/2/3"), remove. "Load encounter" button.
- **Behavior:** players set their own initiative (physically rolled, entered on their device; premium can roll in-app, §10.6) → populates order live; DM can nudge any value. **Round-counted statuses tick at the start of each round** and expire at 0 (via the Effect engine revert). Turn pointer advances per "next turn"; wraps to "next round."
- **Acceptance:** ties stable + reorderable; duplicating a monster yields independent HP/initiative; a 2-round status expires after exactly two "next round" presses and its effects revert; player A cannot set player B's initiative.

### 10.3 Time, calendar, phases & cycles
- **Data:** §7.7.
- **UI:** DM clock control: advance by +1 block (6h), +1 day, custom. Current date/time + active phase + active cycle sub-phases displayed to all. DM calendar editor (premium for custom). DM cycle editor (premium).
- **Behavior:** advancing time recomputes phase + cycles; entering a new phase/sub-phase fires its effects through the engine and swaps the theme (§11). **Time-based statuses tick by elapsed blocks** and expire/revert. Free users get Gregorian + the 4 day-phases (themes included free); custom calendar and custom cycles are premium-gated.
- **Acceptance:** advancing 4 blocks = +1 day and cycles through all four phases; a "lasts 1 day" (4-block) status expires after +1 day; a custom moon cycle and a season run concurrently and both report correct sub-phases; gating blocks free users from the custom editors.

### 10.4 Random events
- **Data:** §7.8.
- **UI:** **visual table editor** (add entries, set weight, description, attach effects via an Effect builder, attach monsters for `enemies`). Per category (weather, enemies). A "Roll" button per table. Result modal showing the rolled entry + a confirm-to-apply step. Import/Export pack buttons (JSON; local file free, cloud-stored premium).
- **Behavior:** roll = weighted random pick → preview → DM confirms → effects apply through the engine; `enemies` entries instantiate combatants into CombatState. Optional scope (premium) ties odds to cycle/phase.
- **Acceptance:** weighting is statistically correct over N rolls (test with fixed RNG seed); confirming an enemies event adds the right combatants; exported pack re-imports to an identical table; scope filtering only surfaces in-scope entries.

### 10.5 DM management (NPC library, encounters, notes, maps, handouts, reveal)
- **Data:** §7.5, §7.9.
- **UI:** monster/NPC library (CRUD stat blocks); encounter builder (compose templates + counts, "send to combat"); notes (markdown, DM/shared visibility); handouts (image/text with reveal toggle and per-player targeting); maps (image upload, pins, reveal). Players see only revealed handouts/maps and shared notes.
- **Behavior:** reveal flips visibility in `shared`; images go to object storage (online) or host/local store (local). **Fog-of-war = stretch** within this module after image+pins+reveal work.
- **Acceptance:** an unrevealed handout is invisible in the player client's synced state (not merely hidden in UI); revealing it appears live; encounter "send to combat" matches §10.2 instantiation; image upload enforces type/size limits (§15).

### 10.6 Dice roller (premium)
- **Data:** §7.10.
- **UI:** dice tray (d4–d100, expression input `2d6+3`, advantage/disadvantage on d20). Shared roll feed visible to the table.
- **Behavior:** premium-gated; free users enter results manually into fields. Rolls broadcast to `shared` feed.
- **Acceptance:** expression parsing correct; adv/dis takes the right value; rolls appear in all clients' feed; free tier sees the manual-entry path and an upgrade prompt.

### 10.7 Accounts, tiers & billing
- **Data:** §7.1.
- **UI:** sign up / log in (online only); account page showing tier and cloud-save usage (x/5); upgrade flow.
- **Behavior:** Argon2id hashing; JWT access (short-lived) + rotating refresh tokens; Stripe subscription webhook sets `tier`. **Entitlement checks live server/host-side** (§12), never UI-only. Local mode requires no account.
- **Acceptance:** free account blocked from online play, in-app dice, custom calendar/cycles, and cloud saves; premium unlocks all; 6th cloud save is rejected; logging in offline-capable local mode is never required.

### 10.8 Networking & hosting
- **Local host (desktop, Tauri):** Rust runs an HTTP+WS server bound to LAN, serves the player web bundle, advertises via mDNS, persists the Y.Doc to a local file. Start/stop from DM UI.
- **Local host (mobile, Capacitor):** custom native plugins — (a) embedded HTTP/WS server, (b) NSD (Android) / Bonjour (iOS) advertise+browse. Same JS host logic as desktop behind a `LocalHostService` interface.
- **Online:** Fastify + `ws` cluster per §6.
- **Acceptance:** two phones + one laptop on the same wifi, **internet cable unplugged**, achieve live sync via the DM host; a browser player joins by scanning the host QR; an installed-app player sees the host in an auto-discovered list; killing/relaunching the host restores state from disk.

### 10.9 Persistence & backup
- Every client: `y-indexeddb`. Desktop host: file snapshots. Cloud: Postgres update log + snapshots (§6).
- **Export/Import:** full-campaign and per-pack JSON. Local file = free; cloud storage of saves = premium (≤5).
- **Acceptance:** clearing browser storage then importing a backup restores a campaign byte-for-byte (semantic equality); cloud save count enforced.

### 10.10 Theming
- See §11.

---

## 11. Theming system

- A **Theme** is a set of CSS-variable tokens (`--bg`, `--surface`, `--text`, `--accent`, `--danger`, …) + optional background image. All components style **only** via these tokens — no hard-coded colors.
- **Four free day-phase themes**: night, sunrise, day, sunset. The active phase (from TimeState) sets the active theme with a smooth transition.
- **Premium custom phases/cycles** may define their own themes/backgrounds; the engine's `set_theme` effect can override temporarily (e.g., a storm event).
- **Acceptance:** advancing time visibly transitions the palette; an event's `set_theme` overrides then clears; no component references a literal color (lint rule enforces token usage).

---

## 12. Freemium gating

| Capability | Free | Premium | Enforcement point |
|---|---|---|---|
| Local LAN play | ✅ | ✅ | none |
| Local campaigns | unlimited | unlimited | none |
| Online play | ❌ | ✅ | cloud connect: reject non-premium DM |
| In-app dice | ❌ | ✅ | server/host capability check |
| Custom calendar | ❌ | ✅ | editor gate + server validate |
| Custom phases/cycles | ❌ | ✅ | editor gate + server validate |
| Cloud saves | 0 | 5 | API rejects >5 / any for free |
| Cloud-stored packs | ❌ | ✅ | API |
| Import/export to local file | ✅ | ✅ | none |

**Rule:** UI hides/locks premium features for clarity, but every gate is **re-checked server/host-side**. A tampered client must not gain premium behavior.

---

## 13. Build phases (everything ships; this is sequence, not scope)

- **Phase 0 — Foundation.** Monorepo, TS strict, ESLint/Prettier, Vitest/Playwright, CI with the §16 license gate, `packages/shared` (Zod schemas/types per §7), design tokens + Tailwind config, empty app shells (web, Tauri, Capacitor).
  - *Done when:* CI green, license gate runs, shared types compile, blank app boots on web + desktop + mobile.
- **Phase 1 — Local single-device core.** Y.Doc + subdocs + `y-indexeddb`; character sheets (schema editor, stats, HP, currency, inventory, statuses display); DM vs player views; whole-sheet lock. No networking between devices yet.
  - *Done when:* §10.1 acceptance passes on a single device.
- **Phase 2 — Effect engine.** §8 fully, with statuses (durations placeholder = manual), reversibility, the cross-trigger integration test.
- **Phase 3 — Initiative & combat.** §10.2 including monster templates, encounters scaffold, round-counted status ticking.
- **Phase 4 — Time & theming.** §10.3 + §11; wire time-based status ticking; free calendar + 4 phases; premium custom editors (gated, gate stubbed until Phase 7).
- **Phase 5 — Random events.** §10.4 incl. visual editor, weighting, monster instantiation, local import/export.
- **Phase 6 — LAN multiplayer.** `SyncProvider` interface; `LocalProvider`; Tauri host (server + mDNS + file persistence); QR/code join; player browser clients; **authority/permission layer (§9.2)**; mobile host plugins; auto-discovery enhancement.
  - *Done when:* §10.8 acceptance passes (offline, multi-device, live).
- **Phase 7 — Accounts + online + scale + billing.** Auth, cloud `CloudProvider`, scalable backend (§6), cloud saves, tier entitlement enforcement, Stripe hooks, activate all premium gates (§12).
- **Phase 8 — Dice (premium).** §10.6.
- **Phase 9 — DM extras.** Notes, maps, handouts, reveal-to-player, object storage; then fog-of-war stretch.
- **Phase 10 — Hardening.** Packaging (PWA install, Tauri installers, Capacitor builds), security pass (§15), performance/backpressure, accessibility, full e2e suite, docs.

---

## 14. Repository structure

```
frogs-world/
  packages/
    shared/        # Zod schemas, types, effect engine, sync schema, domain logic (no UI)
    ui/            # React components styled only via theme tokens
    web/           # Vite PWA app (players + online DM)
    host-desktop/  # Tauri app (DM desktop host)
    host-mobile/   # Capacitor app + native plugins (DM mobile host / app players)
    server/        # Fastify + ws + Postgres + Valkey/NATS (online)
  tooling/         # license-gate script, CI config
```
Conventions: TS `strict`; all synced data flows through `shared`; UI imports domain logic from `shared`, never reimplements it; no literal colors in `ui`/`web` (lint-enforced).

---

## 15. Security & privacy

- Validate all inputs with Zod at trust boundaries (WS messages, API, imports).
- Authority/permission checks on the authoritative side for every write (§9.2); entitlement checks for every premium action (§12).
- Argon2id passwords; short-lived JWT access + rotating refresh tokens; revoke on logout.
- HTTPS/WSS online; strict CSP; sanitize markdown (notes/handouts) to prevent XSS.
- Upload limits: images only (mime + magic-byte check), size cap (e.g. ≤10 MB), strip EXIF; store in object storage, never inline in the Y.Doc.
- Rate-limit WS messages and auth endpoints; cap per-campaign update size; disconnect abusive clients.
- Minimize PII (email + display name only). Local mode stores no server-side data.

---

## 16. Licensing compliance (hard gate)

- **Allowed licenses only:** MIT, Apache-2.0, BSD-2/3-Clause, ISC, Unlicense/public-domain, PostgreSQL license. Anything else fails CI.
- **Explicitly forbidden:** GPL, LGPL (when it would force relinking obligations on a closed binary), AGPL, SSPL, and any "source-available/non-OSI" license. **In particular, do NOT use Redis core** (relicensed to SSPL/RSAL, with an AGPL option, since 2024) — use **Valkey** (BSD-3) or **NATS** (Apache-2.0).
- **CI gate:** a license-scanning step (e.g. an MIT-licensed checker) runs on every install; the build fails on any disallowed or unknown license. Maintain an `ALLOWED_LICENSES` allowlist and a reviewed-exceptions file.
- **No bundled ruleset content** (D-4). If you ever ship optional seed packs derived from an SRD, they must be SRD-licensed content only, with CC-BY-4.0 attribution included in the pack and an in-app credits screen. Default ships with **none**.
- **Trademark:** keep the name and branding original (no third-party game names/logos/trade dress anywhere in code, assets, or store listings).

---

## 17. Definition of done (whole product)

All phase acceptance criteria pass; full e2e suite green on web + desktop + mobile; the offline multi-device LAN test passes with internet disconnected; premium gates verified server-side against a tampered client; license gate green; backup export/import round-trips a full campaign; performance holds under a scripted spike of concurrent rooms in online mode.

---

## 18. Open items deliberately deferred to product/business (not blocking the build)

- Exact premium price and trial terms (billing hooks are built; values are config).
- Additional event categories beyond weather/enemies (architecture supports adding categories later via the same EventTable model).
- Localization (token/theme system is i18n-friendly; strings should be externalized from Phase 0 to make this cheap later).
