import { z } from 'zod';

// 7.1 Account & Billing
export const UserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  passwordHash: z.string(),
  displayName: z.string(),
  tier: z.enum(['free', 'premium']),
  createdAt: z.string(),
});
export type User = z.infer<typeof UserSchema>;

export type Spell = z.infer<typeof SpellSchema>;

// ====== NEW: Spells Compendium ======
export const SpellSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  level: z.number(),
  school: z.string(),
  classes: z.array(z.string()),
  castingTime: z.string().optional(),
  range: z.string(),
  components: z.array(z.string()),
  duration: z.string(),
  description: z.string(),
  concentration: z.boolean().optional(),
  ritual: z.boolean().optional(),
  upgradeText: z.string().nullable().optional(),
  isCustom: z.boolean().default(false),
  isShared: z.boolean().default(true),
  authorId: z.string().optional(),
  higherLevelSlot: z.string().optional(),
  material: z.string().nullable().optional()
});

export const MagicItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  type: z.string(),
  rarity: z.string(),
  requiresAttunement: z.boolean(),
  description: z.string()
});
export type MagicItem = z.infer<typeof MagicItemSchema>;

export const BestiaryItemSchema = z.object({
  id: z.string().optional(),
  name: z.string(),
  size: z.string(),
  type: z.string(),
  alignment: z.string(),
  ac: z.string(),
  hp: z.string(),
  speed: z.string(),
  stats: z.object({
    str: z.string(), str_mod: z.string(),
    dex: z.string(), dex_mod: z.string(),
    con: z.string(), con_mod: z.string(),
    int: z.string(), int_mod: z.string(),
    wis: z.string(), wis_mod: z.string(),
    cha: z.string(), cha_mod: z.string()
  }),
  savingThrows: z.string().optional(),
  skills: z.string().optional(),
  damageResistances: z.string().optional(),
  damageVulnerabilities: z.string().optional(),
  damageImmunities: z.string().optional(),
  conditionImmunities: z.string().optional(),
  senses: z.string().optional(),
  languages: z.string().optional(),
  cr: z.string(),
  traits: z.string().optional(),
  actions: z.string().optional(),
  legendaryActions: z.string().optional(),
  imgUrl: z.string().nullable().optional(),
  isCustom: z.boolean().default(false),
  isShared: z.boolean().default(true),
  authorId: z.string().optional(),
  isRevealed: z.boolean().default(false)
});
export type BestiaryItem = z.infer<typeof BestiaryItemSchema>;

export const SubscriptionSchema = z.object({
  userId: z.string(),
  stripeCustomerId: z.string(),
  status: z.string(),
  currentPeriodEnd: z.string(),
  tier: z.enum(['free', 'premium']),
});
export type Subscription = z.infer<typeof SubscriptionSchema>;

export const CloudCampaignSchema = z.object({
  id: z.string(),
  ownerUserId: z.string(),
  name: z.string(),
  snapshotRef: z.string().optional(),
  updatedAt: z.string(),
});
export type CloudCampaign = z.infer<typeof CloudCampaignSchema>;

// 7.2 Campaign
export const CampaignSettingsSchema = z.object({
  // TBD
});

export const CampaignSchema = z.object({
  id: z.string(),
  name: z.string(),
  createdAt: z.string(),
  settings: CampaignSettingsSchema,
  calendarConfig: z.any(),
  themeConfig: z.any(),
});
export type Campaign = z.infer<typeof CampaignSchema>;

// 7.3 Map Feature
export const MapPinSchema = z.object({
  id: z.string(),
  mapId: z.string(),
  x: z.number(),
  y: z.number(),
  color: z.string(),
  label: z.string().optional(),
  createdBy: z.enum(['dm', 'player']).optional(),
});
export type MapPin = z.infer<typeof MapPinSchema>;

