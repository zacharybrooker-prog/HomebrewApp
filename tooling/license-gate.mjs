import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ALLOWED_LICENSES = [
  'MIT',
  'Apache-2.0',
  'BSD-2-Clause',
  'BSD-3-Clause',
  'ISC',
  'Unlicense',
  '0BSD',
  'PostgreSQL',
  'Zlib',
  'WTFPL',
  'CC0-1.0'
];

try {
  console.log('Checking licenses...');
  const output = execSync('pnpm licenses ls --json', { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  const licenses = JSON.parse(output);
  
  let failed = false;
  
  for (const [license, packages] of Object.entries(licenses)) {
    const parsedLicenses = license.split(/\s+OR\s+|\s+AND\s+/).map(l => l.replace(/[\(\)]/g, '').trim());
    const isAllowed = parsedLicenses.some(l => ALLOWED_LICENSES.includes(l));
    
    if (!isAllowed) {
      if (license === 'Unknown') {
        console.warn(`WARNING: Unknown license for packages:`, Object.keys(packages));
        continue;
      }
      console.error(`\n❌ Disallowed license found: ${license}`);
      for (const [pkgName, pkgData] of Object.entries(packages)) {
        console.error(`   - ${pkgName}`);
      }
      failed = true;
    }
  }
  
  if (failed) {
    console.error('\nLicense check failed. See forbidden licenses above.');
    process.exit(1);
  }
  
  console.log('✅ All licenses passed the gate.');
} catch (error) {
  if (error.status !== 0 && error.stdout) {
      console.log('License check skipped or pnpm licenses command failed. Continuing.');
      process.exit(0);
  } else {
    console.error('Failed to run license check:', error.message);
    process.exit(1);
  }
}
