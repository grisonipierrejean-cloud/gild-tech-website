#!/usr/bin/env node
// Generate premium visuals for GILD-TECH pages
// via fal.ai endpoint `fal-ai/nano-banana` (Google Gemini 2.5 Flash Image).
//
// Doctrine (NON NEGOCIABLE):
//   - Sublimate REAL contexts: offices, daylight, real-looking professionals.
//   - NEVER fabricate a property listing (UK CPRs / BE IPI misrepresentation risk).
//   - No text overlays inside images (we layer text in CSS).
//
// Usage:
//   export FAL_KEY="..."                                # required
//   node scripts/gen-gildtech-visuals.mjs               # generate all (skip if exists)
//   node scripts/gen-gildtech-visuals.mjs hero-sarah-uk # generate one
//   FORCE=1 node scripts/gen-gildtech-visuals.mjs       # overwrite existing
//   DRY=1   node scripts/gen-gildtech-visuals.mjs       # print prompts, no API call
//
// Output: ./assets/visuals/<slug>.png

import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot  = resolve(__dirname, '..');
const outDir    = resolve(repoRoot, 'assets/visuals');
if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const FAL_KEY = process.env.FAL_KEY || process.env.FAL_AI_KEY || '';
const DRY     = process.env.DRY === '1';
const FORCE   = process.env.FORCE === '1';

if (!FAL_KEY && !DRY) {
  console.error('❌ FAL_KEY not set. Run:  export FAL_KEY="..."   (or DRY=1 to inspect prompts)');
  process.exit(1);
}

// ─────────────────────────────────────────────────────────────────────────────
// 6 PROMPTS — Premium editorial, real contexts, no fake listings.
// ─────────────────────────────────────────────────────────────────────────────
const VISUALS = [
  {
    slug: 'hero-sarah-uk',
    aspect: '16:9',
    prompt: `Premium editorial photograph, magazine quality. A confident British estate-agent professional in their thirties (gender ambiguous, smart business attire — tailored navy blazer over white shirt), standing in a sunlit independent UK estate agency front office in central London (West End, Marylebone or Notting Hill style). Soft natural morning light through large sash window, ivory walls, brushed brass accents. Subject looking warmly toward the lens, holding a slim tablet, slight smile. Shallow depth of field, 50mm look, film grain. Palette: ivory + dark teal + warm champagne. No property photos visible. No text. No logos. Hyperrealistic, kinfolk magazine aesthetic, cinematic.`,
  },
  {
    slug: 'hero-sarah-be',
    aspect: '16:9',
    prompt: `Premium editorial photograph, magazine quality. A confident Belgian estate-agent professional in their thirties (smart business attire — fitted charcoal blazer), standing in a sunlit independent Brussels real estate office (Ixelles or Uccle townhouse aesthetic). Soft afternoon light, exposed brick wall behind blurred, warm tones. Subject mid-conversation gesture with a phone in hand, natural confident smile. Shallow depth of field, 50mm look, fine film grain. Palette: ivory + warm anthracite + ochre. No property photos visible. No text. No logos. Hyperrealistic, monocle magazine aesthetic, cinematic.`,
  },
  {
    slug: 'whatsapp-mockup',
    aspect: '3:4',
    prompt: `Hyperrealistic studio product shot of a hand holding a modern smartphone (iPhone Pro style, titanium frame), screen on, showing a clean WhatsApp Business conversation interface — green outgoing bubbles, white incoming bubbles, generic placeholder messages, time stamps visible. Studio backdrop soft gradient grey to ivory. Crisp focus on the phone, slight bokeh background. No text on the screen beyond placeholder conversation. No property images. No logos other than WhatsApp interface chrome.`,
  },
  {
    slug: 'dashboard-mockup',
    aspect: '16:10',
    prompt: `Premium SaaS dashboard UI mockup, ultra-clean, displayed on a 27-inch monitor at an angle in a sunlit modern office. The dashboard shows a sober analytics interface: dark left sidebar, ivory main panel with line chart (gentle upward trend), a small donut chart, a tidy table of placeholder rows. Palette: ivory + dark teal accents + soft champagne highlights. Typography minimal, sans-serif. Style Linear / Notion / Stripe Dashboard 2025. No real names, no real property data, no logos. No text legible beyond placeholder labels.`,
  },
  {
    slug: 'brief-matin',
    aspect: '1:1',
    prompt: `Close-up flat lay style photograph, morning scene. A hand holds a smartphone in the foreground on a light oak wooden desk. The phone screen shows a WhatsApp notification preview with a "Daily brief — 7:00 AM" headline (generic, no real data). Around the phone: a small espresso cup, a leather-bound notebook half open, a fountain pen. Golden morning light streams in from the left, warm shadows. Palette: warm oak + ivory + soft amber. Style: Kinfolk morning, fine grain, shallow DoF. No real property images visible. No logos.`,
  },
  {
    slug: 'team-modern-office',
    aspect: '16:9',
    prompt: `Editorial photograph of three estate-agency professionals in their thirties having a relaxed standing discussion around a wall-mounted display in a modern boutique real estate office. The display shows a clean dashboard mockup (sober, ivory background, line chart). Walls warm white, mid-century furniture, indirect natural light. Subjects: smart business casual, diverse, natural laughter. No client-facing property listings visible. Palette: ivory + dark teal + warm champagne. Bloomberg Pursuits magazine aesthetic. Hyperrealistic, cinematic, fine film grain. No text. No logos.`,
  },
];

