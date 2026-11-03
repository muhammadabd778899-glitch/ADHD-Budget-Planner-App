/**
 * Export shareable Harbor documents from docs/.
 *
 * Outputs (written next to this script):
 *   Harbor-Customer-Guide.pdf — print-ready buyer guide from docs/CUSTOMER_GUIDE.md
 *   Harbor-Listing-Copy.txt   — paste-ready listing text from docs/ETSY_COPY.md
 *
 * Usage: node deliverables/generate-guides.mjs
 * Requires: npm install (uses the Playwright browser already installed for tests).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');

const escapeHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function inline(text) {
  return text
    .replace(/`([^`]+)`/g, (_m, code) => `<code>${escapeHtml(code)}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|\s)_([^_]+)_(?=$|[\s.,;)])/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparatorRow(line) {
  const cells = splitTableRow(line);
  return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/.test(cell));
}

function renderTable(rows) {
  const header = splitTableRow(rows[0]);
  const bodyRows = rows.slice(1).filter((row) => !isSeparatorRow(row));
  const head = `<thead><tr>${header.map((cell) => `<th>${inline(cell)}</th>`).join('')}</tr></thead>`;
  const body = bodyRows
    .map((row) => {
      const cells = splitTableRow(row);
      return `<tr>${cells.map((cell) => `<td>${inline(cell)}</td>`).join('')}</tr>`;
    })
    .join('');
  return `<table>${head}<tbody>${body}</tbody></table>`;
}

function markdownToHtml(markdown) {
  const lines = markdown.split(/\r?\n/);
  let html = '';
  let paragraph = [];
  let code = null;
  let quote = null;
  let table = null;
  const listStack = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    html += `<p>${inline(paragraph.join(' '))}</p>`;
    paragraph = [];
  };
  const flushQuote = () => {
    if (quote === null) return;
    html += `<blockquote>${inline(quote.join(' '))}</blockquote>`;
    quote = null;
  };
  const flushTable = () => {
    if (table === null) return;
    html += renderTable(table);
    table = null;
  };
  const flushLists = () => {
    while (listStack.length > 0) html += listStack.pop().closing;
  };
  const flushAll = () => {
    flushParagraph();
    flushQuote();
    flushTable();
    flushLists();
  };

  for (const rawLine of lines) {
    const line = rawLine.replace(/\s+$/, '');

    if (code !== null) {
      if (/^```/.test(line)) {
        html += `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;
        code = null;
      } else {
        code.push(rawLine);
      }
      continue;
    }

    if (/^```/.test(line)) {
      flushAll();
      code = [];
      continue;
    }

    if (/^\s*\|/.test(line)) {
      flushParagraph();
      flushQuote();
      flushLists();
      if (table === null) table = [];
      table.push(line);
      continue;
    }
    flushTable();

    if (/^#{1,4}\s+/.test(line)) {
      flushAll();
      const level = line.match(/^#+/)[0].length;
      const text = line.replace(/^#+\s+/, '');
      html += `<h${level}>${inline(text)}</h${level}>`;
      continue;
    }

    if (/^-{3,}$/.test(line.trim())) {
      flushAll();
      html += '<hr />';
      continue;
    }

    if (/^>\s?/.test(line)) {
      flushParagraph();
      flushTable();
      flushLists();
      if (quote === null) quote = [];
      quote.push(line.replace(/^>\s?/, ''));
      continue;
    }
    flushQuote();

    const bullet = line.match(/^(\s*)[-*]\s+(.*)$/);
    const ordered = line.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
    if (bullet || ordered) {
      flushParagraph();
      const indent = bullet ? bullet[1].length : ordered[1].length;
      const level = Math.min(2, Math.floor(indent / 2));
      const kind = bullet ? 'ul' : 'ol';
      const text = bullet ? bullet[2] : ordered[3];
      while (listStack.length > level) html += listStack.pop().closing;
      if (listStack.length === level) {
        html += `<${kind}>`;
        listStack.push({ closing: `</${kind}>` });
      }
      html += `<li>${inline(text)}</li>`;
      continue;
    }

    if (line.trim() === '') {
      flushAll();
      continue;
    }

    paragraph.push(line.trim());
  }

  if (code !== null) html += `<pre><code>${escapeHtml(code.join('\n'))}</code></pre>`;
  if (table !== null) html += renderTable(table);
  flushAll();
  return html;
}

function buildGuideDocument(markdown) {
  const body = markdownToHtml(markdown);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Harbor — Customer Guide</title>
<style>
  :root { color-scheme: light; }
  * { box-sizing: border-box; }
  body {
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    color: #1c2540;
    font-size: 11pt;
    line-height: 1.55;
    margin: 0;
  }
  .cover {
    page-break-after: always;
    display: flex;
    flex-direction: column;
    justify-content: center;
    min-height: 92vh;
  }
  .cover__band {
    background: #16213e;
    color: #f7f5ef;
    padding: 34px 30px;
    border-radius: 18px;
  }
  .cover__brand {
    font-size: 30pt;
    font-weight: 650;
    letter-spacing: 0.5px;
    margin: 0;
  }
  .cover__tagline {
    color: #d8c98f;
    font-size: 12pt;
    margin: 8px 0 18px;
  }
  .cover__meta { color: #c7cede; font-size: 10pt; margin: 0; }
  .cover__note { margin-top: 26px; color: #55607a; font-size: 10pt; }
  h1, h2, h3 { color: #16213e; line-height: 1.3; }
  h1 { font-size: 17pt; margin: 26px 0 10px; }
  h2 { font-size: 13.5pt; margin: 22px 0 8px; border-bottom: 1.5px solid #e3e7f2; padding-bottom: 4px; }
  h3 { font-size: 11.5pt; margin: 16px 0 6px; }
  p { margin: 6px 0; }
  ul, ol { margin: 6px 0 10px; padding-left: 22px; }
  li { margin: 3px 0; }
  a { color: #2c4a8a; }
  code {
    font-family: Consolas, 'Courier New', monospace;
    background: #f1f3fa;
    border: 1px solid #e0e4f0;
    border-radius: 4px;
    padding: 0 3px;
    font-size: 9.5pt;
  }
  pre {
    background: #f1f3fa;
    border: 1px solid #e0e4f0;
    border-radius: 8px;
    padding: 10px 12px;
    overflow-x: hidden;
    page-break-inside: avoid;
  }
  pre code { background: none; border: none; padding: 0; }
  blockquote {
    margin: 10px 0;
    padding: 8px 14px;
    border-left: 3px solid #c9a227;
    background: #fbf8ef;
    border-radius: 0 8px 8px 0;
  }
  table { border-collapse: collapse; width: 100%; margin: 10px 0; page-break-inside: avoid; }
  th, td { border: 1px solid #dfe3ee; padding: 5px 8px; text-align: left; vertical-align: top; }
  th { background: #eef1f9; color: #16213e; }
  hr { border: none; border-top: 1px solid #e3e7f2; margin: 16px 0; }
  kbd {
    font-family: Consolas, monospace;
    background: #16213e;
    color: #f7f5ef;
    border-radius: 4px;
    padding: 1px 6px;
    font-size: 9pt;
  }
</style>
</head>
<body>
  <section class="cover">
    <div class="cover__band">
      <p class="cover__brand">Harbor</p>
      <p class="cover__tagline">A calm budget planner for ADHD brains</p>
      <p class="cover__meta">Customer guide · Version 1.0.0 · November 2026</p>
    </div>
    <p class="cover__note">
      Your data stays in your browser on your device. There is no account, no bank login, and no
      subscription. After the first load, Harbor works offline and can be installed like an app.
    </p>
  </section>
  ${body}
</body>
</html>`;
}

function stripMarkdown(markdown) {
  const out = [];
  for (const rawLine of markdown.split(/\r?\n/)) {
    const line = rawLine.replace(/\s+$/, '');
    let result;
    if (/^```/.test(line)) {
      result = '';
    } else if (/^\s*\|/.test(line)) {
      result = line
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => cell.trim())
        .filter((cell) => !/^:?-{3,}:?$/.test(cell))
        .join(' | ');
    } else if (/^\s*[-*]\s+/.test(line)) {
      result = line.replace(/^(\s*)[-*]\s+/, '$1- ');
    } else if (/^#{1,4}\s+/.test(line)) {
      result = line.replace(/^#+\s+/, '').toUpperCase();
    } else if (/^-{3,}$/.test(line.trim())) {
      result = '';
    } else {
      result = line
        .replace(/`([^`]+)`/g, '$1')
        .replace(/\*\*([^*]+)\*\*/g, '$1')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1')
        .replace(/<\/?kbd>/g, '');
    }
    if (!(result === '' && out.length > 0 && out[out.length - 1] === '')) out.push(result);
  }
  return out.join('\n').replace(/^\n+/, '');
}

