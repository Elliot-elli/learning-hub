/* SQ 倒计时测验引擎 —— 由 tools/extract_assets.py 从 ad-art-history-quiz.html 抽取。
   玩法逻辑逐字保留（10 秒倒计时归零才揭晓正确选项），只改了题库来源、
   常量来源与全局暴露。源文件是裸顶层脚本，这里包一层 IIFE 防止全局泄漏。 */
(function(){
  const MOD_ID = new URLSearchParams(location.search).get('m') || document.body.dataset.module;
  const MOD = (window.AP_MODULES || {})[MOD_ID];
  if (!MOD) {
    console.error('[learning-hub] 未知模块：' + MOD_ID);
    return;
  }

const SUBJECT = MOD.subject;
const TIMER_SECONDS = MOD.timerSeconds;
  // 题库来自 assets/data/sq-art-history.js
  const questions = MOD.questions;




const state = { phase: 'welcome', index: 0 };
// revealed：本题答案是否已公布。只有倒计时归零才置 true（单向，不回收）。
const timer = { running: false, done: false, remaining: TIMER_SECONDS, handle: null, endsAt: 0, revealed: false };
// 每题各自的计时快照：切走时冻结，回来时恢复 —— Prev 回看不重置也不丢进度。
// 快照只存在内存里（答案速览页不持久化任何东西）。
const timerMemory = [];
// aria-valuenow 每秒写一次即可，逐帧写会刷屏读屏软件。
let lastAriaSec = -1;

const $ = id => document.getElementById(id);
function show(id){
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  $(id).classList.add('active');
}

// ------------------------------------------------------------ 倒计时
// 长条与数字都由同一个「精确剩余秒」驱动，所以两者天然同步。
// 每帧按真实时间轴重算，不累减计数器 —— 后台标签页被节流也不会漂移。
function paintMeter(){
  const left = Math.max(0, timer.remaining);
  const sec = Math.ceil(left);
  $('timerNum').textContent = String(sec);
  $('timerFill').style.width = (left / TIMER_SECONDS * 100).toFixed(2) + '%';
  if (sec !== lastAriaSec) {
    lastAriaSec = sec;
    $('timerBar').setAttribute('aria-valuenow', String(sec));
  }
}
function paintState(){
  $('timer').classList.toggle('is-running', timer.running);
  $('timer').classList.toggle('is-done', timer.done);
  const btn = $('timerBtn');
  if (timer.running) {
    btn.textContent = 'Running';
    btn.disabled = true;
  } else if (timer.done) {
    btn.textContent = 'Start again';
    btn.disabled = false;
  } else {
    btn.textContent = 'Start timer';
    btn.disabled = false;
  }
  $('timerCap').textContent = timer.done ? "Time's up" : (timer.running ? 'Seconds left' : 'Seconds');
  // Next 门控：倒计时结束（或从未启动）才可跳题，防误触。
  // 未启动时也放行 —— 否则用户不点 Start timer 就永远走不下去。
  $('nextBtn').disabled = timer.running;
}
function paintTimer(){ paintMeter(); paintState(); }

// 离开当前题时冻结它的计时状态
function saveTimer(){
  timerMemory[state.index] = { running: timer.running, done: timer.done, remaining: timer.remaining, revealed: timer.revealed };
}
// 回到某题时恢复它的计时状态；没有快照则全新开始
function restoreTimer(){
  if (timer.handle !== null) { window.cancelAnimationFrame(timer.handle); timer.handle = null; }
  const snap = timerMemory[state.index];
  if (!snap) { timerReset(); return; }
  timer.running = false;
  timer.done = snap.done;
  timer.remaining = snap.remaining;
  timer.revealed = !!snap.revealed;
  paintTimer();
  if (!snap.done && snap.remaining < TIMER_SECONDS) {
    // 这题原本在跑：回来后按剩余量续跑，而不是从头开始
    timer.remaining = snap.remaining;
    timer.running = true;
    timer.endsAt = Date.now() + snap.remaining * 1000;
    paintTimer();
    timer.handle = window.requestAnimationFrame(timerFrame);
  }
}

function timerFrame(){
  if (!timer.running) return;
  timer.remaining = Math.max(0, (timer.endsAt - Date.now()) / 1000);
  paintMeter();
  if (timer.remaining <= 0) { timerStop(); return; }
  timer.handle = window.requestAnimationFrame(timerFrame);
}
function timerStart(){
  if (timer.running) return;
  timer.running = true;
  timer.done = false;
  timer.remaining = TIMER_SECONDS;
  timer.endsAt = Date.now() + TIMER_SECONDS * 1000;
  paintTimer();
  timer.handle = window.requestAnimationFrame(timerFrame);
}
function timerStop(){
  if (timer.handle !== null) { window.cancelAnimationFrame(timer.handle); timer.handle = null; }
  timer.running = false;
  timer.done = true;
  timer.remaining = 0;
  timer.revealed = true;
  paintTimer();
  revealAnswer();
}
function timerReset(){
  if (timer.handle !== null) { window.cancelAnimationFrame(timer.handle); timer.handle = null; }
  timer.running = false;
  timer.done = false;
  timer.remaining = TIMER_SECONDS;
  timer.revealed = false;
  lastAriaSec = -1;
  paintTimer();
}

// ------------------------------------------------------------ 答案揭晓
// 唯一给正确项加 is-answer 的地方 —— 渲染期不加，只有倒计时归零才揭晓。
// 幂等：已揭晓过就什么都不做（重跑计时也不会叠出第二组标记）。
function revealAnswer(){
  const item = questions[state.index];
  if (!item) return;
  const rows = $('options').querySelectorAll('.option');
  const row = rows[item.a];
  if (!row || row.classList.contains('is-answer')) return;
  row.classList.add('is-answer');
  // 勾 + ANSWER 合成一组绝对定位，避免两者分离或重叠
  const mark = document.createElement('span');
  mark.className = 'answer-mark';
  const tick = document.createElement('span');
  tick.className = 'answer-tick';
  const tag = document.createElement('span');
  tag.className = 'answer-tag';
  tag.textContent = 'Answer';
  mark.appendChild(tick);
  mark.appendChild(tag);
  row.appendChild(mark);
}

// ------------------------------------------------------------ 渲染
function render(){
  const item = questions[state.index];
  if (!item || !item.o || item.o.length !== 4) return;
  const total = questions.length;
  hideExitPanel();
  restoreTimer();
  $('topProgress').textContent = `${state.index + 1} / ${total}`;
  const pct = (state.index + 1) / questions.length * 100;
  $('progressFill').style.width = pct + '%';
  $('questionText').textContent = item.q;
  $('nextBtn').textContent = state.index === total - 1 ? 'Finish' : 'Next';
  $('prevBtn').disabled = state.index === 0;
  const box = $('options');
  box.textContent = '';
  item.o.forEach((text, i) => {
    const row = document.createElement('div');
    // 渲染期不点亮答案 —— 只有倒计时归零才揭晓
    row.className = 'option';
    const key = document.createElement('span');
    key.className = 'option-key';
    key.textContent = String.fromCharCode(65 + i);
    const body = document.createElement('span');
    body.textContent = text;
    row.appendChild(key);
    row.appendChild(body);
    box.appendChild(row);
  });
  // 回看已揭晓的题（Prev 回来）时，把高亮恢复回来
  if (timer.revealed) revealAnswer();
}
function next(){
  saveTimer();
  if (state.index < questions.length - 1) { state.index += 1; render(); return; }
  finish();
}
function prev(){
  if (state.index <= 0) return;
  saveTimer();
  state.index -= 1;
  render();
}
function startReview(){
  state.phase = 'playing';
  state.index = 0;
  timerMemory.length = 0;          // 新一轮清空每题计时快照
  timerReset();
  show('gameView');
  render();
}
function finish(){
  state.phase = 'result';
  $('resultTitle').textContent = 'All done.';
  $('resultCopy').textContent = `${questions.length} questions`;
  show('resultView');
}

// ------------------------------------------------------------ 退出
function hideExitPanel(){
  $('exitPanel').classList.remove('show');
}
function showExitPanel(){
  $('exitDetail').textContent = `You are on question ${state.index + 1} of ${questions.length}.`;
  $('exitPanel').classList.add('show');
  $('exitConfirmBtn').focus();
}
function requestExit(){
  if (state.phase !== 'playing') return;
  showExitPanel();
}
function cancelExit(){
  if (state.phase !== 'playing') return;
  hideExitPanel();
}
function confirmExit(){
  if (state.phase !== 'playing') return;
  timerReset();
  timerMemory.length = 0;
  hideExitPanel();
  state.phase = 'welcome';
  state.index = 0;
  show('welcomeView');
}

$('startBtn').addEventListener('click', startReview);
$('againBtn').addEventListener('click', () => {
  state.phase = 'welcome';
  state.index = 0;
  show('welcomeView');
});
$('timerBtn').addEventListener('click', timerStart);
$('nextBtn').addEventListener('click', next);
$('prevBtn').addEventListener('click', prev);
$('quitBtn').addEventListener('click', requestExit);
$('exitStayBtn').addEventListener('click', cancelExit);
$('exitConfirmBtn').addEventListener('click', confirmExit);
document.addEventListener('keydown', e => {
  if (e.key === 'Escape' && $('exitPanel').classList.contains('show')) cancelExit();
});window.LearningHub = window.LearningHub || { modules: {} };
  window.LearningHub.modules[MOD.id] = { id: MOD.id, type: 'sq',
  get phase(){ return state.phase; },
  get index(){ return state.index; },
  get total(){ return questions.length; },
  get exitOpen(){ return $('exitPanel').classList.contains('show'); },
  get timerRunning(){ return timer.running; },
  get timerDone(){ return timer.done; },
  get timerRemaining(){ return timer.remaining; },
  get answerRevealed(){ return timer.revealed; }
};

})();
