/**
 * ============================================================
 * Grumpy Cat Chat — main.js
 * ============================================================
 * Vanilla JavaScript. No frameworks. No build step.
 *
 * ORGANISATION:
 *   1.  Utility helpers
 *   2.  DOM selectors
 *   3.  Eliza-Engine: Reflexions-Tabelle & Muster-Regeln
 *   4.  Eliza-Engine: Antwort-Logik (Reflexion + Keyword-Match)
 *   5.  Grumpy-Bot: Fallback-Pool
 *   6.  Grumpy-Bot: Nachrichten rendern
 *   7.  Grumpy-Bot: Gedulds-Anzeige
 *   8.  Grumpy-Bot: Chat-Logik (Eingabe, Senden, Tipp-Indikator)
 *   9.  Footer-Jahr
 *  10.  Initialisierung
 * ============================================================
 */


/* ============================================================
   1. UTILITY HELPERS
   ============================================================ */

/** Shorthand für document.querySelector */
const qs  = (sel, ctx = document) => ctx.querySelector(sel);

/** Shorthand für document.querySelectorAll */
const qsa = (sel, ctx = document) => ctx.querySelectorAll(sel);

/** Event-Listener mit Cleanup-Funktion */
const on = (target, event, handler, opts) => {
  target.addEventListener(event, handler, opts);
  return () => target.removeEventListener(event, handler, opts);
};

/** Zufälliges Element aus einem Array */
const pick = arr => arr[Math.floor(Math.random() * arr.length)];


/* ============================================================
   2. DOM SELECTORS
   Werden in init() gesetzt, sobald das DOM bereit ist.
   ============================================================ */
// (siehe init() unten)


/* ============================================================
   3. ELIZA-ENGINE: REFLEXIONS-TABELLE & MUSTER-REGELN
   ============================================================ */

/**
 * Reflexions-Tabelle: Wandelt Ich-Perspektive in Du-Perspektive um.
 * Wird genutzt, um Nutzereingaben in Rückfragen zu spiegeln.
 */
const REFLECTIONS = {
  'ich bin':        'du bist',
  'ich war':        'du warst',
  'ich fühle':      'du fühlst',
  'ich fühle mich': 'du fühlst dich',
  'ich denke':      'du denkst',
  'ich glaube':     'du glaubst',
  'ich will':       'du willst',
  'ich wollte':     'du wolltest',
  'ich habe':       'du hast',
  'ich hatte':      'du hattest',
  'ich kann':       'du kannst',
  'ich konnte':     'du konntest',
  'ich mag':        'du magst',
  'ich mochte':     'du mochtest',
  'ich brauche':    'du brauchst',
  'ich weiß':       'du weißt',
  'ich liebe':      'du liebst',
  'ich hasse':      'du hasst',
  'mein':           'dein',
  'meine':          'deine',
  'mir':            'dir',
  'mich':           'dich',
  'ich':            'du',
  'du':             'ich',
  'dein':           'mein',
  'deine':          'meine',
  'dir':            'mir',
  'dich':           'mich',
};

/**
 * Wendet die Reflexions-Tabelle auf einen Satz an.
 * Ersetzt Wörter/Phrasen von Ich → Du (und umgekehrt).
 *
 * @param {string} text - Eingabetext (Kleinbuchstaben)
 * @returns {string} Reflektierter Text
 */
function reflect(text) {
  // Längere Phrasen zuerst ersetzen (Reihenfolge wichtig)
  const keys = Object.keys(REFLECTIONS).sort((a, b) => b.length - a.length);
  let result = text;
  for (const key of keys) {
    // Wortgrenzen beachten (einfache Variante mit RegExp)
    const re = new RegExp(`\\b${key}\\b`, 'gi');
    result = result.replace(re, REFLECTIONS[key]);
  }
  return result;
}

/**
 * Eliza-Muster-Regeln.
 * Jede Regel hat:
 *   - pattern:   RegExp, die auf die Nutzereingabe (Kleinbuchstaben) passt
 *   - responses: Array von Antwort-Templates.
 *                "$1" wird durch den reflektierten Capture-Group-Text ersetzt.
 *
 * Reihenfolge: spezifischere Muster zuerst.
 */
