/**
 * §56 POI 真验收硬门禁（属性页 · 点「保存然后」之前）
 *
 * 硬规则：
 * 1. 读回已选地点完整文案（名称+地址/城市）
 * 2. 与产品韩文名 / Excel 内部名关键词交叉匹配
 * 3. 不匹配 → 删除错误点 → 重搜重选 → 再读回（最多 2 轮可见重试）
 * 4. 未通过：禁止点「保存然后」、禁止 goto 介绍
 * 5. 汇报必须含：【结果】POI读回=… 关键词匹配=通过|失败
 *
 * 搜索规则：
 * - 禁止默认点第 1 条；按城市/官方名 filter
 * - 机场：读回最好含三字码或官方机场名
 * - 同名多结果：必须出现目标城市（北京/上海等）
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** 预置产品关键词（可扩展） */
export const POI_PROFILES = Object.freeze({
  PKX: {
    id: 'PKX',
    label: '北京大兴国际机场',
    productHints: ['PKX', '다싱', '大兴', 'Daxing'],
    internalHints: ['大兴', 'PKX', 'Daxing'],
    // 至少命中一组 anyOf 中的任一关键词
    requireAny: [/大兴|다싱|Daxing|PKX/i],
    // 全部 requireAll 组必须命中（机场类常要求 机场/Airport）
    requireAll: [[/机场|Airport|공항|국제공항/i]],
    // 任一 reject 命中即 FAIL
    reject: [/首都|수도|Capital|PEK\b|浦东|Pudong|PVG|虹桥|Hongqiao|SHA\b|酒店|Hotel|宾馆|住宿|주주/i],
    city: [/北京|Beijing|베이징|中华|中国|China/i],
    searchQueries: ['北京大兴国际机场', 'Beijing Daxing International Airport', '大兴国际机场'],
    officialName: /北京大兴国际机场|Daxing International Airport|베이징\s*다싱/i,
    iata: /PKX/i,
    isAirport: true,
  },
  PEK: {
    id: 'PEK',
    label: '北京首都国际机场',
    productHints: ['PEK', '수도', '首都', 'Capital'],
    internalHints: ['首都', 'PEK', 'Capital'],
    requireAny: [/首都|수도|Capital|PEK/i],
    requireAll: [[/机场|Airport|공항|국제공항/i]],
    reject: [/大兴|다싱|Daxing|PKX\b|浦东|Pudong|PVG|虹桥|Hongqiao|酒店|Hotel|宾馆|住宿/i],
    city: [/北京|Beijing|베이징|中华|中国|China/i],
    searchQueries: ['北京首都国际机场', 'Beijing Capital International Airport', '首都国际机场'],
    officialName: /北京首都国际机场|Capital International Airport|베이징\s*수도/i,
    iata: /PEK/i,
    isAirport: true,
  },
  PVG: {
    id: 'PVG',
    label: '上海浦东国际机场',
    productHints: ['PVG', '푸동', '浦东', 'Pudong'],
    internalHints: ['浦东', 'PVG', 'Pudong'],
    requireAny: [/浦东|Pudong|PVG|푸동/i],
    requireAll: [[/机场|Airport|공항|국제공항/i]],
    reject: [
      /虹桥|Hongqiao|SHA\b|大兴|Daxing|首都|Capital|PEK|PKX|火车站|Railway Station|酒店|Hotel|宾馆|住宿|주주/i,
    ],
    city: [/上海|Shanghai|상하이|中华|中国|China/i],
    searchQueries: ['上海浦东国际机场', 'Shanghai Pudong International Airport', '浦东国际机场'],
    officialName: /上海浦东国际机场|Pudong International Airport|상하이\s*푸동/i,
    iata: /PVG/i,
    isAirport: true,
  },
  SHA: {
    id: 'SHA',
    label: '上海虹桥国际机场',
    productHints: ['SHA', '훙차오', '虹桥', 'Hongqiao'],
    internalHints: ['虹桥机场', '虹桥', 'SHA', 'Hongqiao'],
    requireAny: [/虹桥|Hongqiao|SHA|훙차오/i],
    requireAll: [[/机场|Airport|공항|국제공항/i]],
    reject: [
      /浦东|Pudong|PVG|大兴|Daxing|首都|Capital|PEK|PKX|虹桥站|火车站|Railway Station|Hongqiao Station|酒店|Hotel|宾馆|住宿/i,
    ],
    city: [/上海|Shanghai|상하이|中华|中国|China/i],
    searchQueries: ['上海虹桥国际机场', 'Shanghai Hongqiao International Airport', '虹桥国际机场'],
    officialName: /上海虹桥国际机场|Hongqiao International Airport|상하이\s*훙차오/i,
    iata: /SHA/i,
    isAirport: true,
  },
  PEARL: {
    id: 'PEARL',
    label: '东方明珠',
    productHints: ['동방명주', '东方明珠', 'Oriental Pearl'],
    internalHints: ['东方明珠', '明珠'],
    requireAny: [/东方明珠|동방명주|Oriental\s*Pearl/i],
    requireAll: [[/上海|Shanghai|상하이|Lujiazui|陆家嘴|Century|浦东|Pudong|中华|中国/i]],
    reject: [/서울|Seoul|韩国|韓國|Korea|강남|중구|호텔|酒店(?!.*上海)/i],
    city: [/上海|Shanghai|상하이|中华|中国|China|Lujiazui|陆家嘴/i],
    searchQueries: ['东方明珠', '동방명주탑', 'Oriental Pearl Tower Shanghai'],
    officialName: /东方明珠|Oriental Pearl|동방명주/i,
    iata: null,
    isAirport: false,
  },
  SHZ: {
    id: 'SHZ',
    label: '上海火车站',
    productHints: ['상하이역', '上海火车站', 'Shanghai Railway'],
    internalHints: ['上海火车站', '火车站'],
    requireAny: [/上海站|上海火车站|Shanghai\s*(Railway\s*)?Station|상하이\s*역/i],
    requireAll: [],
    reject: [
      /虹桥|Hongqiao|浦东|Pudong|酒店|Hotel|宾馆|布丁|住宿|주주|南京|杭州|北京/i,
    ],
    city: [/上海|Shanghai|상하이|中华|中国/i],
    searchQueries: ['上海火车站', '上海 역', 'Shanghai Railway Station'],
    officialName: /上海站|上海火车站|Shanghai Railway Station|상하이\s*역/i,
    iata: null,
    isAirport: false,
  },
  HQ_STATION: {
    id: 'HQ_STATION',
    label: '上海虹桥火车站',
    productHints: ['훙차오역', '虹桥站', 'Hongqiao Station'],
    internalHints: ['虹桥站', '虹桥火车站'],
    requireAny: [/虹桥站|虹桥火车站|Hongqiao\s*(Railway\s*)?Station|훙차오\s*역/i],
    requireAll: [],
    reject: [/机场|Airport|공항|浦东|Pudong|酒店|Hotel|宾馆|住宿/i],
    city: [/上海|Shanghai|상하이|中华|中国/i],
    searchQueries: ['上海虹桥火车站', '虹桥站', 'Shanghai Hongqiao Railway Station'],
    officialName: /虹桥站|虹桥火车站|Hongqiao Railway Station|훙차오역/i,
    iata: null,
    isAirport: false,
  },
  WSK: {
    id: 'WSK',
    label: '上海吴淞口国际邮轮港',
    productHints: ['우송커우', '吴淞口', 'Wusongkou'],
    internalHints: ['吴淞口', '邮轮港'],
    requireAny: [/吴淞口|Wusongkou|우송커우|邮轮|크루즈|Cruise/i],
    requireAll: [],
    reject: [/火车站|机场|Airport|酒店|Hotel|宾馆|迪士尼|Disney/i],
    city: [/上海|Shanghai|상하이|宝山|Baoshan|中华|中国/i],
    searchQueries: ['上海吴淞口国际邮轮港', '吴淞口国际邮轮港', 'Wusongkou International Cruise Terminal'],
    officialName: /吴淞口|Wusongkou|邮轮港|Cruise/i,
    iata: null,
    isAirport: false,
  },




  SUZUKA: {
    id: 'SUZUKA',
    label: '스즈카',
    productHints: ['스즈카', '铃鹿', 'Suzuka'],
    internalHints: ['铃鹿'],
    requireAny: [/铃鹿|Suzuka|スズカ|스즈카/i],
    requireAll: [],
    reject: [/京都駅|Kyoto\s*Station|교토역|호텔|酒店|Hotel|숙소|大阪|Osaka|도쿄|東京/i],
    city: [/铃鹿|Suzuka|スズカ|스즈카|三重|Mie|일본|日本|Japan/i],
    searchQueries: ['鈴鹿', 'Suzuka', '스즈카', '鈴鹿市'],
    officialName: /铃鹿|Suzuka|スズカ|스즈카/i,
    iata: null,
    isAirport: false,
  },
  KYOTO_STN: {
    id: 'KYOTO_STN',
    label: '교토역',
    productHints: ['교토역', '京都站', 'Kyoto Station', '京都駅'],
    internalHints: ['京都站', '京都駅'],
    requireAny: [/京都駅|Kyoto\s*Station|교토역|京都站/i],
    requireAll: [],
    reject: [/新大阪|Shin-Osaka|도쿄역|東京駅|Tokyo\s*Station|호텔|酒店|Hotel|숙소|南山城|宇治/i],
    city: [/京都|Kyoto|교토|일본|日本|Japan/i],
    searchQueries: ['京都駅', '교토 역', 'Kyoto Station', '교토역'],
    officialName: /京都駅|Kyoto\s*Station|교토역/i,
    iata: null,
    isAirport: false,
  },
  SKYTREE: {
    id: 'SKYTREE',
    label: '도쿄 스카이트리',
    productHints: ['스카이트리', '晴空塔', 'Skytree', 'スカイツリー'],
    internalHints: ['晴空塔', 'Skytree'],
    requireAny: [/晴空塔|Skytree|スカイツリー|스카이\s*트리|스카이트리/i],
    requireAll: [],
    reject: [/타워\s*타워|Tokyo\s*Tower|도쿄타워|東京タワー|서울|Seoul|迪士尼|Disney/i],
    city: [/東京|Tokyo|도쿄|Sumida|墨田|일본|日本|Japan/i],
    searchQueries: [
      '東京スカイツリー',
      '도쿄 스카이 트리',
      'Tokyo Skytree',
      'スカイツリー',
    ],
    officialName: /Skytree|スカイツリー|스카이트리/i,
    iata: null,
    isAirport: false,
  },




  RUSUTSU: {
    id: 'RUSUTSU',
    label: '루스쓰',
    productHints: ['루스쓰', '留寿都', 'Rusutsu', 'ルスツ'],
    internalHints: ['留寿都'],
    requireAny: [/留寿都|Rusutsu|루스쓰|ルスツ|루스토/i],
    requireAll: [],
    reject: [/호텔|酒店|Hotel|숙소|니세코|Niseko|二世谷|札幌駅|Sapporo\s*Station/i],
    city: [/留寿都|Rusutsu|루스쓰|北海道|Hokkaido|홋카이도|일본|日本|Japan/i],
    searchQueries: ['ルスツ', 'Rusutsu', '루스쓰', '留寿都', 'ルスツリゾート'],
    officialName: /留寿都|Rusutsu|루스쓰|ルスツ/i,
    iata: null,
    isAirport: false,
  },
  NISEKO: {
    id: 'NISEKO',
    label: '니세코',
    productHints: ['니세코', '二世谷', 'Niseko'],
    internalHints: ['二世谷'],
    requireAny: [/二世谷|Niseko|ニセコ|니세코/i],
    requireAll: [],
    reject: [/호텔|酒店|Hotel|숙소|札幌(?!.*Niseko)|Sapporo\s*Station|삿포로역|新千岁|CTS/i],
    city: [/二世谷|Niseko|ニセコ|니세코|北海道|Hokkaido|홋카이도|일본|日本|Japan|倶知安|Kutchan/i],
    searchQueries: [
      'ニセコ',
      'Niseko',
      '니세코',
      '二世谷',
      'ニセコ 町',
    ],
    officialName: /Niseko|ニセコ|니세코|二世谷/i,
    iata: null,
    isAirport: false,
  },

  LEGOLAND: {
    id: 'LEGOLAND',
    label: '레고랜드 재팬',
    productHints: ['레고랜드', '乐高乐园', 'Legoland', 'LEGOLAND', '스즈카 서킷', '铃鹿赛道'],
    internalHints: ['乐高乐园', '铃鹿赛道', '铃鹿'],
    requireAny: [/乐高|LEGOLAND|Legoland|レゴランド|레고랜드|铃鹿|Suzuka|スズカ|스즈카|サーキット|서킷|Circuit/i],
    requireAll: [],
    reject: [/호텔|酒店|Hotel|숙소|서울|Seoul|上海|Shanghai|迪士尼|Disney/i],
    city: [/名古屋|Nagoya|나고야|爱知|Aichi|三重|Mie|铃鹿|Suzuka|일본|日本|Japan/i],
    searchQueries: ['レゴランドジャパン', 'Legoland Japan', '레고랜드 재팬', '鈴鹿サーキット'],
    officialName: /LEGOLAND|Legoland|レゴランド|레고랜드|铃鹿|Suzuka|サーキット|서킷/i,
    iata: null,
    isAirport: false,
  },
  GHIBLI: {
    id: 'GHIBLI',
    label: '지브리 파크',
    productHints: ['지브리', '吉卜力', 'Ghibli', 'ジブリ'],
    internalHints: ['吉卜力'],
    requireAny: [/吉卜力|Ghibli|ジブリ|지브리|Ghibli\s*Park|ジブリパーク/i],
    requireAll: [],
    reject: [/호텔|酒店|Hotel|숙소|东京|Tokyo|大阪|Osaka|哈利|Harry|Harry\s*Potter/i],
    city: [/爱知|Aichi|名古屋|Nagoya|나고야|일본|日本|Japan|長久手|Nagakute/i],
    searchQueries: [
      'ジブリパーク',
      'Ghibli Park',
      '지브리 파크',
      '吉卜力公园',
      'ジブリパーク 長久手',
    ],
    officialName: /Ghibli|ジブリ|지브리|吉卜力/i,
    iata: null,
    isAirport: false,
  },

  NAGANO: {
    id: 'NAGANO',
    label: '나가노',
    productHints: ['나가노', '长野', 'Nagano', '長野'],
    internalHints: ['长野', '長野'],
    requireAny: [/长野|長野|Nagano|나가노|ナガノ/i],
    requireAll: [],
    reject: [/호텔|酒店|Hotel|숙소|서울|Seoul|東京駅|도쿄역|大阪|Osaka/i],
    city: [/长野|長野|Nagano|나가노|일본|日本|Japan/i],
    searchQueries: ['나가노역', '長野駅', 'Nagano Station', '나가노', '長野', 'Nagano'],
    officialName: /长野|長野|Nagano|나가노/i,
    iata: null,
    isAirport: false,
  },
  TAKAYAMA: {
    id: 'TAKAYAMA',
    label: '다카야마',
    productHints: ['다카야마', '高山', 'Takayama'],
    internalHints: ['高山'],
    requireAny: [/高山|Takayama|タカヤマ|다카야마|たかやま/i],
    requireAll: [],
    reject: [/名古屋|Nagoya|나고야|ホテル|酒店|Hotel|숙소|东京|Tokyo|大阪|Osaka|吉卜力|Ghibli/i],
    city: [/高山|Takayama|岐阜|Gifu|일본|日本|Japan/i],
    searchQueries: [
      '高山',
      'Takayama',
      '다카야마',
      '高山市',
      '飛騨高山',
    ],
    officialName: /高山|Takayama|다카야마|飛騨/i,
    iata: null,
    isAirport: false,
  },
  HARRY: {
    id: 'HARRY',
    label: '워너브라더스 스튜디오 투어 도쿄 해리포터',
    productHints: ['해리포터', '哈利波特', 'Harry Potter', 'ワーナー'],
    internalHints: ['哈利波特', 'Harry'],
    requireAny: [/哈利波特|Harry\s*Potter|ハリー|해리포터|Warner\s*Bros|ワーナー|スタジオ\s*ツアー/i],
    requireAll: [],
    reject: [/ディズニー|Disney|디즈니|ユニバーサル|Universal|羽田|成田|ホテル(?!.*Studio)|酒店(?!.*Studio)/i],
    city: [/東京|Tokyo|도쿄|としま|练马|練馬|Nerima|日本|Japan/i],
    searchQueries: [
      'ワーナーブラザース',
      'Studio Tour Tokyo',
      '워너 브라더스 스튜디오 도쿄',
      '메이킹 오브 해리 포터',
    ],
    officialName: /Studio\s*Tour|スタジオ\s*ツアー|Harry\s*Potter|ハリー/i,
    iata: null,
    isAirport: false,
  },
  DWP: {
    id: 'DWP',
    label: '上海迪士尼',
    productHints: ['디즈니', '迪士尼', 'Disney'],
    internalHints: ['迪士尼', 'Disney'],
    requireAny: [/迪士尼|Disney|디즈니/i],
    requireAll: [[/上海|Shanghai|상하이|浦东|Pudong|中华|中国/i]],
    reject: [/香港|Hong\s*Kong|东京|Tokyo|오사카|大阪|酒店|Hotel|宾馆/i],
    city: [/上海|Shanghai|상하이|浦东|Pudong|中华|中国/i],
    searchQueries: ['上海迪士尼乐园', 'Shanghai Disney Resort', '上海迪士尼'],
    officialName: /迪士尼|Disney/i,
    iata: null,
    isAirport: false,
  },
  OSAKA_PORT: {
    id: 'OSAKA_PORT',
    label: '오사카항',
    productHints: ['오사카항', '大阪港', 'Osaka Port', '페리'],
    internalHints: ['大阪港'],
    requireAny: [/大阪港|Osaka\s*Port|오사카항|오사카\s*항|국제\s*페리|フェリー|Ferry\s*Terminal|港/i],
    requireAll: [],
    reject: [/공항|Airport|공항|KIX|ITM|关西|伊丹|호텔|酒店|Hotel|숙소|京都|Kyoto|교토|도쿄|東京|横浜|Yokohama/i],
    city: [/大阪|Osaka|오사카|일본|日本|Japan/i],
    searchQueries: [
      '오사카 국제 페리 터미널',
      '大阪 国際 フェリー',
      'Osaka International Ferry Terminal',
      '大阪港',
    ],
    officialName: /페리|Ferry|大阪港|Osaka\s*Port|오사카항/i,
    iata: null,
    isAirport: false,
  },
  HANEDA: {
    id: 'HANEDA',
    label: '하네다 공항(HND)',
    productHints: ['하네다', '羽田', 'Haneda', 'HND'],
    internalHints: ['羽田', 'HND'],
    requireAny: [/羽田|Haneda|하네다|HND|东京国际机场|Tokyo\s*International\s*Airport/i],
    requireAll: [[/机场|Airport|공항|국제공항/i]],
    reject: [/成田|Narita|NRT|나리타|关西|KIX|伊丹|ITM|호텔|酒店|Hotel|横滨港|Yokohama\s*Port/i],
    city: [/东京|Tokyo|도쿄|일본|日本|Japan|大田|Ota/i],
    searchQueries: [
      '羽田空港',
      'Haneda Airport',
      '하네다 공항',
      '東京国際空港',
    ],
    officialName: /羽田|Haneda|하네다|HND|東京国際空港/i,
    iata: /HND/i,
    isAirport: true,
  },

  TOKYO_PORT: {
    id: 'TOKYO_PORT',
    label: '도쿄항',
    productHints: ['도쿄항', '东京港', 'Tokyo Port', 'クルーズ'],
    internalHints: ['东京港', '東京港'],
    requireAny: [/东京港|東京港|Tokyo\s*Port|도쿄항|도쿄\s*항|Cruise\s*Terminal|크루즈|国際\s*クルーズ|港/i],
    requireAll: [],
    reject: [/공항|Airport|공항|羽田|Haneda|成田|Narita|호텔|酒店|Hotel|숙소|横浜|Yokohama|요코하마|大阪|Osaka/i],
    city: [/东京|東京|Tokyo|도쿄|일본|日本|Japan|有明|Ariake|青海|Odaiba/i],
    searchQueries: [
      '東京国際クルーズターミナル',
      'Tokyo International Cruise Terminal',
      '도쿄 국제 크루즈 터미널',
      '东京港',
      '東京港',
    ],
    officialName: /Cruise|クルーズ|크루즈|东京港|東京港|Tokyo\s*Port|도쿄항/i,
    iata: null,
    isAirport: false,
  },

  KOBE_PORT: {
    id: 'KOBE_PORT',
    label: '고베항',
    productHints: ['고베항', '神户港', 'Kobe Port', '神戸港'],
    internalHints: ['神户港', '神戸港'],
    requireAny: [/神户港|神戸港|Kobe\s*Port|고베항|고베\s*항|Kobe\s*Harbor|メリケン/i],
    requireAll: [],
    reject: [/호텔|酒店|Hotel|숙소|공항|Airport|공항|京都駅|Kyoto\s*Station/i],
    city: [/神户|神戸|Kobe|고베|兵库|Hyogo|일본|日本|Japan/i],
    searchQueries: ['神戸港', 'Kobe Port', '고베항', '神户港', '神戸メリケンパーク'],
    officialName: /神户港|神戸港|Kobe\s*Port|고베항/i,
    iata: null,
    isAirport: false,
  },
  YOKOHAMA_PORT: {
    id: 'YOKOHAMA_PORT',
    label: '요코하마항',
    productHints: ['요코하마항', '横滨港', 'Yokohama Port', '横浜'],
    internalHints: ['横滨港', '横浜港'],
    requireAny: [/横滨港|横浜港|Yokohama\s*Port|요코하마항|오산바시|Osanbashi|국제여객|Cruise\s*Terminal|港/i],
    requireAll: [],
    reject: [/공항|Airport|공항|羽田|Haneda|成田|Narita|호텔|酒店|Hotel|숙소|오사카|大阪/i],
    city: [/横滨|横浜|Yokohama|요코하마|일본|日本|Japan/i],
    searchQueries: [
      '요코하마항 오산바시',
      '横浜 大桟橋',
      'Osanbashi Yokohama',
      '横浜港',
    ],
    officialName: /오산바시|Osanbashi|横浜港|Yokohama|요코하마항/i,
    iata: null,
    isAirport: false,
  },



  NGO: {
    id: 'NGO',
    label: '중부 국제공항(NGO)',
    productHints: ['중부', '中部', 'Centrair', 'NGO', '中部国际'],
    internalHints: ['中部国际', 'NGO'],
    requireAny: [/中部|Centrair|중부|NGO|中部国际|中部國際|中部国際/i],
    requireAll: [[/机场|Airport|공항|국제공항|空港/i]],
    reject: [/羽田|Haneda|成田|Narita|关西|Kansai|KIX|伊丹|ITM|호텔|酒店|Hotel|吉卜力|Ghibli|지브리/i],
    city: [/名古屋|Nagoya|나고야|常滑|Tokoname|爱知|Aichi|일본|日本|Japan/i],
    searchQueries: [
      '中部国際空港',
      'Centrair',
      '중부 국제공항',
      '中部国际机场',
      '中部国際空港 NGO',
    ],
    officialName: /中部|Centrair|중부|NGO/i,
    iata: /NGO/i,
    isAirport: true,
  },
  CTS: {
    id: 'CTS',
    label: '신치토세 공항(CTS)',
    productHints: ['신치토세', '新千岁', 'Chitose', 'CTS'],
    internalHints: ['新千岁', 'CTS'],
    requireAny: [/新千岁|千岁|Chitose|신치토세|CTS|新千歲/i],
    requireAll: [[/机场|Airport|공항|국제공항|空港/i]],
    reject: [/羽田|Haneda|成田|Narita|关西|Kansai|호텔|酒店|Hotel|登别|Noboribetsu/i],
    city: [/千岁|Chitose|삿포로|札幌|Sapporo|北海道|Hokkaido|일본|日本|Japan/i],
    searchQueries: [
      '新千歳空港',
      'New Chitose Airport',
      '신치토세 공항',
      '新千岁机场',
    ],
    officialName: /新千歳|Chitose|신치토세|CTS/i,
    iata: /CTS/i,
    isAirport: true,
  },
  KIX: {
    id: 'KIX',
    label: '간사이 국제공항(KIX)',
    productHints: ['간사이', '关西', 'Kansai', 'KIX'],
    internalHints: ['关西', 'KIX'],
    requireAny: [/关西|Kansai|간사이|KIX|関西/i],
    requireAll: [[/机场|Airport|공항|국제공항|空港/i]],
    reject: [/伊丹|Itami|ITM|이타미|羽田|Haneda|成田|Narita|호텔|酒店|Hotel/i],
    city: [/大阪|Osaka|오사카|泉佐野|Izumisano|일본|日本|Japan/i],
    searchQueries: [
      '関西国際空港',
      'Kansai International Airport',
      '간사이 국제공항',
      '关西国际机场',
    ],
    officialName: /関西|Kansai|간사이|KIX/i,
    iata: /KIX/i,
    isAirport: true,
  },

  ITM: {
    id: 'ITM',
    label: '이타미 공항(ITM)',
    productHints: ['이타미', '伊丹', 'Itami', 'ITM', '오사카 국제공항'],
    internalHints: ['伊丹', 'ITM'],
    requireAny: [/伊丹|Itami|이타미|ITM|大阪国际|大阪國際|Osaka International|오사카\s*국제|국제공항|국제机场|Hotaru|토요나카|Toyonaka/i],
    requireAll: [[/机场|Airport|공항|국제공항|空港|국제/i]],
    reject: [/关西|Kansai|KIX|간사이|成田|Narita|NRT|羽田|Haneda|호텔|酒店|Hotel|住宿|대학|University|비지터|Visitor/i],
    city: [/伊丹|Itami|이타미|大阪|Osaka|오사카|丰中|Toyonaka|토요나카|Hotaru|일본|日本|Japan/i],
    searchQueries: [
      '大阪国際空港',
      'Osaka Itami Airport',
      '오사카 국제공항',
      '伊丹空港',
      '이타미 공항',
    ],
    officialName: /伊丹|Itami|이타미|ITM|大阪国际|大阪國際|Osaka International|오사카\s*국제/i,
    iata: /ITM/i,
    isAirport: true,
  },

  NARITA: {
    id: 'NARITA',
    label: '나리타 공항(NRT)',
    productHints: ['나리타', '成田', 'Narita', 'NRT'],
    internalHints: ['成田', 'NRT'],
    requireAny: [/成田|Narita|나리타|NRT/i],
    requireAll: [[/机场|Airport|공항|국제공항|空港/i]],
    reject: [/羽田|Haneda|HND|하네다|关西|KIX|伊丹|ITM|호텔|酒店|Hotel|横滨港|Yokohama\s*Port/i],
    city: [/成田|Narita|나리타|千叶|Chiba|东京|Tokyo|도쿄|일본|日本|Japan/i],
    searchQueries: [
      '成田空港',
      'Narita Airport',
      '나리타 공항',
      '成田国際空港',
    ],
    officialName: /成田|Narita|나리타|NRT/i,
    iata: /NRT/i,
    isAirport: true,
  },
});

