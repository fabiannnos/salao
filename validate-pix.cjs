/**
 * Validação EMV do módulo Pix Estático
 * --------------------------------------
 * Este script gera payloads com `generatePixStatic` e executa um
 * parser EMV independente para validar:
 *   1) Sintaxe TLV (cada tag tem length coerente)
 *   2) Existência dos IDs obrigatórios: 00, 26, 52, 53, 54, 58, 59, 60, 62, 63
 *   3) Conteúdo do ID 26 (BR.GOV.BCB.PIX + chave)
 *   4) Conteúdo do ID 62 (txid)
 *   5) CRC16-CCITT recomputado bate com o CRC do payload
 *   6) Início "000201" e fim "6304XXXX"
 *
 * O parser é a referência canônica "BR Code" e o algoritmo CRC
 * confere com o do módulo sob teste.
 *
 * Saída: imprime um JSON de relatório e sai com code 1 em caso de falha.
 */

const { generatePixStatic, sanitizePixKey } = require('./src/utils/pix/generatePixStatic');

/** CRC16-CCITT (XMODEM) – implementação independente para validação cruzada. */
function crcRef(payload) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = ((crc << 1) ^ 0x1021) & 0xffff;
      else crc = (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** TLV parser — devolve árvore {tag, value, length, children?}. */
function parseTLV(input, start = 0, end = input.length, withChildren = true) {
  const out = [];
  let i = start;
  while (i < end) {
    if (end - i < 4) throw new Error(`TLV inválido em ${i}: faltam bytes`);
    const tag = input.substring(i, i + 2);
    const len = parseInt(input.substring(i + 2, i + 4), 10);
    if (Number.isNaN(len) || len < 0 || i + 4 + len > end) {
      throw new Error(`TLV com length inválido: tag=${tag} len=${len} em ${i}`);
    }
    const value = input.substring(i + 4, i + 4 + len);
    const node = { tag, value, length: len, offset: i };
    if (withChildren && (tag === '26' || tag === '62')) {
      node.children = parseTLV(value, 0, value.length, true);
    }
    out.push(node);
    i += 4 + len;
  }
  return out;
}

/** Helper: localizar tag na árvore. */
function findTag(tree, tag) {
  return tree.find(n => n.tag === tag);
}

/** Executa a validação completa e devolve objeto de relatório. */
function validate(payload) {
  const issues = [];

  if (!payload.startsWith('000201')) issues.push('payload não inicia com 000201');

  // 1) CRC16 – valida que o sufixo "6304XXXX" bate com o recomputado
  if (!/6304[0-9A-F]{4}$/.test(payload)) {
    issues.push('sufixo CRC ausente ou malformado (esperado 6304XXXX)');
  } else {
    // O CRC é calculado sobre o payload INTEIRO incluindo "63040000"
    // (placeholder). Para recomputar, removemos o CRC de 4 chars e
    // recolocamos o "0000" original.
    const withoutCrcDigits = payload.substring(0, payload.length - 4); // ...6304
    const withoutCrc = withoutCrcDigits + '0000';
    const expectedCrc = crcRef(withoutCrc);
    const actualCrc = payload.substring(payload.length - 4);
    if (expectedCrc !== actualCrc) {
      issues.push(`CRC mismatch: esperado ${expectedCrc}, veio ${actualCrc}`);
    }
  }

  // 2) Parse TLV
  let tree;
  try {
    tree = parseTLV(payload);
  } catch (e) {
    issues.push(`TLV parse error: ${e.message}`);
    return { ok: false, issues };
  }

  // 3) Tags obrigatórias
  const required = ['00', '26', '52', '53', '54', '58', '59', '60', '62', '63'];
  for (const t of required) {
    if (!findTag(tree, t)) issues.push(`tag obrigatória ausente: ${t}`);
  }

  // 4) Conteúdo do ID 26
  const id26 = findTag(tree, '26');
  if (id26) {
    const gui = findTag(id26.children, '00');
    const key = findTag(id26.children, '01');
    if (!gui || gui.value !== 'BR.GOV.BCB.PIX') {
      issues.push(`ID 26/00 GUI inválido: ${gui && gui.value}`);
    }
    if (!key || !key.value) issues.push('ID 26/01 chave Pix vazia');
  }

  // 5) Conteúdo do ID 62
  const id62 = findTag(tree, '62');
  if (id62) {
    const txid = findTag(id62.children, '05');
    if (!txid) issues.push('ID 62/05 txid ausente');
  }

  return {
    ok: issues.length === 0,
    issues,
    tree: tree.map(n => ({
      tag: n.tag,
      value: n.value,
      length: n.length,
      children: n.children ? n.children.map(c => ({ tag: c.tag, value: c.value })) : undefined
    })),
    crc: payload.substring(payload.length - 4),
  };
}

const cases = [
  {
    name: 'Telefone (São Paulo)',
    type: 'telefone',
    input: { pixKey: '+55 (11) 98888-7777', amount: 75.5, merchantName: 'Salão da Maria', merchantCity: 'São Paulo' },
    expect: { gui: 'BR.GOV.BCB.PIX', key: '+5511988887777', amount: '75.50', name: 'SALAO DA MARIA', city: 'SAO PAULO' }
  },
  {
    name: 'CNPJ (Recife)',
    type: 'cnpj',
    input: { pixKey: '12.345.678/0001-90', amount: 1234.56, merchantName: 'Beleza & Cia', merchantCity: 'Recife' },
    expect: { gui: 'BR.GOV.BCB.PIX', key: '12345678000190', amount: '1234.56', name: 'BELEZA CIA', city: 'RECIFE' }
  },
  {
    name: 'Email (Brasília)',
    type: 'email',
    input: { pixKey: 'financeiro@gestao-modello.com.br', amount: 0.01, merchantName: 'Gestão Modello', merchantCity: 'Brasília' },
    expect: { gui: 'BR.GOV.BCB.PIX', key: 'financeiro@gestao-modello.com.br', amount: '0.01', name: 'GESTAO MODELLO', city: 'BRASILIA' }
  },
  {
    name: 'Chave aleatória (Curitiba)',
    type: 'aleatoria',
    input: { pixKey: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890', amount: 99999.99, merchantName: 'Cabeleireiros Sul', merchantCity: 'Curitiba' },
    expect: { gui: 'BR.GOV.BCB.PIX', key: 'A1B2C3D4E5F67890ABCDEF1234567890', amount: '99999.99', name: 'CABELEIREIROS SUL', city: 'CURITIBA' }
  },
  {
    name: 'Acentos no nome (Florianópolis)',
    type: 'telefone',
    input: { pixKey: '47999998888', amount: 250, merchantName: 'Salão Conceição\'s', merchantCity: 'Florianópolis' },
    expect: { gui: 'BR.GOV.BCB.PIX', key: '47999998888', amount: '250.00', name: 'SALAO CONCEICAO S', city: 'FLORIANOPOLIS' }
  },
];

let allOk = true;
const report = [];

for (const c of cases) {
  const sanitizedKey = sanitizePixKey(c.input.pixKey, c.type);
  const { qrPayload, copyPaste } = generatePixStatic({ ...c.input, pixKey: sanitizedKey });
  const validation = validate(qrPayload);
  const id26 = validation.tree.find(n => n.tag === '26');
  const id54 = validation.tree.find(n => n.tag === '54');
  const id59 = validation.tree.find(n => n.tag === '59');
  const id60 = validation.tree.find(n => n.tag === '60');
  const actual = {
    key: id26 && id26.children && id26.children[1] && id26.children[1].value,
    amount: id54 && id54.value,
    name: id59 && id59.value,
    city: id60 && id60.value,
  };
  const fieldsOk = (
    actual.key === c.expect.key &&
    actual.amount === c.expect.amount &&
    actual.name === c.expect.name &&
    actual.city === c.expect.city
  );
  const copyPasteOk = copyPaste === qrPayload;
  const ok = validation.ok && fieldsOk && copyPasteOk;
  if (!ok) allOk = false;
  report.push({
    case: c.name,
    ok,
    sanitizedKey,
    validation,
    copyPasteEqualsQrPayload: copyPasteOk,
    fields: { actual, expected: c.expect, ok: fieldsOk },
    payload: qrPayload,
  });
}

// Erros esperados
const errorCases = [
  { name: 'chave vazia', input: { pixKey: '', amount: 10, merchantName: 'X', merchantCity: 'Y' }, expectThrows: /pixKey/ },
  { name: 'amount negativo', input: { pixKey: 'x', amount: -1, merchantName: 'X', merchantCity: 'Y' }, expectThrows: /amount/ },
];
for (const c of errorCases) {
  let thrown = null;
  try { generatePixStatic(c.input); } catch (e) { thrown = e.message; }
  const ok = thrown && c.expectThrows.test(thrown);
  if (!ok) allOk = false;
  report.push({ case: c.name, ok, error: thrown });
}

console.log(JSON.stringify({ allOk, report }, null, 2));
process.exit(allOk ? 0 : 1);