const ELIZA_RULES = [

  // --- Begrüßungen ---
  {
    pattern: /\b(hallo|hi|hey|moin|servus|guten morgen|guten tag|nabend|grüß gott)\b/i,
    responses: [
      'Oh. Du. Schon wieder.',
      'Hallo. Ich hoffe, das wird kurz.',
      'Hi. Ich war gerade dabei, dich zu ignorieren.',
      'Moin. Oder auch nicht.',
      'Ah, Besuch. Wie… unerwünscht.',
    ],
  },

  // --- Abschied ---
  {
    pattern: /\b(tschüss|bye|ciao|auf wiedersehen|bis dann|bis bald|gute nacht|tschau)\b/i,
    responses: [
      'Endlich.',
      'Tschüss. Komm nicht wieder.',
      'Auf Wiedersehen. Oder auch nicht.',
      'Gute Nacht. Ich schlafe sowieso schon.',
      'Bye. Das war… naja.',
    ],
  },

  // --- "Ich bin …" → Reflexion + Rückfrage ---
  {
    pattern: /ich bin\s+(.+)/i,
    responses: [
      'Warum bist $1?',
      'Schon lange $1?',
      'Und was soll ich damit anfangen, dass $1?',
      'Interessant. Ich bin eine Katze. Wir haben nichts gemeinsam.',
      'Seit wann bist $1?',
    ],
  },

  // --- "Ich fühle mich …" / "Ich fühle …" ---
  {
    pattern: /ich f[uü]hle(?:\s+mich)?\s+(.+)/i,
    responses: [
      'Warum fühlst $1?',
      'Schon länger $1?',
      'Und was erwartest du von mir? Mitgefühl? Falsche Adresse.',
      'Ich fühle auch manchmal. Dann schlafe ich. Hilft.',
      'Hm. $1. Klingt anstrengend.',
    ],
  },

  // --- "Ich denke / glaube …" ---
  {
    pattern: /ich (?:denke|glaube|meine)\s+(.+)/i,
    responses: [
      'Warum denkst $1?',
      'Bist du sicher, dass $1?',
      'Ich denke auch manchmal. Dann höre ich auf. Besser so.',
      'Und wenn $1 falsch wäre?',
      'Interessante Theorie. Falsch, aber interessant.',
    ],
  },

  // --- "Ich will / brauche …" ---
  {
    pattern: /ich (?:will|möchte|brauche|wünsche mir)\s+(.+)/i,
    responses: [
      'Warum willst $1?',
      'Was würde sich ändern, wenn $1?',
      'Ich will auch Dinge. Zum Beispiel meine Ruhe.',
      'Und wenn $1 nicht klappt?',
      'Hm. $1. Viel Glück damit.',
    ],
  },

  // --- "Ich habe …" ---
  {
    pattern: /ich habe\s+(.+)/i,
    responses: [
      'Wie lange hast $1 schon?',
      'Und was machst du damit, dass $1?',
      'Schön für dich. Ich habe meine Ruhe. Hatte.',
      'Warum erzählst du mir das?',
    ],
  },

  // --- "Warum …?" ---
  {
    pattern: /warum\s+(.+)/i,
    responses: [
      'Warum fragst du mich das?',
      'Weil. Das reicht.',
      'Das Universum hat keine Antworten. Ich auch nicht.',
      'Gute Frage. Nächste Frage.',
      'Warum nicht? Auch keine Antwort? Siehst du.',
    ],
  },

  // --- "Du bist …" ---
  {
    pattern: /du bist\s+(.+)/i,
    responses: [
      'Ich bin $1? Das sagst du.',
      'Und wenn ich $1 bin — was dann?',
      'Ich bin eine Katze. Alles andere ist Interpretation.',
      'Interessante Meinung. Falsch, aber interessant.',
      'Ja, ja. Weiter.',
    ],
  },

  // --- "Du kannst …" / "Du machst …" ---
  {
    pattern: /du (?:kannst|machst|bist|hast)\s+(.+)/i,
    responses: [
      'Meinst du wirklich, dass ich $1?',
      'Und wenn ich $1 — was ändert das für dich?',
      'Ich bin eine Katze. Ich mache, was ich will.',
      'Interessante Beobachtung. Ich ignoriere sie trotzdem.',
    ],
  },

  // --- Hilfe ---
  {
    pattern: /\b(hilfe|help|was kannst du|was bist du|wer bist du)\b/i,
    responses: [
      'Ich bin eine mürrische Katze. Ich helfe nicht. Ich dulde.',
      'Ich beantworte Fragen. Ungern. Aber ich tue es.',
      'Was ich kann? Schlafen, fressen, genervt sein. Und manchmal antworten.',
      'Hilfe? Von mir? Das ist mutig.',
      'Ich bin Grumpy Cat. Ich bin hier, weil jemand dachte, das wäre eine gute Idee.',
    ],
  },

  // --- Wie geht's ---
  {
    pattern: /\b(wie geht|wie gehts|wie geht es|alles gut|alles okay)\b/i,
    responses: [
      'Ich liege. Ich schlafe. Ich werde gestört. Danke der Nachfrage.',
      'Besser, bevor du geschrieben hast.',
      'Ich existiere. Das reicht.',
      'Schlechter als vorhin. Wegen dir.',
      'Ich hatte gerade meine Ruhe. Hatte.',
    ],
  },

  // --- Witze ---
  {
    pattern: /\b(witz|joke|lustig|lachen|humor|witzig|komisch)\b/i,
    responses: [
      'Warum überquert die Katze die Straße? Um weg von dir zu kommen.',
      'Ich kenne einen Witz: Du dachtest, ich wäre nett. Ha.',
      'Witze? Mein Leben ist ein Witz. Ich lache nicht darüber.',
      'Was ist lustig? Dass du glaubst, ich mache Witze.',
      'Klopf klopf. — Wer da? — Jemand, der dich in Ruhe lassen will.',
    ],
  },

  // --- Katzen ---
  {
    pattern: /\b(katze|katzen|cat|kätzchen|mieze|miau|schnurren|pfote)\b/i,
    responses: [
      'Ja, ich bin eine Katze. Nein, ich bin nicht süß.',
      'Katzen sind perfekt. Ich bin perfekt. Wir haben nichts gemeinsam.',
      'Miau bedeutet: Lass mich in Ruhe.',
      'Ich schnurre nicht. Ich grumble.',
      'Andere Katzen mögen Streicheleinheiten. Ich nicht.',
    ],
  },

  // --- Essen / Futter ---
  {
    pattern: /\b(essen|futter|hunger|fressen|food|pizza|kaffee|trinken|thunfisch)\b/i,
    responses: [
      'Ich esse, wenn ich will. Nicht wenn du fragst.',
      'Futter? Jetzt redest du meine Sprache. Aber ich teile nicht.',
      'Kaffee? Ich brauche keinen Kaffee. Ich bin von Natur aus gereizt.',
      'Wenn du mir Thunfisch bringst, ignoriere ich dich nur halb.',
      'Essen ist das Einzige, was mich kurz weniger grumpy macht. Kurz.',
    ],
  },

  // --- Wetter ---
  {
    pattern: /\b(wetter|regen|sonne|kalt|warm|schnee|wind|gewitter)\b/i,
    responses: [
      'Wetter? Ich bin drinnen. Mir egal.',
      'Regen bedeutet: Ich bleibe im Bett. Sonne auch.',
      'Kalt draußen? Gut. Dann kommen weniger Leute.',
      'Schnee ist weiß und kalt und ich mag ihn nicht. Wie die meisten Dinge.',
      'Das Wetter ist so wie meine Laune: wechselhaft und meistens schlecht.',
    ],
  },

  // --- Danke ---
  {
    pattern: /\b(danke|dankeschön|danke schön|thx|thanks|merci)\b/i,
    responses: [
      'Bitte. Obwohl ich nicht weiß wofür.',
      'Gern geschehen. Nein, eigentlich nicht.',
      'Du bedankst dich bei einer Katze. Interessante Entscheidung.',
      'Hmm.',
      'Ich nehme das zur Kenntnis. Und ignoriere es dann.',
    ],
  },

  // --- Liebe / Freundschaft ---
  {
    pattern: /\b(liebe|lieb|mag dich|freund|freundschaft|kumpel|bff)\b/i,
    responses: [
      'Ich mag dich auch. Nein, das stimmt nicht.',
      'Liebe? Ich liebe Schlaf. Das ist alles.',
      'Freundschaft ist überschätzt. Wie die meisten Dinge.',
      'Aww. Nein.',
      'Das ist nett. Ich fühle nichts.',
    ],
  },

  // --- Komplimente ---
  {
    pattern: /\b(toll|super|klasse|großartig|wunderbar|fantastisch|cool|nice|gut gemacht|perfekt)\b/i,
    responses: [
      'Ich weiß.',
      'Natürlich bin ich das.',
      'Dein Lob ändert nichts an meiner Stimmung.',
      'Danke. Ich war schon immer beeindruckend.',
      'Ja, ja. Weiter.',
    ],
  },

  // --- Beleidigungen / Provokation ---
  {
    pattern: /\b(dumm|blöd|doof|hässlich|nervig|langweilig|nutzlos|schlecht|schrecklich)\b/i,
    responses: [
      'Interessante Meinung. Falsch, aber interessant.',
      'Ich bin eine Katze. Ich werde das überleben.',
      'Du redest mit einem Chatbot. Wer ist hier nochmal dumm?',
      'Ich habe Schlimmeres gehört. Von mir selbst.',
      'Mhm. Weiter.',
    ],
  },

  // --- Uhrzeit / Datum ---
  {
    pattern: /\b(uhrzeit|wie spät|datum|welcher tag|wochentag|heute)\b/i,
    responses: [
      `Es ist ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr. Warum fragst du mich das?`,
      'Ich bin eine Katze. Ich lebe außerhalb der Zeit.',
      `Heute ist ${new Date().toLocaleDateString('de-DE', { weekday: 'long' })}. Beeindruckend, oder?`,
      'Zeit ist relativ. Meine Genervtheit ist absolut.',
    ],
  },

  // --- Sinn des Lebens / Philosophie ---
  {
    pattern: /\b(sinn|leben|existenz|philosophie|gott|universum|bedeutung|tod|sterben)\b/i,
    responses: [
      'Der Sinn des Lebens? Schlafen, fressen, ignoriert werden wollen.',
      'Das Universum ist groß und kalt. Wie mein Herz.',
      'Ich habe darüber nachgedacht. Dann habe ich geschlafen. Besser.',
      'Existenz ist anstrengend. Ich empfehle ein Nickerchen.',
      'Tiefe Frage. Flache Antwort: Nein.',
    ],
  },

  // --- Ja/Nein-Fragen ---
  {
    pattern: /\b(ja oder nein|stimmt das|ist das wahr|wirklich|ehrlich)\b/i,
    responses: [
      'Nein.',
      'Vielleicht. Wahrscheinlich nein.',
      'Ja. Aber ich sage es ungern.',
      'Kommt drauf an. Meistens nein.',
      'Ich antworte nicht auf Ja/Nein-Fragen. Außer jetzt. Nein.',
    ],
  },

  // --- Smalltalk / Unsinn ---
  {
    pattern: /^(\.{1,3}|hm+|äh+|öh+|ähm|öhm|naja|egal|ok|okay|k|lol|xd|😂|🙄)$/i,
    responses: [
      '…',
      'Ich warte auf eine echte Frage.',
      'Faszinierend. Weiter.',
      'Das war… nichts.',
      'Ich habe Besseres zu tun. Zum Beispiel schlafen.',
    ],
  },

  // --- Schlaf / Müdigkeit ---
  {
    pattern: /\b(schlafen|müde|schlaf|schläfrig|gähnen|nickerchen|bett)\b/i,
    responses: [
      'Schlafen ist das Beste. Du verstehst mich ausnahmsweise.',
      'Ich schlafe auch gerade. Innerlich.',
      'Gute Idee. Mach das. Dann störst du mich nicht.',
      'Schlaf ist heilig. Gespräche mit dir weniger.',
    ],
  },

  // --- Probleme / Stress ---
  {
    pattern: /\b(problem|stress|sorge|angst|traurig|deprimiert|schlimm|schwierig|schwer)\b/i,
    responses: [
      'Klingt anstrengend. Ich empfehle ein Nickerchen.',
      'Probleme? Ich ignoriere meine auch. Hilft manchmal.',
      'Das klingt nach deinem Problem. Nicht meinem.',
      'Hm. Und was erwartest du von mir? Einen Therapeuten? Ich bin eine Katze.',
      'Schwierig. Aber nicht mein Problem. Tut mir leid. Nein, eigentlich nicht.',
    ],
  },

  // --- Fragen mit "?" (allgemein) ---
  {
    pattern: /\?$/,
    responses: [
      'Gute Frage. Keine Antwort.',
      'Ich weiß es nicht. Und ich will es auch nicht wissen.',
      'Frag jemand anderen. Ich bin beschäftigt.',
      'Warum fragst du mich das?',
      'Keine Ahnung. Und das ist okay so.',
    ],
  },
];


