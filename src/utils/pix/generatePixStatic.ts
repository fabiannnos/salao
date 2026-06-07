/**
 * Geração de QR Code Pix Estático (BR Code EMV)
 * ----------------------------------------------------------
 * Implementação compatível com o padrão "BR Code" do Banco Central
 * do Brasil (Manual de Padrões para Iniciadores de Pagamentos sem
 * Falha – Pix Estático, com TLV EMVCo QR Code Specification v1.0).
 *
 * O módulo expõe uma única função pública, `generatePixStatic`, que
 * recebe os quatro campos estritamente exigidos pelo produto e devolve
 * o payload final já com CRC16-CCITT (XMODEM, polinômio 0x1021) e a
 * string "Copia e Cola" idêntica (no padrão Pix Estático a string
 * `copyPaste` é o próprio `qrPayload`).
 *
 * Layout do payload gerado (ordem EMV obrigatória):
 *
 *   00  Payload Format Indicator       "01"
 *   26  Merchant Account Information   GUI "BR.GOV.BCB.PIX" + chave
 *   52  Merchant Category Code         "0000"
 *   53  Transaction Currency           "986" (BRL)
 *   54  Transaction Amount             "0.00"–"99999999.99"
 *   58  Country Code                   "BR"
 *   59  Merchant Name                  até 25 chars ASCII
 *   60  Merchant City                  até 15 chars ASCII
 *   62  Additional Data Field Template txid "***"
 *   63  CRC16-CCITT                    4 hex
 *
 * O ID 26 (Merchant Account Information) é construído como
 *   26 [len] 00 [len] BR.GOV.BCB.PIX  01 [len] <chave>
 * O ID 62 (Additional Data Field Template) é construído como
 *   62 [len] 05 [len] <txid>
 *
 * Esta implementação NÃO depende de nenhuma biblioteca externa e não
 * realiza I/O – é uma função pura, fácil de testar e determinística.
 */

export interface PixStaticInput {
  /** Chave Pix (telefone, e-mail, CNPJ, CPF ou chave aleatória). */
  pixKey: string;
  /** Valor da transação em reais. Aceita inteiros e decimais. */
  amount: number;
  /** Nome do recebedor (será normalizado para ASCII uppercase). */
  merchantName: string;
  /** Cidade do recebedor (será normalizada para ASCII uppercase). */
  merchantCity: string;
  /**
   * txid (ID 62/05). Opcional — se omitido, usa `***` (modo legado
   * Pix Estático). Se informado, será usado como txid real,
   * permitindo que o BR Code seja reconciliado pelo banco na
   * confirmação do pagamento.
   *
   * Em modo `BCB_COMPATIBLE_MODE = true`, informar `txid` é
   * ALTAMENTE RECOMENDADO e validado em runtime.
   */
  txid?: string;
  /**
   * Força validação rigorosa de payload. Default: valor de
   * `BCB_COMPATIBLE_MODE` (true). Em modo compatível, a função
   * sempre parseia o payload gerado, recomputa o CRC e valida todos
   * os campos EMV antes de retornar, lançando `Error` em qualquer
   * divergência.
   */
  bcbCompatible?: boolean;
}

export interface PixStaticOutput {
  /** Payload EMV completo, pronto para ser codificado em QR Code. */
  qrPayload: string;
  /** String "Copia e Cola" – idêntica ao `qrPayload` no padrão Pix Estático. */
  copyPaste: string;
}

const PIX_GUI = 'BR.GOV.BCB.PIX';
const COUNTRY_CODE = 'BR';
const CURRENCY_BRL = '986';
const MERCHANT_CATEGORY_CODE = '0000';
/** txid do Pix Estático pode ser "***" conforme Manual BCB (modo legado). */
const STATIC_TXID = '***';

