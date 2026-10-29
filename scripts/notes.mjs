#!/usr/bin/env node
/**
 * knowledge-notes · 知识点笔记库维护脚本
 *
 * 用法：
 *   node notes.mjs paths
 *   node notes.mjs init
 *   node notes.mjs tree
 *   node notes.mjs find <关键词...>
 *   node notes.mjs check
 *   node notes.mjs index
 *   node notes.mjs set-root <目录> [--move | --keep-old]
 *
 * 约定：
 *   一个一级分类一个 md 文件，文件名 = 一级标题文字。
 *   文件内 # → ## → ### → ####，最多四级，不跳级。
 *   没有下级标题的叶子标题 = 一条知识点（有正文）或分类占位（无正文）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(HERE, '..');
const CONFIG_FILE = path.join(SKILL_DIR, 'config.json');
const DEFAULT_ROOT = 'workspace:notes';
const INDEX_FILE = '00-索引.md';
const MARKER_FILE = '.knowledge-notes.json';
const SCHEMA = 1;
const MAX_DEPTH = 4;

// 初始分类树：只在 init / 空库时落盘，之后以笔记库里的实际标题为准
const SEED = [
  { name: '基础科学', h2: ['数学', '物理', '化学'] },
  { name: '工程理论', h2: ['机械', '计算机', '生物'] },
  { name: '人文社科', h2: ['哲学', '历史', '经济', '心理', '语言文学', '法律'] },
  {
    name: '生活知识',
    h2: ['厨房烹饪', '居家维修', '健康医疗', '数码电子', '出行交通', '理财保险', '安全应急', '社交礼仪'],
  },
];

/* ------------------------------------------------------------------ 基础工具 */

function log(line = '') {
  console.log(line);
}

function die(message, code = 1) {
  console.error(message);
  process.exit(code);
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function dateOf(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function stamp() {
  const d = new Date();
  return `${dateOf(d)} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function norm(text) {
  return String(text)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u3000·・,，。.、:：;；!！?？()（）[\]【】「」"'"'`]/g, '');
}

function readConfig() {
  try {
    const text = fs.readFileSync(CONFIG_FILE, 'utf8').replace(/^\uFEFF/, '');
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function saveConfig(cfg) {
  fs.mkdirSync(SKILL_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, `${JSON.stringify(cfg, null, 2)}\n`, 'utf8');
}

/** 支持 workspace:xxx 相对当前工作目录写法 */
function expandTarget(raw) {
  const text = String(raw).trim();
  if (text.startsWith('workspace:')) {
    return path.resolve(process.cwd(), text.slice('workspace:'.length));
  }
  return path.resolve(text);
}

function resolveRoot() {
  const envRaw = (process.env.KNOWLEDGE_NOTES_ROOT || '').trim();
  const cfg = readConfig();
  const raw = envRaw || cfg.notes_root || DEFAULT_ROOT;
  return {
    root: expandTarget(raw),
    raw,
    source: envRaw ? '环境变量 KNOWLEDGE_NOTES_ROOT' : cfg.notes_root ? 'config.json' : '内置默认值',
  };
}

function rankOf(file) {
  const base = path.basename(file, '.md');
  const i = SEED.findIndex((s) => s.name === base);
  return i === -1 ? SEED.length : i;
}

function listDocs(root) {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root)
    .filter(
      (name) =>
        name.toLowerCase().endsWith('.md') &&
        name !== INDEX_FILE &&
        !name.startsWith('_') &&
        !name.startsWith('.'),
    )
    .map((name) => path.join(root, name))
    .sort((a, b) => rankOf(a) - rankOf(b) || path.basename(a).localeCompare(path.basename(b), 'zh'));
}

/* ------------------------------------------------------------------ Markdown 解析 */

function splitFrontmatter(raw) {
  const m = /^\uFEFF?---\r?\n([\s\S]*?)\r?\n---[ \t]*\r?\n?/.exec(raw);
  if (!m) return { body: raw.replace(/^\uFEFF/, ''), offset: 0 };
  const offset = (m[0].match(/\n/g) || []).length;
  return { body: raw.slice(m[0].length), offset };
}

function parseDoc(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const { body, offset } = splitFrontmatter(raw);
  const lines = body.split(/\r?\n/);
  const headings = [];
  let inFence = false;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})[ \t]+(.+?)[ \t]*$/.exec(line);
    if (!m) continue;
    let text = m[2].trim();
    const closing = /^(.+?)[ \t]+#+$/.exec(text);
    if (closing) text = closing[1].trim();
    headings.push({ level: m[1].length, text, idx: i, line: i + offset + 1, children: [] });
  }

  const stack = [];
  for (const h of headings) {
    while (stack.length && stack[stack.length - 1].level >= h.level) stack.pop();
    h.parent = stack.length ? stack[stack.length - 1] : null;
    if (h.parent) h.parent.children.push(h);
    stack.push(h);
  }

  headings.forEach((h, i) => {
    const end = i + 1 < headings.length ? headings[i + 1].idx : lines.length;
    h.body = lines.slice(h.idx + 1, end).join('\n');
    h.path = h.parent ? `${h.parent.path} › ${h.text}` : h.text;
  });

  return {
    file,
    headings,
    roots: headings.filter((h) => h.level === 1),
    entries: headings.filter((h) => h.children.length === 0 && h.body.trim() !== ''),
    empties: headings.filter((h) => h.children.length === 0 && h.body.trim() === ''),
  };
}

