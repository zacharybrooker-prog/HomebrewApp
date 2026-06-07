import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { CampaignStore } from '../src/store';
import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';
import 'fake-indexeddb/auto';

describe('CampaignStore', () => {
  let store: CampaignStore;

  beforeEach(() => {
    store = new CampaignStore('test-campaign');
  });

  afterEach(() => {
    store.destroy();
  });

  it('initializes a Y.Doc', () => {
    expect(store.doc).toBeInstanceOf(Y.Doc);
  });

  it('attaches y-indexeddb for local persistence', () => {
    expect(store.provider).toBeInstanceOf(IndexeddbPersistence);
    expect(store.provider.name).toBe('test-campaign');
  });

  it('scaffolds shared, dm, and character:{id} subdocs', () => {
    const sharedMap = store.getSharedMap();
    expect(sharedMap).toBeInstanceOf(Y.Map);
    
    const dmMap = store.getDmMap();
    expect(dmMap).toBeInstanceOf(Y.Map);

    const characterMap = store.getCharacterMap('char-123');
    expect(characterMap).toBeInstanceOf(Y.Map);
  });
});
