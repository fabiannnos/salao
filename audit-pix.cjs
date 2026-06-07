/**
 * Auditoria de Geração de PIX EMV (BR Code)
 * ------------------------------------------
 * Executa generatePixStatic com os dados fornecidos pelo usuário,
 * captura toda a instrumentação de logs e valida o BR Code gerado
 * com um parser EMV independente + recomputação de CRC16-CCITT.
 */

const { generatePixStatic, sanitizePixKey } = require('./src/utils/pix/generatePixStatic');

// ============= INPUT DO USUÁRIO =============
const INPUT = {
  tenant_id: 'salon_eclat',
  pix_key_type: 'telefone',
  pix_key: '81997015187',
  amount: 0.01,
  merchant_name: 'DEDA E ELZA',
  merchant_city: 'RECIFE',
};

console.log('═══════════════════════════════════════════════════════════');
console.log('  AUDITORIA — Geração de PIX EMV (BR Code)');
console.log('  Tenant:    ' + INPUT.tenant_id);
console.log('  Key type:  ' + INPUT.pix_key_type);
console.log('  Key:       ' + INPUT.pix_key);
console.log('  Amount:    R$ ' + INPUT.amount.toFixed(2));
console.log('  Merchant:  ' + INPUT.merchant_name + ' / ' + INPUT.merchant_city);
console.log('═══════════════════════════════════════════════════════════');
console.log('');

// ============= 1. CHAMADA REAL COM DEBUG =============
console.log('▶ CHAMADA: generatePixStatic({ ...INPUT, debug: true })');
console.log('');
const { qrPayload, copyPaste } = generatePixStatic({
  pixKey: sanitizePixKey(INPUT.pix_key, INPUT.pix_key_type),
  amount: INPUT.amount,
  merchantName: INPUT.merchant_name,
  merchantCity: INPUT.merchant_city,
  debug: true,
});
console.log('');

// ============= 2. VALIDAÇÃO INDEPENDENTE =============
console.log('▶ VALIDAÇÃO INDEPENDENTE (parser EMV + CRC recomputado)');
console.log('');

// CRC16-CCITT (XMODEM) independente para cross-check
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

// Parser TLV independente
function parseTLV(input, start = 0, end = input.length) {
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
    out.push({ tag, value, length: len, offset: i });
    i += 4 + len;
  }
  return out;
}

const issues = [];

// (a) Início e fim
if (!qrPayload.startsWith('000201')) issues.push('payload não inicia com 000201');
if (!/6304[0-9A-F]{4}$/.test(qrPayload)) issues.push('payload não termina com 6304XXXX');

// (b) CRC
// O CRC é calculado sobre o payload INTEIRO incluindo o "63040000"
// (placeholder). Para recomputar de forma independente, removemos
// apenas os 4 chars do CRC e recolocamos "0000".
const crcObtido = qrPayload.substring(qrPayload.length - 4);
const baseSemCrc = qrPayload.substring(0, qrPayload.length - 4) + '0000';
const crcEsperado = crcRef(baseSemCrc);
console.log('  base do CRC (com 0000) length =', baseSemCrc.length);
console.log('  CRC esperado (recomputado)    =', crcEsperado);
console.log('  CRC obtido   (do payload)     =', crcObtido);
console.log('  match                          =', crcEsperado === crcObtido);
if (crcEsperado !== crcObtido) issues.push(`CRC mismatch: esperado ${crcEsperado}, veio ${crcObtido}`);

// (c) Parse TLV
let tree;
try {
  tree = parseTLV(qrPayload);
  console.log('  ✓ TLV parse: ' + tree.length + ' campos top-level');
} catch (e) {
  issues.push('TLV parse failed: ' + e.message);
  tree = [];
}

// (d) Campos obrigatórios
const required = ['00', '26', '52', '53', '54', '58', '59', '60', '62', '63'];
const present = tree.map(n => n.tag);
const missing = required.filter(t => !present.includes(t));
if (missing.length) issues.push('Campos EMV obrigatórios ausentes: ' + missing.join(', '));

