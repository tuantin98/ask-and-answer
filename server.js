/**
 * Real-time Q&A server: Express serves static pages, Socket.io handles game events.
 * All room data lives in memory (lost when the server restarts).
 */
const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');

const PORT = process.env.PORT || 3000;
const MAX_ANSWER_LENGTH = 200;
const MAX_NAME_LENGTH = 30;
const ROOM_TTL_MS = 10 * 60 * 1000; // delete a room 10 minutes after its host disconnects
const MAX_ANSWERS_PER_ROUND = 20; // per-player cap when multiple answers are allowed

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.get('/host', (req, res) => res.sendFile(path.join(__dirname, 'public', 'host.html')));

/**
 * rooms[code] = {
 *   code, hostSocketId, cleanupTimer,
 *   status: 'idle' | 'open' | 'locked',
 *   startTime: number | null,            // Date.now() when the round was opened
 *   roundId: number,                     // increments on every "start" so clients can detect a new round
 *   allowMultiple: boolean,              // host setting: may a player answer more than once per round?
 *   players: Map<socketId, { name, joinedAt }>,
 *   answers: [{ name, text, responseTime, attempt }],
 *   answerCounts: Map<lowercased name, number>  // answers per player this round
 * }
 */
const rooms = {};

// Room codes avoid look-alike characters (0/O, 1/I).
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms[code]);
  return code;
}

function publicState(room) {
  // `elapsed` lets clients run a local timer without relying on synced clocks.
  const elapsed = room.startTime ? (Date.now() - room.startTime) / 1000 : 0;
  return { code: room.code, status: room.status, roundId: room.roundId, allowMultiple: room.allowMultiple, elapsed };
}

// Connected players in join order: [{ name, joinedAt }].
function playerList(room) {
  return [...room.players.values()];
}

// A player's answers this round: { count, responseTime of the latest } or null.
function myAnswers(room, name) {
  const mine = room.answers.filter((a) => a.name.toLowerCase() === name.toLowerCase());
  return mine.length ? { count: mine.length, responseTime: mine[mine.length - 1].responseTime } : null;
}

// Send the full room snapshot to the host (used on create/rejoin/reset).
function emitHostSnapshot(room) {
  if (!room.hostSocketId) return;
  io.to(room.hostSocketId).emit('host:snapshot', {
    ...publicState(room),
    players: playerList(room),
    answers: room.answers,
  });
}

function broadcastRoundState(room) {
  // Every player in the room learns whether the input should be open or locked.
  io.to(room.code).emit('round:state', publicState(room));
}

function clean(str, maxLen) {
  return String(str ?? '').trim().slice(0, maxLen);
}

