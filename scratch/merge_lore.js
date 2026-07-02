const fs = require('fs');

try {
  const alpha = JSON.parse(fs.readFileSync('scratch/alpha_lore.json', 'utf-8'));
  const beta = JSON.parse(fs.readFileSync('scratch/beta_lore.json', 'utf-8'));
  const gamma = JSON.parse(fs.readFileSync('scratch/gamma_lore.json', 'utf-8'));
  
  const allLore = { ...alpha, ...beta, ...gamma };
  
  const dbPath = 'packages/web/src/data/srd_5e_monsters.json';
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  
  const updatedDb = db.map(m => {
    return {
      ...m,
      flavorText: allLore[m.name] || ''
    };
  });
  
  fs.writeFileSync(dbPath, JSON.stringify(updatedDb, null, 2));
  console.log('Successfully merged lore into srd_5e_monsters.json!');
} catch (err) {
  console.error('Error merging lore:', err);
}
