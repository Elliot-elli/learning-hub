
/* 闪卡共享引擎 —— 由 tools/extract.py 从 ap-science-section1.html 抽取。
   引擎逻辑逐字保留，只改了题库来源、STORE_KEY、copy、全局暴露与导航注入。
   长文本自适应采用源文件里较新的实现（offsetHeight/clientHeight 比对）。 */
(() => {
  // 题库来自 assets/data/<module>.js，由 data-module 属性定位。
  // 结构与源文件内联的 GAME 完全一致，引擎代码无需分支。
  const MOD_ID = new URLSearchParams(location.search).get('m') || document.body.dataset.module;
  const MOD = (window.AP_MODULES || {})[MOD_ID];
  if (!MOD) {
    console.error('[learning-hub] 未知模块：' + MOD_ID);
    return;
  }
  const GAME = { title: MOD.title, sections: MOD.sections };


  const copy = Object.assign({
    hintBefore: 'Choose a state after you reveal the term.',
    hintAfter: 'Take your time, then continue when ready.'
  }, MOD.copy || {});

  const STORE_KEY = MOD.storeKey;
  const STORE_VERSION = 1;

  // ---- 关卡索引（boot 时构建一次） ----
  const LEVELS = [];
  GAME.sections.forEach(function(sec){
    sec.levels.forEach(function(lv){
      lv.sectionNum = sec.num;
      lv.sectionLabel = sec.label;
      LEVELS.push(lv);
    });
  });
  // 章节编号：全局按牌组顺序递增（chapter1、chapter2 …），不再用 section 前缀（2.1 / 2.2）。
  // 直接改写 lv.id —— 它同时是显示源（校验第 14 项要求 .textContent = lv.id）
  // 与 localStorage 的 key，改完三处显示（按钮 / 角标 / 结算页）自然同步。
  // 注意：旧存档里存的是 '2.1' 这类 key，改 id 会让老记录失联，
  // 因此 migrateLegacyIds() 会把旧 key 迁移到新 key。
  const chapterOrder = [];
  GAME.sections.forEach(function(sec){
    sec.levels.forEach(function(lv){
      lv.chapterNo = chapterOrder.length + 1;
      lv.id = 'chapter' + lv.chapterNo;
      chapterOrder.push(lv);
    });
  });
  const levelById = {};
  LEVELS.forEach(function(lv){ levelById[lv.id] = lv; });

  // ---- 词条索引（词汇列表按 term 取回 definition；term 全局唯一） ----
  const cardByTerm = {};
  LEVELS.forEach(function(lv){
    lv.cards.forEach(function(c){ cardByTerm[c.term] = c; });
  });

  // ---- 进度存储（隐私模式下 localStorage 可能抛错，全部 try/catch 降级） ----
  // schema 保持 v1：review / mastered 是纯增量字段，老存档缺省即 {}，
  // 无需迁移即可读出既有通关记录；旧版本读到新存档也只忽略多出的键。
  const store = { cleared: {}, review: {}, mastered: {}, progress: {} };
  function loadStore(){
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (!raw) return;
      var o = JSON.parse(raw);
      if (o && o.v === STORE_VERSION && o.cleared) store.cleared = o.cleared;
      if (o && o.review) store.review = o.review;
      if (o && o.mastered) store.mastered = o.mastered;
      if (o && o.progress) store.progress = o.progress;
    } catch (e) { store.cleared = {}; store.review = {}; store.mastered = {}; }
  }
  function saveStore(){
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify({
        v: STORE_VERSION, cleared: store.cleared, review: store.review, mastered: store.mastered,
        progress: store.progress
      }));
    } catch (e) { /* 降级：不持久化，游戏仍可正常进行 */ }
  }
  function markCleared(id, known, reviewed){
    store.cleared[id] = { known: known, reviewed: reviewed, ts: Math.floor(Date.now() / 1000) };
    saveStore();
  }
  function clearedCount(){
    var n = 0;
    LEVELS.forEach(function(lv){ if (store.cleared[lv.id]) n += 1; });
    return n;
  }

  const phase = { WELCOME:'welcome', LEVELS:'levels', PLAYING:'playing', SUMMARY:'summary' };
  const state = {
    phase: phase.WELCOME,
    levelId: null,
    queue: [],
    index: 0,
    known: 0,
    uncertain: 0,
    unknown: 0,
    reviewed: 0,
    flags: {},
    flipped: false,
    awaitingNext: false,
    transitioning: false,
    swapping: false,
    pendingId: null,
    pendingState: null,
    trail: [],
    dialogOpen: false
  };

  // 当前关卡的卡组（队列算法只读它）
  let deck = [];

  const $ = (id) => document.getElementById(id);
  const welcomeView = $('welcomeView');
  const levelsView = $('levelsView');
  const gameView = $('gameView');
  const summaryView = $('summaryView');
  const reviewView = $('reviewView');
  const reviewBody = $('reviewBody');
  const flashcard = $('flashcard');
  const controls = $('controls');
  const footerNote = $('footerNote');
  const frontText = $('frontText');
  const backText = $('backText');
  const levelsBody = $('levelsBody');

  function showView(view){
    [welcomeView, levelsView, gameView, reviewView, summaryView].forEach(v => v.classList.remove('active'));
    view.classList.add('active');
  }

  // ---- 关卡索引渲染（用 createElement + textContent，不用 innerHTML） ----
  function renderLevels(){
    levelsBody.textContent = '';
    const showGroupLabel = GAME.sections.length > 1;
    GAME.sections.forEach(function(sec){
      const group = document.createElement('div');
      group.className = 'level-group';

      if(showGroupLabel){
        const label = document.createElement('div');
        label.className = 'level-group-label';
        label.textContent = sec.label;
        group.appendChild(label);
      }

      const row = document.createElement('div');
      row.className = 'level-row';

      sec.levels.forEach(function(lv){
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'level-btn' + (store.cleared[lv.id] ? ' cleared' : '');
        b.dataset.level = lv.id;
        b.setAttribute('aria-label',
          lv.id + ', ' + lv.cards.length + ' cards'
          + (store.cleared[lv.id] ? ', cleared' : ''));

        const num = document.createElement('span');
        num.className = 'level-num';
        num.textContent = lv.id;

        const cnt = document.createElement('span');
        cnt.className = 'level-count';
        cnt.textContent = lv.cards.length + ' cards';

        b.appendChild(num);
        b.appendChild(cnt);
        const prog = store.progress[lv.id];
        if(prog && !store.cleared[lv.id]){
          const mark = document.createElement('span');
          mark.className = 'level-resume';
          mark.textContent = 'Resume';
          b.appendChild(mark);
        }
        b.addEventListener('click', function(){ startLevel(lv.id); });
        row.appendChild(b);
      });

      group.appendChild(row);
      levelsBody.appendChild(group);
    });

    const done = clearedCount();
    $('levelsCount').textContent = done + ' of ' + LEVELS.length + ' chapters cleared';
    const left = pendingHistory();
    $('levelsReviewCount').textContent = left > 0 ? '· ' + left : '';
  }

  function refreshHome(){
    const done = clearedCount();
    const total = LEVELS.length;
    $('homeProgress').textContent = done === total
      ? 'All ' + total + ' chapters cleared'
      : done + ' of ' + total + ' chapters cleared';
  }

  function resetState(levelId){
    state.phase = phase.PLAYING;
    state.levelId = levelId;
    deck = levelById[levelId].cards;
    state.queue = deck.map((_, i) => i);
    state.index = 0;
    state.known = 0;
    state.uncertain = 0;
    state.unknown = 0;
    state.reviewed = 0;
    state.flags = {};
    state.flipped = false;
    state.awaitingNext = false;
    state.transitioning = false;
    state.swapping = false;
    state.pendingId = null;
    state.pendingState = null;
    state.trail = [];
    state.dialogOpen = false;
  }

  function currentCard(){ return deck[state.queue[state.index]]; }

  function render(){
    if(state.phase !== phase.PLAYING) return;
    const card = currentCard();
    // 正面是题目侧（definition），不是答案，换卡回正动画的起点即可写入：
    // 正面在 rotateY 超过 90° 之后才可见，提前写入不会泄露任何答案。
    frontText.textContent = card.definition;
    // 背面是答案侧（term），换卡回正过程中必须冻结并保持空白，
    // 否则新卡的 term 会在旋转前半程透出（背面正朝向观察者）。
    if(!state.swapping) backText.textContent = card.term;
    // 清掉上一张残留的行内字号，否则新卡会继承旧卡的缩小值
    frontText.style.fontSize = '';
    backText.style.fontSize = '';
    flashcard.classList.toggle('flipped', state.flipped);
    controls.classList.toggle('awaiting', state.awaitingNext);
    $('progressText').textContent = `${Math.min(state.known + 1, deck.length)} / ${deck.length}`;
    $('knownText').textContent = state.known;
    $('reviewText').textContent = pendingRound();
    $('progressBar').style.width = `${(state.known / deck.length) * 100}%`;
    footerNote.textContent = state.awaitingNext ? copy.hintAfter : copy.hintBefore;
    const lv = levelById[state.levelId];
    if (lv) $('levelStamp').textContent = lv.id;
    $('prevBtn').disabled = state.trail.length <= 1;
    fitDefinition();
    fitText();
  }

  function startLevel(levelId){
    if(!levelById[levelId]) return;
    resetState(levelId);
    // 有进度存档就从上次节点继续；没有就从头开始
    restoreProgress(levelId);
    state.trail.push(snapshot());
    showView(gameView);
    render();
  }

  function startGame(){
    openLevels();
  }

  function openLevels(){
    loadStore();
    renderLevels();
    showView(levelsView);
  }

  function reveal(){
    if(state.phase !== phase.PLAYING || state.transitioning || state.awaitingNext) return;
    state.flipped = !state.flipped;
    render();
  }

  function advance(){
    if(state.phase !== phase.PLAYING || state.transitioning) return;
    if(state.known === deck.length){ finish(); return; }
    const pendingId = state.pendingId;
    if(pendingId !== null){
      const oldPosition = state.queue.indexOf(pendingId);
      if(oldPosition !== -1) state.queue.splice(oldPosition, 1);
      state.queue.push(pendingId);
      state.pendingId = null;
      state.pendingState = null;
    }
    state.transitioning = true;
    state.flipped = false;
    state.awaitingNext = false;
    // 阶段1：翻回正面，背面保持清空、正面立即就位（render 写入新卡释义）
    state.swapping = true;
    backText.textContent = '';
    render();
    window.setTimeout(() => {
      // 阶段2：翻转已结束，此刻才让下一张就位
      state.index = 0;
      state.swapping = false;
      state.transitioning = false;
      state.trail.push(snapshot());
      render();
    }, 620);
  }

  function choose(stateName){
    if(state.phase !== phase.PLAYING || state.transitioning || state.awaitingNext) return;
    const currentId = state.queue[state.index];
    if(stateName === 'known'){
      state.known += 1;
      state.pendingId = currentId;
      state.pendingState = 'known';
      state.flipped = true;
      state.transitioning = true;
      render();
      window.setTimeout(() => {
        const oldPosition = state.queue.indexOf(currentId);
        if(oldPosition !== -1) state.queue.splice(oldPosition, 1);
        state.pendingId = null;
        state.pendingState = null;
        if(state.known === deck.length){ state.transitioning = false; finish(); return; }
        // 阶段1：翻回正面，背面保持清空、正面立即就位（render 写入新卡释义）
        state.flipped = false;
        state.swapping = true;
        backText.textContent = '';
        render();
        window.setTimeout(() => {
          // 阶段2：翻转已结束，此刻才让下一张就位
          state.index = 0;
          state.swapping = false;
          state.transitioning = false;
          state.trail.push(snapshot());
          render();
        }, 620);
      }, 680);
      return;
    }
    // I know 不计入待复查（见上方 known 分支）；uncertain / unknown 按 term 去重后计入
    markReviewed(currentCard().term, stateName);
    state.pendingId = currentId;
    state.pendingState = stateName;
    state.flipped = true;
    state.awaitingNext = true;
    render();
  }

  function finish(){
    state.phase = phase.SUMMARY;
    $('summaryKnown').textContent = state.known;
    $('summaryReviewed').textContent = state.reviewed;
    const lv = levelById[state.levelId];
    $('summaryLevel').textContent = lv ? lv.id : '';
    markCleared(state.levelId, state.known, state.reviewed);
    showView(summaryView);
  }

  // ---- trail 快照栈：回退必须整份恢复 state，只存卡索引会落到错误的卡 ----
  function snapshot(){
    return {
      queue: state.queue.slice(),
      index: state.index,
      known: state.known,
      uncertain: state.uncertain,
      unknown: state.unknown,
      reviewed: state.reviewed,
      flags: Object.assign({}, state.flags)
    };
  }
  function restoreSnapshot(s){
    state.queue = s.queue.slice();
    state.index = s.index;
    state.known = s.known;
    state.uncertain = s.uncertain;
    state.unknown = s.unknown;
    state.reviewed = s.reviewed;
    state.flags = Object.assign({}, s.flags);
  }

  // ---- 回上一张题：第一张题时按钮 disabled，此处仅作兜底 ----
  function goPrev(){
    if(state.phase !== phase.PLAYING || state.transitioning || state.dialogOpen) return;
    if(state.trail.length <= 1) return;
    state.trail.pop();
    restoreSnapshot(state.trail[state.trail.length - 1]);
    state.transitioning = true;
    state.flipped = false;
    state.awaitingNext = false;
    state.pendingId = null;
    state.pendingState = null;
    state.swapping = true;
    backText.textContent = '';
    render();
    window.setTimeout(() => {
      state.swapping = false;
      state.transitioning = false;
      render();
    }, 620);
  }

  // ---- 退出确认弹窗（遮罩为 body 直属层：.app 是 flex 容器，装不下 fixed 弹层）----
  const exitMask = $('exitMask');
  let lastFocus = null;
  function openExitDialog(){
    if(state.dialogOpen) return;
    state.dialogOpen = true;
    lastFocus = document.activeElement;
    exitMask.hidden = false;
    document.body.classList.add('dialog-locked');
    $('exitCancelBtn').focus();
  }
  function closeExitDialog(){
    if(!state.dialogOpen) return;
    state.dialogOpen = false;
    exitMask.hidden = true;
    document.body.classList.remove('dialog-locked');
    if(lastFocus && document.contains(lastFocus)) lastFocus.focus();
    lastFocus = null;
  }
  function confirmExit(){
    saveProgress();
    closeExitDialog();
    state.trail = [];
    state.flags = {};
    state.known = 0;
    state.uncertain = 0;
    state.unknown = 0;
    state.reviewed = 0;
    state.phase = phase.LEVELS;
    openLevels();
  }
  // 离开本轮：本轮有作答才需要确认，没作答直接回章节列表
  function leaveRound(){
    if(state.phase !== phase.PLAYING) return;
    if(state.known + state.uncertain + state.unknown > 0){ openExitDialog(); return; }
    confirmExit();
  }
  // 旧存档迁移：旧 key 是 "section.序号"（如 "2.1"），新 key 是 "chapter序号"。
  // 迁移后用户已有的通关记录与进度存档不会失联。
  function migrateLegacyIds(){
    if(!store.migrated){
      chapterOrder.forEach(function(lv, i){
        const legacy = lv.sectionNum + '.' + (i + 1);
        if(legacy !== lv.id && store.cleared[legacy] && !store.cleared[lv.id]){
          store.cleared[lv.id] = store.cleared[legacy];
          delete store.cleared[legacy];
        }
        if(legacy !== lv.id && store.progress[legacy] && !store.progress[lv.id]){
          store.progress[lv.id] = store.progress[legacy];
          delete store.progress[legacy];
        }
      });
      store.migrated = true;
      saveStore();
    }
  }
  // ---- 进度保留：Back 退出时存档，再次进入同一关卡时从上次节点继续 ----
  // 存档内容：已掌握的词（done）+ 未掌握的词（todo，原队列顺序）。
  // 不存整份 state —— 队列的相对顺序在跨会话后没有意义，
  // 真正要恢复的是「哪些词还没学」，恢复时按 deck 原始顺序重排。
  function saveProgress(){
    if(state.phase !== phase.PLAYING || !state.levelId) return;
    if(state.known + state.uncertain + state.unknown === 0){
      delete store.progress[state.levelId];
      saveStore();
      return;
    }
    // queue 就是权威的「剩余待学列表」：标 I know 的会被 splice 移除，
    // 标 Not sure / I don't know 的会被推到队尾。所以直接存它，
    // 不要自己按 flags 反推 done/todo —— flags 只记 uncertain/unknown，
    // 拿它判「已掌握」会把没碰过的词也当成已掌握。
    const remaining = state.queue.slice();
    store.progress[state.levelId] = {
      remaining: remaining,
      known: state.known,
      uncertain: state.uncertain,
      unknown: state.unknown,
      reviewed: state.reviewed,
      ts: Math.floor(Date.now() / 1000)
    };
    saveStore();
  }

  // 读取存档并重建队列：已掌握的词移出队列（不再出现），其余按 deck 原始顺序回到队首。
  function restoreProgress(levelId){
    const p = store.progress[levelId];
    if(!p) return false;
    if(!Array.isArray(p.remaining)) return false;
    // 过滤掉已不存在的卡（题库若变过，索引会错位）
    const queue = p.remaining.filter(function(ci){ return ci >= 0 && ci < deck.length; });
    if(queue.length === 0) return false;
    state.queue = queue;
    state.index = 0;
    state.known = p.known || 0;
    state.uncertain = p.uncertain || 0;
    state.unknown = p.unknown || 0;
    state.reviewed = p.reviewed || 0;
    state.flags = {};
    return true;
  }
  /*释义溢出判定：必须用几何测量，不能用 scrollHeight。
     .card-front 是 display:flex;align-items:center，内容装不下时上下同时溢出，
     而 scrollHeight 只统计块向末端（下）的溢出 —— 上半侧完全测不到。
     实测：子元素 330px / 可用 210px，真实溢出 120px（上下各 60），
     scrollHeight 只报 60；溢出 1px 时 339 > 338+1 亦为假，直接漏判。
     正确口径：拿文字外框与卡面「内容盒」比，四个方向都算。 */
  function definitionOverflows(face){
    return textOverflows(face, frontText);
  }
  /* 行内缩放下限：正面 12.8px（= 0.8rem，is-verylong 档同值）、背面 13px。
     再小就读不清了；缩到下限仍装不下就裁掉（铁律：溢出宁裁不滚）。 */
  const FIT_MIN_FRONT = 12.8;
  const FIT_MIN_BACK = 13;
  /* 文字块是否超出卡面内容盒：用布局尺寸（offsetHeight / clientHeight）。
     卡面在 3D 容器里带 rotateY(180deg)，翻转动画进行中 getBoundingClientRect
     读到的是透视畸变后的框，尺寸随相位抖动；布局尺寸与变换无关。
     比较的是「文字块高 vs 卡面内容盒高」，不是同一元素的 scrollHeight/clientHeight，
     所以 align-items:center 的上溢出也测得到。 */
  function textOverflows(face, kid){
    const cs = getComputedStyle(face);
    const avail = face.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
    return kid.offsetHeight > avail + 0.5;
  }
  /* 连续缩放：装不下就逐 px 缩，缩到装得下为止。
     从当前计算字号起缩（正面此时已套上 is-long / is-verylong），不重置 class。 */
  function shrinkToFit(face, kid, minPx){
    if(!face || !kid) return;
    let size = parseFloat(getComputedStyle(kid).fontSize);
    if(!size) return;
    while(size > minPx && textOverflows(face, kid)){
      size = Math.max(minPx, size - 1);
      kid.style.fontSize = size + 'px';
    }
  }
  // ---- 释义自适应缩放：装不下时逐档降字号，保证不溢出卡面 ----
  function fitDefinition(){
    const face = frontText.parentNode;
    if(!face) return;
    face.classList.remove('is-long', 'is-verylong');
    if(!definitionOverflows(face)) return;
    face.classList.add('is-long');
    void face.offsetHeight;              // 强制重排，让下一行读到降档后的真实高度
    if(definitionOverflows(face)) face.classList.add('is-verylong');
  }
  /* 连续细调：正面 class 粗调之后再缩 1~2px；背面没有 class，直接从基准连续缩。
     换卡期背面文字为空，空内容不缩。 */
  function fitText(){
    shrinkToFit(frontText.parentNode, frontText, FIT_MIN_FRONT);
    if(backText.textContent.trim()){
      shrinkToFit(backText.parentNode, backText, FIT_MIN_BACK);
    }
  }
  // ---- 待复查词表：本次（内存 state.flags）与历史累计（localStorage store.review） ----
  function markReviewed(term, verdict){
    // 同一单词在本轮内只计一次；换成另一种判定也不重复累加
    if(!state.flags[term]){
      state.flags[term] = verdict;
      state.reviewed += 1;
      if(verdict === 'uncertain') state.uncertain += 1;
      if(verdict === 'unknown') state.unknown += 1;
    }
    store.review[term] = { state: verdict, ts: Math.floor(Date.now() / 1000) };
    saveStore();
  }
  function markMastered(term){
    if(store.mastered[term]) return;
    store.mastered[term] = { ts: Math.floor(Date.now() / 1000) };
    saveStore();
  }
  // 徽标计数：一律排除已掌握的词
  function pendingRound(){
    let n = 0;
    for (const term in state.flags){ if(!store.mastered[term]) n += 1; }
    return n;
  }
  function pendingHistory(){
    let n = 0;
    for (const term in store.review){ if(!store.mastered[term]) n += 1; }
    return n;
  }

  // ---- 词汇列表视图（第 5 个 view）----
  // scope: 'round' = 本次标记的词；'history' = 历史累计
  // 刻意不改 state.phase —— reviewView 只是 showView 的一层，
  // 队列 / 翻面时序 / transitioning 全部原样保留，返回时状态天然自愈。
  let reviewScope = 'round';
  let reviewReturnView = null;
  function openReview(scope){
    reviewScope = scope;
    reviewReturnView = (scope === 'round') ? gameView : levelsView;
    renderReview();
    showView(reviewView);
    $('reviewBackBtn').focus();
  }
  function closeReview(){
    const back = reviewReturnView || gameView;
    showView(back);
    if (back === gameView){ render(); $('reviewStatBtn').focus(); }
    else { renderLevels(); $('levelsReviewBtn').focus(); }
  }
  function renderReview(){
    const round = reviewScope === 'round';
    const keys = round ? Object.keys(state.flags) : Object.keys(store.review);
    if(!round) keys.sort(function(a, b){ return store.review[b].ts - store.review[a].ts; });
    $('reviewScope').textContent = round ? 'This round' : 'All time';
    $('reviewTitle').textContent = round ? 'Review list' : 'Review history';
    let left = 0;
    reviewBody.textContent = '';
    if(keys.length === 0){
      const empty = document.createElement('div');
      empty.className = 'review-empty';
      empty.id = 'reviewEmpty';
      empty.textContent = round
        ? 'No words marked in this round yet. Cards you mark as Not sure or I don\'t know will collect here.'
        : 'No words marked yet. Words you flag in any chapter will collect here.';
      reviewBody.appendChild(empty);
    } else {
      keys.forEach(function(term){
        const learned = !!store.mastered[term];
        if(!learned) left += 1;
        const card = cardByTerm[term];
        const row = document.createElement('div');
        row.className = learned ? 'word-row is-mastered' : 'word-row';
        row.setAttribute('role', 'listitem');
        const main = document.createElement('div');
        main.className = 'word-main';
        const t = document.createElement('div');
        t.className = 'word-term';
        t.textContent = term;
        main.appendChild(t);
        if(card){
          const d = document.createElement('div');
          d.className = 'word-def';
          d.textContent = card.definition;
          main.appendChild(d);
        }
        row.appendChild(main);
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'word-master';
        btn.dataset.term = term;
        if(learned){
          btn.textContent = 'Learned';
          btn.disabled = true;
          btn.setAttribute('aria-pressed', 'true');
          btn.setAttribute('aria-label', term + ' is marked as learned');
        } else {
          btn.textContent = 'Got it';
          btn.setAttribute('aria-pressed', 'false');
          btn.setAttribute('aria-label', 'Mark ' + term + ' as learned');
          btn.addEventListener('click', function(){
            markMastered(term);
            row.className = 'word-row is-mastered';
            btn.textContent = 'Learned';
            btn.disabled = true;
            btn.setAttribute('aria-pressed', 'true');
            // 徽标 / 本页计数 / 关卡页计数同步排除已掌握
            left -= 1;
            $('reviewCount').textContent = left + ' to review · ' + keys.length + ' marked';
            $('reviewText').textContent = pendingRound();
            const hist = pendingHistory();
            $('levelsReviewCount').textContent = hist > 0 ? '· ' + hist : '';
          });
        }
        row.appendChild(btn);
        reviewBody.appendChild(row);
      });
    }
    $('reviewCount').textContent = keys.length
      ? left + ' to review · ' + keys.length + ' marked'
      : '';
  }

  $('startBtn').addEventListener('click', startGame);
  $('levelsBackBtn').addEventListener('click', function(){ refreshHome(); showView(welcomeView); });
  $('levelsExitBtn').addEventListener('click', leaveRound);
  $('prevBtn').addEventListener('click', goPrev);
  $('exitCancelBtn').addEventListener('click', closeExitDialog);
  $('exitConfirmBtn').addEventListener('click', confirmExit);
  exitMask.addEventListener('click', function(e){ if(e.target === exitMask) closeExitDialog(); });
  $('reviewStatBtn').addEventListener('click', function(){ openReview('round'); });
  $('levelsReviewBtn').addEventListener('click', function(){ openReview('history'); });
  $('reviewBackBtn').addEventListener('click', closeReview);
  document.addEventListener('keydown', function(event){
    if (state.dialogOpen) {
      if (event.key === 'Tab') {
        const f = [$('exitCancelBtn'), $('exitConfirmBtn')];
        const i = f.indexOf(document.activeElement);
        event.preventDefault();
        f[(i + (event.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
      if (event.key === 'Escape'){ event.preventDefault(); closeExitDialog(); }
      return;
    }
    if (event.key === 'Escape' && reviewView.classList.contains('active')) {
      event.preventDefault();
      closeReview();
    }
  });
  $('summaryLevelsBtn').addEventListener('click', openLevels);
  $('resetBtn').addEventListener('click', function(){ startLevel(state.levelId); });
  flashcard.addEventListener('click', reveal);
  flashcard.addEventListener('keydown', (event) => {
    if(event.key === 'Enter' || event.key === ' '){ event.preventDefault(); reveal(); }
  });
  document.querySelectorAll('.state-btn').forEach(btn => btn.addEventListener('click', () => choose(btn.dataset.state)));
  $('nextBtn').addEventListener('click', advance);

  // ---- 视口变化后重算释义降档：旋转 / 地址栏收放都会改变卡面高度 ----
  let fitTimer = 0;
  function scheduleFit(){
    if(fitTimer) clearTimeout(fitTimer);
    fitTimer = setTimeout(function(){ fitTimer = 0; fitDefinition(); fitText(); }, 120);
  }
  window.addEventListener('resize', scheduleFit);
  window.addEventListener('orientationchange', scheduleFit);

  // ---- 学习站导航：返回主目录（整合时新增） ----
  function mountHubLinks(){
    var HREF = '../index.html';
    function mk(cls, label){
      var a = document.createElement('a');
      a.className = cls; a.href = HREF; a.textContent = label;
      a.setAttribute('data-hub-back', '');
      return a;
    }
    // welcome：左上角浮层
    if (welcomeView) welcomeView.appendChild(mk('hub-back hub-back-float', '← Learning Hub'));
    // levels：顶栏 Back 之后追加
    if ($('levelsBackBtn') && $('levelsBackBtn').parentNode){
      $('levelsBackBtn').parentNode.appendChild(mk('hub-back-inline', 'Hub'));
    }
    // game：标题块上方，不与右上角 Exit 打架
    var wrap = document.querySelector('.game-title-wrap');
    if (wrap) wrap.insertBefore(mk('hub-link', '← Learning Hub'), wrap.firstChild);
    // summary：动作区追加
    if ($('summaryLevelsBtn') && $('summaryLevelsBtn').parentNode){
      $('summaryLevelsBtn').parentNode.appendChild(mk('hub-back-inline', 'Hub'));
    }
    // review：顶栏追加
    if ($('reviewBackBtn') && $('reviewBackBtn').parentNode){
      $('reviewBackBtn').parentNode.appendChild(mk('hub-back-inline', 'Hub'));
    }
  }

  // ---- boot ----
  loadStore();
  migrateLegacyIds();
  refreshHome();
  renderLevels();
  mountHubLinks();

  // 对外只暴露一个命名空间，避免多模块塞进同一文档时撞名
  window.LearningHub = window.LearningHub || { modules: {} };
  window.LearningHub.modules[MOD.id] = { id: MOD.id, type: 'flashcards', state: state, store: store, GAME: GAME };
})();
