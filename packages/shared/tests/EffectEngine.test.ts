import { expect, test } from 'vitest';
import 'fake-indexeddb/auto';
import { CampaignStore } from '../src/store';
import { computeEffects, computeRevertEffects } from '../src/effects/engine';
import type { Effect } from '../src/schema';

test('Cross-trigger integration: modify_stat via Item and Status', () => {
  const store = new CampaignStore('test-engine');
  store.setRole('dm');
  store.addStatFieldDef({ id: 'str', label: 'STR', type: 'number', order: 0 });

  const charMap = store.getCharacterMap('char-1');
  charMap.set('stats', { str: 10 });

  const effect: Effect = {
    id: 'e1',
    type: 'modify_stat',
    target: { kind: 'self' },
    payload: { statId: 'str', modifier: 2 }
  };

  // 1. Compute mutations
  const { mutations, revertData } = computeEffects([effect], { sourceId: 'char-1', store });
  
  // 2. Commit mutations
  store.commitMutations(mutations);

  // 3. Verify Y.Doc was mutated!
  expect(charMap.get('stats').str).toBe(12);

  // 4. Compute reverts
  const reverts = computeRevertEffects([effect], { sourceId: 'char-1', store }, revertData);
  store.commitMutations(reverts);

  // 5. Verify Y.Doc reverted perfectly!
  expect(charMap.get('stats').str).toBe(10);
});
