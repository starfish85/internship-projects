import { readFileSync } from 'fs';
import { createRequire } from 'module';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const root = dirname(fileURLToPath(import.meta.url));
for (const line of readFileSync(join(root, '.env'), 'utf8').split('\n')) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2];
}

const require = createRequire(join(root, 'package.json'));
const Lark = require('@larksuiteoapi/node-sdk');

const appId = process.env.FEISHU_APP_ID;
const appSecret = process.env.FEISHU_APP_SECRET;
if (!appId || !appSecret) {
  console.error('missing FEISHU_APP_ID / FEISHU_APP_SECRET');
  process.exit(1);
}

const client = new Lark.Client({ appId, appSecret });
const wsClient = new Lark.WSClient({
  appId,
  appSecret,
  loggerLevel: Lark.LoggerLevel.info,
});

console.log('starting long-connection…');

wsClient.start({
  eventDispatcher: new Lark.EventDispatcher({}).register({
    'im.message.receive_v1': async (data) => {
      const msg = data.message || {};
      const { chat_id, content, message_type, chat_type, message_id } = msg;
      console.log('recv', { chat_type, message_type, message_id, content: String(content).slice(0, 200) });
      if (data.sender?.sender_type === 'app') return;
      try {
        await client.im.v1.message.create({
          params: { receive_id_type: 'chat_id' },
          data: {
            receive_id: chat_id,
            msg_type: 'text',
            content: JSON.stringify({ text: '收到了，长连接是通的' }),
          },
        });
      } catch (err) {
        console.error('reply failed', err?.message || err);
      }
    },
  }),
});
