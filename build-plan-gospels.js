// Gera plano-gospels.json e reflexoes-gospels.json: plano alternativo focado so nos
// ensinamentos de Jesus (os quatro Evangelhos, capitulo a capitulo, em ordem canonica).
// Reaproveita as reflexoes ja escritas em reflexoes.json (mesma reflexao para o mesmo
// capitulo, so reordenada pros novos numeros de dia deste plano menor).
const fs = require('fs');
const path = require('path');

const bible = require('./www/bible-acf.json');
const byAbbrev = Object.fromEntries(bible.map(b => [b.abbrev, b]));
const planoCompleto = require('./www/plano.json');
const reflexoesCompleto = require('./www/reflexoes.json');

const GOSPEL_BOOKS = ['mt', 'mc', 'lc', 'jo'];
const GOSPEL_NAMES = { mt: 'Mateus', mc: 'Marcos', lc: 'Lucas', jo: 'João' };

// dia (no plano completo) -> reflexao, indexado por "abbrev:capitulo"
const reflexaoPorCapitulo = {};
for (let i = 0; i < planoCompleto.length; i++) {
  const p = planoCompleto[i];
  reflexaoPorCapitulo[`${p.abbrev}:${p.chapter}`] = reflexoesCompleto[i];
}

const plano = [];
const reflexoes = [];

for (const abbrev of GOSPEL_BOOKS) {
  const book = byAbbrev[abbrev];
  for (let c = 0; c < book.chapters.length; c++) {
    const chapter = c + 1;
    const verses = book.chapters[c];
    const day = plano.length + 1;
    plano.push({
      day,
      abbrev,
      book: GOSPEL_NAMES[abbrev],
      chapter,
      reference: `${GOSPEL_NAMES[abbrev]} ${chapter}`,
      highlightVerse: 1,
      highlightText: verses[0],
      verseCount: verses.length,
    });
    const refl = reflexaoPorCapitulo[`${abbrev}:${chapter}`];
    reflexoes.push({
      day,
      reflection: refl ? refl.reflection : '',
      modernText: refl ? refl.modernText : '',
      practice: refl ? refl.practice || '' : '',
    });
  }
}

fs.writeFileSync(path.join(__dirname, 'www', 'plano-gospels.json'), JSON.stringify(plano, null, 2));
fs.writeFileSync(path.join(__dirname, 'www', 'reflexoes-gospels.json'), JSON.stringify(reflexoes, null, 2));

const semReflexao = reflexoes.filter((r) => !r.reflection).length;
console.log('plano-gospels.json gerado com', plano.length, 'dias (so Evangelhos).');
console.log('reflexoes-gospels.json:', reflexoes.length - semReflexao, 'com reflexao reaproveitada,', semReflexao, 'faltando.');