/**
 * 从产品韩文名 + Excel 内部名推断 profile（或合并自定义关键词）
 * @param {{ productKo?: string, internal?: string, profileId?: string, profile?: object }} opts
 */
export function resolvePoiProfile(opts = {}) {
  if (opts.profile) return opts.profile;
  if (opts.profileId && POI_PROFILES[opts.profileId]) {
    return POI_PROFILES[opts.profileId];
  }
  const blob = `${opts.productKo || ''} ${opts.internal || ''}`;
  const order = [
    ['PKX', /PKX|다싱|大兴|Daxing/i],
    ['PEK', /PEK|수도국제공항|首都机场|Capital\s*International/i],
    ['PVG', /PVG|푸동|浦东机场|Pudong\s*International/i],
    ['SHA', /SHA|훙차오국제공항|虹桥机场|Hongqiao\s*International\s*Airport/i],
    ['HQ_STATION', /虹桥站|虹桥火车站|훙차오역|Hongqiao\s*(Railway\s*)?Station/i],
    ['SHZ', /上海火车站|상하이역|Shanghai\s*Railway/i],
    ['WSK', /吴淞口|우송커우|Wusongkou/i],
    ['HARRY', /哈利波特|해리포터|Harry\s*Potter|ハリー/i],
    ['DWP', /迪士尼|디즈니|Disney/i],
    ['PEARL', /东方明珠|동방명주|Oriental\s*Pearl/i],
    ['OSAKA_PORT', /大阪港|오사카항|Osaka\s*Port|국제\s*페리/i],
    ['TOKYO_PORT', /东京港|東京港|도쿄항|Tokyo\s*Port/i],
    ['KOBE_PORT', /神户港|고베항|Kobe\s*Port|神戸港/i],
    ['YOKOHAMA_PORT', /横滨港|横浜港|요코하마항|Yokohama\s*Port/i],
    ['NGO', /中部国际|중부|Centrair|NGO/i],
    ['CTS', /新千岁|신치토세|Chitose|CTS/i],
    ['KIX', /关西|간사이|Kansai|KIX/i],
    ['ITM', /伊丹|이타미|Itami|ITM/i],
    ['NARITA', /成田|나리타|Narita|NRT/i],
    ['HANEDA', /羽田|하네다|Haneda|HND/i],
    ['KYOTO_STN', /京都站|京都駅|교토역|Kyoto\s*Station/i],
    ['SUZUKA', /铃鹿|스즈카|Suzuka/i],
    ['NAGANO', /长野|長野|나가노|Nagano/i],
    ['TAKAYAMA', /高山|다카야마|Takayama/i],
    ['RUSUTSU', /留寿都|루스쓰|Rusutsu|ルスツ/i],
    ['NISEKO', /二世谷|니세코|Niseko|ニセコ/i],
    ['GHIBLI', /吉卜力|지브리|Ghibli|ジブリ/i],
    ['SKYTREE', /晴空塔|스카이트리|Skytree/i],
  ];
  for (const [id, re] of order) {
    if (re.test(blob)) return POI_PROFILES[id];
  }
  // 自定义：从名字抽关键词
  return {
    id: 'CUSTOM',
    label: opts.internal || opts.productKo || 'custom',
    requireAny: [],
    requireAll: [],
    reject: [/酒店|Hotel|宾馆|住宿|주주/i],
    city: [],
    searchQueries: [opts.internal, opts.productKo].filter(Boolean),
    officialName: null,
    iata: null,
    isAirport: /机场|Airport|공항/i.test(blob),
    productHints: [],
    internalHints: [],
  };
}

