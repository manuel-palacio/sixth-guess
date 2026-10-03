import type { TileState } from '../game/feedback.ts';
import type { RejectionReason } from '../game/game.ts';
import type { HardModeViolation } from '../game/hardMode.ts';
import type { LanguageCode } from '../game/language.ts';
import type { Suggestion } from '../game/suggest.ts';

import type { PlayMode } from './settings.ts';

/** Plain strings, applied to elements marked data-i18n / data-i18n-aria in index.html. */
interface StaticText {
  modeDaily: string;
  modePractice: string;
  modeGroup: string;
  wordLanguage: string;
  statistics: string;
  settings: string;
  gameBoard: string;
  keyboard: string;
  close: string;
  scratchpad: string;
  pattern: string;
  lettersLeft: string;
  showWords: string;
  hideWords: string;
  suggest: string;
  hardMode: string;
  hardModeHelp: string;
  scratchpadHelp: string;
  colourBlind: string;
  colourBlindHelp: string;
  theme: string;
  appearance: string;
  paletteNotebook: string;
  paletteSage: string;
  paletteLavender: string;
  themeSystem: string;
  themeLight: string;
  themeDark: string;
  howToPlay: string;
  howIntro: string;
  howCorrect: string;
  howPresent: string;
  howAbsent: string;
  howModes: string;
  challengeTitle: string;
  challengeHelp: string;
  challengeWord: string;
  challengeLanguage: string;
  challengeClue: string;
  challengeFrom: string;
  challengeStory: string;
  challengeStoryHelp: string;
  yourName: string;
  storyTitle: string;
  scoreboardTitle: string;
  you: string;
  someone: string;
  yourTurn: string;
  sentTitle: string;
  sentEmpty: string;
  nobodyYet: string;
  pointsHelp: string;
  challengeBackFriend: string;
  challengedByFriend: string;
  welcomeIntro: string;
  welcomeAnyLetters: string;
  welcomeStart: string;
  challengeCreate: string;
  challengeThisWord: string;
  share: string;
  reviewTitle: string;
  reviewGuess: string;
  reviewWordsLeft: string;
  reviewBest: string;
  reviewMatched: string;
  played: string;
  winRate: string;
  streak: string;
  bestStreak: string;
  strategy: string;
  strategyHelp: string;
  winsByGuesses: string;
  enter: string;
  deleteLetter: string;
  thinking: string;
  reviewing: string;
  noSuggestion: string;
  hardModeNextGame: string;
  copied: string;
  copyBlocked: string;
  challengeCopied: string;
  challengeBroken: string;
  challengeBadWord: string;
  serverUnavailable: string;
  attemptLimit: string;
  boardRestored: string;
  playAnother: string;
  newWord: string;
  nextWord: string;
  confirmGiveUp: string;
  practiceWhileWaiting: string;
  offDictionary: string;
  customWord: string;
  outOfGuesses: string;
  solvedInOne: string;
  hardModeConsidered: string;
  tryWord: string;
}

export interface Messages extends StaticText {
  ordinals: string[];
  tileState: Record<TileState, string>;
  keyState: Record<TileState, string>;
  modeLabel(mode: PlayMode, day?: number): string;
  caption(mode: PlayMode, day: number | undefined, hardMode: boolean): string;
  fitCount(count: number): string;
  solvedIn(guesses: number): string;
  wordWas(word: string): string;
  nextDaily(countdown: string): string;
  guessCount(guesses: number, wins: number): string;
  statsTitle(mode: PlayMode, languageName: string): string;
  strategyScore(score: number): string;
  clue(text: string): string;
  challengedBy(name: string): string;
  welcomeNameHelp(name: string): string;
  challengeBack(name: string): string;
  seriesRound(round: number): string;
  points(count: number): string;
  newResults(count: number): string;
  rowEmpty(row: number): string;
  rowTyping(row: number, word: string): string;
  rowResult(row: number, description: string): string;
  announce(row: number, total: number, description: string): string;
  misplaced(ordinal: string, letter: string): string;
  missing(letter: string, count: number): string;
  notEnoughLetters: string;
  notInList: string;
  gameOver: string;
  only: string;
  pair(first: string, second: string): string;
  tests(letters: string): string;
  rearranges: string;
  splits(candidates: number, groups: number): string;
  couldWin: string;
  /** French typography puts a space before the colon. */
  colon: string;
  slotKnown(letter: string): string;
  slotRuledOut(letters: string): string;
  slotUnknown: string;
}