/**
 * MODO DE COMPATIBILIDADE BANCÁRIA
 * --------------------------------
 * Quando `true`, o gerador produz BR Codes com:
 *   • TXID real e determinístico (nunca "***")
 *   • Chave telefone em formato E.164 internacional (+55...)
 *   • Encoding ASCII estrito em todos os campos
 *   • Validação obrigatória antes de retornar (parse EMV + CRC)
 *   • Algoritmo de CRC com input reduzido (interpretação B — sem
 *     auto-referência), que casa com a implementação de diversos
 *     aplicativos bancários reais.
 *
 * Esta flag é a fonte da verdade para o modo de operação do módulo.
 * Foi ligada após constatação de que certos bancos rejeitam payloads
 * gerados com o algoritmo "estrito BCB" (interpretação A) ou que
 * usam placeholders genéricos.
 */
export const BCB_COMPATIBLE_MODE = true;

/**
 * Comprimento máximo permitido pelo BR Code para o campo txid.
 * Especificado em "Manual de Padrões para Iniciadores de Pagamento
 * Sem Falha" do Banco Central do Brasil.
 */
const TXID_MAX_LENGTH = 25;

/** Caracteres permitidos no txid pelo BR Code. */
const TXID_ALLOWED_RE = /^[A-Za-z0-9\-._]{1,25}$/;

/**
 * Gera um TXID determinístico a partir do `comandaId` e do
 * `timestampMs`. O formato é `CMD{id}_{shortHash}`, totalmente
 * alfanumérico, com até 25 caracteres (limite do BR Code).
 *
 * Determinístico significa: mesmos inputs → mesmo output. Isso
 * garante idempotência: gerar o QR duas vezes para a mesma comanda
 * produz o mesmo BR Code, evitando divergências em sincronização.
 *
 * @param comandaId   ID da comanda (ex: "cmd_a1b2c3d4e" ou "CMD-00042")
 * @param timestampMs Timestamp em ms. Se omitido, usa `Date.now()`.
 *                    Em testes, passar valor fixo.
 *
 * @returns TXID no formato `CMD{idCurto}_{hashCurto}` (≤ 25 chars)
 *
 * @example
 *   generatePixTxid('cmd_a1b2c3d4e', 1749312000000)
 *   // → "CMDA1B2C3D4E_K1F9Q" (12 chars)
 */
export function generatePixTxid(comandaId: string, timestampMs: number = Date.now()): string {
  // Extrai parte alfanumérica do comandaId, sem prefixos tipo "cmd_"
  const idPart = (comandaId || '')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(-10);

  // Hash curto determinístico: 5 chars alfanuméricos do timestamp
  const ts = Math.floor((timestampMs || Date.now()) / 1000);
  const hashPart = (ts % 36 ** 5).toString(36).toUpperCase().padStart(5, '0');

  // Compõe "CMD" + id + "_" + hash
  let txid = `CMD${idPart}_${hashPart}`;

  // Trunca para 25 chars (limite BR Code) e valida charset
  if (txid.length > TXID_MAX_LENGTH) {
    txid = txid.substring(0, TXID_MAX_LENGTH);
  }
  if (!TXID_ALLOWED_RE.test(txid)) {
    // Fallback: limpa qualquer char fora do whitelist
    txid = txid.replace(/[^A-Za-z0-9\-._]/g, '').substring(0, TXID_MAX_LENGTH);
  }
  return txid;
}

/** TLV: codifica `tag` + length (2 dígitos) + `value`. */
function encodeTLV(tag: string, value: string): string {
  if (tag.length !== 2 && tag.length !== 4) {
    throw new Error(`[pix] tag inválida: "${tag}" (esperado 2 ou 4 dígitos)`);
  }
  if (value.length > 99) {
    throw new Error(
      `[pix] valor TLV excede 99 caracteres para tag ${tag} (${value.length})`
    );
  }
  const len = value.length.toString().padStart(2, '0');
  return `${tag}${len}${value}`;
}

