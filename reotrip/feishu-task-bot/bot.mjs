import { readFileSync, writeFileSync, mkdirSync, existsSync, appendFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const root = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const require = createRequire(join(root, 'package.json'));
const Lark = require('@larksuiteoapi/node-sdk');

const appId = process.env.FEISHU_APP_ID;
const appSecret = process.env.FEISHU_APP_SECRET;
const TASKS = join(root, '..', 'tasks');
const DATA = join(root, 'data');
const STATE = join(DATA, 'state.json');
const GROK = process.env.GROK_BIN || '/Users/mac/.grok/bin/grok';

mkdirSync(TASKS, { recursive: true });
mkdirSync(DATA, { recursive: true });

const client = new Lark.Client({ appId, appSecret });
const wsClient = new Lark.WSClient({ appId, appSecret, loggerLevel: Lark.LoggerLevel.info });

function loadState() {
  if (!existsSync(STATE)) return { current: null };
  try { return JSON.parse(readFileSync(STATE, 'utf8')); } catch { return { current: null }; }
}
function saveState(s) { writeFileSync(STATE, JSON.stringify(s, null, 2)); }

function redact(text) {
  return String(text || '')
    .replace(/(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*\S+/gi, '$1=[已打码]')
    .replace(/sk-[A-Za-z0-9_-]{10,}/g, '[已打码]')
    .replace(/eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, '[已打码]');
}

function slug(s) {
  return String(s || 'task')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[^\u4e00-\u9fa5\w.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 36) || 'task';
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

function safeName(name) {
  return String(name || 'file').replace(/[/\\?%*:|"<>]/g, '_').slice(0, 80);
}

async function reply(chatId, text) {
  await client.im.v1.message.create({
    params: { receive_id_type: 'chat_id' },
    data: {
      receive_id: chatId,
      msg_type: 'text',
      content: JSON.stringify({ text: text.slice(0, 4000) }),
    },
  });
}

function parseContent(messageType, raw) {
  let obj = {};
  try { obj = JSON.parse(raw || '{}'); } catch { obj = { text: String(raw || '') }; }
  const texts = [];
  const urls = [];
  const files = [];
  const walk = (v) => {
    if (v == null) return;
    if (typeof v === 'string') {
      if (v.trim()) texts.push(v);
      for (const m of v.matchAll(/https?:\/\/[^\s\]）)]+/g)) urls.push(m[0]);
      return;
    }
    if (Array.isArray(v)) { v.forEach(walk); return; }
    if (typeof v === 'object') {
      if (v.file_key) {
        files.push({
          key: v.file_key,
          name: v.file_name || v.name || 'file',
          type: 'file',
        });
      }
      if (v.image_key) {
        files.push({
          key: v.image_key,
          name: (v.file_name || v.image_key) + '.png',
          type: 'image',
        });
      }
      Object.values(v).forEach(walk);
    }
  };
  walk(obj);
  if (obj.text) texts.unshift(obj.text);
  const feishuUrls = [...new Set(urls.filter((u) => /feishu\.cn|larkoffice\.com|larksuite\.com/i.test(u)))];
  return {
    obj,
    text: [...new Set(texts.map((t) => t.trim()).filter(Boolean))].join('\n'),
    urls: [...new Set(urls)],
    feishuUrls,
    files,
  };
}

function extractDocToken(url) {
  const u = String(url || '');
  const wiki = u.match(/\/wiki\/([A-Za-z0-9]+)/);
  if (wiki) return { kind: 'wiki', token: wiki[1], url: u };
  const docx = u.match(/\/(?:docx|docs)\/([A-Za-z0-9]+)/);
  if (docx) return { kind: 'docx', token: docx[1], url: u };
  const sheet = u.match(/\/(?:sheets|sheet)\/([A-Za-z0-9]+)/);
  if (sheet) return { kind: 'sheet', token: sheet[1], url: u };
  const base = u.match(/\/base\/([A-Za-z0-9]+)/);
  if (base) return { kind: 'bitable', token: base[1], url: u };
  return null;
}

async function readDocx(token) {
  const res = await client.docx.v1.document.rawContent({
    path: { document_id: token },
  });
  return res?.data?.content || JSON.stringify(res, null, 2);
}

async function readWiki(token) {
  const node = await client.wiki.v2.space.getNode({
    params: { token },
  });
  const info = node?.data?.node || {};
  const objToken = info.obj_token || token;
  const objType = info.obj_type || '';
  let body = `wiki node: ${info.title || ''} type=${objType} token=${objToken}\n`;
  if (objType === 'docx' || objType === 'doc') {
    try { body += await readDocx(objToken); } catch (e) { body += `(docx read failed: ${e.message})\n`; }
  } else {
    body += JSON.stringify(info, null, 2);
  }
  return body;
}

async function pullDocs(urls) {
  const chunks = [];
  for (const url of urls) {
    const ref = extractDocToken(url);
    if (!ref) continue;
    try {
      if (ref.kind === 'wiki') chunks.push(`## ${url}\n` + await readWiki(ref.token));
      else if (ref.kind === 'docx') chunks.push(`## ${url}\n` + await readDocx(ref.token));
      else chunks.push(`## ${url}\n(类型 ${ref.kind}，链接已记下)`);
    } catch (e) {
      chunks.push(`## ${url}\n读取失败：${e.message}\n请在文档右上角「…」→「添加文档应用」里加上「任务助手」，或把正文贴过来。`);
    }
  }
  return chunks.join('\n\n');
}

async function downloadAttachments(messageId, files, destDir) {
  const saved = [];
  const seen = new Set();
  for (const f of files) {
    if (!f.key || seen.has(f.key)) continue;
    seen.add(f.key);
    const name = safeName(f.name || f.key);
    const path = join(destDir, name);
    try {
      const res = await client.im.v1.messageResource.get({
        path: { message_id: messageId, file_key: f.key },
        params: { type: f.type === 'image' ? 'image' : 'file' },
      });
      await res.writeFile(path);
      saved.push(name);
      console.log('saved file', name);
    } catch (e) {
      console.error('download failed', f.key, e.message);
      saved.push(`${name}（下载失败：${e.message}）`);
    }
  }
  return saved;
}

function writeReadme(dir, title) {
  writeFileSync(join(dir, 'README.md'), `# ${title}

这是飞书「任务助手」自动建的 Grok 工作目录。

| 路径 | 内容 |
|------|------|
| inbox.md | 飞书原文和补充 |
| docs.md | 拉下来的云文档正文 |
| files/ | 转发过来的附件 |
| plan.md | Grok 出的方案 |
| output/ | 成果（表格、xlsx、截图等） |

在此目录打开 Grok：

\`\`\`
cd "${dir}"
grok
\`\`\`
`);
}

function compactList(section) {
  if (!section) return '';
  const items = [];
  for (const raw of String(section).split(/\r?\n/)) {
    let line = raw.replace(/^#+\s*/, '').trim();
    if (!line) continue;
    if (/^(需要你确认的信息|需要你动手的事|请你现在确认|请你现在打开|Grok 做不到)/.test(line)) continue;
    line = line.replace(/^[-*]\s*/, '').replace(/^\[(确认|人工|打开)\]\s*/, '');
    if (!line || line === '无') continue;
    if (line.length > 80) line = line.slice(0, 77) + '…';
    items.push(`· ${line}`);
    if (items.length >= 6) break;
  }
  return items.join('\n');
}

function extractSection(plan, titles) {
  const lines = String(plan || '').split(/\r?\n/);
  const isHeading = (line) => {
    const t = line.replace(/^#+\s*/, '').trim();
    return titles.some((x) => t.includes(x));
  };
  let start = -1;
  for (let i = 0; i < lines.length; i++) {
    if (isHeading(lines[i])) { start = i; break; }
  }
  if (start < 0) return '';
  let end = lines.length;
  for (let i = start + 1; i < lines.length; i++) {
    if (/^#{1,3}\s+\S/.test(lines[i]) && !isHeading(lines[i])) {
      end = i;
      break;
    }
  }
  return lines.slice(start, end).join('\n').trim();
}

function grokRun({ taskDir, prompt, allowWrite }) {
  return new Promise((resolve, reject) => {
    const args = [
      '-p', prompt,
      '--cwd', taskDir,
      '--permission-mode', 'bypassPermissions',
    ];
    if (!allowWrite) args.push('--disallowed-tools', 'search_replace');
    const child = spawn(GROK, args, { cwd: taskDir, env: process.env });
    let out = '';
    let err = '';
    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { err += d.toString(); });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code !== 0 && !out.trim()) reject(new Error(err.slice(0, 800) || `grok exit ${code}`));
      else resolve((out || err).trim());
    });
  });
}

function ensureTask(chatId, titleHint) {
  const state = loadState();
  const dir = join(TASKS, `${stamp()}-${slug(titleHint)}`);
  mkdirSync(join(dir, 'files'), { recursive: true });
  mkdirSync(join(dir, 'output'), { recursive: true });
  mkdirSync(join(dir, 'refs'), { recursive: true });
  writeReadme(dir, titleHint);
  writeFileSync(join(dir, 'inbox.md'), `# ${titleHint}\n\n`);
  const task = { dir, chatId, title: titleHint, createdAt: new Date().toISOString() };
  state.current = task;
  saveState(state);
  console.log('new grok folder', dir);
  return task;
}

function currentTask() {
  const s = loadState();
  if (s.current && existsSync(s.current.dir)) return s.current;
  return null;
}

function appendInbox(dir, block) {
  appendFileSync(join(dir, 'inbox.md'), block + '\n\n');
}

function titleFrom(parsed, messageType) {
  if (parsed.files[0]?.name) return parsed.files[0].name.replace(/\.[^.]+$/, '');
  if (parsed.feishuUrls[0]) {
    const tok = extractDocToken(parsed.feishuUrls[0]);
    return tok ? `飞书${tok.kind}` : '飞书文档';
  }
  const line = parsed.text.split('\n')[0];
  if (line && line.length < 40) return line;
  if (messageType === 'image') return '图片任务';
  if (messageType === 'file') return '文件任务';
  return '飞书任务';
}

async function handleNewOrUpdate(data, parsed, isNew) {
  const chatId = data.message.chat_id;
  const title = titleFrom(parsed, data.message.message_type);
  const task = isNew ? ensureTask(chatId, title) : (currentTask() || ensureTask(chatId, title));

  const header = `## ${new Date().toISOString()}  ${data.message.message_type}\n`;
  appendInbox(task.dir, header + redact(parsed.text || JSON.stringify(parsed.obj, null, 2)));
  if (parsed.feishuUrls.length) appendInbox(task.dir, '### 链接\n' + parsed.feishuUrls.join('\n'));
  writeFileSync(join(task.dir, 'raw-last.json'), JSON.stringify(data, null, 2));

  const saved = await downloadAttachments(data.message.message_id, parsed.files, join(task.dir, 'files'));
  if (saved.length) appendInbox(task.dir, '### 附件\n' + saved.map((n) => `- files/${n}`).join('\n'));

  await reply(
    chatId,
    (isNew ? `已新建 Grok 工作目录：\n${task.dir}\n\n正在读内容并出方案（先不改成果）。` : `已追加到当前目录：\n${task.dir}\n\n正在更新方案。`),
  );

  const docs = await pullDocs(parsed.feishuUrls);
  if (docs) {
    const prev = existsSync(join(task.dir, 'docs.md')) ? readFileSync(join(task.dir, 'docs.md'), 'utf8') + '\n\n' : '';
    writeFileSync(join(task.dir, 'docs.md'), prev + redact(docs));
    appendInbox(task.dir, '### 文档正文\n' + redact(docs));
  }

  try {
    const plan = await grokRun({
      taskDir: task.dir,
      allowWrite: false,
      prompt: `你是实习助手。这是飞书转发来的任务，工作目录是：
${task.dir}

目录约定：
- inbox.md / docs.md / files/ 是需求
- plan.md 将由系统保存你的方案
- output/ 留给以后的成果，现在不要往里面写

先读 inbox.md、docs.md（如有）和 files/。只出实施方案，禁止修改文件、禁止爬取、禁止碰密码/.env。登录类网站只写「请你用已登录的浏览器打开」，不要向用户要账号密码。

必须用中文，严格按顺序写。前两节给用户看，要短：每条一行，每节最多 6 条，禁止解释、禁止套话。

## 需要你确认的信息
只写必须拍板的决策。格式：
- 问题？A / B（默认 B）
没有就写：无

## 需要你动手的事
Grok 做不到、必须你做的。打开网页只是其中一类。格式：
- 做什么（链接有就带上，从 inbox/docs 抄，禁止编造）
没有就写：无

## 任务理解
## 交付物
默认飞书电子表格，不要用没排版的 xlsx 当成品。
## 字段 / 样例 / 分类
## 工作目录猜测
## 登录与爬取
只复用已登录浏览器；说明节奏和风控。
## 表格美观规格
## Grok 自己能做的部分
简要列出实施时我能自动完成的步骤，方便你对照上面的人工清单。`,
    });
    writeFileSync(join(task.dir, 'plan.md'), plan);
    const confirmSec = extractSection(plan, ['需要你确认的信息', '请你现在确认']);
    const humanSec = extractSection(plan, ['需要你动手的事', 'Grok 做不到', '请你现在打开']);
    const confirm = compactList(confirmSec) || '· 无';
    const human = compactList(humanSec) || '· 无';
    const checklist = `需要你确认：\n${confirm}\n\n需要你做：\n${human}`;
    writeFileSync(join(task.dir, '需要你确认.md'), checklist);

    await reply(chatId, checklist);

    const rest = plan
      .replace(confirmSec, '')
      .replace(humanSec, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    const shown = rest.length > 2500 ? rest.slice(0, 2500) + '\n…' : rest;
    await reply(
      chatId,
      `方案：\n${shown || '见 plan.md'}\n\n目录：${task.dir}\n看完上面清单后回「做」。`,
    );
  } catch (e) {
    console.error('plan failed', e);
    await reply(chatId, `方案失败：${e.message}\n目录仍在 ${task.dir}`);
  }
}

async function handleDo(chatId) {
  const task = currentTask();
  if (!task) {
    await reply(chatId, '没有进行中的任务。先转发文件或云文档。');
    return;
  }
  await reply(chatId, `开始按方案做。成果只会写进：\n${join(task.dir, 'output')}`);
  try {
    const out = await grokRun({
      taskDir: task.dir,
      allowWrite: true,
      prompt: `按 ${join(task.dir, 'plan.md')} 实施。

硬性规则：
- 工作目录：${task.dir}
- 成果（表格、xlsx、tsv、截图、导出）一律写到 output/
- 可以读 inbox.md / docs.md / files/ / plan.md
- 禁止碰密码、.env、cookie、配置文件
- 登录类网站只复用用户已打开的浏览器，不要输入账号密码
- 不要把公司代码整份贴回聊天
- 做完用中文写一份很短的摘要：写了哪些 output 文件、还缺什么`,
    });
    writeFileSync(join(task.dir, 'output', '摘要.md'), out);
    const shown = out.length > 2500 ? out.slice(0, 2500) + '\n…' : out;
    await reply(chatId, `${shown}\n\n成果目录：\n${join(task.dir, 'output')}`);
  } catch (e) {
    console.error('do failed', e);
    await reply(chatId, `实施失败：${e.message}\n目录：${task.dir}`);
  }
}

async function handle(data) {
  const msg = data.message || {};
  if (data.sender?.sender_type === 'app') return;
  const parsed = parseContent(msg.message_type, msg.content);
  const text = (parsed.text || '').trim();
  const cmd = text.replace(/\s+/g, '');
  const chatId = msg.chat_id;

  console.log('recv', {
    type: msg.message_type,
    cmd: cmd.slice(0, 40),
    urls: parsed.feishuUrls,
    files: parsed.files.map((f) => f.name),
  });

  if (/^(ping|你好|在吗|hi|hello)$/i.test(cmd)) {
    await reply(chatId, '在。转发文件或云文档给我，我会新建一个 Grok 文件夹，方案和成果都放进去。');
    return;
  }
  if (cmd === '停' || cmd === '取消') {
    const s = loadState();
    s.current = null;
    saveState(s);
    await reply(chatId, '已取消当前任务。再转发会建新文件夹。');
    return;
  }
  if (cmd === '做' || cmd === '按方案做') {
    await handleDo(chatId);
    return;
  }

  const looksNew =
    !currentTask() ||
    parsed.feishuUrls.length > 0 ||
    parsed.files.length > 0 ||
    ['file', 'image', 'media', 'audio', 'video', 'merge_forward', 'post'].includes(msg.message_type);
  await handleNewOrUpdate(data, parsed, looksNew);
}

console.log('starting task bot long-connection…');
wsClient.start({
  eventDispatcher: new Lark.EventDispatcher({}).register({
    'im.message.receive_v1': async (data) => {
      setImmediate(() => handle(data).catch((e) => console.error('handle', e)));
    },
  }),
});