const EN: Messages = {
  modeDaily: 'Daily',
  modePractice: 'Practice',
  modeGroup: 'Game mode',
  wordLanguage: 'Language',
  statistics: 'Statistics',
  settings: 'Settings',
  gameBoard: 'Game board',
  keyboard: 'Keyboard',
  close: 'Close',
  scratchpad: 'Scratchpad',
  pattern: 'Pattern',
  lettersLeft: 'Letters left',
  showWords: 'Show words that fit',
  hideWords: 'Hide words',
  suggest: 'Suggest a guess',
  hardMode: 'Hard mode',
  hardModeHelp: 'Every revealed hint must be used in later guesses. Turns on before your first guess.',
  scratchpadHelp: 'Show the notes panel. Turn off for the plain game.',
  colourBlind: 'Colour-blind mode',
  colourBlindHelp: 'Blue and orange tiles, with ✓ and ↔ marks.',
  theme: 'Theme',
  appearance: 'Appearance',
  paletteNotebook: 'Notebook',
  paletteSage: 'Sage',
  paletteLavender: 'Lavender',
  themeSystem: 'Match system',
  themeLight: 'Light',
  themeDark: 'Dark',
  howToPlay: 'How to play',
  howIntro: 'Guess the five-letter word in six tries. After each guess the tiles show how close you were:',
  howCorrect: 'right letter, right place',
  howPresent: 'in the word, wrong place',
  howAbsent: 'not in the word',
  howModes: 'Daily gives everyone the same word each day. Practice is unlimited.',
  challengeTitle: 'Challenge a friend',
  challengeHelp: 'Pick any five letters: a name, a place, an old joke. Your friend gets a link to solve it.',
  challengeWord: 'Word',
  challengeLanguage: 'Language your friend plays in',
  challengeClue: 'Clue (optional)',
  challengeFrom: 'Your name (optional)',
  challengeStory: 'Story (optional)',
  challengeStoryHelp: 'Shown after the game: the memory behind the word.',
  yourName: 'Your name',
  storyTitle: 'The story behind it',
  scoreboardTitle: 'Everyone who played this word',
  you: 'You',
  someone: 'Someone',
  yourTurn: 'Your turn',
  sentTitle: 'Your challenges',
  sentEmpty: 'Challenges you send appear here, with everyone’s results.',
  nobodyYet: 'No one has played yet',
  pointsHelp: 'Points per solved word: 6 for one guess, down to 1 for six.',
  challengeBackFriend: 'Challenge them back',
  challengedByFriend: 'A friend has challenged you',
  welcomeIntro: 'They picked a secret five-letter word. Find it in six guesses: type any word, and the tiles show which letters are in it.',
  welcomeAnyLetters: 'It may be a name or a private joke, so any five letters are allowed.',
  welcomeStart: 'Start guessing',
  challengeCreate: 'Copy challenge link',
  challengeThisWord: 'Challenge a friend with this word',
  share: 'Share result',
  reviewTitle: 'Your game, guess by guess',
  reviewGuess: 'Guess',
  reviewWordsLeft: 'Words left',
  reviewBest: 'Best available',
  reviewMatched: 'Yours was as good as any',
  played: 'Played',
  winRate: 'Win rate',
  streak: 'Streak',
  bestStreak: 'Best streak',
  strategy: 'Strategy',
  strategyHelp: 'How well your guesses narrowed the word down, compared with the best guess at each step.',
  winsByGuesses: 'Wins by number of guesses',
  enter: 'Enter',
  deleteLetter: 'Delete letter',
  thinking: 'Working it out…',
  reviewing: 'Reviewing your guesses…',
  noSuggestion: 'No suggestion: no word in the list fits these clues.',
  hardModeNextGame: 'Hard mode changes from your next game',
  copied: 'Result copied',
  copyBlocked: 'Copying is blocked in this browser',
  challengeCopied: 'Challenge link copied',
  challengeBroken: 'This challenge link is broken',
  challengeBadWord: 'The word must be exactly five letters',
  serverUnavailable: 'Challenges need a connection. Try again in a moment.',
  attemptLimit: 'This challenge has already been started too many times from this connection.',
  boardRestored: 'Your board was updated with the guesses saved for you',
  playAnother: 'Play another',
  newWord: 'New word',
  nextWord: 'Next word',
  confirmGiveUp: 'Give up? Tap again',
  practiceWhileWaiting: 'Practice while you wait',
  offDictionary: 'This word may not be in the dictionary, so the scratchpad cannot count it. Any five letters are accepted.',
  customWord: 'Custom word',
  outOfGuesses: 'Out of guesses',
  solvedInOne: 'Solved in one',
  hardModeConsidered: 'Only hard-mode legal guesses were considered.',
  tryWord: 'Try',
  ordinals: ['1st', '2nd', '3rd', '4th', '5th'],
  tileState: { correct: 'correct', present: 'wrong place', absent: 'not in word' },
  keyState: { correct: 'correct', present: 'in word', absent: 'not in word' },
  modeLabel: (mode, day) => ({ daily: `Daily #${day}`, practice: 'Practice', challenge: 'Challenge' })[mode],
  caption: (mode, day, hardMode) => EN.modeLabel(mode, day) + (hardMode ? ', hard mode' : ''),
  fitCount: (count) => (count === 1 ? '1 word still fits' : `${count} words still fit`),
  solvedIn: (guesses) => `Solved in ${guesses}`,
  wordWas: (word) => `The word was ${word}`,
  nextDaily: (countdown) => `Next daily word in ${countdown}`,
  guessCount: (guesses, wins) => `${guesses} ${guesses === 1 ? 'guess' : 'guesses'}: ${wins}`,
  statsTitle: (mode, languageName) => `${EN.modeLabel(mode).replace(/ #.*/, '')}, ${languageName}`,
  strategyScore: (score) => `Strategy score: ${score}%`,
  clue: (text) => `Clue: ${text}`,
  challengedBy: (name) => `${name} has challenged you`,
  welcomeNameHelp: (name) => `So ${name} can see how you did`,
  challengeBack: (name) => `Challenge ${name} back`,
  seriesRound: (round) => `Round ${round}`,
  points: (count) => `${count} ${count === 1 ? 'pt' : 'pts'}`,
  newResults: (count) => `${count} new`,
  rowEmpty: (row) => `Guess ${row}, empty`,
  rowTyping: (row, word) => `Guess ${row}, typing: ${word}`,
  rowResult: (row, description) => `Guess ${row}: ${description}`,
  announce: (row, total, description) => `Guess ${row} of ${total}: ${description}.`,
  misplaced: (ordinal, letter) => `${ordinal} letter must be ${letter}`,
  missing: (letter, count) => (count === 1 ? `Guess must contain ${letter}` : `Guess must contain ${count} ${letter}s`),
  notEnoughLetters: 'Not enough letters',
  notInList: 'Not in word list',
  gameOver: 'The game is over',
  only: 'It is the only word that fits every clue.',
  pair: (first, second) => `Only ${first} and ${second} fit: guess one, and the other follows if it misses.`,
  tests: (letters) => `Tests ${letters} at once`,
  rearranges: 'Rearranges known letters',
  splits: (candidates, groups) => `splits ${candidates} words into ${groups} groups`,
  couldWin: ', and it could be the answer',
  colon: ': ',
  slotKnown: (letter) => `Known: ${letter}`,
  slotRuledOut: (letters) => `Unknown, not ${letters}`,
  slotUnknown: 'Unknown',
};

