// Host client: create a room, control rounds, and watch answers arrive live.
const socket = io();

const $ = (id) => document.getElementById(id);
const createScreen = $('createScreen');
const roomScreen = $('roomScreen');
const statusEl = $('status');
const timerEl = $('timer');
const startBtn = $('startBtn');
const lockBtn = $('lockBtn');
const resetBtn = $('resetBtn');
const feed = $('feed');

let roomCode = sessionStorage.getItem('aa-host-room');
let answers = [];
let roundStatus = 'idle';
let timerStart = null;   // local performance.now() matching the server's startTime
let rafId = null;

// ---------------------------------------------------------------- rendering

function renderStatus() {
  const labels = { idle: 'Chưa mở câu hỏi', open: 'Đang nhận câu trả lời...', locked: 'Đã khóa' };
  statusEl.className = `status ${roundStatus === 'idle' ? '' : roundStatus}`;
  statusEl.textContent = labels[roundStatus];
  lockBtn.disabled = roundStatus !== 'open';
}

function answerRow(a, index) {
  const li = document.createElement('li');
  // textContent (not innerHTML) so player input can never inject HTML.
  const cells = [
    ['rank', `#${index + 1}`],
    ['name', a.name],
    ['answer', a.text],
    ['time', `${a.responseTime.toFixed(2)}s`],
  ];
  for (const [cls, text] of cells) {
    const span = document.createElement('span');
    span.className = cls;
    span.textContent = text;
    li.appendChild(span);
  }
  return li;
}

function renderFeed() {
  answers.sort((a, b) => a.responseTime - b.responseTime); // fastest on top
  feed.replaceChildren(...answers.map(answerRow));
  $('answerCount').textContent = answers.length;
  $('emptyFeed').classList.toggle('hidden', answers.length > 0);
}

function renderPlayers(players) {
  $('playerCount').textContent = players.length;
  $('playerNames').textContent = players.length ? players.join(', ') : '—';
}

// The timer runs locally; the server's `elapsed` keeps it in sync after a reload.
function tick() {
  timerEl.textContent = `${((performance.now() - timerStart) / 1000).toFixed(2)}s`;
  rafId = requestAnimationFrame(tick);
}

function syncTimer(state) {
  cancelAnimationFrame(rafId);
  if (state.status === 'open') {
    timerStart = performance.now() - state.elapsed * 1000;
    tick();
  } else {
    timerEl.textContent = `${(state.status === 'locked' ? state.elapsed : 0).toFixed(2)}s`;
  }
}

function showRoom(code) {
  roomCode = code;
  sessionStorage.setItem('aa-host-room', code);
  $('roomCode').textContent = code;
  createScreen.classList.add('hidden');
  roomScreen.classList.remove('hidden');
}

function showCreate(error = '') {
  roomCode = null;
  sessionStorage.removeItem('aa-host-room');
  $('hostError').textContent = error;
  roomScreen.classList.add('hidden');
  createScreen.classList.remove('hidden');
}

// ------------------------------------------------------------- user actions

function createRoom() {
  // host:create — server generates a unique room code.
  socket.emit('host:create', (res) => showRoom(res.code));
}

$('createBtn').addEventListener('click', createRoom);
$('newRoomBtn').addEventListener('click', () => {
  if (confirm('Tạo phòng mới? Người chơi sẽ phải nhập mã mới.')) createRoom();
});
startBtn.addEventListener('click', () => socket.emit('host:start'));
lockBtn.addEventListener('click', () => socket.emit('host:lock'));
resetBtn.addEventListener('click', () => socket.emit('host:reset'));

// ------------------------------------------------------------ server events

// host:snapshot — full room state (after create, rejoin, start, lock, reset).
socket.on('host:snapshot', (snap) => {
  roundStatus = snap.status;
  answers = snap.answers;
  renderStatus();
  renderFeed();
  renderPlayers(snap.players);
  syncTimer(snap);
});

// host:answer — a single new answer, pushed the moment a player submits.
socket.on('host:answer', (answer) => {
  answers.push(answer);
  renderFeed();
});

// host:players — someone joined or left.
socket.on('host:players', renderPlayers);

// On (re)connect, reclaim our room if we already had one (survives page reloads).
socket.on('connect', () => {
  if (!roomCode) return;
  socket.emit('host:rejoin', { code: roomCode }, (res) => {
    if (res.ok) showRoom(res.code);
    else showCreate(res.error);
  });
});
