// Gera plano.json: 365 dias intercalando o Novo Testamento inteiro (capítulo a capítulo)
// com os 105 primeiros Salmos, em ordem canônica, para uma leitura devocional anual completa.
const fs = require('fs');
const path = require('path');

const bible = require('./www/bible-acf.json');
const byAbbrev = Object.fromEntries(bible.map(b => [b.abbrev, b]));

const NT_BOOKS = ['mt','mc','lc','jo','atos','rm','1co','2co','gl','ef','fp','cl','1ts','2ts','1tm','2tm','tt','fm','hb','tg','1pe','2pe','1jo','2jo','3jo','jd','ap'];
const NT_NAMES = {
  mt:'Mateus', mc:'Marcos', lc:'Lucas', jo:'João', atos:'Atos', rm:'Romanos',
  '1co':'1 Coríntios','2co':'2 Coríntios', gl:'Gálatas', ef:'Efésios', fp:'Filipenses',
  cl:'Colossenses', '1ts':'1 Tessalonicenses','2ts':'2 Tessalonicenses', '1tm':'1 Timóteo',
  '2tm':'2 Timóteo', tt:'Tito', fm:'Filemom', hb:'Hebreus', tg:'Tiago', '1pe':'1 Pedro',
  '2pe':'2 Pedro', '1jo':'1 João', '2jo':'2 João', '3jo':'3 João', jd:'Judas', ap:'Apocalipse'
};

const ntChapters = [];
for (const abbrev of NT_BOOKS) {
  const book = byAbbrev[abbrev];
  for (let c = 0; c < book.chapters.length; c++) {
    ntChapters.push({ abbrev, name: NT_NAMES[abbrev], chapter: c + 1 });
  }
}

const psalms = byAbbrev['sl'];
const psalmChapters = [];
for (let c = 0; c < 105; c++) {
  psalmChapters.push({ abbrev: 'sl', name: 'Salmos', chapter: c + 1 });
}

// Intercala: a cada ~2.47 capítulos do NT insere 1 Salmo, distribuindo os 105 salmos
// uniformemente ao longo dos 260 capítulos do NT, para completar 365 dias.
const total = 365;
const plan = [];
let ntIdx = 0, psIdx = 0;
const ratio = ntChapters.length / psalmChapters.length; // ~2.476
let nextPsalmAt = ratio;

for (let day = 1; day <= total; day++) {
  if (psIdx < psalmChapters.length && (day >= nextPsalmAt || ntIdx >= ntChapters.length)) {
    plan.push(psalmChapters[psIdx]);
    psIdx++;
    nextPsalmAt += ratio;
  } else if (ntIdx < ntChapters.length) {
    plan.push(ntChapters[ntIdx]);
    ntIdx++;
  } else if (psIdx < psalmChapters.length) {
    plan.push(psalmChapters[psIdx]);
    psIdx++;
  }
}

// Preenche eventual sobra/déficit até exatamente 365
while (plan.length < total && ntIdx < ntChapters.length) plan.push(ntChapters[ntIdx++]);
while (plan.length < total && psIdx < psalmChapters.length) plan.push(psalmChapters[psIdx++]);
plan.length = total;

const out = plan.map((p, i) => {
  const book = byAbbrev[p.abbrev];
  const verses = book.chapters[p.chapter - 1];
  return {
    day: i + 1,
    abbrev: p.abbrev,
    book: p.name,
    chapter: p.chapter,
    reference: `${p.name} ${p.chapter}`,
    highlightVerse: 1,
    highlightText: verses[0],
    verseCount: verses.length
  };
});

fs.writeFileSync(path.join(__dirname, 'www', 'plano.json'), JSON.stringify(out, null, 2));
console.log('plano.json gerado com', out.length, 'dias. NT usados:', ntIdx, '/', ntChapters.length, '| Salmos usados:', psIdx, '/', psalmChapters.length);
