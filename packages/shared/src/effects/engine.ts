import type { Effect, EffectTarget } from '../schema';
import { CampaignStore } from '../store';

export type EffectContext = {
  sourceId: string; // The charId or 'dm' or 'system'
  store: CampaignStore;
};

export type EffectMutation = 
  | { type: 'modify_stat'; targetId: string; statId: string; amount: number; isDelta: boolean }
  | { type: 'modify_hp'; targetId: string; amount: number; op: 'damage' | 'heal' | 'set' }
  | { type: 'notify'; message: string }
  | { type: 'set_theme'; themeIndex: number }
  | { type: 'apply_status'; targetId: string; status: any };

export function resolveTargets(target: EffectTarget, ctx: EffectContext): string[] {
  if (target.kind === 'self') return [ctx.sourceId];
  if (target.kind === 'players') return target.ids;
  if (target.kind === 'combatants') return target.ids;
  if (target.kind === 'all_players') {
    const ids: string[] = [];
    for (const key of ctx.store.doc.share.keys()) {
      if (key.startsWith('character:')) ids.push(key.replace('character:', ''));
    }
    return ids;
  }
  if (target.kind === 'scene') return ['scene'];
  return [];
}

export function computeEffects(effects: Effect[], ctx: EffectContext): { mutations: EffectMutation[], revertData: Record<string, any> } {
  const mutations: EffectMutation[] = [];
  const revertData: Record<string, any> = {};

  for (let i = 0; i < effects.length; i++) {
    const eff = effects[i];
    const targetIds = resolveTargets(eff.target, ctx);
    
    for (const tid of targetIds) {
      if (eff.type === 'modify_hp') {
        mutations.push({
          type: 'modify_hp',
          targetId: tid,
          amount: eff.payload.amount,
          op: eff.payload.op
        });
      } else if (eff.type === 'modify_stat') {
        const statId = eff.payload.statId;
        const modifierValue = eff.payload.modifier ?? eff.payload.amount ?? 0;
        const isDelta = eff.payload.op !== 'set';
        
        mutations.push({
          type: 'modify_stat',
          targetId: tid,
          statId,
          amount: modifierValue,
          isDelta
        });

        // Save how much to revert. Use index `i` to prevent clobbering multiple modifiers on the same stat.
        revertData[`${tid}.stats.${statId}.${i}`] = { modifier: modifierValue, wasDelta: isDelta };
      } else if (eff.type === 'notify') {
        mutations.push({ type: 'notify', message: eff.payload.message });
      } else if (eff.type === 'set_theme') {
        mutations.push({ type: 'set_theme', themeIndex: eff.payload.themeIndex });
      } else if (eff.type === 'apply_status') {
         const statusObj = { ...eff.payload.status };
         if (statusObj.effects && statusObj.effects.length > 0) {
           const subResult = computeEffects(statusObj.effects, ctx);
           mutations.push(...subResult.mutations);
           statusObj.revertData = subResult.revertData;
         }
         mutations.push({ type: 'apply_status', targetId: tid, status: statusObj });
      }
    }
  }

  return { mutations, revertData };
}

export function computeRevertEffects(effects: Effect[], ctx: EffectContext, revertData: Record<string, any> = {}): EffectMutation[] {
  const mutations: EffectMutation[] = [];

  for (let i = 0; i < effects.length; i++) {
    const eff = effects[i];
    const targetIds = resolveTargets(eff.target, ctx);
    for (const tid of targetIds) {
      if (eff.type === 'modify_stat') {
        const saved = revertData[`${tid}.stats.${eff.payload.statId}.${i}`];
        if (saved && saved.modifier !== undefined && saved.wasDelta) {
          mutations.push({
            type: 'modify_stat',
            targetId: tid,
            statId: eff.payload.statId,
            amount: -saved.modifier, // Revert the delta!
            isDelta: true
          });
        }
      }
      // We generally do not revert damage, theme changes, or notifications
    }
  }
  return mutations;
}