const ES: Messages = {
  modeDaily: 'Diario',
  modePractice: 'Práctica',
  modeGroup: 'Modo de juego',
  wordLanguage: 'Idioma',
  statistics: 'Estadísticas',
  settings: 'Ajustes',
  gameBoard: 'Tablero',
  keyboard: 'Teclado',
  close: 'Cerrar',
  scratchpad: 'Libreta',
  pattern: 'Patrón',
  lettersLeft: 'Letras posibles',
  showWords: 'Ver palabras que encajan',
  hideWords: 'Ocultar palabras',
  suggest: 'Sugerir jugada',
  hardMode: 'Modo difícil',
  hardModeHelp: 'Cada pista revelada debe usarse en los siguientes intentos. Se activa antes del primer intento.',
  scratchpadHelp: 'Muestra el panel de notas. Desactívalo para el juego clásico.',
  colourBlind: 'Modo daltónico',
  colourBlindHelp: 'Casillas azules y naranjas, con marcas ✓ y ↔.',
  theme: 'Tema',
  appearance: 'Apariencia',
  paletteNotebook: 'Cuaderno',
  paletteSage: 'Salvia',
  paletteLavender: 'Lavanda',
  themeSystem: 'Como el sistema',
  themeLight: 'Claro',
  themeDark: 'Oscuro',
  howToPlay: 'Cómo se juega',
  howIntro: 'Adivina la palabra de cinco letras en seis intentos. Tras cada intento, las casillas indican lo cerca que estás:',
  howCorrect: 'letra correcta, en su sitio',
  howPresent: 'está en la palabra, en otro sitio',
  howAbsent: 'no está en la palabra',
  howModes: 'El diario es la misma palabra para todos cada día. La práctica es ilimitada.',
  challengeTitle: 'Reta a un amigo',
  challengeHelp: 'Elige cinco letras cualesquiera: un nombre, un lugar, una broma de siempre. Tu amigo recibe un enlace para resolverla.',
  challengeWord: 'Palabra',
  challengeLanguage: 'Idioma del reto',
  challengeClue: 'Pista (opcional)',
  challengeFrom: 'Tu nombre (opcional)',
  challengeStory: 'Historia (opcional)',
  challengeStoryHelp: 'Se muestra al terminar: el recuerdo detrás de la palabra.',
  yourName: 'Tu nombre',
  storyTitle: 'La historia detrás',
  scoreboardTitle: 'Quién ha jugado esta palabra',
  you: 'Tú',
  someone: 'Alguien',
  yourTurn: 'Te toca',
  sentTitle: 'Tus retos',
  sentEmpty: 'Los retos que envíes aparecen aquí, con los resultados de todos.',
  nobodyYet: 'Nadie ha jugado todavía',
  pointsHelp: 'Puntos por palabra resuelta: 6 a la primera, hasta 1 en el sexto intento.',
  challengeBackFriend: 'Devuélvele el reto',
  challengedByFriend: 'Te han lanzado un reto',
  welcomeIntro: 'Ha elegido una palabra secreta de cinco letras. Encuéntrala en seis intentos: escribe cualquier palabra y las casillas te dirán qué letras contiene.',
  welcomeAnyLetters: 'Puede ser un nombre o una broma vuestra, así que se acepta cualquier combinación de cinco letras.',
  welcomeStart: 'Empezar',
  challengeCreate: 'Copiar enlace del reto',
  challengeThisWord: 'Reta a un amigo con esta palabra',
  share: 'Compartir resultado',
  reviewTitle: 'Tu partida, intento a intento',
  reviewGuess: 'Intento',
  reviewWordsLeft: 'Palabras posibles',
  reviewBest: 'Mejor opción',
  reviewMatched: 'El tuyo era de los mejores',
  played: 'Jugadas',
  winRate: 'Victorias',
  streak: 'Racha',
  bestStreak: 'Mejor racha',
  strategy: 'Estrategia',
  strategyHelp: 'Lo bien que tus intentos acotaron la palabra, comparado con la mejor jugada en cada paso.',
  winsByGuesses: 'Victorias por número de intentos',
  enter: 'Enviar',
  deleteLetter: 'Borrar letra',
  thinking: 'Pensando…',
  reviewing: 'Revisando tus intentos…',
  noSuggestion: 'Sin sugerencia: ninguna palabra de la lista encaja con estas pistas.',
  hardModeNextGame: 'El modo difícil cambia a partir de la próxima partida',
  copied: 'Resultado copiado',
  copyBlocked: 'Este navegador no permite copiar',
  challengeCopied: 'Enlace del reto copiado',
  challengeBroken: 'Este enlace de reto no funciona',
  challengeBadWord: 'La palabra debe tener exactamente cinco letras',
  serverUnavailable: 'Los retos necesitan conexión. Inténtalo de nuevo en un momento.',
  attemptLimit: 'Este reto ya se ha empezado demasiadas veces desde esta conexión.',
  boardRestored: 'Tu tablero se ha actualizado con los intentos guardados',
  playAnother: 'Jugar otra',
  newWord: 'Nueva palabra',
  nextWord: 'Siguiente palabra',
  confirmGiveUp: '¿Te rindes? Pulsa otra vez',
  practiceWhileWaiting: 'Practica mientras esperas',
  offDictionary: 'Puede que esta palabra no esté en el diccionario, así que la libreta no la cuenta. Se acepta cualquier combinación de cinco letras.',
  customWord: 'Palabra propia',
  outOfGuesses: 'Sin intentos',
  solvedInOne: 'Resuelto a la primera',
  hardModeConsidered: 'Solo se han considerado jugadas válidas en modo difícil.',
  tryWord: 'Prueba',
  ordinals: ['1.ª', '2.ª', '3.ª', '4.ª', '5.ª'],
  tileState: { correct: 'correcta', present: 'en otro sitio', absent: 'no está' },
  keyState: { correct: 'correcta', present: 'está en la palabra', absent: 'no está' },
  modeLabel: (mode, day) => ({ daily: `Diario n.º ${day}`, practice: 'Práctica', challenge: 'Reto' })[mode],
  caption: (mode, day, hardMode) => ES.modeLabel(mode, day) + (hardMode ? ', modo difícil' : ''),
  fitCount: (count) => (count === 1 ? 'Encaja 1 palabra' : `Encajan ${count} palabras`),
  solvedIn: (guesses) => `Resuelto en ${guesses}`,
  wordWas: (word) => `La palabra era ${word}`,
  nextDaily: (countdown) => `Próxima palabra diaria en ${countdown}`,
  guessCount: (guesses, wins) => `${guesses} ${guesses === 1 ? 'intento' : 'intentos'}: ${wins}`,
  statsTitle: (mode, languageName) => `${ES.modeLabel(mode).replace(/ n\.º.*/, '')}, ${languageName}`,
  strategyScore: (score) => `Estrategia: ${score}%`,
  clue: (text) => `Pista: ${text}`,
  challengedBy: (name) => `${name} te ha retado`,
  welcomeNameHelp: (name) => `Para que ${name} vea cómo te ha ido`,
  challengeBack: (name) => `Devuélvele el reto a ${name}`,
  seriesRound: (round) => `Ronda ${round}`,
  points: (count) => `${count} ${count === 1 ? 'pto' : 'ptos'}`,
  newResults: (count) => `${count} ${count === 1 ? 'nuevo' : 'nuevos'}`,
  rowEmpty: (row) => `Intento ${row}, vacío`,
  rowTyping: (row, word) => `Intento ${row}, escribiendo: ${word}`,
  rowResult: (row, description) => `Intento ${row}: ${description}`,
  announce: (row, total, description) => `Intento ${row} de ${total}: ${description}.`,
  misplaced: (ordinal, letter) => `La ${ordinal} letra debe ser ${letter}`,
  missing: (letter, count) => (count === 1 ? `Debe contener la ${letter}` : `Debe contener ${count} ${letter}`),
  notEnoughLetters: 'Faltan letras',
  notInList: 'No está en la lista',
  gameOver: 'La partida ha terminado',
  only: 'Es la única palabra que encaja con todas las pistas.',
  pair: (first, second) => `Solo encajan ${first} y ${second}: prueba una y, si falla, será la otra.`,
  tests: (letters) => `Prueba ${letters} a la vez`,
  rearranges: 'Recoloca letras conocidas',
  splits: (candidates, groups) => `reparte ${candidates} palabras en ${groups} grupos`,
  couldWin: ', y podría ser la respuesta',
  colon: ': ',
  slotKnown: (letter) => `Conocida: ${letter}`,
  slotRuledOut: (letters) => `Desconocida, no es ${letters}`,
  slotUnknown: 'Desconocida',
};

