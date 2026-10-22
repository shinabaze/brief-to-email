// Turns every brief in briefs/ into an HTML email in output/, then checks each one.
// Usage: node build.js   (or npm run build)
import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import mjml2html from "mjml";
import announcement from "./templates/announcement.mjml.js";
import newsletter from "./templates/newsletter.mjml.js";

const TEMPLATES = { announcement, newsletter };
const BRIEFS_DIR = "briefs";
const OUTPUT_DIR = "output";
// Gmail cuts the message off with "[Message clipped]" once the HTML passes 102 KB.
const GMAIL_CLIP_BYTES = 102 * 1024;

const REQUIRED = [
  "template", "brand.name", "brand.primaryColor", "brand.logoUrl",
  "subject", "preheader", "headline", "body", "cta.text", "cta.url",
];

const get = (obj, dotted) => dotted.split(".").reduce((v, k) => (v == null ? v : v[k]), obj);
const isBlank = (v) => v == null || (typeof v === "string" && v.trim() === "");

// Returns a list of problems. An empty list means the brief can be rendered.
function validateBrief(brief) {
  const problems = REQUIRED.filter((f) => isBlank(get(brief, f))).map((f) => `missing "${f}"`);

  if (brief.template && !TEMPLATES[brief.template]) {
    problems.push(`unknown template "${brief.template}" (use: ${Object.keys(TEMPLATES).join(", ")})`);
  }
  const color = get(brief, "brand.primaryColor");
  if (color && !/^#[0-9a-f]{6}$/i.test(color)) {
    problems.push(`brand.primaryColor must be a 6-digit hex like #2563EB, got "${color}"`);
  }
  if (brief.template === "newsletter") {
    if (!Array.isArray(brief.items) || brief.items.length === 0) {
      problems.push(`newsletter needs at least one entry in "items"`);
    } else {
      brief.items.forEach((item, i) => {
        for (const f of ["title", "text", "url"]) {
          if (isBlank(item?.[f])) problems.push(`missing "items[${i}].${f}"`);
        }
      });
    }
  }
  return problems;
}

// MJML strict mode throws on invalid markup; older versions return the list instead.
async function compile(mjml) {
  try {
    const result = await mjml2html(mjml, { validationLevel: "strict" });
    return { html: result.html, errors: result.errors ?? [] };
  } catch (err) {
    // MJML 5 puts the list on err.errors, MJML 4 on err.details. A throw is never "no errors".
    const list = [err.errors, err.details].find((l) => Array.isArray(l) && l.length);
    return { html: null, errors: list ?? [{ formattedMessage: err.message }] };
  }
}

function runChecks(html, brief, mjmlErrors) {
  const bytes = html ? Buffer.byteLength(html, "utf8") : 0;
  const imgs = html ? html.match(/<img\b[^>]*>/gi) ?? [] : [];
  const noAlt = imgs.filter((tag) => !/\balt="[^"]+"/i.test(tag));

  return [
    {
      name: "Size under 102 KB (Gmail clips above this)",
      pass: html != null && bytes < GMAIL_CLIP_BYTES,
      detail: `${(bytes / 1024).toFixed(1)} KB`,
    },
    {
      name: "Every <img> has alt text",
      pass: html != null && noAlt.length === 0,
      detail: noAlt.length ? `${noAlt.length} of ${imgs.length} missing` : `${imgs.length} images`,
    },
    {
      name: "Preheader present",
      pass: html != null && !isBlank(brief.preheader) && html.includes("display:none") &&
        html.includes(escapeHtml(brief.preheader.trim())),
      detail: `"${brief.preheader}"`,
    },
    {
      name: "No MJML validation errors",
      pass: mjmlErrors.length === 0,
      detail: mjmlErrors.length
        ? mjmlErrors.map((e) => e.formattedMessage ?? e.message ?? String(e)).join("; ")
        : "strict mode",
    },
    {
      name: "CTA link is https",
      pass: /^https:\/\//i.test(brief.cta.url),
      detail: brief.cta.url,
    },
  ];
}

// Same escaping the templates use, so the preheader can be found in the output.
function escapeHtml(s) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const files = (await readdir(BRIEFS_DIR)).filter((f) => f.endsWith(".json")).sort();
  if (files.length === 0) {
    console.log(`No briefs found in ${BRIEFS_DIR}/`);
    return;
  }

  let built = 0, skipped = 0, failed = 0;

  for (const file of files) {
    const name = path.basename(file, ".json");
    console.log(`\n${name}`);

    let brief;
    try {
      brief = JSON.parse(await readFile(path.join(BRIEFS_DIR, file), "utf8"));
    } catch (err) {
      console.log(`  SKIPPED  not valid JSON: ${err.message}`);
      skipped++;
      continue;
    }

    const problems = validateBrief(brief);
    if (problems.length) {
      problems.forEach((p) => console.log(`  SKIPPED  ${p}`));
      skipped++;
      continue;
    }

    const { html, errors } = await compile(TEMPLATES[brief.template](brief));
    const checks = runChecks(html, brief, errors);
    for (const c of checks) {
      console.log(`  ${c.pass ? "PASS" : "FAIL"}  ${c.name.padEnd(44)} ${c.detail}`);
    }

    if (html) {
      const out = path.join(OUTPUT_DIR, `${name}.html`);
      await writeFile(out, html);
      console.log(`  wrote ${out}`);
      built++;
    }
    if (checks.some((c) => !c.pass)) failed++;
  }

  console.log(`\n${built} built, ${skipped} skipped, ${failed} with failed checks`);
  // Non-zero exit so CI or a pre-send script can stop a bad email going out.
  if (skipped || failed) process.exitCode = 1;
}

main();
