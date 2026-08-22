// Custom sign hook do electron-builder (win.sign na versão 24).
// Assina os .exe do Windows (todas as marcas) com o certificado Certum Cloud Code Signing
// (SimplySign) usando Jsign — roda direto no Mac, sem VM Windows.
//
// PRÉ-REQUISITO (só isso): o app "SimplySign Desktop" precisa estar aberto e
// conectado (menu na barra do topo -> Connect with cloud). A sessão dura ~2h.
// Se cair, o cartão some e este script pula a assinatura com um aviso.
//
// O cartão é PINLESS: não precisa de PIN nenhum (validado em 2026-08-12).
// Se um dia passar a pedir, basta exportar SIMPLYSIGN_PIN.
//
// Ver memória "certificado-code-signing-certum".

const { execFile } = require('child_process');
const { promisify } = require('util');
const { writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const { tmpdir } = require('os');

const execFileAsync = promisify(execFile);

const PKCS11_LIB = process.env.SIMPLYSIGN_LIB || '/usr/local/lib/libSimplySignPKCS.dylib';
const TSA_URL = process.env.SIMPLYSIGN_TSA_URL || 'http://time.certum.pl';
// Alias = número de série do certificado (é assim que o cartão o identifica,
// NÃO pelo nome do titular).
const ALIAS = process.env.SIMPLYSIGN_ALIAS || '3AB2E5FA2915CED6472FB5475A771C22';

function avisarPulado(filePath, motivo) {
  console.warn('');
  console.warn('  ⚠️  ASSINATURA PULADA — o instalador vai sair SEM ASSINATURA.');
  console.warn(`     Arquivo: ${filePath}`);
  console.warn(`     Motivo:  ${motivo}`);
  console.warn('     Como resolver: abrir o "SimplySign Desktop", clicar no ícone da');
  console.warn('     barra do topo -> "Connect with cloud" e refazer o login.');
  console.warn('');
}

exports.default = async function (configuration) {
  const filePath = configuration.path;

  if (!existsSync(PKCS11_LIB)) {
    avisarPulado(filePath, `biblioteca do SimplySign não encontrada em ${PKCS11_LIB}`);
    return;
  }

  const configPath = join(tmpdir(), 'simplysign-pkcs11.cfg');
  writeFileSync(configPath, `name=SimplySignPKCS\nlibrary=${PKCS11_LIB}\nslotListIndex=0\n`);

  const args = [
    '--storetype', 'PKCS11',
    '--keystore', configPath,
    '--alias', ALIAS,
    '--tsaurl', TSA_URL,
    '--tsmode', 'RFC3161',
    '--alg', 'SHA-256',
    '--replace',
    filePath,
  ];
  if (process.env.SIMPLYSIGN_PIN) {
    args.splice(4, 0, '--storepass', process.env.SIMPLYSIGN_PIN);
  }

  console.log(`[sign-windows] Assinando ${filePath} (Certum SimplySign)...`);

  try {
    const { stdout } = await execFileAsync('jsign', args);
    if (stdout) console.log(stdout.trim());
  } catch (err) {
    const saida = `${err.stdout || ''}${err.stderr || ''}${err.message || ''}`;
    // Cartão fora do ar = sessão do SimplySign caiu. Não quebra o build.
    if (/No slots|CKR_TOKEN_NOT_PRESENT|keystore is empty|No certificate found/i.test(saida)) {
      avisarPulado(filePath, 'o SimplySign Desktop não está conectado (nenhum cartão visível)');
      return;
    }
    // Sessão EXPIRADA é diferente de cartão ausente: o cartão continua montado
    // (pkcs11-tool -T mostra o slot, a chave pública aparece), mas o backend da
    // Certum recusa a operação e TODA assinatura falha com CKR_FUNCTION_FAILED
    // no C_SignFinal — inclusive fora do jsign. Sem este caso, o build inteiro
    // abortava antes de gerar o .exe (visto em 2026-08-21).
    if (/CKR_FUNCTION_FAILED|CKR_USER_NOT_LOGGED_IN|CKR_SESSION_HANDLE_INVALID/i.test(saida)) {
      avisarPulado(filePath, 'a sessão do SimplySign expirou (cartão montado, mas o C_SignFinal falha)');
      return;
    }
    throw err;
  }

  console.log(`[sign-windows] ✓ ${filePath} assinado.`);
};