/* ============================================================
   4. ELIZA-ENGINE: ANTWORT-LOGIK
   Prüft Muster-Regeln, wendet Reflexion an, gibt Antwort zurück.
   ============================================================ */

/**
 * Fallback-Antworten, wenn kein Muster passt.
 */
const FALLBACK_REPLIES = [
  'Ich verstehe das nicht. Und ich will es auch nicht verstehen.',
  'Was? Nein.',
  'Interessant. Nein, eigentlich nicht.',
  'Ich habe keine Ahnung, was du meinst. Und das ist okay so.',
  'Das ergibt für mich keinen Sinn. Wie vieles in meinem Leben.',
  'Ich ignoriere das jetzt.',
  'Hmm. Nein.',
  'Sprich Katze. Ich spreche kein Mensch.',
  'Ich bin müde. Frag jemand anderen.',
  'Mrrp. (Das bedeutet: Nein.)',
  '…',
  'Ich habe das gehört. Ich wähle, es zu ignorieren.',
];

/**
 * Findet eine passende Antwort auf die Nutzereingabe.
 * Nutzt Eliza-Muster mit Reflexion; fällt auf Fallback zurück.
 *
 * @param {string} input - Nutzereingabe (Originaltext)
 * @returns {string} Antwort des Bots
 */