// 7.4 Characters
export const CharacterProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  charClass: z.string(),
  level: z.number().default(1),
  species: z.string().optional(),
  proficiencies: z.array(z.string()).optional(),
  features: z.array(z.any()).optional(),
});
export type CharacterProfile = z.infer<typeof CharacterProfileSchema>;

export const StatFieldDefSchema = z.object({
  id: z.string(),
  label: z.string(),
  type: z.enum(['number', 'text', 'toggle', 'gauge']),
  defaultValue: z.any(),
  group: z.string().optional(),
  order: z.number(),
});
export type StatFieldDef = z.infer<typeof StatFieldDefSchema>;

export const CurrencyDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  abbreviation: z.string(),
  order: z.number(),
});
export type CurrencyDef = z.infer<typeof CurrencyDefSchema>;

export const EffectTargetSchema = z.union([
  z.object({ kind: z.literal('all_players') }),
  z.object({ kind: z.literal('players'), ids: z.array(z.string()) }),
  z.object({ kind: z.literal('combatants'), ids: z.array(z.string()) }),
  z.object({ kind: z.literal('self') }),
  z.object({ kind: z.literal('scene') }),
]);
export type EffectTarget = z.infer<typeof EffectTargetSchema>;

export const EffectPayloadSchema = z.any(); // Details in 8.2

export const EffectSchema = z.object({
  id: z.string(),
  type: z.enum(['apply_status', 'remove_status', 'modify_stat', 'modify_hp', 'notify', 'set_theme']),
  target: EffectTargetSchema,
  payload: EffectPayloadSchema,
});
export type Effect = z.infer<typeof EffectSchema>;

export const StatusInstanceSchema = z.object({
  id: z.string(),
  defId: z.string().optional(),
  nameSnapshot: z.string(),
  color: z.string().optional(),
  remaining: z.number().optional(),
  effects: z.array(EffectSchema),
  revertData: z.record(z.any()).optional(),
});
export type StatusInstance = z.infer<typeof StatusInstanceSchema>;

export const ItemTypeSchema = z.string();

export const ItemTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: ItemTypeSchema,
  attunement: z.boolean(),
  damage: z.string().optional(),
  effectDescription: z.string().optional(),
  effectsOnEquip: z.array(EffectSchema).optional(),
  visibleToAll: z.boolean().default(true),
  creatorId: z.string().optional(),
  validSlots: z.array(z.string()).optional(),
});
export type ItemTemplate = z.infer<typeof ItemTemplateSchema>;

export const ItemSchema = z.object({
  id: z.string(),
  templateId: z.string().optional(),
  name: z.string(),
  type: ItemTypeSchema,
  attunement: z.boolean(),
  damage: z.string().optional(),
  effectDescription: z.string().optional(),
  quantity: z.number().default(1),
  equipped: z.boolean(),
  effectsOnEquip: z.array(EffectSchema),
  revertData: z.record(z.any()).optional(),
  validSlots: z.array(z.string()).optional(),
});
export type Item = z.infer<typeof ItemSchema>;

export const EquipmentItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  equipmentCategory: z.string(),
  cost: z.union([z.string(), z.record(z.any())]).optional(),
  weight: z.union([z.number(), z.string()]).optional(),
  description: z.string(),
  damage: z.string().optional(),
  properties: z.array(z.string()).optional(),
  armorClass: z.union([z.string(), z.number()]).optional(),
  stealthDisadvantage: z.boolean().optional(),
  strengthRequirement: z.number().optional(),
  isCustom: z.boolean().default(false),
  isShared: z.boolean().default(true),
  authorId: z.string().default("SYSTEM"),
});
export type EquipmentItem = z.infer<typeof EquipmentItemSchema>;

export const ClassFeatureSchema = z.object({
  id: z.string(),
  name: z.string(),
  className: z.string(),
  levelRequired: z.number(),
  description: z.string(),
  isCustom: z.boolean().default(false),
  isShared: z.boolean().default(true),
  authorId: z.string().default("SYSTEM"),
});
export type ClassFeature = z.infer<typeof ClassFeatureSchema>;

