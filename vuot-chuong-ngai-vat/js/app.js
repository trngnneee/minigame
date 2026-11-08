/*
 * Vượt chướng ngại vật – logic trò chơi (vanilla JS, chạy trực tiếp từ file://).
 * Trạng thái được lưu vào localStorage để lỡ tải lại trang vẫn chơi tiếp.
 */
(function () {
  'use strict';

  const DATA = window.VCNV_DATA;
  if (!DATA || !Array.isArray(DATA.rows)) {
    document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px;color:#ff6f61">Không tải được dữ liệu câu hỏi (js/questions.js).</p>');
    return;
  }

  const ROW_COUNT = DATA.rows.length;
  const MIN_TEAMS = 2;
  const MAX_TEAMS = 10;
  const SHORTCUT_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
  const DEFAULT_SETUP = (Array.isArray(DATA.teams) && DATA.teams.length
    ? DATA.teams
    : [1, 2, 3, 4].map((n) => ({ name: 'Đội ' + n, key: String(n) }))
  ).slice(0, MAX_TEAMS).map((t) => ({ name: String(t.name), key: t.key == null ? null : String(t.key) }));
  const ADJUST_STEP = 5;
  const STORAGE_KEY = 'vcnv-doi-ngoai-state';
  const STATE_VERSION = 2;
  const DATA_KEY = hashString(JSON.stringify(DATA.rows.map((r) => [r.question, r.points])) + DATA.cnv.answer);

  // ------------------------------------------------------------------
  // Helpers
  // ------------------------------------------------------------------
  const $ = (id) => document.getElementById(id);

  function esc(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function hashString(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function defaultName(i) { return DEFAULT_SETUP[i] ? DEFAULT_SETUP[i].name : 'Đội ' + (i + 1); }

  function keyLabel(t) { return t && t.key ? '<span class="toggle-key" aria-hidden="true">[' + esc(t.key) + ']</span>' : ''; }

  // Ảnh + chú thích có link nguồn. Chỉ gọi khi đã được phép hiện đáp án.
  function mediaFigure(media, cls) {
    if (!media) return '';
    const caption = media.url
      ? '<a href="' + esc(media.url) + '" target="_blank" rel="noopener noreferrer">' + esc(media.caption) + ' ↗</a>'
      : esc(media.caption);
    if (!media.image) return '<p class="q-media">' + caption + '</p>';
    return '<figure class="' + cls + '">' +
      '<img src="' + esc(media.image) + '" alt="' + esc(media.caption.replace(/^Ảnh:\s*/, '')) + '" decoding="async">' +
      '<figcaption>' + caption + '</figcaption></figure>';
  }

  // Tải trước ảnh vào bộ nhớ đệm (không đưa vào DOM) để lúc hiện đáp án ảnh xuất hiện ngay
  function preloadImages() {
    DATA.rows.forEach((r) => {
      if (r.media && r.media.image) { const img = new Image(); img.src = r.media.image; }
    });
  }

  function teamIndexForKey(key) { return state.teams.findIndex((t) => t.key === key); }

  function cnvValue(hints) {
    const s = DATA.scoring;
    return Math.max(s.cnvMin, s.cnvBase - s.cnvPenaltyPerHint * hints);
  }

  function difficultySummary() {
    const seen = [];
    DATA.rows.forEach((r) => {
      if (!seen.some((x) => x.d === r.difficulty)) seen.push({ d: r.difficulty, p: r.points });
    });
    return seen.map((x) => x.d + ' ' + x.p).join(' · ');
  }

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  function newState(setup, phase) {
    return {
      version: STATE_VERSION,
      dataKey: DATA_KEY,
      phase: phase,
      teamSetup: setup.map((t) => ({ name: t.name, key: t.key })),
      teams: phase === 'setup' ? [] : setup.map((t) => ({ name: t.name, key: t.key, score: 0, cnvLocked: false })),
      rows: DATA.rows.map(() => ({ done: false, correct: [] })),
      active: null, // { row, stage: 'question' | 'judge', selected: [] }
      cnv: { status: 'open', solvedBy: null, value: 0, hints: 0, attempts: [] }
    };
  }

  function isValidState(s) {
    try {
      if (!s || s.version !== STATE_VERSION || s.dataKey !== DATA_KEY) return false;
      if (['setup', 'board', 'results'].indexOf(s.phase) < 0) return false;
      const validTeam = (t) => t && typeof t.name === 'string' && (t.key === null || SHORTCUT_KEYS.indexOf(t.key) >= 0);
      if (!Array.isArray(s.teamSetup) || s.teamSetup.length < MIN_TEAMS || s.teamSetup.length > MAX_TEAMS) return false;
      if (!s.teamSetup.every(validTeam)) return false;
      if (!Array.isArray(s.rows) || s.rows.length !== ROW_COUNT) return false;
      if (!s.rows.every((r) => r && typeof r.done === 'boolean' && Array.isArray(r.correct))) return false;
      if (!Array.isArray(s.teams)) return false;
      if (s.phase !== 'setup') {
        if (s.teams.length < MIN_TEAMS || s.teams.length > MAX_TEAMS) return false;
        if (!s.teams.every((t) => validTeam(t) && Number.isFinite(t.score) && typeof t.cnvLocked === 'boolean')) return false;
      }
      if (!s.cnv || ['open', 'solved', 'revealed'].indexOf(s.cnv.status) < 0 || !Array.isArray(s.cnv.attempts)) return false;
      if (s.active) {
        const a = s.active;
        if (!Number.isInteger(a.row) || a.row < 0 || a.row >= ROW_COUNT) return false;
        if (['question', 'judge'].indexOf(a.stage) < 0 || !Array.isArray(a.selected)) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return isValidState(parsed) ? parsed : null;
    } catch (e) {
      return null;
    }
  }

  function save() {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      /* bộ nhớ trình duyệt không khả dụng – trò chơi vẫn chạy bình thường */
    }
  }

  let state = load() || newState(DEFAULT_SETUP, 'setup');

  // Trạng thái tạm (không lưu)
  const ui = {
    justOpenedHint: -1,
    bump: new Set(),
    cnvDialog: { step: 'pick', team: null },
    reviewOpen: false,
    lettersKey: ''
  };

  const hintsOpened = () => state.rows.filter((r) => r.done).length;
  const nextRowIndex = () => state.rows.findIndex((r) => !r.done);
  const eligibleCnvTeams = () => state.teams.map((t, i) => (t.cnvLocked ? -1 : i)).filter((i) => i >= 0);

  // ------------------------------------------------------------------
  // Elements
  // ------------------------------------------------------------------
  const el = {
    restart: $('btn-restart'),
    topbarTopic: $('topbar-topic'),
    screenSetup: $('screen-setup'),
    screenBoard: $('screen-board'),
    screenResults: $('screen-results'),
    setupTopic: $('setup-topic'),
    rulesList: $('rules-list'),
    teamCount: $('team-count'),
    teamMinus: $('btn-team-minus'),
    teamPlus: $('btn-team-plus'),
    teamInputs: $('team-inputs'),
    start: $('btn-start'),
    cnvMeta: $('cnv-meta'),
    cnvValueLabel: $('cnv-value-label'),
    cnvValue: $('cnv-value'),
    cnvLetters: $('cnv-letters'),
    cnvStatus: $('cnv-status'),
    cnvBtn: $('btn-cnv'),
    rowsView: $('rows-view'),
    rowsList: $('rows-list'),
    hintsProgress: $('hints-progress'),
    boardPrimary: $('btn-board-primary'),
    questionView: $('question-view'),
    qLabel: $('q-label'),
    qDifficulty: $('q-difficulty'),
    qPoints: $('q-points'),
    qText: $('q-text'),
    timer: $('timer'),
    timerFill: $('timer-fill'),
    timerNum: $('timer-num'),
    timerBtn: $('btn-timer'),
    qReveal: $('q-reveal'),
    qJudge: $('q-judge'),
    judgeTeams: $('judge-teams'),
    judgeSummary: $('judge-summary'),
    qBack: $('btn-q-back'),
    qPrimary: $('btn-q-primary'),
    scoreboard: $('scoreboard'),
    resultsCnv: $('results-cnv'),
    ranking: $('results-ranking'),
    reviewBtn: $('btn-review'),
    review: $('review'),
    replay: $('btn-replay'),
    newSetup: $('btn-new-setup'),
    announcer: $('announcer'),
    dlgCnv: $('dlg-cnv'),
    dlgCnvInfo: $('dlg-cnv-info'),
    dlgCnvPick: $('dlg-cnv-pick'),
    dlgCnvTeams: $('dlg-cnv-teams'),
    dlgCnvJudge: $('dlg-cnv-judge'),
    dlgCnvJudgeText: $('dlg-cnv-judge-text'),
    cnvRight: $('btn-cnv-right'),
    cnvWrong: $('btn-cnv-wrong'),
    cnvCancel: $('btn-cnv-cancel'),
    dlgRestart: $('dlg-restart'),
    restartCancel: $('btn-restart-cancel'),
    restartSetup: $('btn-restart-setup'),
    restartKeep: $('btn-restart-keep')
  };

  function announce(msg) {
    el.announcer.textContent = '';
    window.setTimeout(() => { el.announcer.textContent = msg; }, 30);
  }

  // ------------------------------------------------------------------
  // Timer
  // ------------------------------------------------------------------
  const timer = { total: DATA.timerSeconds, remaining: DATA.timerSeconds, running: false, up: false, endAt: 0, id: null };
  let audioCtx = null;

  function ensureAudio() {
    try {
      if (!audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (AC) audioCtx = new AC();
      }
      if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume();
    } catch (e) { audioCtx = null; }
  }

  function beep() {
    if (!audioCtx) return;
    try {
      const t = audioCtx.currentTime;
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(t);
      osc.stop(t + 0.75);
    } catch (e) { /* bỏ qua âm thanh */ }
  }

  function timerClear() {
    if (timer.id) window.clearInterval(timer.id);
    timer.id = null;
  }

  function timerReset() {
    timerClear();
    timer.remaining = timer.total;
    timer.running = false;
    timer.up = false;
    renderTimer();
  }

  function timerStart() {
    ensureAudio();
    timer.running = true;
    timer.up = false;
    timer.endAt = performance.now() + timer.remaining * 1000;
    timerClear();
    timer.id = window.setInterval(timerTick, 100);
    timerTick();
  }

  function timerPause() {
    if (!timer.running) return;
    timer.remaining = Math.max(0, (timer.endAt - performance.now()) / 1000);
    timer.running = false;
    timerClear();
    renderTimer();
  }

  function timerTick() {
    timer.remaining = Math.max(0, (timer.endAt - performance.now()) / 1000);
    if (timer.remaining <= 0) {
      timerClear();
      timer.running = false;
      timer.up = true;
      beep();
      announce('Hết giờ!');
    }
    renderTimer();
  }

  function timerToggle() {
    if (!state.active || state.active.stage !== 'question') return;
    if (timer.up) { timerReset(); timerStart(); return; }
    if (timer.running) timerPause(); else timerStart();
  }

  function renderTimer() {
    const ratio = timer.total ? timer.remaining / timer.total : 0;
    el.timerFill.style.transform = 'scaleX(' + ratio.toFixed(4) + ')';
    el.timerNum.textContent = String(Math.ceil(timer.remaining - 1e-6));
    el.timer.classList.toggle('is-low', !timer.up && timer.remaining <= 5 && timer.remaining < timer.total);
    el.timer.classList.toggle('is-up', timer.up);
    let label;
    if (timer.running) label = 'Tạm dừng';
    else if (timer.up) label = 'Đếm lại';
    else if (timer.remaining < timer.total) label = 'Tiếp tục';
    else label = 'Bắt đầu ' + timer.total + ' giây';
    el.timerBtn.innerHTML = esc(label) + ' <kbd>T</kbd>';
  }

  // ------------------------------------------------------------------
  // Rendering
  // ------------------------------------------------------------------
  function render() {
    const focusKey = document.activeElement && document.activeElement.getAttribute
      ? document.activeElement.getAttribute('data-focus')
      : null;

    el.screenSetup.hidden = state.phase !== 'setup';
    el.screenBoard.hidden = state.phase !== 'board';
    el.screenResults.hidden = state.phase !== 'results';
    el.restart.hidden = state.phase === 'setup';

    if (state.phase === 'setup') renderSetup();
    if (state.phase === 'board') renderBoard();
    if (state.phase === 'results') {
      renderResults();
    } else {
      // Không để đáp án của ván trước nằm ẩn trong DOM
      el.resultsCnv.innerHTML = '';
      el.ranking.innerHTML = '';
      el.review.innerHTML = '';
    }

    if (focusKey) {
      const target = document.querySelector('[data-focus="' + focusKey + '"]');
      if (target && target !== document.activeElement) target.focus();
    }
    ui.bump.clear();
  }

  function renderStatic() {
    el.topbarTopic.textContent = DATA.topic;
    el.setupTopic.textContent = DATA.topic;
    const s = DATA.scoring;
    const rules = [
      'Có <strong>' + ROW_COUNT + ' hàng ngang</strong>, chơi lần lượt. Mỗi câu có <strong>' + DATA.timerSeconds + ' giây</strong> suy nghĩ.',
      'Mọi đội trả lời đúng đều được điểm theo độ khó: <strong>' + esc(difficultySummary()) + '</strong>.',
      'Mỗi hàng ngang chơi xong sẽ mở <strong>1 gợi ý</strong> cho chướng ngại vật – kể cả khi không đội nào trả lời đúng.',
      'Chướng ngại vật gồm <strong>' + DATA.cnv.syllables + ' tiếng, ' + DATA.cnv.letterCount + ' chữ cái</strong>. Các đội được xin giải <strong>bất cứ lúc nào</strong>.',
      'Giải đúng: <strong>' + s.cnvBase + ' điểm</strong>, trừ <strong>' + s.cnvPenaltyPerHint + ' điểm</strong> cho mỗi gợi ý đã mở (thấp nhất ' + s.cnvMin + ' điểm). Có đội giải đúng là kết thúc vòng.',
      'Giải sai: đội bị loại khỏi phần chướng ngại vật nhưng vẫn tiếp tục trả lời hàng ngang.'
    ];
    el.rulesList.innerHTML = rules.map((r) => '<li>' + r + '</li>').join('');
    el.cnvMeta.textContent = DATA.cnv.syllables + ' tiếng · ' + DATA.cnv.letterCount + ' chữ cái';
  }

  // ---------- Setup ----------
  function renderSetup() {
    const n = state.teamSetup.length;
    el.teamCount.textContent = String(n);
    el.teamMinus.disabled = n <= MIN_TEAMS;
    el.teamPlus.disabled = n >= MAX_TEAMS;
    if (el.teamInputs.children.length !== n) {
      el.teamInputs.innerHTML = state.teamSetup.map((t, i) =>
        '<div class="team-input">' +
          '<label for="team-name-' + i + '" title="Phím tắt khi chấm">' + (t.key ? '[' + esc(t.key) + ']' : '#' + (i + 1)) + '</label>' +
          '<input id="team-name-' + i + '" data-team-input="' + i + '" data-focus="team-name-' + i + '" type="text" maxlength="40" autocomplete="off" value="' + esc(t.name) + '" placeholder="' + esc(defaultName(i)) + '">' +
        '</div>'
      ).join('');
    }
  }

  // ---------- Board ----------
  function renderBoard() {
    renderCnv();
    renderScoreboard();
    const a = state.active;
    el.questionView.hidden = !a;
    el.rowsView.hidden = !!a;
    if (a) renderQuestion(); else renderRows();
    renderPrimary();
  }

  function renderCnv() {
    const c = state.cnv;
    const h = hintsOpened();

    // Giá trị
    if (c.status === 'open') {
      el.cnvValueLabel.textContent = 'Giá trị nếu giải đúng';
      el.cnvValue.textContent = String(cnvValue(h));
    } else if (c.status === 'solved') {
      el.cnvValueLabel.textContent = 'Đã giải – nhận';
      el.cnvValue.textContent = String(c.value);
    } else {
      el.cnvValueLabel.textContent = 'Không đội nào giải được';
      el.cnvValue.textContent = '—';
    }

    // Ô chữ: chỉ đưa đáp án vào DOM khi đã giải / công bố
    const lettersKey = c.status;
    if (ui.lettersKey !== lettersKey) {
      ui.lettersKey = lettersKey;
      if (c.status === 'open') {
        let boxes = '';
        for (let i = 0; i < DATA.cnv.letterCount; i++) boxes += '<span class="cnv-box"></span>';
        el.cnvLetters.innerHTML = '<div class="cnv-word">' + boxes + '</div>';
        el.cnvLetters.setAttribute('role', 'img');
        el.cnvLetters.setAttribute('aria-label', DATA.cnv.letterCount + ' ô chữ chưa được giải');
      } else {
        const cls = c.status === 'solved' ? 'is-filled' : 'is-revealed-none';
        let idx = 0;
        el.cnvLetters.innerHTML = DATA.cnv.boardLetters.map((word) =>
          '<div class="cnv-word">' + word.split('').map((ch) =>
            '<span class="cnv-box ' + cls + '" style="animation-delay:' + (idx++ * 70) + 'ms">' + esc(ch) + '</span>'
          ).join('') + '</div>'
        ).join('');
        el.cnvLetters.setAttribute('role', 'img');
        el.cnvLetters.setAttribute('aria-label', 'Chướng ngại vật: ' + DATA.cnv.answer);
      }
    }

    // Trạng thái
    el.cnvStatus.classList.toggle('is-solved', c.status === 'solved');
    if (c.status === 'open') {
      const locked = state.teams.filter((t) => t.cnvLocked);
      let html = 'Đã mở <strong>' + h + '/' + ROW_COUNT + '</strong> gợi ý.';
      if (locked.length) {
        html += '<br><span class="cnv-locked" aria-label="Các đội đã bị loại khỏi phần chướng ngại vật">' +
          locked.map((t) => '<span class="chip">✕ ' + esc(t.name) + '</span>').join('') + '</span>';
      }
      if (!eligibleCnvTeams().length) html += '<br>Không còn đội nào được quyền giải chướng ngại vật.';
      el.cnvStatus.innerHTML = html;
    } else if (c.status === 'solved') {
      const team = state.teams[c.solvedBy];
      el.cnvStatus.innerHTML = '✓ ' + esc(team ? team.name : '') + ' giải đúng sau ' + c.hints + ' gợi ý · +' + c.value + ' điểm';
    } else {
      el.cnvStatus.innerHTML = 'Không nhóm nào giải được – chướng ngại vật đã được công bố.';
    }

    el.cnvBtn.hidden = c.status !== 'open';
    el.cnvBtn.disabled = !eligibleCnvTeams().length;
  }

  function renderRows() {
    const next = nextRowIndex();
    const cnvOpen = state.cnv.status === 'open';
    const h = hintsOpened();
    el.hintsProgress.textContent = 'Đã mở ' + h + '/' + ROW_COUNT + ' gợi ý';

    el.rowsList.innerHTML = DATA.rows.map((row, i) => {
      const r = state.rows[i];
      const isNext = cnvOpen && i === next;
      let result;
      if (r.done) {
        result = r.correct.length
          ? '<span class="row-result ok">✓ Đúng: ' + r.correct.map((t) => esc(state.teams[t] ? state.teams[t].name : '')).join(', ') + '</span>'
          : '<span class="row-result none">✕ Không đội nào đúng</span>';
      } else {
        result = '<span class="row-result pending">' + (isNext ? '▶ Hàng tiếp theo' : 'Chưa mở') + '</span>';
      }
      const hint = r.done
        ? '<div class="hint is-open' + (ui.justOpenedHint === i ? ' just-opened' : '') + '">' +
            '<p class="hint-label">Gợi ý ' + (i + 1) + ' · ' + esc(row.hint.level) + '</p>' +
            '<p class="hint-text">' + esc(row.hint.text) + '</p></div>'
        : '<div class="hint is-locked"><p class="hint-label">Gợi ý ' + (i + 1) + '</p>' +
            '<p class="hint-text">Mở sau khi chơi xong hàng ngang ' + (i + 1) + '</p></div>';
      return '<li class="row-card' + (r.done ? ' is-done' : '') + (isNext ? ' is-next' : '') + '">' +
        '<div class="row-meta">' +
          '<p class="row-name">Hàng ngang ' + (i + 1) + '</p>' +
          '<div class="row-sub"><span class="chip">' + esc(row.difficulty) + '</span><span class="chip chip-points">' + row.points + ' điểm</span></div>' +
          result +
        '</div>' + hint + '</li>';
    }).join('');
    ui.justOpenedHint = -1;
  }

  // Nút chính trên thanh CNV dính – luôn nhìn thấy, đổi nhãn theo bước hiện tại
  function renderPrimary() {
    const a = state.active;
    let label;
    if (a && a.stage === 'question') label = 'HIỆN ĐÁP ÁN';
    else if (a) label = 'XÁC NHẬN & MỞ GỢI Ý ' + (a.row + 1);
    else if (state.cnv.status !== 'open') label = 'XEM KẾT QUẢ';
    else if (nextRowIndex() >= 0) label = 'MỞ HÀNG NGANG ' + (nextRowIndex() + 1);
    else label = 'CÔNG BỐ CHƯỚNG NGẠI VẬT';
    el.boardPrimary.innerHTML = esc(label) + ' <kbd>Enter</kbd>';
  }

  function renderQuestion() {
    const a = state.active;
    const row = DATA.rows[a.row];
    el.qLabel.textContent = 'Hàng ngang ' + (a.row + 1);
    el.qDifficulty.textContent = row.difficulty;
    el.qPoints.textContent = row.points + ' điểm';
    el.qText.textContent = row.question;

    if (a.stage === 'question') {
      // Không đưa đáp án / chú thích ảnh vào DOM trước khi MC bấm hiện đáp án
      el.qReveal.innerHTML = '';
      el.qReveal.hidden = true;
      el.qJudge.hidden = true;
      el.judgeTeams.innerHTML = '';
      el.timerBtn.disabled = false;
      el.qPrimary.innerHTML = 'HIỆN ĐÁP ÁN <kbd>Enter</kbd>';
    } else {
      el.timerBtn.disabled = true;
      if (el.qReveal.hidden || el.qReveal.getAttribute('data-row') !== String(a.row)) {
        el.qReveal.setAttribute('data-row', String(a.row));
        el.qReveal.classList.toggle('has-figure', !!(row.media && row.media.image));
        el.qReveal.innerHTML =
          '<div class="q-reveal-text">' +
            '<p class="q-answer-label">Đáp án</p>' +
            '<p class="q-answer">' + esc(row.answer) + '</p>' +
            '<p class="q-explain">' + esc(row.explanation) + '</p>' +
            '<p class="q-source">Nguồn: ' + esc(row.source) + '</p>' +
          '</div>' +
          mediaFigure(row.media, 'q-figure');
        el.qReveal.hidden = false;
      }
      el.qJudge.hidden = false;
      el.judgeTeams.innerHTML = state.teams.map((t, i) => {
        const on = a.selected.indexOf(i) >= 0;
        return '<button type="button" class="btn team-toggle" data-judge="' + i + '" data-focus="judge-' + i + '" aria-pressed="' + on + '">' +
          '<span class="toggle-mark" aria-hidden="true">' + (on ? '✓' : '') + '</span>' +
          '<span>' + esc(t.name) + '</span>' +
          keyLabel(t) +
          '</button>';
      }).join('');
      if (a.selected.length) {
        el.judgeSummary.classList.remove('is-none');
        el.judgeSummary.textContent = 'Cộng ' + row.points + ' điểm cho: ' +
          a.selected.slice().sort((x, y) => x - y).map((i) => state.teams[i].name).join(', ') + '.';
      } else {
        el.judgeSummary.classList.add('is-none');
        el.judgeSummary.textContent = 'Chưa chọn đội nào: nếu xác nhận, gợi ý vẫn được mở nhưng không đội nào được cộng điểm.';
      }
      el.qPrimary.innerHTML = 'XÁC NHẬN &amp; MỞ GỢI Ý ' + (a.row + 1) + ' <kbd>Enter</kbd>';
    }
    renderTimer();
  }

  function renderScoreboard() {
    const max = Math.max.apply(null, state.teams.map((t) => t.score));
    el.scoreboard.innerHTML = state.teams.map((t, i) => {
      const solved = state.cnv.status === 'solved' && state.cnv.solvedBy === i;
      let flag = '';
      if (solved) flag = '✓ Giải được CNV';
      else if (t.cnvLocked) flag = '✕ Bị loại khỏi CNV';
      return '<li class="score-item' + (max > 0 && t.score === max ? ' is-leader' : '') + '">' +
        '<span class="score-name">' + esc(t.name) + '</span>' +
        '<span class="score-value' + (ui.bump.has(i) ? ' bump' : '') + '" aria-label="' + t.score + ' điểm">' + t.score + '</span>' +
        '<span class="score-flags' + (solved ? ' solved' : '') + '">' + flag + '</span>' +
        '<span class="score-adjust">' +
          '<button type="button" class="btn btn-ghost" data-adjust="' + i + '" data-delta="-' + ADJUST_STEP + '" data-focus="adj-' + i + '-m" aria-label="Trừ ' + ADJUST_STEP + ' điểm ' + esc(t.name) + '">−</button>' +
          '<button type="button" class="btn btn-ghost" data-adjust="' + i + '" data-delta="' + ADJUST_STEP + '" data-focus="adj-' + i + '-p" aria-label="Cộng ' + ADJUST_STEP + ' điểm ' + esc(t.name) + '">+</button>' +
        '</span></li>';
    }).join('');
  }

  // ---------- Results ----------
  function rankTeams() {
    const order = state.teams.map((t, i) => ({ t: t, i: i })).sort((a, b) => b.t.score - a.t.score || a.i - b.i);
    let lastScore = null;
    let lastRank = 0;
    return order.map((x, pos) => {
      const rank = x.t.score === lastScore ? lastRank : pos + 1;
      lastScore = x.t.score;
      lastRank = rank;
      return { team: x.t, index: x.i, rank: rank };
    });
  }

  function renderResults() {
    const c = state.cnv;
    let who;
    if (c.status === 'solved') {
      const team = state.teams[c.solvedBy];
      who = '✓ ' + esc(team ? team.name : '') + ' giải đúng sau ' + c.hints + ' gợi ý (+' + c.value + ' điểm).';
    } else {
      who = 'Không đội nào giải được chướng ngại vật.';
    }
    el.resultsCnv.innerHTML =
      '<p class="eyebrow">Chướng ngại vật</p>' +
      '<p class="cnv-phrase">' + esc(DATA.cnv.answer) + '</p>' +
      '<p>' + who + '</p>' +
      '<p>' + esc(DATA.cnv.explanation) + '</p>';

    el.ranking.innerHTML = rankTeams().map((r) => {
      const rowsCorrect = state.rows.filter((row) => row.correct.indexOf(r.index) >= 0).length;
      let detail = 'Hàng ngang đúng: ' + rowsCorrect + '/' + ROW_COUNT;
      if (c.status === 'solved' && c.solvedBy === r.index) detail += ' · Giải CNV: +' + c.value;
      else if (r.team.cnvLocked) detail += ' · Giải sai CNV';
      return '<li class="rank-item' + (r.rank === 1 ? ' is-first' : '') + '">' +
        '<span class="rank-pos">#' + r.rank + '</span>' +
        '<span class="rank-name">' + esc(r.team.name) + '<span class="rank-detail">' + detail + '</span></span>' +
        '<span class="rank-score">' + r.team.score + '</span></li>';
    }).join('');

    el.reviewBtn.setAttribute('aria-expanded', String(ui.reviewOpen));
    el.reviewBtn.textContent = ui.reviewOpen ? 'Ẩn đáp án' : 'Xem lại đáp án';
    el.review.hidden = !ui.reviewOpen;
    if (ui.reviewOpen) {
      el.review.innerHTML = DATA.rows.map((row, i) =>
        '<article class="review-item">' +
          '<h3>Hàng ngang ' + (i + 1) + ' · ' + esc(row.difficulty) + ' · ' + row.points + ' điểm</h3>' +
          '<p class="review-q">' + esc(row.question) + '</p>' +
          '<p class="review-a">Đáp án: <strong>' + esc(row.answer) + '</strong></p>' +
          '<p class="review-meta">' + esc(row.explanation) + '</p>' +
          '<p class="review-meta">Nguồn: ' + esc(row.source) + '</p>' +
          mediaFigure(row.media, 'review-figure') +
          '<p class="review-hint">Gợi ý ' + (i + 1) + ' (' + esc(row.hint.level) + '): ' + esc(row.hint.text) + '</p>' +
        '</article>'
      ).join('');
    } else {
      el.review.innerHTML = '';
    }
  }

  // ------------------------------------------------------------------
  // Actions
  // ------------------------------------------------------------------
  function commit() { save(); render(); }

  function currentTeamSetup() { return state.teams.map((t) => ({ name: t.name, key: t.key })); }

  function setTeamCount(n) {
    n = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, n));
    const setup = state.teamSetup.slice(0, n);
    while (setup.length < n) {
      const i = setup.length;
      const used = setup.map((t) => t.key);
      const preset = DEFAULT_SETUP[i];
      const key = preset && used.indexOf(preset.key) < 0
        ? preset.key
        : (SHORTCUT_KEYS.find((k) => used.indexOf(k) < 0) || null);
      setup.push({ name: defaultName(i), key: key });
    }
    state.teamSetup = setup;
    el.teamInputs.innerHTML = '';
    commit();
  }

  function startGame(setup) {
    const clean = (setup || state.teamSetup).map((t, i) => ({
      name: String(t.name || '').trim() || defaultName(i),
      key: t.key
    }));
    state = newState(clean, 'board');
    ui.reviewOpen = false;
    ui.lettersKey = '';
    timerReset();
    commit();
    el.boardPrimary.focus();
    announce('Bắt đầu vòng Vượt chướng ngại vật với ' + clean.length + ' đội.');
  }

  function goToSetup() {
    state = newState(state.teams.length ? currentTeamSetup() : state.teamSetup, 'setup');
    ui.reviewOpen = false;
    ui.lettersKey = '';
    el.teamInputs.innerHTML = '';
    timerReset();
    commit();
    el.start.focus();
  }

  function openNextRow() {
    if (state.cnv.status !== 'open') return;
    const idx = nextRowIndex();
    if (idx < 0) return;
    state.active = { row: idx, stage: 'question', selected: [] };
    timerReset();
    commit();
    el.boardPrimary.focus({ preventScroll: true });
    el.questionView.scrollIntoView({ block: 'start' });
    announce('Hàng ngang ' + (idx + 1) + ': ' + DATA.rows[idx].question);
  }

  function revealAnswer() {
    const a = state.active;
    if (!a || a.stage !== 'question') return;
    timerPause();
    a.stage = 'judge';
    commit();
    announce('Đáp án: ' + DATA.rows[a.row].answer);
  }

  function toggleJudge(i) {
    const a = state.active;
    if (!a || a.stage !== 'judge' || i < 0 || i >= state.teams.length) return;
    const pos = a.selected.indexOf(i);
    if (pos >= 0) a.selected.splice(pos, 1); else a.selected.push(i);
    commit();
  }

  function confirmRow() {
    const a = state.active;
    if (!a || a.stage !== 'judge') return;
    const row = DATA.rows[a.row];
    const selected = a.selected.slice().sort((x, y) => x - y);
    selected.forEach((i) => {
      state.teams[i].score += row.points;
      ui.bump.add(i);
    });
    state.rows[a.row].done = true;
    state.rows[a.row].correct = selected;
    state.active = null;
    ui.justOpenedHint = a.row;
    timerReset();
    commit();
    el.boardPrimary.focus({ preventScroll: true });
    const card = el.rowsList.children[a.row];
    if (card) card.scrollIntoView({ block: 'center' });
    const who = selected.length
      ? 'Cộng ' + row.points + ' điểm cho ' + selected.map((i) => state.teams[i].name).join(', ') + '. '
      : 'Không đội nào trả lời đúng. ';
    announce(who + 'Gợi ý ' + (a.row + 1) + ': ' + row.hint.text);
  }

  function backToBoard() {
    if (!state.active) return;
    state.active = null;
    timerReset();
    commit();
    el.boardPrimary.focus();
  }

  function revealCnv() {
    if (state.cnv.status !== 'open') return;
    state.cnv.status = 'revealed';
    state.active = null;
    timerReset();
    commit();
    el.boardPrimary.focus();
    announce('Chướng ngại vật là: ' + DATA.cnv.answer);
  }

  function showResults() {
    state.phase = 'results';
    state.active = null;
    timerReset();
    commit();
    el.screenResults.querySelector('h1').setAttribute('tabindex', '-1');
    el.screenResults.querySelector('h1').focus();
  }

  function boardPrimary() {
    if (state.cnv.status !== 'open') { showResults(); return; }
    if (nextRowIndex() >= 0) openNextRow(); else revealCnv();
  }

  function primaryAction() {
    if (state.phase === 'setup') { startGame(); return; }
    if (state.phase !== 'board') return;
    const a = state.active;
    if (a) {
      if (a.stage === 'question') revealAnswer(); else confirmRow();
    } else {
      boardPrimary();
    }
  }

  function adjustScore(i, delta) {
    if (!state.teams[i]) return;
    state.teams[i].score += delta;
    if (delta > 0) ui.bump.add(i);
    commit();
    announce(state.teams[i].name + ': ' + state.teams[i].score + ' điểm');
  }

  // ---------- CNV dialog ----------
  function openCnvDialog() {
    if (state.phase !== 'board' || state.cnv.status !== 'open') return;
    if (!eligibleCnvTeams().length) { announce('Không còn đội nào được quyền giải chướng ngại vật.'); return; }
    if (timer.running) timerPause();
    ui.cnvDialog = { step: 'pick', team: null };
    renderCnvDialog();
    if (!el.dlgCnv.open) el.dlgCnv.showModal();
    const first = el.dlgCnvTeams.querySelector('button');
    if (first) first.focus();
  }

  function renderCnvDialog() {
    const h = hintsOpened();
    el.dlgCnvInfo.innerHTML = 'Đã mở <strong>' + h + '/' + ROW_COUNT + '</strong> gợi ý · Nếu đúng, đội nhận <strong>' + cnvValue(h) + ' điểm</strong>. Nếu sai, đội bị loại khỏi phần chướng ngại vật.';
    const d = ui.cnvDialog;
    el.dlgCnvPick.hidden = d.step !== 'pick';
    el.dlgCnvJudge.hidden = d.step !== 'judge';
    if (d.step === 'pick') {
      el.dlgCnvTeams.innerHTML = state.teams.map((t, i) =>
        '<button type="button" class="btn" data-cnv-team="' + i + '"' + (t.cnvLocked ? ' disabled' : '') + '>' +
          keyLabel(t) +
          '<span>' + esc(t.name) + (t.cnvLocked ? ' (đã bị loại)' : '') + '</span></button>'
      ).join('');
    } else {
      const team = state.teams[d.team];
      el.dlgCnvJudgeText.textContent = (team ? team.name : '') + ' trả lời. MC đối chiếu với phiếu đáp án:';
    }
  }

  function pickCnvTeam(i) {
    const t = state.teams[i];
    if (!t || t.cnvLocked) return;
    ui.cnvDialog = { step: 'judge', team: i };
    renderCnvDialog();
    el.cnvRight.focus();
  }

  function judgeCnv(correct) {
    const d = ui.cnvDialog;
    const t = state.teams[d.team];
    if (!t || state.cnv.status !== 'open') { el.dlgCnv.close(); return; }
    const h = hintsOpened();
    const value = cnvValue(h);
    state.cnv.attempts.push({ team: d.team, correct: correct, hints: h });
    if (correct) {
      t.score += value;
      ui.bump.add(d.team);
      state.cnv.status = 'solved';
      state.cnv.solvedBy = d.team;
      state.cnv.value = value;
      state.cnv.hints = h;
      state.active = null;
      timerReset();
    } else {
      t.cnvLocked = true;
    }
    el.dlgCnv.close();
    commit();
    if (correct) {
      el.boardPrimary.focus();
      announce(t.name + ' giải đúng chướng ngại vật: ' + DATA.cnv.answer + '. Cộng ' + value + ' điểm.');
    } else {
      announce(t.name + ' trả lời sai, bị loại khỏi phần chướng ngại vật.');
    }
  }

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------
  el.teamMinus.addEventListener('click', () => setTeamCount(state.teamSetup.length - 1));
  el.teamPlus.addEventListener('click', () => setTeamCount(state.teamSetup.length + 1));
  el.teamInputs.addEventListener('input', (e) => {
    const i = Number(e.target.getAttribute('data-team-input'));
    if (Number.isInteger(i) && i >= 0 && i < state.teamSetup.length) {
      state.teamSetup[i].name = e.target.value;
      save();
    }
  });
  el.teamInputs.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); startGame(); }
  });
  el.start.addEventListener('click', () => startGame());

  el.boardPrimary.addEventListener('click', primaryAction);
  el.qPrimary.addEventListener('click', () => {
    const a = state.active;
    if (!a) return;
    if (a.stage === 'question') revealAnswer(); else confirmRow();
  });
  el.qBack.addEventListener('click', backToBoard);
  el.timerBtn.addEventListener('click', timerToggle);
  el.judgeTeams.addEventListener('click', (e) => {
    const b = e.target.closest('[data-judge]');
    if (b) toggleJudge(Number(b.getAttribute('data-judge')));
  });
  el.scoreboard.addEventListener('click', (e) => {
    const b = e.target.closest('[data-adjust]');
    if (b) adjustScore(Number(b.getAttribute('data-adjust')), Number(b.getAttribute('data-delta')));
  });

  el.cnvBtn.addEventListener('click', openCnvDialog);
  el.dlgCnvTeams.addEventListener('click', (e) => {
    const b = e.target.closest('[data-cnv-team]');
    if (b && !b.disabled) pickCnvTeam(Number(b.getAttribute('data-cnv-team')));
  });
  el.cnvRight.addEventListener('click', () => judgeCnv(true));
  el.cnvWrong.addEventListener('click', () => judgeCnv(false));
  el.cnvCancel.addEventListener('click', () => el.dlgCnv.close());
  el.dlgCnv.addEventListener('close', () => { ui.cnvDialog = { step: 'pick', team: null }; });

  function openRestart() {
    if (state.phase === 'setup' || el.dlgRestart.open) return;
    if (timer.running) timerPause();
    el.dlgRestart.showModal();
    el.restartCancel.focus();
  }
  el.restart.addEventListener('click', openRestart);
  el.restartCancel.addEventListener('click', () => el.dlgRestart.close());
  el.restartKeep.addEventListener('click', () => {
    el.dlgRestart.close();
    startGame(currentTeamSetup());
  });
  el.restartSetup.addEventListener('click', () => {
    el.dlgRestart.close();
    goToSetup();
  });

  el.reviewBtn.addEventListener('click', () => { ui.reviewOpen = !ui.reviewOpen; render(); });
  el.replay.addEventListener('click', () => startGame(currentTeamSetup()));
  el.newSetup.addEventListener('click', goToSetup);

  document.addEventListener('keydown', (e) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.isComposing) return;
    const target = e.target instanceof Element ? e.target : null;
    if (target && target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const key = e.key;

    if (el.dlgCnv.open) {
      if (/^[0-9]$/.test(key) && ui.cnvDialog.step === 'pick') {
        e.preventDefault();
        pickCnvTeam(teamIndexForKey(key));
      }
      return; // Esc do <dialog> tự xử lý
    }
    if (el.dlgRestart.open) return;

    if (key === 'Enter') {
      if (target && target.closest('button, a, summary')) return; // để nút gốc tự xử lý
      e.preventDefault();
      primaryAction();
      return;
    }

    const lower = key.toLowerCase();
    if (lower === 'r') { e.preventDefault(); openRestart(); return; }
    if (state.phase !== 'board') return;
    if (lower === 't') { e.preventDefault(); timerToggle(); return; }
    if (lower === 'c') { e.preventDefault(); openCnvDialog(); return; }
    if (/^[0-9]$/.test(key) && state.active && state.active.stage === 'judge') {
      e.preventDefault();
      toggleJudge(teamIndexForKey(key));
    }
  });

  // ------------------------------------------------------------------
  // Init
  // ------------------------------------------------------------------
  // Đo chiều cao topbar + thanh CNV để thanh dính và cuộn tới câu hỏi không bị che
  function updateStickyOffsets() {
    const topbar = document.querySelector('.topbar');
    const panel = $('cnv-panel');
    const tb = topbar ? topbar.offsetHeight : 69;
    const sticky = panel && getComputedStyle(panel).position === 'sticky';
    const offset = tb + 10 + (sticky ? panel.offsetHeight + 14 : 0);
    document.documentElement.style.setProperty('--topbar-h', tb + 'px');
    document.documentElement.style.setProperty('--sticky-offset', offset + 'px');
  }
  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(updateStickyOffsets);
    ro.observe(document.querySelector('.topbar'));
    ro.observe($('cnv-panel'));
  }
  window.addEventListener('resize', updateStickyOffsets);

  renderStatic();
  preloadImages();
  timerReset();
  render();
  updateStickyOffsets();
})();