function countEntries(h) {
  if (h.children.length === 0) return h.body.trim() ? 1 : 0;
  return h.children.reduce((sum, child) => sum + countEntries(child), 0);
}

/* ------------------------------------------------------------------ 内容检查用 */

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`\n]*`/g, ' ');
}

function looksLikeMath(body) {
  if (/\$\$/.test(body)) return true;
  if (/\$[^$\n]*\\[a-zA-Z][^$\n]*\$/.test(body)) return true;
  return /\$[^$\n]*[_^=+\-*/<>][^$\n]*\$/.test(body);
}

function countDollars(body) {
  return (body.replace(/\\\$/g, '').match(/\$/g) || []).length;
}

function hasSymbolBlock(body) {
  return /\*\*符号\*\*\s*[：:]/.test(body);
}

/* ------------------------------------------------------------------ 命令实现 */

function seedText(seed) {
  const out = [`# ${seed.name}`, ''];
  for (const h2 of seed.h2) out.push(`## ${h2}`, '');
  return `${out.join('\n').replace(/\n+$/, '')}\n`;
}

function buildIndex(root) {
  const docs = listDocs(root);
  const rows = docs.map((file) => {
    const doc = parseDoc(file);
    const h1 = doc.roots[0]?.text ?? path.basename(file, '.md');
    const h2 = (doc.roots[0]?.children ?? [])
      .filter((c) => c.level === 2)
      .map((c) => c.text.replace(/\|/g, '\\|'));
    return {
      h1,
      base: path.basename(file),
      h2: h2.length ? h2.join('、') : '—',
      count: doc.entries.length,
      updated: dateOf(fs.statSync(file).mtime),
    };
  });
  const total = rows.reduce((sum, row) => sum + row.count, 0);
  const lines = [
    '# 知识点笔记 · 索引',
    '',
    '> 本页由 skill `knowledge-notes` 生成，请勿手工编辑；新增分类或知识点后运行 `notes.mjs index` 重建。',
    '',
    `更新时间：${stamp()} ｜ 分类 ${rows.length} ｜ 知识点 ${total}`,
    '',
    '| 一级分类 | 文件 | 二级分类 | 知识点 | 最近更新 |',
    '| --- | --- | --- | ---: | --- |',
    ...rows.map((r) => `| ${r.h1} | [${r.base}](${r.base}) | ${r.h2} | ${r.count} | ${r.updated} |`),
    '',
  ];
  fs.writeFileSync(path.join(root, INDEX_FILE), lines.join('\n'), 'utf8');
  return { rows, total };
}

function cmdPaths() {
  const { root, raw, source } = resolveRoot();
  const exists = fs.existsSync(root);
  log(`技能目录  ${SKILL_DIR}`);
  log(`配置文件  ${CONFIG_FILE}${fs.existsSync(CONFIG_FILE) ? '' : '（尚未生成）'}`);
  log(`笔记库    ${root}${exists ? '' : '（不存在）'}`);
  log(`配置来源  ${source}${source === 'config.json' ? `，notes_root = ${JSON.stringify(raw)}` : ''}`);
  if (exists) {
    const docs = listDocs(root);
    const parsed = docs.map((file) => parseDoc(file));
    const entries = parsed.reduce((sum, d) => sum + d.entries.length, 0);
    const empties = parsed.reduce((sum, d) => sum + d.empties.length, 0);
    log(`内容      ${docs.length} 个分类文件 ｜ ${entries} 条知识点 ｜ ${empties} 个空标题`);
    const missing = SEED.filter((s) => !fs.existsSync(path.join(root, `${s.name}.md`)));
    if (missing.length) log(`提示      缺分类文件：${missing.map((s) => `${s.name}.md`).join('、')}（可运行 init 补齐）`);
  } else {
    log('提示      笔记库还没建，运行 init 初始化');
  }
}