// (e) Validação semântica
const get = (tag) => tree.find(n => n.tag === tag);
const id00 = get('00');
const id26 = get('26');
const id52 = get('52');
const id53 = get('53');
const id54 = get('54');
const id58 = get('58');
const id59 = get('59');
const id60 = get('60');
const id62 = get('62');
const id63 = get('63');

console.log('');
console.log('  ── Campos top-level ──');
for (const n of tree) {
  console.log(`    [${n.tag}] len=${String(n.length).padStart(2, '0')} value=${JSON.stringify(n.value)}`);
}

if (id00 && id00.value !== '01') issues.push(`ID 00 esperado "01", veio "${id00.value}"`);
if (id52 && id52.value !== '0000') issues.push(`ID 52 esperado "0000", veio "${id52.value}"`);
if (id53 && id53.value !== '986') issues.push(`ID 53 esperado "986" (BRL), veio "${id53.value}"`);
if (id54 && id54.value !== '0.01') issues.push(`ID 54 esperado "0.01", veio "${id54.value}"`);
if (id58 && id58.value !== 'BR') issues.push(`ID 58 esperado "BR", veio "${id58.value}"`);
if (id59 && id59.value !== 'DEDA E ELZA') issues.push(`ID 59 esperado "DEDA E ELZA", veio "${id59.value}"`);
if (id60 && id60.value !== 'RECIFE') issues.push(`ID 60 esperado "RECIFE", veio "${id60.value}"`);

// (f) Validação de ID 26 (Merchant Account Information)
if (id26) {
  let children26;
  try {
    children26 = parseTLV(id26.value);
  } catch (e) {
    issues.push('ID 26 children parse failed: ' + e.message);
  }
  if (children26) {
    const gui = children26.find(c => c.tag === '00');
    const key = children26.find(c => c.tag === '01');
    console.log('');
    console.log('  ── ID 26 children (Merchant Account Information) ──');
    for (const c of children26) {
      console.log(`    [${c.tag}] len=${String(c.length).padStart(2, '0')} value=${JSON.stringify(c.value)}`);
    }
    if (!gui || gui.value !== 'BR.GOV.BCB.PIX') {
      issues.push(`ID 26/00 GUI esperado "BR.GOV.BCB.PIX", veio "${gui && gui.value}"`);
    }
    if (!key || key.value !== '81997015187') {
      issues.push(`ID 26/01 key esperado "81997015187", veio "${key && key.value}"`);
    }
  }
}

// (g) Validação de ID 62 (Additional Data Field Template)
if (id62) {
  let children62;
  try {
    children62 = parseTLV(id62.value);
  } catch (e) {
    issues.push('ID 62 children parse failed: ' + e.message);
  }
  if (children62) {
    const txid = children62.find(c => c.tag === '05');
    console.log('');
    console.log('  ── ID 62 children (Additional Data) ──');
    for (const c of children62) {
      console.log(`    [${c.tag}] len=${String(c.length).padStart(2, '0')} value=${JSON.stringify(c.value)}`);
    }
    if (!txid || txid.value !== '***') {
      issues.push(`ID 62/05 txid esperado "***" (Pix Estático), veio "${txid && txid.value}"`);
    }
  }
}

// (h) Sanity checks estruturais
const lengthOK = (n) => n.length.toString().padStart(2, '0') === String(n.value.length).padStart(2, '0');
const allLenOK = tree.every(lengthOK);
if (!allLenOK) issues.push('Algum campo tem length inconsistente com o tamanho do value');

// ============= 3. VEREDITO =============
console.log('');
console.log('═══════════════════════════════════════════════════════════');
console.log('  VEREDITO');
console.log('═══════════════════════════════════════════════════════════');
if (issues.length === 0) {
  console.log('  ✓ BR Code VÁLIDO — todos os campos EMV estão corretos');
  console.log('  ✓ CRC16-CCITT bate com payload');
  console.log('  ✓ Parser TLV independente aceita a estrutura');
  console.log('  ✓ copyPaste === qrPayload:', copyPaste === qrPayload);
  process.exit(0);
} else {
  console.log('  ✗ BR Code INVÁLIDO — issues encontrados:');
  for (const i of issues) console.log('    - ' + i);
  process.exit(1);
}