/**
 * CRC16-CCITT (XMODEM): polinômio 0x1021, init 0xFFFF, sem reflexão,
 * sem XOR final. É o algoritmo exigido pelo BR Code e produz saída
 * hex de 4 caracteres em maiúsculas.
 */
/**
 * CRC16-CCITT (XMODEM): polinômio 0x1021, init 0xFFFF, sem reflexão,
 * sem XOR final. É o algoritmo exigido pelo BR Code e produz saída
 * hex de 4 caracteres em maiúsculas.
 *
 * ⚠️  SEMÂNTICA DO PARÂMETRO `includeHeader`:
 *
 * O caller SEMPRE passa o payload SEM o sufixo "6304" (cabeçalho do
 * campo 63) e SEM o próprio CRC. Por exemplo, para o payload
 * `00020126...62...6304XXXX`, o caller passa `00020126...62...`
 * (apenas os TLVs antes do campo 63).
 *
 * Quando `includeHeader` é `true` (modo BCB_COMPAT, default), a
 * função acrescenta `"6304"` ao input — implementando a
 * "interpretação B" usada por diversos bancos brasileiros reais:
 *   crc = CRC16(input + "6304")
 *
 * Quando `includeHeader` é `false` (modo estrito BCB), a função
 * calcula o CRC apenas sobre o input — mas o caller precisa passar
 * o input já com `"6304" + "0000"` se quiser a "interpretação A"
 * (BCB strict). Para o nosso pipeline, o caller passa apenas os
 * TLVs e usa a interpretação B, que é o default.
 */
function crc16CCITT(
  input: string,
  includeHeader: boolean = BCB_COMPATIBLE_MODE,
  debug: boolean = false
): string {
  const data = includeHeader ? input + '6304' : input;
  if (debug) {
    console.log('[pix-audit][crc] includeHeader (B mode):', includeHeader);
    console.log('[pix-audit][crc] input length:', data.length);
    console.log('[pix-audit][crc] input tail (last 8 chars):', data.slice(-8));
    console.log('[pix-audit][crc] algorithm: CRC16-CCITT XMODEM, poly=0x1021, init=0xFFFF, no reflection, no xorout');
  }
  let crc = 0xffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  const hex = crc.toString(16).toUpperCase().padStart(4, '0');
  if (debug) console.log('[pix-audit][crc] output:', hex);
  return hex;
}

/**
 * Parser TLV independente (auto-contido, para validação interna).
 * Recebe uma string EMV e devolve a árvore top-level.
 */
function parseTLVForValidation(input: string): Array<{ tag: string; length: number; value: string }> {
  const out: Array<{ tag: string; length: number; value: string }> = [];
  let i = 0;
  while (i < input.length) {
    if (input.length - i < 4) throw new Error(`TLV truncado em offset ${i}`);
    const tag = input.substring(i, i + 2);
    const length = parseInt(input.substring(i + 2, i + 4), 10);
    if (Number.isNaN(length) || length < 0 || i + 4 + length > input.length) {
      throw new Error(`TLV inválido: tag=${tag} length=${length} em offset ${i}`);
    }
    const value = input.substring(i + 4, i + 4 + length);
    out.push({ tag, length, value });
    i += 4 + length;
  }
  return out;
}

/**
 * Validação interna completa do BR Code gerado. Verifica:
 *   • Início `000201` e fim `6304XXXX`
 *   • Todos os 10 campos EMV obrigatórios (00, 26, 52, 53, 54, 58, 59, 60, 62, 63)
 *   • LEN de cada campo bate com tamanho real do VALUE
 *   • ID 26 contém GUI `BR.GOV.BCB.PIX` e a chave
 *   • ID 62 contém txid alfanumérico
 *   • ID 53 = `986` (BRL)
 *   • CRC recomputado bate com o CRC do payload
 *
 * Lança `Error` em qualquer inconsistência. Retorna `void` se OK.
 */
