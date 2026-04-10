/**
 * ============================================================
 * Grumpy Cat Chat — main.js
 * ============================================================
 * Vanilla JavaScript. No frameworks. No build step.
 *
 * ORGANISATION:
 *   1.  Utility helpers
 *   2.  DOM selectors
 *   3.  Grumpy-Bot: Antwort-Datenbank & Keyword-Erkennung
 *   4.  Grumpy-Bot: Nachrichten rendern
 *   5.  Grumpy-Bot: Gedulds-Anzeige
 *   6.  Grumpy-Bot: Chat-Logik (Eingabe, Senden, Tipp-Indikator)
 *   7.  Footer-Jahr
 *   8.  Initialisierung
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
   3. GRUMPY-BOT: ANTWORT-DATENBANK & KEYWORD-ERKENNUNG
   Regelbasierte Antworten nach Kategorien.
   Jede Kategorie hat mehrere Varianten für Abwechslung.
   ============================================================ */

/**
 * Antwort-Datenbank.
 * Jeder Eintrag hat:
 *   - keywords: Array von Strings (Kleinbuchstaben), die erkannt werden
 *   - replies:  Array von möglichen Antworten (eine wird zufällig gewählt)
 */
const RESPONSES = [

  // --- Begrüßungen ---
  {
    keywords: ['hallo', 'hi', 'hey', 'moin', 'guten morgen', 'guten tag', 'servus', 'grüß gott', 'nabend'],
    replies: [
      'Oh. Du. Schon wieder.',
      'Hallo. Ich hoffe, das wird kurz.',
      'Hi. Ich war gerade dabei, dich zu ignorieren.',
      'Moin. Oder auch nicht.',
      'Ah, Besuch. Wie… unerwünscht.',
    ],
  },

  // --- Wie geht's ---
  {
    keywords: ['wie geht', 'wie gehts', 'wie geht es', 'alles gut', 'alles okay', 'was machst du'],
    replies: [
      'Ich liege. Ich schlafe. Ich werde gestört. Danke der Nachfrage.',
      'Besser, bevor du geschrieben hast.',
      'Ich existiere. Das reicht.',
      'Schlechter als vorhin. Wegen dir.',
      'Ich hatte gerade meine Ruhe. Hatte.',
    ],
  },

  // --- Hilfe ---
  {
    keywords: ['hilfe', 'help', 'was kannst du', 'was bist du', 'wer bist du', 'was machst du hier'],
    replies: [
      'Ich bin eine mürrische Katze. Ich helfe nicht. Ich dulde.',
      'Ich beantworte Fragen. Ungern. Aber ich tue es.',
      'Was ich kann? Schlafen, fressen, genervt sein. Und manchmal antworten.',
      'Hilfe? Von mir? Das ist mutig.',
      'Ich bin Grumpy Cat. Ich bin hier, weil jemand dachte, das wäre eine gute Idee.',
    ],
  },

  // --- Witze ---
  {
    keywords: ['witz', 'joke', 'lustig', 'lachen', 'humor', 'witzig', 'komisch'],
    replies: [
      'Warum überquert die Katze die Straße? Um weg von dir zu kommen.',
      'Ich kenne einen Witz: Du dachtest, ich wäre nett. Ha.',
      'Witze? Mein Leben ist ein Witz. Ich lache nicht darüber.',
      'Was ist lustig? Dass du glaubst, ich mache Witze.',
      'Klopf klopf. — Wer da? — Jemand, der dich in Ruhe lassen will.',
    ],
  },

  // --- Katzen ---
  {
    keywords: ['katze', 'katzen', 'cat', 'kätzchen', 'mieze', 'miau', 'schnurren'],
    replies: [
      'Ja, ich bin eine Katze. Nein, ich bin nicht süß.',
      'Katzen sind perfekt. Ich bin perfekt. Wir haben nichts gemeinsam.',
      'Miau bedeutet: Lass mich in Ruhe.',
      'Ich schnurre nicht. Ich grumble.',
      'Andere Katzen mögen Streicheleinheiten. Ich nicht.',
    ],
  },

  // --- Essen / Futter ---
  {
    keywords: ['essen', 'futter', 'hunger', 'fressen', 'food', 'pizza', 'kaffee', 'trinken'],
    replies: [
      'Ich esse, wenn ich will. Nicht wenn du fragst.',
      'Futter? Jetzt redest du meine Sprache. Aber ich teile nicht.',
      'Kaffee? Ich brauche keinen Kaffee. Ich bin von Natur aus gereizt.',
      'Wenn du mir Thunfisch bringst, ignoriere ich dich nur halb.',
      'Essen ist das Einzige, was mich kurz weniger grumpy macht. Kurz.',
    ],
  },

  // --- Wetter ---
  {
    keywords: ['wetter', 'regen', 'sonne', 'kalt', 'warm', 'schnee', 'wind'],
    replies: [
      'Wetter? Ich bin drinnen. Mir egal.',
      'Regen bedeutet: Ich bleibe im Bett. Sonne auch.',
      'Kalt draußen? Gut. Dann kommen weniger Leute.',
      'Schnee ist weiß und kalt und ich mag ihn nicht. Wie die meisten Dinge.',
      'Das Wetter ist so wie meine Laune: wechselhaft und meistens schlecht.',
    ],
  },

  // --- Danke ---
  {
    keywords: ['danke', 'dankeschön', 'danke schön', 'thx', 'thanks', 'merci'],
    replies: [
      'Bitte. Obwohl ich nicht weiß wofür.',
      'Gern geschehen. Nein, eigentlich nicht.',
      'Du bedankst dich bei einer Katze. Interessante Entscheidung.',
      'Hmm.',
      'Ich nehme das zur Kenntnis. Und ignoriere es dann.',
    ],
  },

  // --- Tschüss / Abschied ---
  {
    keywords: ['tschüss', 'bye', 'ciao', 'auf wiedersehen', 'bis dann', 'bis bald', 'gute nacht'],
    replies: [
      'Endlich.',
      'Tschüss. Komm nicht wieder.',
      'Auf Wiedersehen. Oder auch nicht.',
      'Gute Nacht. Ich schlafe sowieso schon.',
      'Bye. Das war… naja.',
    ],
  },

  // --- Liebe / Freundschaft ---
  {
    keywords: ['liebe', 'lieb', 'mag dich', 'freund', 'freundschaft', 'kumpel', 'bff'],
    replies: [
      'Ich mag dich auch. Nein, das stimmt nicht.',
      'Liebe? Ich liebe Schlaf. Das ist alles.',
      'Freundschaft ist überschätzt. Wie die meisten Dinge.',
      'Aww. Nein.',
      'Das ist nett. Ich fühle nichts.',
    ],
  },

  // --- Komplimente ---
  {
    keywords: ['toll', 'super', 'klasse', 'großartig', 'wunderbar', 'fantastisch', 'cool', 'nice', 'gut gemacht'],
    replies: [
      'Ich weiß.',
      'Natürlich bin ich das.',
      'Dein Lob ändert nichts an meiner Stimmung.',
      'Danke. Ich war schon immer beeindruckend.',
      'Ja, ja. Weiter.',
    ],
  },

  // --- Beleidigungen / Provokation ---
  {
    keywords: ['dumm', 'blöd', 'doof', 'hässlich', 'nervig', 'langweilig', 'nutzlos', 'schlecht'],
    replies: [
      'Interessante Meinung. Falsch, aber interessant.',
      'Ich bin eine Katze. Ich werde das überleben.',
      'Du redest mit einem Chatbot. Wer ist hier nochmal dumm?',
      'Ich habe Schlimmeres gehört. Von mir selbst.',
      'Mhm. Weiter.',
    ],
  },

  // --- Fragen nach der Zeit / Datum ---
  {
    keywords: ['uhrzeit', 'wie spät', 'datum', 'welcher tag', 'wochentag'],
    replies: [
      `Es ist ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr. Warum fragst du mich das?`,
      'Ich bin eine Katze. Ich lebe außerhalb der Zeit.',
      `Heute ist ${new Date().toLocaleDateString('de-DE', { weekday: 'long' })}. Beeindruckend, oder?`,
      'Zeit ist relativ. Meine Genervtheit ist absolut.',
    ],
  },

  // --- Sinn des Lebens / Philosophie ---
  {
    keywords: ['sinn', 'leben', 'warum', 'existenz', 'philosophie', 'gott', 'universum', 'bedeutung'],
    replies: [
      'Der Sinn des Lebens? Schlafen, fressen, ignoriert werden wollen.',
      'Warum? Weil. Das reicht.',
      'Das Universum ist groß und kalt. Wie mein Herz.',
      'Ich habe darüber nachgedacht. Dann habe ich geschlafen. Besser.',
      'Existenz ist anstrengend. Ich empfehle ein Nickerchen.',
    ],
  },

  // --- Ja/Nein-Fragen ---
  {
    keywords: ['ja oder nein', 'stimmt das', 'ist das wahr', 'wirklich', 'ehrlich'],
    replies: [
      'Nein.',
      'Vielleicht. Wahrscheinlich nein.',
      'Ja. Aber ich sage es ungern.',
      'Kommt drauf an. Meistens nein.',
      'Ich antworte nicht auf Ja/Nein-Fragen. Außer jetzt. Nein.',
    ],
  },

  // --- Smalltalk / Unsinn ---
  {
    keywords: ['blabla', 'lalala', 'test', 'hm', 'hmm', 'ähm', 'öhm', 'naja', 'so so', 'egal'],
    replies: [
      '…',
      'Ich warte auf eine echte Frage.',
      'Faszinierend. Weiter.',
      'Das war… nichts.',
      'Ich habe Besseres zu tun. Zum Beispiel schlafen.',
    ],
  },
];