function cmdInit() {
  const { root, raw } = resolveRoot();
  fs.mkdirSync(root, { recursive: true });
  const created = [];
  for (const seed of SEED) {
    const file = path.join(root, `${seed.name}.md`);
    if (fs.existsSync(file)) continue;
    fs.writeFileSync(file, seedText(seed), 'utf8');
    created.push(path.basename(file));
  }
  const marker = path.join(root, MARKER_FILE);
  if (!fs.existsSync(marker)) {
    fs.writeFileSync(
      marker,
      `${JSON.stringify({ schema: SCHEMA, skill: 'knowledge-notes', created_at: new Date().toISOString() }, null, 2)}\n`,
      'utf8',
    );
  }
  const cfg = readConfig();
  const envOverride = (process.env.KNOWLEDGE_NOTES_ROOT || '').trim();
  if (!envOverride && (!cfg.notes_root || cfg.schema !== SCHEMA)) {
    saveConfig({ ...cfg, schema: SCHEMA, notes_root: cfg.notes_root || raw });
  }
  const { total } = buildIndex(root);
  log(`笔记库  ${root}`);
  log(created.length ? `新建    ${created.join('、')}` : '分类文件已齐全，未覆盖任何已有文件');
  log(`知识点  ${total} 条 ｜ 索引已生成：${INDEX_FILE}`);
}

function cmdTree() {
  const { root } = resolveRoot();
  if (!fs.existsSync(root)) die(`笔记库不存在：${root}\n先运行 init`);
  const docs = listDocs(root);
  if (!docs.length) {
    log('笔记库为空，先运行 init');
    return;
  }
  log(root);
  for (const file of docs) {
    const doc = parseDoc(file);
    const h1 = doc.roots[0];
    if (!h1) {
      log(`\n${path.basename(file)}  （缺少一级标题）`);
      continue;
    }
    log('');
    log(`${h1.text}  ·  ${countEntries(h1)} 条  ·  ${path.basename(file)}  L${h1.line}`);
    h1.children.forEach((child, i) => printTree(child, '', i === h1.children.length - 1));
  }
}

function printTree(h, prefix, isLast) {
  const count = countEntries(h);
  const isEntry = h.children.length === 0;
  const tag = isEntry ? (count ? '条目' : '空') : `${count} 条`;
  log(`${prefix}${isLast ? '└─ ' : '├─ '}${h.text}  ·  ${tag}${isEntry ? `  L${h.line}` : ''}`);
  const childPrefix = prefix + (isLast ? '   ' : '│  ');
  h.children.forEach((child, i) => printTree(child, childPrefix, i === h.children.length - 1));
}

function cmdFind(terms) {
  if (!terms.length) die('用法：find <关键词...>');
  const { root } = resolveRoot();
  if (!fs.existsSync(root)) die(`笔记库不存在：${root}\n先运行 init`);
  const needles = terms.join(' ').toLowerCase().split(/\s+/).filter(Boolean);
  const hits = [];
  for (const file of listDocs(root)) {
    const doc = parseDoc(file);
    for (const h of doc.headings) {
      const title = h.text.toLowerCase();
      const pathText = h.path.toLowerCase();
      const body = h.body.toLowerCase();
      const hay = `${pathText}\n${body}`;
      if (!needles.every((n) => hay.includes(n))) continue;
      let score = 0;
      if (needles.every((n) => title.includes(n))) score += 4;
      else if (needles.every((n) => pathText.includes(n))) score += 2;
      if (h.children.length === 0) score += 1;
      hits.push({ base: path.basename(file), h, score });
    }
  }
  if (!hits.length) {
    log(`未找到：${terms.join(' ')}`);
    log('可先用 tree 看现有分类，再决定新建哪个标题。');
    return;
  }
  hits.sort((a, b) => b.score - a.score || a.base.localeCompare(b.base, 'zh') || a.h.line - b.h.line);
  for (const { base, h } of hits.slice(0, 50)) {
    log(`${base}:${h.line}  [${h.path}]  ${h.text}`);
  }
  if (hits.length > 50) log(`…… 共 ${hits.length} 处，只显示前 50 处`);
}

function cmdIndex() {
  const { root } = resolveRoot();
  if (!fs.existsSync(root)) die(`笔记库不存在：${root}\n先运行 init`);
  const { rows, total } = buildIndex(root);
  log(`索引已重建：${path.join(root, INDEX_FILE)}`);
  log(`分类 ${rows.length} ｜ 知识点 ${total}`);
  for (const row of rows) log(`  ${row.h1}  ${row.count} 条  （${row.h2}）`);
}