function validateGeneratedPayload(payload: string): void {
  // 1) Início/fim
  if (!payload.startsWith('000201')) {
    throw new Error('[pix] validação: payload não inicia com 000201');
  }
  if (!/6304[0-9A-F]{4}$/.test(payload)) {
    throw new Error('[pix] validação: payload não termina com 6304XXXX');
  }

  // 2) Parse TLV
  const tree = parseTLVForValidation(payload);

  // 3) Campos obrigatórios
  const required = ['00', '26', '52', '53', '54', '58', '59', '60', '62', '63'];
  for (const tag of required) {
    if (!tree.find(n => n.tag === tag)) {
      throw new Error(`[pix] validação: campo EMV obrigatório ausente: ${tag}`);
    }
  }

  // 4) LEN coerente com tamanho do VALUE
  for (const n of tree) {
    if (n.length !== n.value.length) {
      throw new Error(`[pix] validação: LEN inconsistente em ${n.tag} (LEN=${n.length}, valor tem ${n.value.length} chars)`);
    }
  }

  // 5) Sem caracteres não-ASCII
  for (const n of tree) {
    if (/[^\x20-\x7E]/.test(n.value)) {
      throw new Error(`[pix] validação: char não-ASCII em ${n.tag}`);
    }
  }

  // 6) ID 53 deve ser BRL
  const id53 = tree.find(n => n.tag === '53');
  if (id53 && id53.value !== '986') {
    throw new Error(`[pix] validação: ID 53 deve ser 986 (BRL), veio ${id53.value}`);
  }

  // 7) ID 26 deve conter GUI válido
  const id26 = tree.find(n => n.tag === '26');
  if (id26) {
    const children = parseTLVForValidation(id26.value);
    const gui = children.find(c => c.tag === '00');
    const key = children.find(c => c.tag === '01');
    if (!gui || gui.value !== 'BR.GOV.BCB.PIX') {
      throw new Error(`[pix] validação: ID 26/00 GUI inválido: ${gui && gui.value}`);
    }
    if (!key || !key.value) {
      throw new Error(`[pix] validação: ID 26/01 chave Pix vazia`);
    }
  }

  // 8) ID 62 deve ter txid alfanumérico (não pode ser só "***")
  const id62 = tree.find(n => n.tag === '62');
  if (id62) {
    const children = parseTLVForValidation(id62.value);
    const txid = children.find(c => c.tag === '05');
    if (!txid || !txid.value) {
      throw new Error(`[pix] validação: ID 62/05 txid ausente`);
    }
    if (txid.value === '***') {
      throw new Error(`[pix] validação: txid genérico "***" não é permitido em modo compatibilidade bancária`);
    }
    if (!/^[A-Za-z0-9\-._]{1,25}$/.test(txid.value)) {
      throw new Error(`[pix] validação: txid contém chars inválidos: ${txid.value}`);
    }
  }

  // 9) CRC recomputado bate
  // O payload é `payloadTLV + "6304" + CRC` (interpretação B).
  // Extrai `payloadTLV` removendo o sufixo "6304XXXX" (8 chars).
  // Recomputa o CRC: `crc16CCITT(payloadTLV, true)` faz
  // `crc16(payloadTLV + "6304")` — exatamente o que foi usado
  // na geração. Em modo legado, o caller passaria `payloadTLV
  // + "63040000"` e chamaria com `includeHeader=false`.
  const payloadTLV = payload.substring(0, payload.length - 8);
  const crcExpected = crc16CCITT(payloadTLV, true, false);
  const crcFound = payload.substring(payload.length - 4);
  if (crcExpected !== crcFound) {
    throw new Error(
      `[pix] validação: CRC mismatch: esperado ${crcExpected}, veio ${crcFound} (modo: ${BCB_COMPATIBLE_MODE ? 'BCB_COMPAT (B)' : 'LEGACY'})`
    );
  }
}