/**
 * 读回属性页「地区和地点」区块已选地点完整文案
 * @returns {Promise<{ text: string, hasSelection: boolean, snip: string }>}
 */
export async function readSelectedPoi(page) {
  return page.evaluate(() => {
    const body = document.body.innerText || '';
    const markers = ['地区和地点', '地區和地點', '지역과 장소'];
    let start = -1;
    for (const m of markers) {
      const i = body.indexOf(m);
      if (i >= 0) {
        start = i;
        break;
      }
    }
    const snip = start >= 0 ? body.slice(start, start + 500) : body.slice(0, 600);
    // 尽量抓已选卡片：删/删除按钮附近
    const cards = Array.from(document.querySelectorAll('div,li,section')).filter((el) => {
      const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
      const r = el.getBoundingClientRect();
      if (r.width < 120 || r.height < 28 || r.height > 280) return false;
      if (!t || t.length < 4 || t.length > 400) return false;
      // 选中 POI 卡常带删除/改
      const hasDel = Array.from(el.querySelectorAll('button,span,a')).some((b) =>
        /删除|刪除|삭제|×|✕/.test((b.innerText || b.getAttribute('aria-label') || '').trim()),
      );
      return hasDel && t.length > 6;
    });
    cards.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    let text = '';
    if (cards[0]) {
      text = (cards[0].innerText || '').replace(/\s+/g, ' ').trim().slice(0, 280);
    } else {
      // fallback: snip 去掉标题行
      text = snip
        .split('\n')
        .map((l) => l.trim())
        .filter((l) => l && !/^(地区和地点|地區和地點|添加地区|添加地區)/.test(l))
        .slice(0, 6)
        .join(' ')
        .slice(0, 280);
    }
    const hasSelection =
      text.length >= 4 &&
      !/请添加|請添加|添加地区和地点|添加地區和地點|尚未|未选择|未選擇/.test(text);
    return { text, hasSelection, snip: snip.slice(0, 320) };
  });
}

