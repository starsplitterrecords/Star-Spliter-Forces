// npm run content:validate — the editorial gate. Exits non-zero on errors.
import { LIBRARY } from '../../src/story/library';
import { validateLibrary } from '../../src/story/validate';

const r = validateLibrary(LIBRARY);
console.log('Content library:', JSON.stringify(r.stats, null, 2));
for (const w of r.warnings) console.log('WARN ', w);
for (const e of r.errors) console.log('ERROR', e);
console.log(`\n${r.errors.length} error(s), ${r.warnings.length} warning(s)`);
process.exit(r.errors.length ? 1 : 0);