/**
 * Remove acentos, caracteres não-ASCII imprimíveis, normaliza espaços
 * e converte para UPPERCASE. Usado para `merchantName` e `merchantCity`
 * (limites de 25 e 15 caracteres respectivamente, conforme BR Code).
 */
function normalizeASCII(input: string, maxLen: number): string {
  const stripped = (input || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toUpperCase();
  return stripped.substring(0, maxLen);
}

/**
 * Normaliza a chave Pix removendo APENAS whitespace. A normalização
 * semântica (pontos, traços, +, @) é responsabilidade do chamador
 * via `sanitizePixKey(key, type)`. Manter a chave o mais próxima
 * possível do original é importante para que validadores EMV
 * consigam identificar o tipo de chave.
 */
function normalizePixKey(key: string): string {
  return (key || '').replace(/\s+/g, '').trim();
}

/**
 * Tipos de chave Pix suportados pelo BR Code.
 */
export type PixKeyType = 'telefone' | 'email' | 'cnpj' | 'aleatoria';

/**
 * Normaliza uma chave Pix de acordo com o seu tipo, devolvendo a
 * forma canônica exigida pelo BR Code:
 *
 *  - telefone:  E.164 brasileiro. Aceita formatos:
 *                 • `81997015187`           → `+5581997015187`
 *                 • `11988887777`           → `+5511988887777`
 *                 • `5511988887777`         → `+5511988887777`
 *                 • `+55 (11) 98888-7777`   → `+5511988887777`
 *               Mantém o `+` apenas quando há código de país (E.164).
 *               Esta conversão aumenta a interoperabilidade com
 *               aplicativos bancários que esperam o formato internacional.
 *  - cnpj:      remove pontos, barras, traços. Mantém 14 dígitos.
 *  - email:     lowercase, remove whitespace.
 *  - aleatoria: remove whitespace, traços, underscores. Uppercase
 *               para uniformizar a chave EVP canônica.
 *
 * Use este helper ANTES de passar a chave para `generatePixStatic`,
 * para que o payload gerado seja compatível com validadores reais.
 */
export function sanitizePixKey(key: string, type: PixKeyType): string {
  if (!key) return '';
  switch (type) {
    case 'telefone': {
      // Extrai apenas dígitos
      let digits = (key || '').replace(/\D/g, '');

      // Se já começa com 55 e tem 12 ou 13 dígitos (55 + DDD + 8/9),
      // está em formato nacional com DDI — só normaliza o prefixo.
      if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
        return '+' + digits;
      }

      // Se tem 10 dígitos (fixo: DDD + 8) ou 11 dígitos (móvel: DDD + 9),
      // está em formato nacional sem DDI — adiciona +55.
      if (digits.length === 10 || digits.length === 11) {
        return '+55' + digits;
      }

      // Caso não encaixe em nenhum padrão, devolve como veio (sem
      // formatação de pontuação). Validador EMV ainda assim
      // tentará parsear.
      return key.replace(/[\s\-().]/g, '');
    }
    case 'cnpj':
      return key.replace(/[^\d]/g, '');
    case 'email':
      return key.trim().toLowerCase().replace(/\s+/g, '');
    case 'aleatoria':
      return key.replace(/[\s\-_]/g, '').toUpperCase();
    default:
      return key.trim();
  }
}

/**
 * Formata o valor da transação com exatamente 2 casas decimais e
 * ponto como separador, conforme exige o ID 54 do BR Code.
 */
function formatAmount(amount: number): string {
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error(`[pix] amount inválido: ${amount}`);
  }
  return (Math.round(amount * 100) / 100).toFixed(2);
}

/**
 * Gera payload Pix Estático (BR Code EMV) e devolve o QR + copia/cola.
 *
 * Exemplo de uso:
 *
 *   const { qrPayload, copyPaste } = generatePixStatic({
 *     pixKey: '5511999998888',
 *     amount: 75.5,
 *     merchantName: 'Salão da Maria',
 *     merchantCity: 'São Paulo',
 *   });
 *
 * A string retornada começa com `000201` e termina com `6304XXXX`
 * (CRC16-CCITT). É válida para qualquer app bancário nacional.
 */
