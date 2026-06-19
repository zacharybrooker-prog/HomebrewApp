import { useState } from 'react';
import Papa from 'papaparse';
import { db } from '../firebase';
import { collection, writeBatch, doc } from 'firebase/firestore';
import type { MagicItem } from '@frogs-world/shared/src/schema';

export function CsvImporter() {
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileData, setFileData] = useState<any[]>([]);
  const [mappings, setMappings] = useState({
    name: '',
    type: '',
    rarity: '',
    description: '',
    requiresAttunement: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
          
          // Auto-map if headers match somewhat
          const autoMap: any = {};
          results.meta.fields.forEach(f => {
            const lower = f.toLowerCase();
            if (lower.includes('name')) autoMap.name = f;
            else if (lower.includes('type')) autoMap.type = f;
            else if (lower.includes('rarity')) autoMap.rarity = f;
            else if (lower.includes('description') || lower.includes('desc')) autoMap.description = f;
            else if (lower.includes('attune')) autoMap.requiresAttunement = f;
          });
          setMappings(prev => ({ ...prev, ...autoMap }));
        }
        setFileData(results.data);
      },
      error: (err) => {
        alert('Failed to parse CSV: ' + err.message);
      }
    });
  };

  const handleExecute = async () => {
    if (!mappings.name || !mappings.description) {
      alert("Name and Description must be mapped at a minimum.");
      return;
    }

    try {
      let batch = writeBatch(db);
      let count = 0;
      
      for (const row of fileData) {
        const attunementVal = mappings.requiresAttunement ? String(row[mappings.requiresAttunement] || '').toLowerCase() : '';
        const isAttunement = attunementVal === 'yes' || attunementVal === 'true' || attunementVal === '1';

        const itemData: MagicItem = {
          name: row[mappings.name] || 'Unnamed Item',
          type: mappings.type ? (row[mappings.type] || 'Unknown') : 'Unknown',
          rarity: mappings.rarity ? (row[mappings.rarity] || 'unknown') : 'unknown',
          description: row[mappings.description] || '',
          requiresAttunement: isAttunement
        };

        const docRef = doc(collection(db, 'magicItems'));
        batch.set(docRef, itemData);
        count++;

        if (count === 490) {
          await batch.commit();
          batch = writeBatch(db);
          count = 0;
        }
      }

      if (count > 0) {
        await batch.commit();
      }

      alert(`Successfully imported ${fileData.length} items from CSV!`);
      setFileData([]);
      setHeaders([]);
    } catch (err: any) {
      console.error(err);
      alert('Failed to import CSV: ' + err.message);
    }
  };

  return (
    <div className="bg-primary/20 border border-primary/40 p-4 rounded-lg flex flex-col gap-3 mt-4">
      <div>
        <div className="font-bold text-primary text-sm">Dynamic CSV Importer</div>
        <div className="text-xs text-muted-foreground">Upload a CSV of homebrew magic items.</div>
      </div>
      
      <input type="file" accept=".csv" className="text-xs file:btn-primary file:py-1 file:px-3 file:mr-2 file:border-0" onChange={handleFileUpload} />

      {headers.length > 0 && (
        <div className="flex flex-col gap-3 mt-2 p-3 bg-black/40 rounded border border-white/10">
          <div className="text-xs font-bold text-accent">Map CSV Columns</div>
          
          {Object.keys(mappings).map(key => (
            <div key={key} className="flex items-center gap-2">
              <label className="w-32 text-xs text-white/80 uppercase tracking-widest">{key}</label>
              <select 
                className="select-fantasy flex-1 text-xs"
                value={(mappings as any)[key]}
                onChange={e => setMappings({ ...mappings, [key]: e.target.value })}
              >
                <option value="">-- Ignore / Unmapped --</option>
                {headers.map(h => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          ))}

          <button onClick={handleExecute} className="btn-fantasy mt-2 self-start py-2 px-4 uppercase font-bold tracking-widest text-xs">
            Execute Bulk Import ({fileData.length} rows)
          </button>
        </div>
      )}
    </div>
  );
}