/**
 * 关键词交叉匹配
 * @returns {{ pass: boolean, reasons: string[], detail: object }}
 */
export function matchPoiKeywords(readbackText, profile, extra = {}) {
  const text = (readbackText || '').trim();
  const reasons = [];
  const detail = { text: text.slice(0, 200), profileId: profile?.id };

  if (!text || text.length < 3) {
    return { pass: false, reasons: ['读回为空'], detail };
  }

  // reject 优先
  if (profile.reject) {
    for (const re of asArr(profile.reject)) {
      if (re.test(text)) {
        reasons.push(`命中拒词 ${re}`);
      }
    }
  }
  if (reasons.length) {
    return { pass: false, reasons, detail: { ...detail, rejectHit: true } };
  }

  // requireAny：至少一组
  const anyList = asArr(profile.requireAny);
  if (anyList.length) {
    const anyOk = anyList.some((re) => re.test(text));
    detail.anyOk = anyOk;
    if (!anyOk) reasons.push(`未命中 requireAny: ${anyList.map(String).join('|')}`);
  }

  // requireAll：每组至少命中一个
  for (const group of profile.requireAll || []) {
    const g = asArr(group);
    if (g.length && !g.some((re) => re.test(text))) {
      reasons.push(`未命中 requireAll 组: ${g.map(String).join('|')}`);
    }
  }

  // 城市：同名多结果时强制
  const cityList = asArr(profile.city);
  if (cityList.length) {
    const cityOk = cityList.some((re) => re.test(text));
    detail.cityOk = cityOk;
    // 景区/机场同名风险高：城市缺失 = 软失败（若 requireAny 已含城市可跳过）
    // 用户硬规则：同名多结果必须出现目标城市 — 一律要求
    if (!cityOk) reasons.push(`读回未含目标城市: ${cityList.map(String).join('|')}`);
  }

  // 机场：三字码或官方名优先（有其一即 bonus；两者皆无且非 require 已过则软警告）
  if (profile.isAirport) {
    const iataOk = profile.iata ? profile.iata.test(text) : false;
    const officialOk = profile.officialName ? profile.officialName.test(text) : false;
    detail.iataOk = iataOk;
    detail.officialOk = officialOk;
    if (!iataOk && !officialOk) {
      // 若 requireAny 已含官方/代码，上面会过；这里仅当 require 也没覆盖时追加
      const soft =
        !anyList.some((re) => re.test(text)) ||
        !/机场|Airport|공항|国际/i.test(text);
      if (soft) {
        reasons.push('机场产品读回未对上三字码或官方机场名');
      }
    }
  }

  // 额外：与产品/内部名交叉（可选强化）
  const productBlob = `${extra.productKo || ''} ${extra.internal || ''}`;
  if (productBlob.trim() && profile.productHints?.length) {
    const cross = profile.productHints.some(
      (h) => productBlob.includes(h) || new RegExp(escapeRe(h), 'i').test(text),
    );
    detail.productCross = cross;
  }

  return { pass: reasons.length === 0, reasons, detail };
}