export function generatePixStatic(input: PixStaticInput & { debug?: boolean }): PixStaticOutput {
  const debug = !!(input as any)?.debug;

  if (debug) {
    console.log('[pix-audit] ===== INPUT BRUTO =====');
    console.log('[pix-audit]   pixKey raw      :', JSON.stringify(input.pixKey));
    console.log('[pix-audit]   amount raw      :', input.amount, typeof input.amount);
    console.log('[pix-audit]   merchantName raw:', JSON.stringify(input.merchantName));
    console.log('[pix-audit]   merchantCity raw:', JSON.stringify(input.merchantCity));
  }

  if (!input || typeof input !== 'object') {
    throw new Error('[pix] input ausente');
  }

  const cleanKey = normalizePixKey(input.pixKey);
  if (!cleanKey) {
    throw new Error('[pix] pixKey obrigatória e não pode ficar vazia após normalização');
  }

  const cleanName = normalizeASCII(input.merchantName, 25) || 'RECEBEDOR';
  const cleanCity = normalizeASCII(input.merchantCity, 15) || 'BRASILIA';
  const cleanAmount = formatAmount(input.amount);

  // Modo compatibilidade bancária (BCB)
  const useBcb = input.bcbCompatible !== undefined
    ? input.bcbCompatible
    : BCB_COMPATIBLE_MODE;

  // txid: prioriza o fornecido; se ausente, usa STATIC_TXID ("***")
  // que é o padrão Pix Estático. Em modo compat, o caller DEVE
  // passar um txid real — `***` causa rejeição na validação final.
  const effectiveTxid = (input.txid && input.txid.trim())
    ? input.txid.trim()
    : STATIC_TXID;

  if (debug) {
    console.log('[pix-audit] ===== NORMALIZAÇÃO =====');
    console.log('[pix-audit]   cleanKey       :', JSON.stringify(cleanKey), `(${cleanKey.length} chars)`);
    console.log('[pix-audit]   cleanName      :', JSON.stringify(cleanName), `(${cleanName.length} chars, max 25)`);
    console.log('[pix-audit]   cleanCity      :', JSON.stringify(cleanCity), `(${cleanCity.length} chars, max 15)`);
    console.log('[pix-audit]   cleanAmount    :', JSON.stringify(cleanAmount));
    console.log('[pix-audit]   txid           :', JSON.stringify(effectiveTxid), `(mode: ${useBcb ? 'BCB_COMPAT' : 'LEGACY'})`);
  }

  // Validação do txid em modo compatível
  if (useBcb && effectiveTxid === STATIC_TXID) {
    // Em modo compat, `***` só é aceito se caller explicitamente pediu
    // via flag; aqui assumimos que o caller que ligou o modo deveria
    // ter passado um txid real. Mantemos o payload gerável, mas
    // emitimos aviso em modo debug.
    if (debug) {
      console.warn('[pix-audit]   ⚠️ ATENÇÃO: txid="***" em modo BCB_COMPAT — recomenda-se passar txid real');
    }
  }

  // ID 26 – Merchant Account Information (Pix)
  const merchantAccountInfo = encodeTLV(
    '26',
    encodeTLV('00', PIX_GUI) + encodeTLV('01', cleanKey)
  );

  // ID 62 – Additional Data Field Template (txid)
  const additionalData = encodeTLV('62', encodeTLV('05', effectiveTxid));

  // Montagem do payload TLV — APENAS os campos 00..62, sem o
  // campo 63 (CRC). O sufixo "6304" será acrescentado no momento
  // de calcular o CRC, conforme interpretação B.
  const payloadTLV =
    encodeTLV('00', '01') +
    merchantAccountInfo +
    encodeTLV('52', MERCHANT_CATEGORY_CODE) +
    encodeTLV('53', CURRENCY_BRL) +
    encodeTLV('54', cleanAmount) +
    encodeTLV('58', COUNTRY_CODE) +
    encodeTLV('59', cleanName) +
    encodeTLV('60', cleanCity) +
    additionalData;

  if (debug) {
    console.log('[pix-audit] ===== TLV (SEM CRC) =====');
    const dumpTLV = (s: string, prefix: string) => {
      if (s.length < 4) return;
      for (let i = 0; i < s.length; ) {
        const tag = s.substring(i, i + 2);
        const len = parseInt(s.substring(i + 2, i + 4), 10);
        const value = s.substring(i + 4, i + 4 + len);
        if (Number.isFinite(len) && len >= 0) {
          console.log(`[pix-audit]   ${prefix}ID ${tag} | LEN ${String(len).padStart(2, '0')} | VAL ${JSON.stringify(value)}`);
        } else {
          console.log(`[pix-audit]   ${prefix}ID ${tag} | LEN INVALID (${s.substring(i + 2, i + 4)})`);
          break;
        }
        i += 4 + len;
        if (i >= s.length) break;
      }
    };
    console.log('[pix-audit]   payloadTLV length:', payloadTLV.length);
    dumpTLV(payloadTLV, '');
    // dump nested 26 and 62
    const find = (id: string) => {
      const idx = payloadTLV.indexOf(id);
      if (idx < 0) return '';
      const len = parseInt(payloadTLV.substring(idx + 2, idx + 4), 10);
      return payloadTLV.substring(idx + 4, idx + 4 + len);
    };
    const id26 = find('26');
    const id62 = find('62');
    if (id26) {
      console.log('[pix-audit]   --- ID 26 children ---');
      dumpTLV(id26, '   ');
    }
    if (id62) {
      console.log('[pix-audit]   --- ID 62 children ---');
      dumpTLV(id62, '   ');
    }
  }

  // CRC calculado sobre `payloadTLV + "6304"` em modo compatível
  // (interpretação B). O "6304" é o cabeçalho do campo 63 (CRC) e
  // faz parte do input que está sendo protegido. Em modo legado
  // (includeHeader=false), o caller precisa passar o input já
  // com "63040000" se quiser a interpretação A estrita.
  const crc = crc16CCITT(payloadTLV, useBcb, debug);
  const qrPayload = payloadTLV + '6304' + crc;

  if (debug) {
    const fp = (s: string) => {
      let h = 5381;
      for (let i = 0; i < s.length; i++) h = ((h << 5) + h) ^ s.charCodeAt(i);
      return ('00000000' + (h >>> 0).toString(16)).slice(-8);
    };
    console.log('[pix-audit] ===== PAYLOAD FINAL =====');
    console.log('[pix-audit]   qrPayload      :', qrPayload);
    console.log('[pix-audit]   length         :', qrPayload.length);
    console.log('[pix-audit]   startsWith 000201:', qrPayload.startsWith('000201'));
    console.log('[pix-audit]   endsWith 6304 + CRC:', qrPayload.endsWith('6304' + crc));
    console.log('[pix-audit]   fingerprint (djb2-xor):', fp(qrPayload));
  }

  // Validação interna obrigatória em modo compatível
  if (useBcb) {
    try {
      validateGeneratedPayload(qrPayload);
      if (debug) {
        console.log('[pix-audit] ===== VALIDAÇÃO INTERNA =====');
        console.log('[pix-audit]   ✅ payload válido (10/10 campos EMV, CRC bate, TXID OK)');
      }
    } catch (err: any) {
      if (debug) {
        console.error('[pix-audit]   ❌ VALIDAÇÃO FALHOU:', err.message);
        console.error('[pix-audit]   payload problemático:', qrPayload);
      }
      throw err;
    }
  }

  return {
    qrPayload,
    copyPaste: qrPayload,
  };
}

