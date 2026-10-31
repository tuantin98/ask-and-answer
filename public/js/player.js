// Player client: join a room, wait for the host to open a round, submit one answer.
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

let session = null;        // { code, name } once joined
let roundStatus = 'idle';  // mirrors the server: idle | open | locked
let roundId = 0;           // changes whenever the host opens a new question
let submitted = null;      // { responseTime } after a successful submit this round

// Prefill the room code from ?room=XXXXX (handy for sharing a link).
const urlRoom = new URLSearchParams(location.search).get('room');
if (urlRoom) roomCodeInput.value = urlRoom.toUpperCase();

function render() {
  const canAnswer = roundStatus === 'open' && !submitted;
  answerInput.disabled = !canAnswer;
  submitBtn.disabled = !canAnswer;

  statusEl.className = 'status';
  if (submitted) {
    statusEl.classList.add('sent');
    statusEl.textContent = `Đã gửi thành công! Thời gian: ${submitted.responseTime.toFixed(2)} giây`;
  } else if (roundStatus === 'open') {
    statusEl.classList.add('open');
    statusEl.textContent = 'Câu hỏi đã mở – Trả lời ngay!';
  } else if (roundStatus === 'locked') {
    statusEl.classList.add('locked');
    statusEl.textContent = 'Đã khóa – hết thời gian trả lời.';
  } else {
    statusEl.textContent = 'Đang chờ Host mở câu hỏi...';
  }
  if (canAnswer) answerInput.focus();
}

function join(code, name) {
  // player:join — ask the server to add us to the room.
  socket.emit('player:join', { code, name }, (res) => {
    if (!res.ok) {
      joinError.textContent = res.error;
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
    submitted = res.alreadyAnswered ? { responseTime: res.alreadyAnswered.responseTime } : null;

    $('roomLabel').textContent = session.code;
    $('nameLabel').textContent = session.name;
    joinError.textContent = '';
    joinScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');
    render();
  });
}

joinForm.addEventListener('submit', (e) => {
  e.preventDefault();
  join(roomCodeInput.value.trim().toUpperCase(), nameInput.value.trim());
});

answerForm.addEventListener('submit', (e) => {
  e.preventDefault(); // also handles the Enter key
  const text = answerInput.value.trim();
  if (!text || submitBtn.disabled) return;

  answerInput.disabled = true; // lock immediately to prevent double-submits
  submitBtn.disabled = true;
  answerError.textContent = '';

  // player:answer — send the text; the server replies with our response time.
  socket.emit('player:answer', { text }, (res) => {
    if (res.ok) {
      submitted = { responseTime: res.responseTime };
      answerInput.value = '';
    } else {
      answerError.textContent = res.error;
    }
    render();
  });
});

// round:state — host opened, locked or reset the round.
socket.on('round:state', (state) => {
  if (state.roundId !== roundId) {
    // A new round started: forget the previous answer.
    submitted = null;
    answerInput.value = '';
    answerError.textContent = '';
  }
  if (state.status === 'idle') submitted = null;
  roundId = state.roundId;
  roundStatus = state.status;
  render();
});

// room:closed — the host left and the room expired.
socket.on('room:closed', () => {
  sessionStorage.removeItem('aa-player');
  session = null;
  joinError.textContent = 'Phòng đã đóng.';
  joinScreen.classList.remove('hidden');
  gameScreen.classList.add('hidden');
});

// On (re)connect, automatically rejoin the last room (survives reloads and network blips).
socket.on('connect', () => {
  const saved = session || JSON.parse(sessionStorage.getItem('aa-player') || 'null');
  if (saved) join(saved.code, saved.name);
});