io.on('connection', (socket) => {
  // ---------------------------------------------------------------- HOST EVENTS

  // host:create — create a new room; this socket becomes its host.
  socket.on('host:create', (ack) => {
    const code = generateRoomCode();
    rooms[code] = {
      code,
      hostSocketId: socket.id,
      cleanupTimer: null,
      status: 'idle',
      startTime: null,
      roundId: 0,
      allowMultiple: false,
      players: new Map(),
      answers: [],
      answerCounts: new Map(),
    };
    socket.data.hostOf = code;
    ack?.({ ok: true, code });
    emitHostSnapshot(rooms[code]);
  });

  // host:rejoin — host page reloaded / reconnected; reclaim an existing room.
  socket.on('host:rejoin', ({ code } = {}, ack) => {
    const room = rooms[clean(code, 10).toUpperCase()];
    if (!room) return ack?.({ ok: false, error: 'Phòng không còn tồn tại.' });
    clearTimeout(room.cleanupTimer);
    room.cleanupTimer = null;
    room.hostSocketId = socket.id;
    socket.data.hostOf = room.code;
    ack?.({ ok: true, code: room.code });
    emitHostSnapshot(room);
  });

  // Resolve the room this socket hosts (ignores requests from non-hosts).
  const hostedRoom = () => {
    const room = rooms[socket.data.hostOf];
    return room && room.hostSocketId === socket.id ? room : null;
  };

  // host:start — open a new round: record startTime, clear old answers, unlock players.
  socket.on('host:start', () => {
    const room = hostedRoom();
    if (!room) return;
    room.status = 'open';
    room.startTime = Date.now();
    room.roundId += 1;
    room.answers = [];
    room.answerCounts.clear();
    broadcastRoundState(room);
    emitHostSnapshot(room);
  });

  // host:lock — stop accepting answers for the current round.
  socket.on('host:lock', () => {
    const room = hostedRoom();
    if (!room || room.status !== 'open') return;
    room.status = 'locked';
    broadcastRoundState(room);
    emitHostSnapshot(room);
  });

  // host:settings — change room options (currently only "allow multiple answers").
  socket.on('host:settings', ({ allowMultiple } = {}) => {
    const room = hostedRoom();
    if (!room) return;
    room.allowMultiple = Boolean(allowMultiple);
    broadcastRoundState(room);
    emitHostSnapshot(room);
  });

  // host:reset — clear answers and go back to "waiting" for the next question.
  socket.on('host:reset', () => {
    const room = hostedRoom();
    if (!room) return;
    room.status = 'idle';
    room.startTime = null;
    room.answers = [];
    room.answerCounts.clear();
    broadcastRoundState(room);
    emitHostSnapshot(room);
  });

  // -------------------------------------------------------------- PLAYER EVENTS

  // player:join — enter a room with a nickname.
  socket.on('player:join', ({ code, name } = {}, ack) => {
    const room = rooms[clean(code, 10).toUpperCase()];
    name = clean(name, MAX_NAME_LENGTH);
    if (!room) return ack?.({ ok: false, error: 'Mã phòng không tồn tại.' });
    if (!name) return ack?.({ ok: false, error: 'Vui lòng nhập tên.' });

    const taken = [...room.players.entries()].some(
      ([id, p]) => id !== socket.id && p.name.toLowerCase() === name.toLowerCase()
    );
    if (taken) return ack?.({ ok: false, error: 'Tên này đã có người dùng trong phòng.' });

    socket.join(room.code);
    socket.data.playerOf = room.code;
    socket.data.name = name;
    room.players.set(socket.id, { name, joinedAt: room.players.get(socket.id)?.joinedAt ?? Date.now() });

    ack?.({
      ok: true,
      name,
      state: publicState(room),
      // Lets a reconnecting player keep their "already answered" status.
      myAnswers: myAnswers(room, name),
    });
    if (room.hostSocketId) io.to(room.hostSocketId).emit('host:players', playerList(room));
  });

  // player:answer — submit a text answer; the server computes the response time.
  socket.on('player:answer', ({ text } = {}, ack) => {
    const receivedAt = Date.now(); // capture first, before any other work
    const room = rooms[socket.data.playerOf];
    const name = socket.data.name;
    if (!room || !name) return ack?.({ ok: false, error: 'Bạn chưa vào phòng.' });
    if (room.status !== 'open') return ack?.({ ok: false, error: 'Câu hỏi chưa mở hoặc đã bị khóa.' });

    text = clean(text, MAX_ANSWER_LENGTH);
    if (!text) return ack?.({ ok: false, error: 'Câu trả lời không được để trống.' });

    const key = name.toLowerCase();
    const count = room.answerCounts.get(key) || 0;
    if (count && !room.allowMultiple) return ack?.({ ok: false, error: 'Bạn đã gửi câu trả lời rồi.' });
    if (count >= MAX_ANSWERS_PER_ROUND) {
      return ack?.({ ok: false, error: `Tối đa ${MAX_ANSWERS_PER_ROUND} lần trả lời mỗi câu.` });
    }

    const answer = { name, text, responseTime: (receivedAt - room.startTime) / 1000, attempt: count + 1 };
    room.answerCounts.set(key, answer.attempt);
    room.answers.push(answer); // arrival order == time order, so the list stays sorted

    ack?.({ ok: true, responseTime: answer.responseTime, count: answer.attempt });
    // Push the new answer to the host immediately.
    if (room.hostSocketId) io.to(room.hostSocketId).emit('host:answer', answer);
  });

  // ----------------------------------------------------------------- DISCONNECT

  socket.on('disconnect', () => {
    const playerRoom = rooms[socket.data.playerOf];
    if (playerRoom && playerRoom.players.delete(socket.id) && playerRoom.hostSocketId) {
      io.to(playerRoom.hostSocketId).emit('host:players', playerList(playerRoom));
    }

    const hostRoom = rooms[socket.data.hostOf];
    if (hostRoom && hostRoom.hostSocketId === socket.id) {
      // Keep the room for a while so the host can reload the page and rejoin.
      hostRoom.hostSocketId = null;
      hostRoom.cleanupTimer = setTimeout(() => {
        io.to(hostRoom.code).emit('room:closed');
        delete rooms[hostRoom.code];
      }, ROOM_TTL_MS);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Player: http://localhost:${PORT}/`);
  console.log(`Host:   http://localhost:${PORT}/host`);
});
