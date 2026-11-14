// Player client: join a room, wait for the host to open a round, submit an answer
// (or several, if the host allows multiple answers).
const socket = io();

const $ = (id) => document.getElementById(id);
const joinScreen = $('joinScreen');
const gameScreen = $('gameScreen');
const joinForm = $('joinForm');
const roomCodeInput = $('roomCodeInput');
const nameInput = $('nameInput');
const joinError = $('joinError');
const statusEl = $('status');
const answerForm = $('answerForm');
const answerInput = $('answerInput');
const submitBtn = $('submitBtn');
const answerError = $('answerError');
const charCount = $('charCount');

let session = null;        // { code, name } once joined
let roundStatus = 'idle';  // mirrors the server: idle | open | locked
let roundId = 0;           // changes whenever the host opens a new question
let allowMultiple = false; // host setting: can we keep answering after the first submit?
let submitted = null;      // { count, responseTime of the latest } after a successful submit this round

// Prefill the room code from ?room=XXXXX (handy for sharing a link).
const urlRoom = new URLSearchParams(location.search).get('room');
if (urlRoom) roomCodeInput.value = urlRoom.toUpperCase();

function render(focus = true) {
  const canAnswer = roundStatus === 'open' && (!submitted || allowMultiple);
  answerInput.disabled = !canAnswer;
  submitBtn.disabled = !canAnswer;

  statusEl.className = 'status';
  if (submitted) {
    statusEl.classList.add('sent');
    const params = { count: submitted.count, time: submitted.responseTime.toFixed(2) };
    statusEl.textContent = t(canAnswer ? 'player.status.sentMore' : 'player.status.sent', params);
  } else if (roundStatus === 'open') {
    statusEl.classList.add('open');
    statusEl.textContent = t('player.status.open');
  } else if (roundStatus === 'locked') {
    statusEl.classList.add('locked');
    statusEl.textContent = t('player.status.locked');
  } else {
    statusEl.textContent = t('player.status.waiting');
  }
  if (canAnswer && focus) answerInput.focus();
}

function join(code, name) {
  // player:join — ask the server to add us to the room.
  socket.emit('player:join', { code, name }, (res) => {
    if (!res.ok) {
      showError(joinError, res);
      session = null;
      sessionStorage.removeItem('aa-player');
      joinScreen.classList.remove('hidden');
      gameScreen.classList.add('hidden');
      return;
    }
    session = { code: res.state.code, name: res.name };
    sessionStorage.setItem('aa-player', JSON.stringify(session));
    roundStatus = res.state.status;
    roundId = res.state.roundId;
    allowMultiple = res.state.allowMultiple;
    submitted = res.myAnswers;

    $('roomLabel').textContent = session.code;
    $('nameLabel').textContent = session.name;
    setI18nText(joinError, null);
    joinScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    render();
  });
}

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  join(roomCodeInput.value.trim().toUpperCase(), nameInput.value.trim());
});

// Grow the textarea with its content and show how many characters are left.
function syncAnswerBox() {
  answerInput.style.height = 'auto';
  answerInput.style.height = `${answerInput.scrollHeight + 4}px`; // +4 for the 2px borders
  const len = answerInput.value.length;
  charCount.textContent = `${len}/${answerInput.maxLength}`;
  charCount.classList.toggle('near-limit', len >= answerInput.maxLength * 0.9);
}

function clearAnswerBox() {
  answerInput.value = '';
  syncAnswerBox();
}

answerInput.addEventListener('input', syncAnswerBox);

// Enter sends, Shift+Enter adds a new line (ignored while an IME is composing, e.g. Vietnamese Telex).
answerInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
    e.preventDefault();
    answerForm.requestSubmit();
  }
});

answerForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = answerInput.value.trim();
  if (!text || submitBtn.disabled) return;

  answerInput.disabled = true; // lock immediately to prevent double-submits
  submitBtn.disabled = true;
  setI18nText(answerError, null);

  // player:answer — send the text; the server replies with our response time.
  socket.emit('player:answer', { text }, (res) => {
    if (res.ok) {
      submitted = { count: res.count, responseTime: res.responseTime };
      clearAnswerBox();
    } else {
      showError(answerError, res);
    }
    render();
  });
});

// round:state — host opened, locked or reset the round.
socket.on('round:state', (state) => {
  if (state.roundId !== roundId) {
    // A new round started: forget the previous answer.
    submitted = null;
    clearAnswerBox();
    setI18nText(answerError, null);
  }
  if (state.status === 'idle') submitted = null;
  roundId = state.roundId;
  roundStatus = state.status;
  allowMultiple = state.allowMultiple;
  render();
});

// room:closed — the host left and the room expired.
socket.on('room:closed', () => {
  sessionStorage.removeItem('aa-player');
  session = null;
  setI18nText(joinError, 'player.roomClosed');
  joinScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
});

// langchange — static text is already re-translated by i18n.js; redo the status line
// without pulling focus away from the language picker.
document.addEventListener('langchange', () => {
  if (session) render(false);
});

// On (re)connect, automatically rejoin the last room (survives reloads and network blips).
socket.on('connect', () => {
  const saved = session || JSON.parse(sessionStorage.getItem('aa-player') || 'null');
  if (saved) join(saved.code, saved.name);
});