export const FeatSchema = z.object({
  id: z.string(),
  name: z.string(),
  prerequisite: z.string().nullable(),
  description: z.string(),
  isCustom: z.boolean().default(false),
  isShared: z.boolean().default(true),
  authorId: z.string().default("SYSTEM"),
});
export type Feat = z.infer<typeof FeatSchema>;

export const EquipmentSchema = z.object({
  head: ItemSchema.nullable().optional(),
  mask: ItemSchema.nullable().optional(),
  torso: ItemSchema.nullable().optional(),
  hands: ItemSchema.nullable().optional(),
  belt: ItemSchema.nullable().optional(),
  feet: ItemSchema.nullable().optional(),
  ring1: ItemSchema.nullable().optional(),
  ring2: ItemSchema.nullable().optional(),
  amulet: ItemSchema.nullable().optional(),
  mainHand: ItemSchema.nullable().optional(),
  offHand: ItemSchema.nullable().optional(),
});
export type EquipmentMap = z.infer<typeof EquipmentSchema>;

export const CharacterSchema = z.object({
  id: z.string(),
  name: z.string(),
  charClass: z.string().optional(),
  level: z.number().default(1),
  species: z.string().optional(),
  ownerParticipantId: z.string(),
  locked: z.boolean(),
  hp: z.object({ current: z.number(), max: z.number() }),
  statValues: z.record(z.any()),
  currencies: z.record(z.number()),
  statuses: z.array(StatusInstanceSchema),
  conditions: z.array(z.string()).default([]),
  mainStorage: z.array(ItemSchema),
  extraPlanarStorage: z.array(ItemSchema),
  equipment: EquipmentSchema,
  avatarRef: z.string().optional(),
  feats: z.array(FeatSchema).default([]),
});
export type Character = z.infer<typeof CharacterSchema>;

// 7.4 Statuses
export const StatusDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  color: z.string().optional(),
  duration: z.object({ mode: z.enum(['rounds', 'time', 'manual']), amount: z.number().optional() }),
  effects: z.array(EffectSchema),
});
export type StatusDef = z.infer<typeof StatusDefSchema>;

// 7.5 Monsters
export const MonsterTemplateSchema = z.object({
  id: z.string(),
  name: z.string(),
  hp: z.object({ current: z.number(), max: z.number() }),
  statValues: z.record(z.any()),
  statuses: z.array(StatusInstanceSchema),
  notes: z.string().optional(),
});
export type MonsterTemplate = z.infer<typeof MonsterTemplateSchema>;

export const EncounterSchema = z.object({
  id: z.string(),
  name: z.string(),
  entries: z.array(z.object({ templateId: z.string(), count: z.number() })),
  notes: z.string().optional(),
});
export type Encounter = z.infer<typeof EncounterSchema>;

// 7.6 Combat
export const CombatantSchema = z.object({
  id: z.string(),
  source: z.enum(['character', 'monster']),
  refId: z.string(),
  label: z.string(),
  initiative: z.number(),
  ac: z.number(),
  hp: z.object({ current: z.number(), max: z.number() }),
  statuses: z.array(StatusInstanceSchema),
  conditions: z.array(z.string()).default([]),
});
export type Combatant = z.infer<typeof CombatantSchema>;

export const CombatStateSchema = z.object({
  active: z.boolean(),
  round: z.number(),
  turnIndex: z.number(),
  combatants: z.array(CombatantSchema),
});
export type CombatState = z.infer<typeof CombatStateSchema>;

// 7.7 Time
export const TimeStateSchema = z.object({
  blocks: z.number(),
  gameTimeMs: z.number().optional(),
  lastRealTimeMs: z.number().optional(),
  timeScale: z.number().optional(),
  isRunning: z.boolean().optional(),
});
export type TimeState = z.infer<typeof TimeStateSchema>;