async function main() {
  mkdirSync(here, { recursive: true });

  const guideMarkdown = readFileSync(join(repo, 'docs', 'CUSTOMER_GUIDE.md'), 'utf8');
  const html = buildGuideDocument(guideMarkdown);
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'load' });
  await page.pdf({
    path: join(here, 'Harbor-Customer-Guide.pdf'),
    format: 'A4',
    printBackground: true,
    margin: { top: '16mm', bottom: '16mm', left: '14mm', right: '14mm' },
    displayHeaderFooter: true,
    headerTemplate: '<span></span>',
    footerTemplate:
      '<div style="width:100%;font-size:8pt;color:#8891a8;text-align:center;">Harbor customer guide — page <span class="pageNumber"></span> of <span class="totalPages"></span></div>',
  });
  await browser.close();

  const listingMarkdown = readFileSync(join(repo, 'docs', 'ETSY_COPY.md'), 'utf8');
  const header = [
    'HARBOR — ETSY LISTING COPY (November 2026 build)',
    'Copy each section into the listing editor. Adjust only the delivery paragraph to match your attached files.',
    '',
    '===============================================================',
    '',
  ].join('\n');
  writeFileSync(
    join(here, 'Harbor-Listing-Copy.txt'),
    header + stripMarkdown(listingMarkdown) + '\n',
  );

  console.log('Wrote Harbor-Customer-Guide.pdf and Harbor-Listing-Copy.txt');
}

export { markdownToHtml, buildGuideDocument, stripMarkdown };

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