function cmdCheck() {
  const { root } = resolveRoot();
  if (!fs.existsSync(root)) die(`笔记库不存在：${root}\n先运行 init`);
  const issues = [];
  const add = (sev, base, line, msg) => issues.push({ sev, base, line, msg });
  const docs = listDocs(root);

  if (!docs.length) add('警告', INDEX_FILE, 0, '笔记库里还没有分类文件');

  for (const file of docs) {
    const base = path.basename(file);
    const doc = parseDoc(file);
    const h1 = doc.roots[0];
    const stem = base.replace(/\.md$/i, '');

    if (!h1) add('错误', base, 1, '缺少一级标题（应以 # 分类名 开头）');
    if (h1 && h1.text !== stem) add('警告', base, h1.line, `一级标题「${h1.text}」与文件名「${stem}」不一致`);

    let prev = 0;
    for (const h of doc.headings) {
      if (prev && h.level > prev + 1) add('错误', base, h.line, `标题层级跳跃：${prev} → ${h.level}（「${h.text}」）`);
      if (h.level > MAX_DEPTH) add('错误', base, h.line, `标题超过四级：${'#'.repeat(h.level)} 「${h.text}」`);
      prev = h.level;
    }

    const seen = new Map();
    for (const entry of doc.entries) {
      const scope = entry.parent ? entry.parent.path : '(根)';
      const key = `${scope}||${norm(entry.text)}`;
      if (seen.has(key)) {
        add('错误', base, entry.line, `同一分类下重复条目「${entry.text}」（首次在第 ${seen.get(key)} 行）`);
      } else {
        seen.set(key, entry.line);
      }
      const prose = stripCode(entry.body);
      if (looksLikeMath(prose) && !hasSymbolBlock(entry.body)) {
        add('警告', base, entry.line, `「${entry.text}」含公式，但缺少 **符号** 说明`);
      }
      if (/\*\*符号\*\*\s*[：:]\s*(\n|$)/.test(entry.body)) {
        add('警告', base, entry.line, `「${entry.text}」的 **符号** 行为空`);
      }
      if (countDollars(prose) % 2 !== 0) {
        add('警告', base, entry.line, `「${entry.text}」中 $ 个数为奇数，可能有未闭合的公式`);
      }
      if (entry.body.trim().length < 12) {
        add('提示', base, entry.line, `「${entry.text}」正文过短，是否写完整了`);
      }
    }

    const emptyTitles = doc.empties.filter((h) => h.level > 1);
    if (emptyTitles.length) {
      const shown = emptyTitles.slice(0, 8).map((h) => h.text).join('、');
      const more = emptyTitles.length > 8 ? ` 等 ${emptyTitles.length} 个` : '';
      add('提示', base, emptyTitles[0].line, `空标题（尚无内容，分类占位可忽略）：${shown}${more}`);
    }
  }
  const indexFile = path.join(root, INDEX_FILE);
  if (!fs.existsSync(indexFile)) {
    add('警告', INDEX_FILE, 0, '缺少索引文件，运行 index 生成');
  } else {
    const indexText = fs.readFileSync(indexFile, 'utf8');
    for (const file of docs) {
      const base = path.basename(file);
      if (!indexText.includes(`(${base})`)) add('警告', INDEX_FILE, 0, `索引未收录 ${base}，运行 index 重建`);
    }
  }

  const order = { 错误: 0, 警告: 1, 提示: 2 };
  issues.sort((a, b) => order[a.sev] - order[b.sev] || a.base.localeCompare(b.base) || a.line - b.line);

  log(`检查：${root}`);
  log('');
  if (!issues.length) {
    log('检查通过：0 错误、0 警告。');
    return;
  }
  for (const it of issues) {
    const where = it.line ? `${it.base}:${it.line}` : it.base;
    log(`[${it.sev}] ${where}  ${it.msg}`);
  }
  const count = (sev) => issues.filter((i) => i.sev === sev).length;
  log('');
  log(`汇总：错误 ${count('错误')} ｜ 警告 ${count('警告')} ｜ 提示 ${count('提示')}`);
}

function moveFile(src, dst) {
  if (fs.existsSync(dst)) throw new Error(`目标已存在同名文件：${dst}`);
  try {
    fs.renameSync(src, dst);
  } catch (err) {
    if (err.code !== 'EXDEV') throw err;
    fs.copyFileSync(src, dst);
    fs.unlinkSync(src);
  }
}