export const PhaseDefSchema = z.object({
  blockIndexes: z.array(z.number()),
  theme: z.any(),
});
export type PhaseDef = z.infer<typeof PhaseDefSchema>;

export const CycleDefSchema = z.object({
  id: z.string(),
  name: z.string(),
  totalBlocks: z.number(),
  subPhases: z.array(
    z.object({
      name: z.string(),
      lengthBlocks: z.number(),
      theme: z.any().optional(),
      effects: z.array(EffectSchema),
    })
  ),
});
export type CycleDef = z.infer<typeof CycleDefSchema>;

// 7.8 Events
export const EventEntrySchema = z.object({
  id: z.string(),
  label: z.string(),
  weight: z.number(),
  description: z.string().optional(),
  effects: z.array(EffectSchema),
  monsters: z.array(z.object({ templateId: z.string(), count: z.number() })).optional(),
});
export type EventEntry = z.infer<typeof EventEntrySchema>;


export const MoonPhaseNamesSchema = z.tuple([
  z.string(), z.string(), z.string(), z.string(), 
  z.string(), z.string(), z.string(), z.string()
]);
export type MoonPhaseNames = z.infer<typeof MoonPhaseNamesSchema>;

export const MoonConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  cycleLengthDays: z.number(),
  phaseOffsetDays: z.number(),
  color: z.string().optional(),
  customPhases: MoonPhaseNamesSchema.optional(),
  isVisibleToPlayers: z.boolean().default(false),
});
export type MoonConfig = z.infer<typeof MoonConfigSchema>;

export interface CalendarConfig {
  weekdays: string[];
  months: { name: string; days: number }[];
  startYear: number;
  moons?: MoonConfig[];
}

export const EventTableSchema = z.object({
  id: z.string(),
  category: z.enum(['weather', 'enemies']),
  name: z.string(),
  entries: z.array(EventEntrySchema),
  scope: z.object({ cycleId: z.string().optional(), subPhaseName: z.string().optional(), phase: z.string().optional() }).optional(),
});
export type EventTable = z.infer<typeof EventTableSchema>;

export const EventResultSchema = z.object({
  id: z.string(),
  tableId: z.string(),
  entryId: z.string(),
  rolledAt: z.string(),
  appliedEffectIds: z.array(z.string()),
});
export type EventResult = z.infer<typeof EventResultSchema>;

export const GlobalEffectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  sourceTableId: z.string().optional(),
});
export type GlobalEffect = z.infer<typeof GlobalEffectSchema>;

// 7.9 DM Extras

export const NoteSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string().optional(),
  body: z.string().optional(),
  inGameDateString: z.string().optional(),
  inGameDayNumber: z.number().optional(),
  category: z.string().optional(),
  authorId: z.string().optional(),
});
export type Note = z.infer<typeof NoteSchema>;

export const HandoutSchema = z.object({
  id: z.string(),
  title: z.string(),
  textContent: z.string().optional(),
  imageBase64: z.string().optional(),
  isRevealed: z.boolean().default(false)
});
export type Handout = z.infer<typeof HandoutSchema>;

export const MapDocSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetRef: z.string(),
  pins: z.array(z.object({ x: z.number(), y: z.number(), label: z.string(), color: z.string() })),
  revealed: z.boolean(),
});
export type MapDoc = z.infer<typeof MapDocSchema>;

// 7.10 Dice
export const RollLogEntrySchema = z.object({
  id: z.string(),
  actorId: z.string(),
  expression: z.string(),
  mode: z.enum(['adv', 'dis']).optional(),
  result: z.number(),
  breakdown: z.array(z.any()),
  rolledAt: z.string(),
});
export type RollLogEntry = z.infer<typeof RollLogEntrySchema>;

// 7.11 Chat Messages
export const ChatMessageSchema = z.object({
  id: z.string(),
  authorId: z.string(),
  authorName: z.string(),
  characterId: z.string().optional(),
  isIC: z.boolean(),
  content: z.string(),
  timestamp: z.number(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;