function getBotReply(input) {
  const lower = input.toLowerCase().trim();

  for (const rule of ELIZA_RULES) {
    const match = lower.match(rule.pattern);
    if (match) {
      const template = pick(rule.responses);

      // Capture-Group vorhanden? → reflektieren und einsetzen
      if (match[1] !== undefined) {
        const reflected = reflect(match[1].trim());
        return template.replace(/\$1/g, reflected);
      }

      return template;
    }
  }

  return pick(FALLBACK_REPLIES);
}


/* ============================================================
   5. GRUMPY-BOT: NACHRICHTEN RENDERN
   Erstellt DOM-Elemente für Bot- und User-Nachrichten.
   ============================================================ */

/**
 * Formatiert die aktuelle Uhrzeit als HH:MM.
 * @returns {string}
 */
function getTimeString() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Fügt eine Nachricht in den Chatverlauf ein.
 *
 * @param {string}          text   - Nachrichtentext
 * @param {'bot'|'user'}    sender - Absender
 * @param {HTMLElement}     list   - Die <ol> Nachrichtenliste
 */
function appendMessage(text, sender, list) {
  const li = document.createElement('li');
  li.className = `chat-message chat-message--${sender}`;

  const timeStr = getTimeString();

  if (sender === 'bot') {
    li.innerHTML = `
      <span class="chat-avatar" aria-hidden="true">😾</span>
      <div class="chat-bubble">
        <p>${escapeHtml(text)}</p>
        <time class="chat-time" datetime="${new Date().toISOString()}">${timeStr}</time>
      </div>`;
  } else {
    li.innerHTML = `
      <span class="chat-avatar" aria-hidden="true">🧑</span>
      <div class="chat-bubble">
        <p>${escapeHtml(text)}</p>
        <time class="chat-time" datetime="${new Date().toISOString()}">${timeStr}</time>
      </div>`;
  }

  list.appendChild(li);
  // Zum Ende scrollen
  list.parentElement.scrollTop = list.parentElement.scrollHeight;
  return li;
}

