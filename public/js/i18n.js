// Client-side translations (vi / en / fr), shared by the player and host pages.
// Static text is marked with data-i18n / data-i18n-placeholder / data-i18n-aria-label;
// page scripts call t() for dynamic text and re-render on the 'langchange' event.

const LANGS = { vi: 'Tiếng Việt', en: 'English', fr: 'Français' };
const LOCALES = { vi: 'vi-VN', en: 'en-GB', fr: 'fr-FR' };

// A value is either a string with {placeholders} or a function of the params (for plurals).
const STRINGS = {
  vi: {
    'lang.label': 'Ngôn ngữ',

    'player.title': 'Ask & Answer – Người chơi',
    'player.subtitle': 'Trả lời nhanh nhất để giành chiến thắng!',
    'player.roomCode': 'Mã phòng',
    'player.roomCodePh': 'VD: AB3KD',
    'player.name': 'Họ tên',
    'player.namePh': 'Tên của bạn',
    'player.join': 'VÀO PHÒNG',
    'player.room': 'Phòng:',
    'player.you': 'Bạn:',
    'player.answerPh': 'Nhập câu trả lời... (Shift+Enter để xuống dòng)',
    'player.submit': 'GỬI CÂU TRẢ LỜI',
    'player.status.waiting': 'Đang chờ Host mở câu hỏi...',
    'player.status.open': 'Câu hỏi đã mở – Trả lời ngay!',
    'player.status.locked': 'Đã khóa – hết thời gian trả lời.',
    'player.status.sent': 'Đã gửi thành công! Thời gian: {time} giây',
    'player.status.sentMore': 'Đã gửi {count} lần (lần gần nhất: {time} giây) – bạn có thể gửi tiếp.',
    'player.roomClosed': 'Phòng đã đóng.',

    'host.title': 'Ask & Answer – Host',
    'host.subtitle': 'Tạo phòng, mở câu hỏi và xem câu trả lời theo thời gian thực.',
    'host.create': 'TẠO PHÒNG',
    'host.roomCode': 'Mã phòng',
    'host.newRoom': 'Tạo phòng mới',
    'host.confirmNewRoom': 'Tạo phòng mới? Người chơi sẽ phải nhập mã mới.',
    'host.status.idle': 'Chưa mở câu hỏi',
    'host.status.open': 'Đang nhận câu trả lời...',
    'host.status.locked': 'Đã khóa',
    'host.start': 'MỞ CÂU HỎI',
    'host.reopen': 'MỞ LẠI',
    'host.lock': 'KHÓA / DỪNG',
    'host.reset': 'XÓA LƯỢT',
    'host.allowMultiple': 'Cho phép người chơi trả lời nhiều lần trong một câu',
    'host.playersOnline': 'Người chơi đang online',
    'host.playerCount': '{n} người',
    'host.noPlayers': 'Chưa có ai vào phòng.',
    'host.answers': 'Câu trả lời',
    'host.answerCount': ({ people, total }) => `${people} người đã trả lời` + (total > people ? ` · ${total} lượt` : ''),
    'host.noAnswers': 'Chưa có câu trả lời nào.',
    'host.attempt': ' (lần {n})',
    'host.joinedAt': 'Thời điểm vào phòng',
    'host.answeredTimes': 'Đã trả lời {n} lần',

    'err.roomGone': 'Phòng không còn tồn tại.',
    'err.roomNotFound': 'Mã phòng không tồn tại.',
    'err.nameRequired': 'Vui lòng nhập tên.',
    'err.nameTaken': 'Tên này đã có người dùng trong phòng.',
    'err.notJoined': 'Bạn chưa vào phòng.',
    'err.notOpen': 'Câu hỏi chưa mở hoặc đã bị khóa.',
    'err.emptyAnswer': 'Câu trả lời không được để trống.',
    'err.alreadyAnswered': 'Bạn đã gửi câu trả lời rồi.',
    'err.tooManyAnswers': 'Tối đa {max} lần trả lời mỗi câu.',
  },

  en: {
    'lang.label': 'Language',

    'player.title': 'Ask & Answer – Player',
    'player.subtitle': 'Answer fastest to win!',
    'player.roomCode': 'Room code',
    'player.roomCodePh': 'e.g. AB3KD',
    'player.name': 'Your name',
    'player.namePh': 'Enter your name',
    'player.join': 'JOIN ROOM',
    'player.room': 'Room:',
    'player.you': 'You:',
    'player.answerPh': 'Type your answer... (Shift+Enter for a new line)',
    'player.submit': 'SUBMIT ANSWER',
    'player.status.waiting': 'Waiting for the host to open a question...',
    'player.status.open': 'The question is open – answer now!',
    'player.status.locked': 'Locked – time is up.',
    'player.status.sent': 'Sent! Time: {time} s',
    'player.status.sentMore': ({ count, time }) =>
      `Sent ${count === 1 ? 'once' : `${count} times`} (latest: ${time} s) – you can send more.`,
    'player.roomClosed': 'The room has been closed.',

    'host.title': 'Ask & Answer – Host',
    'host.subtitle': 'Create a room, open questions and watch answers arrive in real time.',
    'host.create': 'CREATE ROOM',
    'host.roomCode': 'Room code',
    'host.newRoom': 'New room',
    'host.confirmNewRoom': 'Create a new room? Players will need to enter the new code.',
    'host.status.idle': 'No question open',
    'host.status.open': 'Accepting answers...',
    'host.status.locked': 'Locked',
    'host.start': 'OPEN QUESTION',
    'host.reopen': 'REOPEN',
    'host.lock': 'LOCK / PAUSE',
    'host.reset': 'CLEAR ROUND',
    'host.allowMultiple': 'Allow players to answer more than once per question',
    'host.playersOnline': 'Players online',
    'host.playerCount': ({ n }) => `${n} ${n === 1 ? 'player' : 'players'}`,
    'host.noPlayers': 'No one has joined yet.',
    'host.answers': 'Answers',
    'host.answerCount': ({ people, total }) => `${people} answered` + (total > people ? ` · ${total} answers` : ''),
    'host.noAnswers': 'No answers yet.',
    'host.attempt': ' (attempt {n})',
    'host.joinedAt': 'Joined at',
    'host.answeredTimes': ({ n }) => `Answered ${n === 1 ? 'once' : `${n} times`}`,

    'err.roomGone': 'This room no longer exists.',
    'err.roomNotFound': 'Room code not found.',
    'err.nameRequired': 'Please enter your name.',
    'err.nameTaken': 'This name is already taken in this room.',
    'err.notJoined': "You haven't joined a room.",
    'err.notOpen': 'The question is not open or has been locked.',
    'err.emptyAnswer': 'Your answer cannot be empty.',
    'err.alreadyAnswered': 'You have already answered.',
    'err.tooManyAnswers': 'At most {max} answers per question.',
  },

  fr: {
    'lang.label': 'Langue',

    'player.title': 'Ask & Answer – Joueur',
    'player.subtitle': 'Répondez le plus vite pour gagner !',
    'player.roomCode': 'Code de la salle',
    'player.roomCodePh': 'ex. : AB3KD',
    'player.name': 'Votre nom',
    'player.namePh': 'Entrez votre nom',
    'player.join': 'REJOINDRE',
    'player.room': 'Salle :',
    'player.you': 'Vous :',
    'player.answerPh': 'Tapez votre réponse... (Maj+Entrée pour aller à la ligne)',
    'player.submit': 'ENVOYER LA RÉPONSE',
    'player.status.waiting': "En attente que l'hôte ouvre une question...",
    'player.status.open': 'La question est ouverte – répondez vite !',
    'player.status.locked': 'Verrouillé – le temps est écoulé.',
    'player.status.sent': 'Envoyé ! Temps : {time} s',
    'player.status.sentMore': "Envoyé {count} fois (dernier : {time} s) – vous pouvez en envoyer d'autres.",
    'player.roomClosed': 'La salle a été fermée.',

    'host.title': 'Ask & Answer – Hôte',
    'host.subtitle': 'Créez une salle, ouvrez des questions et suivez les réponses en temps réel.',
    'host.create': 'CRÉER UNE SALLE',
    'host.roomCode': 'Code de la salle',
    'host.newRoom': 'Nouvelle salle',
    'host.confirmNewRoom': 'Créer une nouvelle salle ? Les joueurs devront saisir le nouveau code.',
    'host.status.idle': 'Aucune question ouverte',
    'host.status.open': 'Réception des réponses...',
    'host.status.locked': 'Verrouillé',
    'host.start': 'OUVRIR LA QUESTION',
    'host.reopen': 'ROUVRIR',
    'host.lock': 'VERROUILLER / PAUSE',
    'host.reset': 'EFFACER LE TOUR',
    'host.allowMultiple': 'Autoriser plusieurs réponses par joueur et par question',
    'host.playersOnline': 'Joueurs en ligne',
    'host.playerCount': ({ n }) => `${n} ${n > 1 ? 'joueurs' : 'joueur'}`,
    'host.noPlayers': "Personne n'a encore rejoint la salle.",
    'host.answers': 'Réponses',
    'host.answerCount': ({ people, total }) =>
      `${people} ${people > 1 ? 'ont répondu' : 'a répondu'}` + (total > people ? ` · ${total} réponses` : ''),
    'host.noAnswers': 'Aucune réponse pour le moment.',
    'host.attempt': ' (essai {n})',
    'host.joinedAt': "Heure d'arrivée",
    'host.answeredTimes': 'A répondu {n} fois',

    'err.roomGone': "Cette salle n'existe plus.",
    'err.roomNotFound': 'Code de salle introuvable.',
    'err.nameRequired': 'Veuillez saisir votre nom.',
    'err.nameTaken': 'Ce nom est déjà utilisé dans cette salle.',
    'err.notJoined': "Vous n'avez pas rejoint de salle.",
    'err.notOpen': "La question n'est pas ouverte ou a été verrouillée.",
    'err.emptyAnswer': 'La réponse ne peut pas être vide.',
    'err.alreadyAnswered': 'Vous avez déjà répondu.',
    'err.tooManyAnswers': '{max} réponses maximum par question.',
  },
};

