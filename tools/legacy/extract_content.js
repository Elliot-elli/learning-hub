// 历史迁移脚本 —— 记录题库是怎么从旧站抽出来的。
//
// 一次性用途：把旧站 learning-hub/assets/data/*.js 的题库抽成 content/ 下的 JSON。
// AP 两套闪卡题库逐字保留；AD 的 Super Quiz 5 题转成 Flashcards 卡片，
// 原题干、四个选项、答案下标、解析文本全部存进 source 字段，供后续 MCQ 题型复用。
//
// 题库已经抽完，现在 content/modules/*.json 是唯一真源，日常维护不需要跑这个脚本。
// 保留它是为了让「题库从哪来」有据可查：改动题库后若要追溯原始出处，从这里回看。
//
// 用法：node tools/legacy/extract_content.js
// 输出：tools/legacy/_extracted/（不覆盖 content/，避免误改真源）
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const OLD = path.resolve(ROOT, '..', 'learning-hub', 'assets', 'data');
const OUT = path.join(__dirname, '_extracted');

function loadModule(file, id) {
  const src = fs.readFileSync(path.join(OLD, file), 'utf8');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox);
  const mod = sandbox.window.AP_MODULES[id];
  if (!mod) throw new Error(`module ${id} not found in ${file}`);
  return mod;
}

function writeJson(rel, obj) {
  const p = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  console.log('wrote', rel);
}

// ---------- AP: 两套闪卡题库，原样搬运 ----------
writeJson('ap/ap-science-section1.json',
  loadModule('ap-science-section1.js', 'ap-science-section1'));
writeJson('ap/ap-social-science-section1.json',
  loadModule('ap-social-science-section1.js', 'ap-social-science-section1'));

// ---------- AD: Super Quiz 5 题 → Flashcards 卡片 ----------
// 正面（definition）只放题干与解析，不出现答案；背面（term）放正确选项原文。
const sq = loadModule('sq-art-history.js', 'sq-art-history');
const cards = sq.questions.map((q) => {
  const answer = q.o[q.a];
  const definition = q.e ? q.q + ' ' + q.e : q.q;
  return {
    term: answer,
    definition,
    source: {
      type: 'multiple-choice',
      question: q.q,
      options: q.o.slice(),
      answerIndex: q.a,
      explanation: q.e || '',
    },
  };
});

writeJson('ad/ad-art-history-section1.json', {
  id: 'ad-art-history-section1',
  type: 'flashcards',
  title: 'Art History',
  subjectLine: 'AD Art History Section 1',
  storeKey: 'fx_fc_v1:ad-art-history-section1',
  sections: [
    {
      num: 1,
      label: 'Section 1',
      levels: [
        { id: '1.1', cards },
      ],
    },
  ],
});

console.log('AD cards:', cards.length);