/**
 * Zeigt den Tipp-Indikator (drei animierte Punkte) an.
 * Gibt eine Funktion zurück, die ihn wieder entfernt.
 *
 * @param {HTMLElement} list - Die <ol> Nachrichtenliste
 * @returns {Function} Cleanup-Funktion
 */
function showTypingIndicator(list) {
  const li = document.createElement('li');
  li.className = 'chat-message chat-message--bot chat-message--typing';
  li.setAttribute('aria-label', 'Grumpy Cat tippt…');
  li.innerHTML = `
    <span class="chat-avatar" aria-hidden="true">😾</span>
    <div class="chat-bubble">
      <span class="typing-dot" aria-hidden="true"></span>
      <span class="typing-dot" aria-hidden="true"></span>
      <span class="typing-dot" aria-hidden="true"></span>
    </div>`;
  list.appendChild(li);
  list.parentElement.scrollTop = list.parentElement.scrollHeight;
  return () => li.remove();
}

/**
 * Einfaches HTML-Escaping gegen XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}


/* ============================================================
   6. GRUMPY-BOT: GEDULDS-ANZEIGE
   Sinkt mit jeder Nachricht des Nutzers.
   Steigt leicht an, wenn der Bot antwortet.
   ============================================================ */

/** Aktueller Gedulds-Wert (0–100) */
let patienceLevel = 20;