// Saved choice, else the browser language if supported, else Vietnamese.
function pickLang() {
  let saved = null;
  try { saved = localStorage.getItem('aa-lang'); } catch {}
  if (saved && saved in LANGS) return saved;
  const browser = (navigator.language || '').slice(0, 2).toLowerCase();
  return browser in LANGS ? browser : 'vi';
}

let lang = pickLang();

function currentLocale() {
  return LOCALES[lang];
}

function t(key, params = {}) {
  const value = STRINGS[lang][key] ?? STRINGS.vi[key];
  if (value === undefined) return key;
  if (typeof value === 'function') return value(params);
  return value.replace(/\{(\w+)\}/g, (m, k) => (k in params ? params[k] : m));
}

// Set an element's text from a key and remember it, so switching language re-translates it.
// A falsy key clears the element.
function setI18nText(el, key, params) {
  if (!key) {
    delete el.dataset.i18n;
    delete el.dataset.i18nArgs;
    el.textContent = '';
    return;
  }
  el.dataset.i18n = key;
  if (params) el.dataset.i18nArgs = JSON.stringify(params);
  else delete el.dataset.i18nArgs;
  el.textContent = t(key, params);
}

// The server replies with error codes ({ error: 'nameTaken', ...params }); unknown ones are shown as-is.
function showError(el, res) {
  const key = `err.${res.error}`;
  if (key in STRINGS.vi) setI18nText(el, key, res);
  else {
    setI18nText(el, null);
    el.textContent = res.error;
  }
}

function applyI18n() {
  document.documentElement.lang = lang;
  for (const el of document.querySelectorAll('[data-i18n]')) {
    el.textContent = t(el.dataset.i18n, el.dataset.i18nArgs ? JSON.parse(el.dataset.i18nArgs) : undefined);
  }
  for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of document.querySelectorAll('[data-i18n-aria-label]')) {
    el.setAttribute('aria-label', t(el.dataset.i18nAriaLabel));
  }
}

function setLang(next) {
  if (!(next in LANGS)) return;
  lang = next;
  try { localStorage.setItem('aa-lang', lang); } catch {}
  applyI18n();
  document.dispatchEvent(new Event('langchange'));
}

// Fill the language picker and translate the page right away (this script loads at the end of <body>).
const langSelect = document.getElementById('langSelect');
if (langSelect) {
  langSelect.replaceChildren(...Object.entries(LANGS).map(([code, label]) => new Option(label, code)));
  langSelect.value = lang;
  langSelect.addEventListener('change', () => setLang(langSelect.value));
}
applyI18n();