function asArr(x) {
  if (!x) return [];
  return Array.isArray(x) ? x : [x];
}

function escapeRe(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 删除属性页错误 POI 卡
 */
export async function deleteSelectedPoi(page) {
  console.log('【将要】删除错误 POI');
  const deleted = await page.evaluate(() => {
    // 优先：地区区块内带删除的按钮
    const body = document.body.innerText || '';
    const markers = ['地区和地点', '地區和地點'];
    let areaY = 0;
    // 找删除按钮
    const btns = Array.from(document.querySelectorAll('button, [role=button], span, a'));
    const delCandidates = btns.filter((b) => {
      const t = (b.innerText || b.getAttribute('aria-label') || '').trim();
      const r = b.getBoundingClientRect();
      if (r.width < 8 || r.height < 8) return false;
      return /删除|刪除|삭제/.test(t) || (t === '×' || t === '✕' || t === 'x');
    });
    // 取靠近「地区和地点」的
    delCandidates.sort((a, b) => a.getBoundingClientRect().y - b.getBoundingClientRect().y);
    // 过滤：y 不太靠顶（避免关窗），不太靠底
    const usable = delCandidates.filter((b) => {
      const y = b.getBoundingClientRect().y;
      return y > 100 && y < window.innerHeight - 80;
    });
    if (!usable[0]) return { ok: false, n: delCandidates.length };
    usable[0].click();
    return { ok: true, t: (usable[0].innerText || usable[0].getAttribute('aria-label') || '').slice(0, 20) };
  });
  console.log('【读回】deletePoi', deleted);
  await sleep(800);
  // 确认弹窗
  await page
    .getByRole('button', { name: /确定|確定|确认|確認|삭제|OK/i })
    .first()
    .click({ timeout: 3000 })
    .catch(() => {});
  await sleep(600);
  return deleted;
}

/**
 * 搜索并选中 POI（禁止默认第 1 条；按 filter）
 */
export async function searchAndSelectPoi(page, profile) {
  const queries = (profile.searchQueries || []).filter(Boolean);
  if (!queries.length) {
    throw new PoiGateError('no_search_query', 'profile 无 searchQueries', { profileId: profile.id });
  }

  console.log('【将要】打开 添加地区和地点');
  await page.getByRole('button', { name: /添加地区和地点|添加地區和地點/ }).first().click({ timeout: 12000 });
  await sleep(1500);

  const search = page
    .locator(
      'input[placeholder*="검색"], input[placeholder*="관광지"], input[placeholder*="搜索"], input[placeholder*="Search"], input[placeholder*="숙소"]',
    )
    .first();
  await search.waitFor({ state: 'visible', timeout: 12000 });

  let pick = null;
  for (const q of queries) {
    console.log('【将要】POI 搜索', q, '（禁止默认第1条）');
    await search.fill('');
    await search.fill(q);
    await page.keyboard.press('Enter');
    await sleep(2800);

    pick = await page.evaluate((prof) => {
      const requireAny = (prof.requireAny || []).map((s) => new RegExp(s.source || s, s.flags || 'i'));
      const reject = (prof.reject || []).map((s) => new RegExp(s.source || s, s.flags || 'i'));
      const city = (prof.city || []).map((s) => new RegExp(s.source || s, s.flags || 'i'));
      const official = prof.officialName
        ? new RegExp(prof.officialName.source || prof.officialName, prof.officialName.flags || 'i')
        : null;
      const iata = prof.iata ? new RegExp(prof.iata.source || prof.iata, prof.iata.flags || 'i') : null;

      const cards = Array.from(document.querySelectorAll('div,li,button')).filter((el) => {
        const t = (el.innerText || '').replace(/\s+/g, ' ').trim();
        const r = el.getBoundingClientRect();
        if (r.width <= 240 || r.height <= 36 || r.height >= 240 || r.y <= 70) return false;
        if (t.length < 4 || t.length > 500) return false;
        // 拒词
        if (reject.some((re) => re.test(t))) return false;
        // 酒店硬拒
        if (/住宿|酒店|Hotel|宾馆|公寓|주주|모텔|hostel/i.test(t) && !/机场|Airport|공항|旅游地|旅遊地/i.test(t))
          return false;
        // requireAny
        if (requireAny.length && !requireAny.some((re) => re.test(t))) return false;
        // 城市（多结果时强制）
        if (city.length && !city.some((re) => re.test(t))) return false;
        return true;
      });

      // 评分：官方名/三字码/旅游地 优先 — 禁止纯「第1条」
      const score = (el) => {
        const t = el.innerText || '';
        let s = 0;
        if (official && official.test(t)) s += 50;
        if (iata && iata.test(t)) s += 40;
        if (/旅游地|旅遊地|관광지/.test(t)) s += 20;
        if (/International Airport|国际机场|국제공항/.test(t)) s += 15;
        if (city.some((re) => re.test(t))) s += 10;
        // 惩罚酒店
        if (/酒店|Hotel|宾馆|住宿/.test(t)) s -= 100;
        return s;
      };
      // prefer higher score, then smaller height (inner card), then higher y
      cards.sort((a, b) => score(b) - score(a) || a.getBoundingClientRect().height - b.getBoundingClientRect().height || a.getBoundingClientRect().y - b.getBoundingClientRect().y);

      if (!cards[0] || score(cards[0]) < 0) return { pick: null, candidates: cards.length, top: null };
      const top = cards[0];
      top.scrollIntoView({ block: 'center' });
      top.click();
      return {
        pick: (top.innerText || '').replace(/\s+/g, ' ').slice(0, 180),
        candidates: cards.length,
        score: score(top),
      };
    }, serializeProfile(profile));

    console.log('【读回】POI search pick', pick);
    if (pick?.pick) break;
  }

  if (!pick?.pick) {
    await page.keyboard.press('Escape').catch(() => {});
    throw new PoiGateError('poi_search_none', '搜索无匹配结果（已按城市/官方名过滤，未点默认第1条）', {
      profileId: profile.id,
      queries,
    });
  }

  await sleep(900);
  // Google 地图结果：必须先点「添加地点」（小钮），才会出现类型单选
  // 若有「添加地点」中间步则点
  await page.locator('button').filter({ hasText: /^添加地点$|^添加地點$/ }).first().click({ timeout: 8000 }).catch(async () => {
    await page.getByRole('button', { name: /添加地点|添加地點/ }).first().click({ timeout: 5000 }).catch(() => {});
  });
  await sleep(1000);

  // 类型 旅游地 — 多路径真选中
  for (let attempt = 0; attempt < 3; attempt++) {
    await page.evaluate(() => {
      const radio = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
      if (radio && !radio.checked) {
        const lab = radio.id ? document.querySelector(`label[for="${radio.id}"]`) : null;
        (lab || radio.closest('label') || radio).click();
      }
      const lab2 = Array.from(document.querySelectorAll('label,div,span,button'))
        .find((e) => /^(旅游地|旅遊地|TRAVEL_PLACE)$/i.test((e.innerText || '').trim()));
      lab2?.click();
    });
    await sleep(500);
    // 文案点 旅游地
    await page.getByText(/^(旅游地|旅遊地)$/).first().click({ timeout: 2000 }).catch(() => {});
    await sleep(400);
    const typeOk = await page.evaluate(() => {
      const radio = document.querySelector('input[type=radio][value="TRAVEL_PLACE"]');
      return !!(radio?.checked || radio?.getAttribute('aria-checked') === 'true');
    });
    console.log('【读回】TRAVEL_PLACE', typeOk, 'attempt', attempt);
    if (typeOk) break;
  }

  // 底部「添加」— 含 disabled 时 force 等 enabled
  let added = false;
  for (let i = 0; i < 8; i++) {
    const st = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button')).filter((x) => {
        const t = (x.innerText || '').trim();
        return t === '添加' || t === '添加地点' || t === '添加地點' || t === '완료' || t === '完成';
      });
      const b = btns.find((x) => (x.innerText || '').trim() === '添加') || btns[0];
      if (!b) return { n: btns.length, disabled: null, texts: btns.map((x) => x.innerText.trim()) };
      return {
        n: btns.length,
        disabled: !!b.disabled,
        t: (b.innerText || '').trim(),
        texts: btns.map((x) => (x.innerText || '').trim().slice(0, 20)),
      };
    });
    console.log('【读回】添加钮', st);
    if (st.n && st.disabled === false) {
      await page.locator('button').filter({ hasText: /^添加$/ }).first().click({ timeout: 5000 }).catch(async () => {
        await page.evaluate(() => {
          const b = Array.from(document.querySelectorAll('button')).find(
            (x) => (x.innerText || '').trim() === '添加' && !x.disabled,
          );
          b?.click();
        });
      });
      added = true;
      break;
    }
    // 再点一次旅游地
    await page.getByText(/^(旅游地|旅遊地)$/).first().click({ timeout: 1500 }).catch(() => {});
    await sleep(600);
  }
  console.log('【读回】POI 添加', added);
  await sleep(1800);
  // 关残留弹层
  await page.keyboard.press('Escape').catch(() => {});
  await sleep(400);
  return pick;
}