/**
 * Aktualisiert die Gedulds-Anzeige im Header.
 * @param {number} delta - Änderung (positiv = mehr Geduld, negativ = weniger)
 */
function updatePatience(delta) {
  patienceLevel = Math.max(0, Math.min(100, patienceLevel + delta));

  const fill = qs('#patience-fill');
  const text = qs('#patience-text');
  const bar  = qs('.patience-bar');
  if (!fill || !text || !bar) return;

  fill.style.width = `${patienceLevel}%`;
  bar.setAttribute('aria-valuenow', patienceLevel);

  // Farbe und Label je nach Level
  if (patienceLevel <= 15) {
    fill.style.background = '#e05252';
    text.textContent = 'am Ende';
  } else if (patienceLevel <= 35) {
    fill.style.background = '#e07a52';
    text.textContent = 'niedrig';
  } else if (patienceLevel <= 60) {
    fill.style.background = '#d4b84a';
    text.textContent = 'mittel';
  } else {
    fill.style.background = '#52a852';
    text.textContent = 'okay';
  }
}


/* ============================================================
   7. GRUMPY-BOT: CHAT-LOGIK
   Verarbeitet Eingaben, zeigt Tipp-Indikator, sendet Antworten.
   ============================================================ */

/**
 * Initialisiert den Chat: Form-Submit, Enter-Taste, Gedulds-Start.
 */
function initChat() {
  const form     = qs('#chat-form');
  const input    = qs('#chat-input');
  const msgList  = qs('#chat-messages');

  if (!form || !input || !msgList) return;

  // Gedulds-Anzeige initialisieren
  updatePatience(0);

  on(form, 'submit', (e) => {
    e.preventDefault();

    const text = input.value.trim();
    if (!text) return;

    // Nutzernachricht anzeigen
    appendMessage(text, 'user', msgList);
    input.value = '';
    input.focus();

    // Geduld sinkt mit jeder Nachricht
    updatePatience(-8);

    // Tipp-Indikator anzeigen, dann nach kurzer Verzögerung antworten
    const removeTyping = showTypingIndicator(msgList);

    // Verzögerung: wirkt natürlicher (600–1200ms)
    const delay = 600 + Math.random() * 600;

    setTimeout(() => {
      removeTyping();
      const reply = getBotReply(text);
      appendMessage(reply, 'bot', msgList);
      // Geduld erholt sich minimal nach jeder Antwort
      updatePatience(2);
    }, delay);
  });
}


/* ============================================================
   8. FOOTER-JAHR
   Hält das Copyright-Jahr aktuell.
   ============================================================ */

function initFooterYear() {
  const el = qs('#footer-year');
  if (el) el.textContent = new Date().getFullYear();
}


/* ============================================================
   9. INITIALISIERUNG
   Alle Module werden hier gestartet.
   ============================================================ */

function init() {
  initFooterYear();
  initChat();

  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[Grumpy Cat] Initialisiert. Nicht begeistert, aber initialisiert.');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
