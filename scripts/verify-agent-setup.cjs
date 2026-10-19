/* eslint-disable @typescript-eslint/no-require-imports -- Local deterministic Node CLI, no third-party runtime. */
const fs = require('node:fs');
const path = require('node:path');

function verifySetup(root) {
  const lock = JSON.parse(fs.readFileSync(path.join(root, '.agents/tooling-lock.json'), 'utf8'));
  if (lock.schemaVersion !== 1 || !Array.isArray(lock.skills)) throw new Error('Unsupported tooling manifest');
  const seen = new Set();
  const found = [];
  for (const skill of lock.skills) {
    if (!/^[a-z0-9-]+$/.test(skill.directory) || !/^[a-z0-9-]+$/.test(skill.name)) throw new Error('Invalid skill name/path');
    if (!/^[a-f0-9]{40}$/.test(skill.revision) || !/^[\w.-]+\/[\w.-]+$/.test(skill.repo)) throw new Error('Unpinned skill source');
    if (seen.has(skill.name)) throw new Error(`Duplicate skill: ${skill.name}`);
    seen.add(skill.name);
    const folder = path.join(root, '.agents/skills', skill.directory);
    if (fs.lstatSync(folder).isSymbolicLink()) throw new Error(`Non-portable skill link: ${skill.directory}`);
    const file = path.join(folder, 'SKILL.md');
    if (fs.lstatSync(file).isSymbolicLink()) throw new Error(`Linked manifest: ${skill.directory}`);
    const text = fs.readFileSync(file, 'utf8');
    const header = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)?.[1];
    const match = header?.match(/^name:[ \t]*["']?([a-z0-9-]+)["']?[ \t]*$/m);
    if (!header || match?.[1] !== skill.name || !/^description:/m.test(header)) throw new Error(`Invalid frontmatter: ${skill.directory}`);
    found.push(skill.name);
  }
  return found;
}

if (require.main === module) {
  try {
    const found = verifySetup(path.resolve(__dirname, '..'));
    console.log(`${found.length} pinned local skills verified: ${found.join(', ')}`);
    console.log('Manifest metadata/structure only; no byte-integrity, client discovery, execution or trust guarantee. No files changed.');
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Setup verification failed');
    process.exitCode = 1;
  }
}
module.exports = { verifySetup };
