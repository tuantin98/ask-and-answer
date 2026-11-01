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
let players = [];        // [{ name, joinedAt }] of connected players
let knownPlayers = new Set(); // names already rendered, so only newcomers animate
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
  if (a.attempt > 1) {
    const attempt = document.createElement('span');
    attempt.className = 'attempt';
    attempt.textContent = ` (lần ${a.attempt})`;
    li.querySelector('.name').appendChild(attempt);
  }
  return li;
}

// Number of answers per lowercased name in the current round.
function answerCounts() {
  const counts = new Map();
  for (const a of answers) counts.set(a.name.toLowerCase(), (counts.get(a.name.toLowerCase()) || 0) + 1);
  return counts;
}

function renderFeed() {
  answers.sort((a, b) => a.responseTime - b.responseTime); // fastest on top
  feed.replaceChildren(...answers.map(answerRow));
  const people = answerCounts().size;
  $('answerCount').textContent =
    `${people} người đã trả lời` + (answers.length > people ? ` · ${answers.length} lượt` : '');
  $('emptyFeed').classList.toggle('hidden', answers.length > 0);
  renderPlayers();
}

function playerChip(p, counts) {
  const li = document.createElement('li');
  const count = counts.get(p.name.toLowerCase()) || 0;
  if (!knownPlayers.has(p.name)) li.classList.add('new');
  if (count) li.classList.add('answered');

  const name = document.createElement('span');
  name.textContent = p.name;
  const since = document.createElement('span');
  since.className = 'since';
  since.textContent = new Date(p.joinedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  since.title = 'Thời điểm vào phòng';
  li.append(name, since);

  if (count) {
    const badge = document.createElement('span');
    badge.className = 'badge';
    badge.textContent = count > 1 ? `✓ ${count}` : '✓';
    badge.title = `Đã trả lời ${count} lần`;
    li.appendChild(badge);
  }
  return li;
}

function renderPlayers() {
  const counts = answerCounts();
  $('playerList').replaceChildren(...players.map((p) => playerChip(p, counts)));
  knownPlayers = new Set(players.map((p) => p.name));
  $('playerCount').textContent = players.length;
  $('emptyPlayers').classList.toggle('hidden', players.length > 0);
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
$('multiToggle').addEventListener('change', (e) => {
  socket.emit('host:settings', { allowMultiple: e.target.checked });
});

// ------------------------------------------------------------ server events

// host:snapshot — full room state (after create, rejoin, start, lock, reset).
socket.on('host:snapshot', (snap) => {
  roundStatus = snap.status;
  answers = snap.answers;
  players = snap.players;
  $('multiToggle').checked = snap.allowMultiple;
  renderStatus();
  renderFeed(); // also re-renders the player list
  syncTimer(snap);
});

// host:answer — a single new answer, pushed the moment a player submits.
socket.on('host:answer', (answer) => {
  answers.push(answer);
  renderFeed();
});

// host:players — someone joined or left.
socket.on('host:players', (list) => {
  players = list;
  renderPlayers();
});

// On (re)connect, reclaim our room if we already had one (survives page reloads).
socket.on('connect', () => {
  if (!roomCode) return;
  socket.emit('host:rejoin', { code: roomCode }, (res) => {
    if (res.ok) showRoom(res.code);
    else showCreate(res.error);
  });
});
