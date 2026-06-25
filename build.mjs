import { cpSync } from 'fs';
try {
  cpSync('packages/web/dist', 'dist', { recursive: true, force: true });
  console.log('Successfully copied packages/web/dist to dist');
} catch (err) {
  console.error('Failed to copy dist directory:', err);
  process.exit(1);
}