const FR: Messages = {
  modeDaily: 'Du jour',
  modePractice: 'Entraînement',
  modeGroup: 'Mode de jeu',
  wordLanguage: 'Langue',
  statistics: 'Statistiques',
  settings: 'Réglages',
  gameBoard: 'Grille',
  keyboard: 'Clavier',
  close: 'Fermer',
  scratchpad: 'Brouillon',
  pattern: 'Motif',
  lettersLeft: 'Lettres possibles',
  showWords: 'Voir les mots possibles',
  hideWords: 'Masquer les mots',
  suggest: 'Suggérer un essai',
  hardMode: 'Mode difficile',
  hardModeHelp: 'Chaque indice révélé doit être réutilisé. S’active avant le premier essai.',
  scratchpadHelp: 'Affiche le panneau de notes. Désactivez-le pour le jeu classique.',
  colourBlind: 'Mode daltonien',
  colourBlindHelp: 'Cases bleues et orange, avec les marques ✓ et ↔.',
  theme: 'Thème',
  appearance: 'Apparence',
  paletteNotebook: 'Cahier',
  paletteSage: 'Sauge',
  paletteLavender: 'Lavande',
  themeSystem: 'Comme le système',
  themeLight: 'Clair',
  themeDark: 'Sombre',
  howToPlay: 'Comment jouer',
  howIntro: 'Trouvez le mot de cinq lettres en six essais. Après chaque essai, les cases indiquent si vous chauffez :',
  howCorrect: 'bonne lettre, bien placée',
  howPresent: 'dans le mot, mal placée',
  howAbsent: 'absente du mot',
  howModes: 'Le mot du jour est le même pour tous. L’entraînement est illimité.',
  challengeTitle: 'Défier un ami',
  challengeHelp: 'Choisissez cinq lettres : un prénom, un lieu, une vieille blague. Votre ami reçoit un lien pour le trouver.',
  challengeWord: 'Mot',
  challengeLanguage: 'Langue du défi',
  challengeClue: 'Indice (facultatif)',
  challengeFrom: 'Votre prénom (facultatif)',
  challengeStory: 'Histoire (facultatif)',
  challengeStoryHelp: 'Affichée après la partie : le souvenir derrière le mot.',
  yourName: 'Votre prénom',
  storyTitle: 'L’histoire derrière',
  scoreboardTitle: 'Tous ceux qui ont joué ce mot',
  you: 'Vous',
  someone: 'Quelqu’un',
  yourTurn: 'À vous',
  sentTitle: 'Vos défis',
  sentEmpty: 'Les défis que vous envoyez apparaissent ici, avec les résultats de chacun.',
  nobodyYet: 'Personne n’a encore joué',
  pointsHelp: 'Points par mot trouvé : 6 du premier coup, jusqu’à 1 au sixième essai.',
  challengeBackFriend: 'Lui renvoyer un défi',
  challengedByFriend: 'On vous lance un défi',
  welcomeIntro: 'Un mot secret de cinq lettres a été choisi pour vous. Trouvez-le en six essais : tapez n’importe quel mot, et les cases indiquent quelles lettres il contient.',
  welcomeAnyLetters: 'Ce peut être un prénom ou une blague entre vous : toute suite de cinq lettres est acceptée.',
  welcomeStart: 'Commencer',
  challengeCreate: 'Copier le lien du défi',
  challengeThisWord: 'Défier un ami avec ce mot',
  share: 'Partager le résultat',
  reviewTitle: 'Votre partie, essai par essai',
  reviewGuess: 'Essai',
  reviewWordsLeft: 'Mots possibles',
  reviewBest: 'Meilleur choix',
  reviewMatched: 'Le vôtre était parmi les meilleurs',
  played: 'Parties',
  winRate: 'Victoires',
  streak: 'Série',
  bestStreak: 'Meilleure série',
  strategy: 'Stratégie',
  strategyHelp: 'À quel point vos essais ont resserré les possibilités, par rapport au meilleur essai à chaque étape.',
  winsByGuesses: 'Victoires par nombre d’essais',
  enter: 'Entrée',
  deleteLetter: 'Effacer la lettre',
  thinking: 'Réflexion…',
  reviewing: 'Analyse de vos essais…',
  noSuggestion: 'Pas de suggestion : aucun mot de la liste ne colle à ces indices.',
  hardModeNextGame: 'Le mode difficile change à la prochaine partie',
  copied: 'Résultat copié',
  copyBlocked: 'Ce navigateur bloque la copie',
  challengeCopied: 'Lien du défi copié',
  challengeBroken: 'Ce lien de défi est cassé',
  challengeBadWord: 'Le mot doit faire exactement cinq lettres',
  serverUnavailable: 'Les défis ont besoin d’une connexion. Réessayez dans un instant.',
  attemptLimit: 'Ce défi a déjà été commencé trop de fois depuis cette connexion.',
  boardRestored: 'Votre grille a été mise à jour avec vos essais enregistrés',
  playAnother: 'Rejouer',
  newWord: 'Nouveau mot',
  nextWord: 'Mot suivant',
  confirmGiveUp: 'Abandonner ? Touchez encore',
  practiceWhileWaiting: 'S’entraîner en attendant',
  offDictionary: 'Ce mot n’est peut-être pas dans le dictionnaire : le brouillon ne peut pas le compter. Toute suite de cinq lettres est acceptée.',
  customWord: 'Mot perso',
  outOfGuesses: 'Plus d’essais',
  solvedInOne: 'Trouvé du premier coup',
  hardModeConsidered: 'Seuls les essais autorisés en mode difficile ont été considérés.',
  tryWord: 'Essayez',
  ordinals: ['1re', '2e', '3e', '4e', '5e'],
  tileState: { correct: 'bien placée', present: 'mal placée', absent: 'absente' },
  keyState: { correct: 'bien placée', present: 'dans le mot', absent: 'absente' },
  modeLabel: (mode, day) => ({ daily: `Mot du jour n° ${day}`, practice: 'Entraînement', challenge: 'Défi' })[mode],
  caption: (mode, day, hardMode) => FR.modeLabel(mode, day) + (hardMode ? ', mode difficile' : ''),
  fitCount: (count) => (count === 1 ? '1 mot possible' : `${count} mots possibles`),
  solvedIn: (guesses) => `Trouvé en ${guesses}`,
  wordWas: (word) => `Le mot était ${word}`,
  nextDaily: (countdown) => `Prochain mot du jour dans ${countdown}`,
  guessCount: (guesses, wins) => `${guesses} ${guesses === 1 ? 'essai' : 'essais'} : ${wins}`,
  statsTitle: (mode, languageName) => `${FR.modeLabel(mode).replace(/ n° .*/, '')}, ${languageName}`,
  strategyScore: (score) => `Stratégie : ${score} %`,
  clue: (text) => `Indice : ${text}`,
  challengedBy: (name) => `${name} vous lance un défi`,
  welcomeNameHelp: (name) => `Pour que ${name} voie votre résultat`,
  challengeBack: (name) => `Renvoyer un défi à ${name}`,
  seriesRound: (round) => `Manche ${round}`,
  points: (count) => `${count} pt${count === 1 ? '' : 's'}`,
  newResults: (count) => `${count} nouveau${count === 1 ? '' : 'x'}`,
  rowEmpty: (row) => `Essai ${row}, vide`,
  rowTyping: (row, word) => `Essai ${row}, en cours : ${word}`,
  rowResult: (row, description) => `Essai ${row} : ${description}`,
  announce: (row, total, description) => `Essai ${row} sur ${total} : ${description}.`,
  misplaced: (ordinal, letter) => `La ${ordinal} lettre doit être ${letter}`,
  missing: (letter, count) => (count === 1 ? `Le mot doit contenir ${letter}` : `Le mot doit contenir ${count} ${letter}`),
  notEnoughLetters: 'Pas assez de lettres',
  notInList: 'Mot inconnu',
  gameOver: 'La partie est terminée',
  only: 'C’est le seul mot qui colle à tous les indices.',
  pair: (first, second) => `Seuls ${first} et ${second} collent : essayez l’un, sinon ce sera l’autre.`,
  tests: (letters) => `Teste ${letters} d’un coup`,
  rearranges: 'Réorganise des lettres connues',
  splits: (candidates, groups) => `répartit ${candidates} mots en ${groups} groupes`,
  couldWin: ', et ce pourrait être la réponse',
  colon: ' : ',
  slotKnown: (letter) => `Connue : ${letter}`,
  slotRuledOut: (letters) => `Inconnue, pas ${letters}`,
  slotUnknown: 'Inconnue',
};