/** evaluate 不能传 RegExp，序列化为 {source,flags} */
function serializeProfile(profile) {
  const ser = (arr) =>
    (arr || []).map((re) =>
      re instanceof RegExp ? { source: re.source, flags: re.flags } : { source: String(re), flags: 'i' },
    );
  return {
    id: profile.id,
    requireAny: ser(profile.requireAny),
    reject: ser(asArr(profile.reject)),
    city: ser(profile.city),
    officialName: profile.officialName
      ? { source: profile.officialName.source, flags: profile.officialName.flags }
      : null,
    iata: profile.iata ? { source: profile.iata.source, flags: profile.iata.flags } : null,
    isAirport: !!profile.isAirport,
  };
}

export class PoiGateError extends Error {
  constructor(step, message, readback = {}) {
    super(`[§56 POI] step=${step} ${message}`);
    this.name = 'PoiGateError';
    this.step = step;
    this.readback = readback;
  }
}

/**
 * 硬门禁：保存然后之前必须调用
 * @param {import('playwright').Page} page
 * @param {object} opts
 * @param {string} [opts.profileId]
 * @param {object} [opts.profile]
 * @param {string} [opts.productKo]
 * @param {string} [opts.internal]
 * @param {boolean} [opts.autoFix=true] 不匹配时删+重选
 * @param {number} [opts.maxRetries=2]
 * @returns {Promise<{ pass: true, text: string, match: object }>}
 */
