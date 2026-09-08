// Junta as 5 partes geradas pelos agentes em um único www/reflexoes.json com 365 entradas.
const fs = require('fs');
const path = require('path');

const parts = [1, 2, 3, 4, 5].map(n => {
  const file = path.join(__dirname, 'www', `reflexoes-part-${n}.json`);
  return JSON.parse(fs.readFileSync(file, 'utf8'));
});

const merged = parts.flat().sort((a, b) => a.day - b.day);

if (merged.length !== 365) {
  throw new Error(`Esperado 365 entradas, encontrado ${merged.length}`);
}
for (let i = 0; i < 365; i++) {
  if (merged[i].day !== i + 1) {
    throw new Error(`Dia fora de ordem/faltando no índice ${i}: esperado ${i + 1}, achou ${merged[i].day}`);
  }
  if (!merged[i].reflection || !merged[i].modernText) {
    throw new Error(`Dia ${merged[i].day} com campo faltando`);
  }
}

fs.writeFileSync(path.join(__dirname, 'www', 'reflexoes.json'), JSON.stringify(merged, null, 2));
console.log('reflexoes.json gerado com', merged.length, 'dias validados.');