/**
 * Fallback-Antworten, wenn kein Keyword passt.
 */
const FALLBACK_REPLIES = [
  'Ich verstehe das nicht. Und ich will es auch nicht verstehen.',
  'Was? Nein.',
  'Interessant. Nein, eigentlich nicht.',
  'Ich habe keine Ahnung, was du meinst. Und das ist okay so.',
  'Kannst du das nochmal sagen? Nein, eigentlich nicht.',
  'Das ergibt für mich keinen Sinn. Wie vieles in meinem Leben.',
  'Ich ignoriere das jetzt.',
  'Hmm. Nein.',
  'Sprich Katze. Ich spreche kein Mensch.',
  'Ich bin müde. Frag jemand anderen.',
];

/**
 * Findet eine passende Antwort auf die Nutzereingabe.
 * Prüft Keywords (Kleinbuchstaben) und gibt eine zufällige Antwort zurück.
 *
 * @param {string} input - Nutzereingabe
 * @returns {string} Antwort des Bots
 */
function getBotReply(input) {
  const lower = input.toLowerCase().trim();

  for (const entry of RESPONSES) {
    if (entry.keywords.some(kw => lower.includes(kw))) {
      return pick(entry.replies);
    }
  }

  return pick(FALLBACK_REPLIES);
}


/* ============================================================
   4. GRUMPY-BOT: NACHRICHTEN RENDERN
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
   5. GRUMPY-BOT: GEDULDS-ANZEIGE
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
   6. GRUMPY-BOT: CHAT-LOGIK
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
   7. FOOTER-JAHR
   Hält das Copyright-Jahr aktuell.
   ============================================================ */

function initFooterYear() {
  const el = qs('#footer-year');
  if (el) el.textContent = new Date().getFullYear();
}


/* ============================================================
   8. INITIALISIERUNG
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