export async function assertPoiGateBeforeSaveThen(page, opts = {}) {
  const {
    autoFix = true,
    maxRetries = 2,
    productKo = '',
    internal = '',
  } = opts;
  const profile = resolvePoiProfile(opts);
  console.log('\n========== 【POI 真验收】§56 ==========');
  console.log('【将要】POI 真验收 profile=', profile.id, profile.label || '');
  console.log('【产品交叉】KO=', (productKo || '').slice(0, 60), '内部=', internal);

  let lastMatch = null;
  let lastText = '';

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const rb = await readSelectedPoi(page);
    lastText = rb.text || rb.snip || '';
    console.log(`【读回】POI读回(attempt ${attempt})=`, lastText.slice(0, 200));
    console.log('【读回】hasSelection=', rb.hasSelection);

    lastMatch = matchPoiKeywords(lastText, profile, { productKo, internal });
    console.log('【读回】关键词匹配 detail=', JSON.stringify(lastMatch.detail));
    console.log('【读回】reasons=', lastMatch.reasons);

    if (lastMatch.pass && rb.hasSelection) {
      console.log(`【结果】POI读回=${lastText.slice(0, 120)} 关键词匹配=通过`);
      console.log('========================================\n');
      return { pass: true, text: lastText, match: lastMatch, profileId: profile.id };
    }

    console.log(
      `【结果】POI读回=${lastText.slice(0, 120)} 关键词匹配=失败 reasons=${lastMatch.reasons.join('; ')}`,
    );

    if (!autoFix || attempt >= maxRetries) break;

    // 有错误选点 → 删除
    if (rb.hasSelection) {
      await deleteSelectedPoi(page);
      const afterDel = await readSelectedPoi(page);
      console.log('【读回】删除后 POI=', afterDel.text?.slice(0, 80), 'has=', afterDel.hasSelection);
    }

    // 重搜重选
    try {
      await searchAndSelectPoi(page, profile);
    } catch (e) {
      console.log('【结果】FAIL 重搜', e.message);
      if (attempt >= maxRetries - 1) throw e;
    }
  }

  // 最终失败 — 禁止保存然后 / 禁止 goto 介绍
  const failMsg = `POI 真验收未通过 profile=${profile.id} 读回=${lastText.slice(0, 100)} reasons=${(lastMatch?.reasons || []).join('; ')}`;
  console.log('【结果】POI读回=', lastText.slice(0, 160), '关键词匹配=失败');
  console.log('【门禁】禁止点「保存然后」、禁止 goto 介绍');
  console.log('========================================\n');
  throw new PoiGateError('poi_keyword_mismatch', failMsg, {
    text: lastText,
    match: lastMatch,
    profileId: profile.id,
  });
}

/**
 * 安全点击保存然后：先过 POI 门禁
 */
export async function clickSaveThenAfterPoiGate(page, opts = {}) {
  await assertPoiGateBeforeSaveThen(page, opts);

  const saveState = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) =>
      /保存然后|保存然後/.test((x.innerText || '').trim()),
    );
    return b ? { disabled: b.disabled, text: (b.innerText || '').trim() } : { disabled: null };
  });
  console.log('【读回】保存然后', saveState);
  if (saveState.disabled === true) {
    throw new PoiGateError('save_then_disabled', 'POI 已过但保存然后仍灰', saveState);
  }

  console.log('【将要】点 保存然后（POI 门禁已过）');
  const clicked = await page.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find((x) => {
      const t = (x.innerText || '').trim();
      return (t === '保存然后' || t === '保存然後') && !x.disabled;
    });
    if (!b) return false;
    b.click();
    return true;
  });
  console.log('【读回】保存然后 click', clicked);
  if (!clicked) throw new PoiGateError('save_then_click', '未点到保存然后', saveState);
  return true;
}