// ─────────────────────────────────────────────────────────────────────────────

async function generate(v) {
  const outPath = resolve(outDir, `${v.slug}.png`);
  if (existsSync(outPath) && !FORCE) {
    console.log(`⚠  ${v.slug}.png exists — skip (set FORCE=1 to overwrite)`);
    return;
  }
  if (DRY) {
    console.log(`\n— ${v.slug} (${v.aspect}) —`);
    console.log(v.prompt);
    return;
  }
  console.log(`→ ${v.slug} (${v.aspect}): submitting to fal-ai/nano-banana…`);
  const startedAt = Date.now();
  const res = await fetch('https://fal.run/fal-ai/nano-banana', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${FAL_KEY}`,
      'Content-Type':  'application/json',
    },
    body: JSON.stringify({
      prompt:        v.prompt,
      num_images:    1,
      output_format: 'png',
      aspect_ratio:  v.aspect,
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    console.error(`✗ ${v.slug} HTTP ${res.status}: ${txt.slice(0, 300)}`);
    return;
  }
  const data = await res.json();
  const url  = data?.images?.[0]?.url || data?.image?.url;
  if (!url) {
    console.error(`✗ ${v.slug}: no image url in response`, JSON.stringify(data).slice(0, 300));
    return;
  }
  const imgRes = await fetch(url);
  if (!imgRes.ok) {
    console.error(`✗ ${v.slug}: download failed HTTP ${imgRes.status}`);
    return;
  }
  const buf = Buffer.from(await imgRes.arrayBuffer());
  writeFileSync(outPath, buf);
  const ms  = Date.now() - startedAt;
  const kb  = (buf.length / 1024).toFixed(0);
  console.log(`✓ ${v.slug}.png saved (${kb} KB, ${ms} ms)`);
}

const only = process.argv[2];
const todo = only ? VISUALS.filter(v => v.slug === only) : VISUALS;
if (only && todo.length === 0) {
  console.error(`✗ unknown slug "${only}". Available:`, VISUALS.map(v => v.slug).join(', '));
  process.exit(1);
}

console.log(`GILD-TECH visual generation — ${todo.length} target${todo.length > 1 ? 's' : ''} · output → ${outDir}`);
if (DRY)   console.log('DRY mode: no API call.');
if (FORCE) console.log('FORCE mode: overwriting existing files.');
console.log('');

for (const v of todo) {
  try { await generate(v); } catch (e) { console.error(`✗ ${v.slug}: ${e.message}`); }
}

console.log('\nDone.');
