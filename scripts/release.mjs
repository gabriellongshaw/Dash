import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const repo = process.env.GITHUB_REPOSITORY;
const token = process.env.GITHUB_TOKEN;
const apiUrl = process.env.DASH_API_URL || '';
const secret = process.env.RELEASE_SECRET || '';
const dry = process.argv.includes('--dry');
const backfill = process.argv.includes('--backfill');

const git = (...args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }).trim();

const SEMVER = /^v(\d+)\.(\d+)\.(\d+)$/;
const SUBJECT = /^(\w+)(?:\(([^)]*)\))?(!)?:\s*(.+)$/;

const titles = JSON.parse(readFileSync(new URL('./release-titles.json', import.meta.url), 'utf8'));

const tags = () => git('tag', '--list', 'v*', '--sort=v:refname').split('\n').filter(tag => SEMVER.test(tag));

function commitsBetween(from, to) {
  const range = from ? `${from}..${to}` : to;
  const raw = git('log', '--no-merges', '--format=%H%x1f%s%x1f%b%x1e', range);
  return raw
    .split('\x1e')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const [sha, subject, body = ''] = entry.split('\x1f');
      const match = SUBJECT.exec(subject);
      return {
        sha,
        subject,
        type: match ? match[1] : 'other',
        scope: match && match[2] ? match[2] : '',
        text: match ? match[4] : subject,
        breaking: !!(match && match[3]) || /^BREAKING[ -]CHANGE:/m.test(body)
      };
    });
}

function bumpFor(list) {
  if (list.some(c => c.breaking)) return 'major';
  if (list.some(c => c.type === 'feat')) return 'minor';
  if (list.some(c => c.type === 'fix' || c.type === 'perf')) return 'patch';
  return null;
}

function nextVersion(last, bump) {
  const [major, minor, patch] = last ? SEMVER.exec(last).slice(1).map(Number) : [0, 0, 0];
  if (bump === 'major') return `v${major + 1}.0.0`;
  if (bump === 'minor') return `v${major}.${minor + 1}.0`;
  return `v${major}.${minor}.${patch + 1}`;
}

const capital = text => text.charAt(0).toUpperCase() + text.slice(1);

const line = c => `- ${c.scope ? `**${c.scope}:** ` : ''}${c.text} (${c.sha.slice(0, 7)})`;

function notesFor(list, from, to) {
  const groups = [
    ['Breaking changes', list.filter(c => c.breaking)],
    ['Features', list.filter(c => c.type === 'feat')],
    ['Fixes', list.filter(c => c.type === 'fix' || c.type === 'perf')],
    ['Maintenance', list.filter(c => ['refactor', 'style', 'chore', 'docs', 'build', 'ci', 'test', 'revert'].includes(c.type))]
  ];
  const parts = groups.filter(([, items]) => items.length).map(([name, items]) => `## ${name}\n\n${items.map(line).join('\n')}`);
  if (from) parts.push(`**Full changelog:** https://github.com/${repo}/compare/${from}...${to}`);
  return parts.join('\n\n');
}

function headline(version, list, fallback) {
  const lead = fallback || (list.find(c => c.type === 'feat') || list.find(c => c.type === 'fix') || list[0] || {}).text;
  return lead ? `Dash ${version.slice(1)}: ${capital(lead)}`.slice(0, 80) : `Dash ${version.slice(1)}`;
}

function summary(list) {
  const feats = list.filter(c => c.type === 'feat').map(c => `New: ${capital(c.text)}`);
  const fixes = list.filter(c => c.type === 'fix' || c.type === 'perf').map(c => `Fixed: ${capital(c.text)}`);
  const lines = [...feats.slice(0, 8), ...fixes.slice(0, 8)];
  const extra = feats.length + fixes.length - lines.length;
  if (extra > 0) lines.push(`And ${extra} more`);
  return lines.join('\n').slice(0, 1500);
}

async function github(path, options = {}) {
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers || {})
    }
  });
  return res;
}

async function createRelease(payload) {
  const res = await github('/releases', { method: 'POST', body: JSON.stringify(payload) });
  if (!res.ok) throw new Error(`release ${payload.tag_name} failed: ${res.status} ${await res.text()}`);
}

async function announce(version, title, body) {
  if (!apiUrl || !secret) {
    console.log('announcement skipped: DASH_API_URL or RELEASE_SECRET not set');
    return;
  }
  const res = await fetch(apiUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'publishRelease', version: version.slice(1), title, body })
  });
  console.log(`announcement ${version}: ${res.status}`);
  if (!res.ok) throw new Error(`announcement failed: ${res.status} ${await res.text()}`);
}

async function releaseNext() {
  const head = git('rev-parse', 'HEAD');
  if (git('tag', '--points-at', head).split('\n').some(tag => SEMVER.test(tag))) {
    console.log('HEAD is already tagged');
    return;
  }
  const list = tags();
  const last = list[list.length - 1] || null;
  const commits = commitsBetween(last, head);
  const bump = bumpFor(commits);
  if (!bump) {
    console.log(`no release-worthy commits since ${last || 'the start'}`);
    return;
  }
  const version = nextVersion(last, bump);
  const title = headline(version, commits);
  const notes = notesFor(commits, last, version);
  console.log(`${last || 'none'} -> ${version} (${bump})`);
  console.log(notes);
  if (dry) return;
  await createRelease({ tag_name: version, target_commitish: head, name: title, body: notes, draft: false, prerelease: false });
  console.log(`released ${version}`);
  await announce(version, title, summary(commits));
}

async function backfillAll() {
  const list = tags();
  for (let i = 0; i < list.length; i++) {
    const tag = list[i];
    const existing = dry ? { ok: false } : await github(`/releases/tags/${tag}`);
    if (existing.ok) {
      console.log(`skip ${tag}: release exists`);
      continue;
    }
    const prev = i ? list[i - 1] : null;
    const commits = commitsBetween(prev, tag);
    const notes = notesFor(commits, prev, tag);
    const name = titles[tag] ? `Dash ${tag.slice(1)}: ${titles[tag]}` : headline(tag, commits);
    console.log(`release ${tag}: ${name}`);
    if (dry) continue;
    await createRelease({ tag_name: tag, name, body: notes, draft: false, prerelease: false, make_latest: i === list.length - 1 ? 'true' : 'false' });
  }
}

if (!repo || (!token && !dry)) {
  console.error('GITHUB_REPOSITORY and GITHUB_TOKEN are required');
  process.exit(1);
}

(backfill ? backfillAll() : releaseNext()).catch(e => {
  console.error(e.message);
  process.exit(1);
});