const CATALOGUES: Record<LanguageCode, Messages> = { en: EN, es: ES, fr: FR };

export function messagesFor(language: LanguageCode): Messages {
  return CATALOGUES[language];
}

export function describeRejection(messages: Messages, reason: RejectionReason): string {
  switch (reason.kind) {
    case 'gameOver':
      return messages.gameOver;
    case 'tooShort':
      return messages.notEnoughLetters;
    case 'notInList':
      return messages.notInList;
    case 'hardMode':
      return describeViolation(messages, reason.violation);
  }
}

export function describeViolation(messages: Messages, violation: HardModeViolation): string {
  const letter = violation.letter.toUpperCase();
  if (violation.kind === 'misplaced') return messages.misplaced(messages.ordinals[violation.position], letter);
  return messages.missing(letter, violation.count);
}

export function explainSuggestion(messages: Messages, suggestion: Suggestion): string {
  const { basis } = suggestion;
  if (basis.kind === 'only') return messages.only;
  if (basis.kind === 'pair') return messages.pair(basis.words[0].toUpperCase(), basis.words[1].toUpperCase());
  const letters = basis.freshLetters.map((letter) => letter.toUpperCase()).join(', ');
  const tests = basis.freshLetters.length > 0 ? messages.tests(letters) : messages.rearranges;
  const chance = basis.isCandidate ? messages.couldWin : '';
  return `${tests}${messages.colon}${messages.splits(basis.candidateCount, suggestion.groupCount)}${chance}.`;
}

export function describeTiles(messages: Messages, word: string, states: TileState[]): string {
  return [...word].map((letter, position) => `${letter.toUpperCase()} ${messages.tileState[states[position]]}`).join(', ');
}

/** Fills every element marked data-i18n (text) or data-i18n-aria (aria-label) from the catalogue. */
export function applyStaticText(root: ParentNode, messages: Messages): void {
  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n]')) {
    element.textContent = messages[element.dataset.i18n as keyof StaticText];
  }
  for (const element of root.querySelectorAll<HTMLElement>('[data-i18n-aria]')) {
    element.setAttribute('aria-label', messages[element.dataset.i18nAria as keyof StaticText]);
  }
}