function cmdSetRoot(args, flags) {
  const target = args[0];
  if (!target) die('用法：set-root <新目录> [--move | --keep-old]');

  const raw = target.startsWith('workspace:') ? target : path.resolve(target);
  const nextRoot = expandTarget(raw);
  const current = resolveRoot();

  if (current.root.toLowerCase() === nextRoot.toLowerCase()) {
    log(`已经是这个目录：${nextRoot}`);
    return;
  }
  if (fs.existsSync(nextRoot) && !fs.statSync(nextRoot).isDirectory()) {
    die(`目标不是目录：${nextRoot}`);
  }

  const oldDocs = listDocs(current.root);
  if (oldDocs.length && !flags.has('--move') && !flags.has('--keep-old')) {
    die(
      [
        `旧笔记库里还有 ${oldDocs.length} 个分类文件：`,
        ...oldDocs.map((f) => `  ${path.basename(f)}`),
        '',
        '为避免笔记变成孤儿，请明确选一个：',
        '  --move      把旧笔记一起搬到新目录',
        '  --keep-old  只切换配置，旧文件留在原处',
      ].join('\n'),
    );
  }

  fs.mkdirSync(nextRoot, { recursive: true });
  const moved = [];
  if (flags.has('--move')) {
    try {
      for (const file of oldDocs) {
        const dst = path.join(nextRoot, path.basename(file));
        moveFile(file, dst);
        moved.push(path.basename(file));
      }
      for (const extra of [INDEX_FILE, MARKER_FILE]) {
        const src = path.join(current.root, extra);
        if (fs.existsSync(src)) moveFile(src, path.join(nextRoot, extra));
      }
    } catch (err) {
      die(`搬迁中断：${err.message}\n配置未改动；已移动 ${moved.length} 个文件，其余仍在 ${current.root}`);
    }
  }

  const cfg = readConfig();
  saveConfig({ ...cfg, schema: SCHEMA, notes_root: raw });
  log(`配置已更新：notes_root = ${raw}`);
  if ((process.env.KNOWLEDGE_NOTES_ROOT || '').trim()) {
    log('注意：环境变量 KNOWLEDGE_NOTES_ROOT 优先级高于配置，当前环境仍会读写旧目录。');
  }
  if (moved.length) log(`已搬迁：${moved.join('、')}`);
  if (flags.has('--keep-old') && oldDocs.length) log(`旧文件保留在：${current.root}`);

  if (!listDocs(nextRoot).length) {
    for (const seed of SEED) {
      const file = path.join(nextRoot, `${seed.name}.md`);
      if (!fs.existsSync(file)) fs.writeFileSync(file, seedText(seed), 'utf8');
    }
    const marker = path.join(nextRoot, MARKER_FILE);
    if (!fs.existsSync(marker)) {
      fs.writeFileSync(
        marker,
        `${JSON.stringify({ schema: SCHEMA, skill: 'knowledge-notes', created_at: new Date().toISOString() }, null, 2)}\n`,
        'utf8',
      );
    }
    log('新目录为空，已生成基础分类文件');
  }
  const { total } = buildIndex(nextRoot);
  log(`笔记库：${nextRoot} ｜ 知识点 ${total} 条 ｜ 索引已重建`);
}

/* ------------------------------------------------------------------ 入口 */

function help() {
  log('knowledge-notes 维护脚本');
  log('');
  log('  paths                     显示技能目录、配置、笔记库位置与内容统计');
  log('  init                      初始化笔记库（只补缺，不覆盖）');
  log('  tree                      打印分类树与条目位置');
  log('  find <关键词...>          按标题/正文检索，用于查重');
  log('  check                     体检：层级、重名、公式符号、索引');
  log('  index                     重建索引页');
  log('  set-root <目录> [--move|--keep-old]   更换笔记库目录');
}

const [cmd, ...rest] = process.argv.slice(2);
const positional = rest.filter((a) => !a.startsWith('--'));
const flags = new Set(rest.filter((a) => a.startsWith('--')));

switch (cmd) {
  case 'paths':
    cmdPaths();
    break;
  case 'init':
    cmdInit();
    break;
  case 'tree':
    cmdTree();
    break;
  case 'find':
    cmdFind(positional);
    break;
  case 'check':
    cmdCheck();
    break;
  case 'index':
    cmdIndex();
    break;
  case 'set-root':
    cmdSetRoot(positional, flags);
    break;
  case undefined:
  case 'help':
  case '--help':
    help();
    break;
  default:
    die(`未知命令：${cmd}\n运行 node notes.mjs help 查看用法`);
}
