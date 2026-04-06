const CONFIG = {
  SPREADSHEET_ID: '', // opcional. Se deixar vazio, usa a planilha vinculada ao script.
  SCRIPT_SALT: 'healthpro-2026-minha-chave-super-forte',
  SHEETS: {
    profissionais: 'Profissionais',
    pacientes: 'Pacientes',
    agendamentos: 'Agendamentos',
    treinos: 'Treinos',
    financeiro: 'Financeiro'
  }
};

function doGet() {
  return jsonOutput({ success: true, status: 'HealthPro API online ✅', timestamp: new Date().toISOString() });
}

function doOptions() {
  return HtmlService
    .createHtmlOutput('')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('Access-Control-Allow-Origin', '*')
    .addMetaTag('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
    .addMetaTag('Access-Control-Allow-Headers', 'Content-Type');
}

function doPost(e) {
  try {
    const body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const action = body.action;
    const data = body.data || {};

    switch (action) {
      case 'ping': return jsonOutput({ success: true, pong: true });
      case 'registerProfissional': return jsonOutput(registerProfissional(data));
      case 'loginProfissional': return jsonOutput(loginProfissional(data));
      case 'addPaciente': return jsonOutput(addPaciente(data));
      case 'getPacientes': return jsonOutput(getPacientes(data));
      case 'updatePaciente': return jsonOutput(updatePaciente(data));
      case 'deletePaciente': return jsonOutput(deletePaciente(data));
      case 'addAgendamento': return jsonOutput(addAgendamento(data));
      case 'getAgendamentos': return jsonOutput(getAgendamentos(data));
      case 'updateAgendamento': return jsonOutput(updateAgendamento(data));
      case 'deleteAgendamento': return jsonOutput(deleteAgendamento(data));
      case 'addTreino': return jsonOutput(addTreino(data));
      case 'getTreinos': return jsonOutput(getTreinos(data));
      case 'updateTreino': return jsonOutput(updateTreino(data));
      case 'deleteTreino': return jsonOutput(deleteTreino(data));
      case 'addLancamento': return jsonOutput(addLancamento(data));
      case 'getLancamentos': return jsonOutput(getLancamentos(data));
      default: return jsonOutput({ success: false, error: 'Ação inválida: ' + action });
    }
  } catch (err) {
    return jsonOutput({ success: false, error: err.message, stack: String(err.stack || '') });
  }
}

function registerProfissional(data) {
  validateRequired(data, ['nome', 'email', 'senha']);
  const sheet = getSheet(CONFIG.SHEETS.profissionais, PROFISSIONAIS_HEADERS);
  const rows = getObjects(sheet);
  const email = normalizeEmail(data.email);
  if (rows.some(r => normalizeEmail(r.Email) === email)) {
    return { success: false, error: 'Email já cadastrado.' };
  }

  const now = new Date().toISOString();
  const record = {
    ID: createId('prof'),
    Nome: String(data.nome || '').trim(),
    Email: email,
    Telefone: String(data.telefone || '').trim(),
    Especialidade: String(data.especialidade || '').trim(),
    Registro_Profissional: String(data.registro || '').trim(),
    Senha_Hash: hashPassword(data.senha),
    Plano: 'FREE',
    Status_Assinatura: 'ativo',
    Stripe_Customer_ID: '',
    Criado_Em: now,
    Atualizado_Em: now,
    Ultimo_Login_Em: ''
  };
  appendObject(sheet, PROFISSIONAIS_HEADERS, record);
  return { success: true, id: record.ID, plano: record.Plano };
}

function loginProfissional(data) {
  validateRequired(data, ['email', 'senha']);
  const sheet = getSheet(CONFIG.SHEETS.profissionais, PROFISSIONAIS_HEADERS);
  const rows = getObjects(sheet);
  const email = normalizeEmail(data.email);
  const hash = hashPassword(data.senha);
  const prof = rows.find(r => normalizeEmail(r.Email) === email && String(r.Senha_Hash || '') === hash);
  if (!prof) return { success: false, error: 'Email ou senha incorretos.' };

  updateRowById(sheet, PROFISSIONAIS_HEADERS, prof.ID, {
    Ultimo_Login_Em: new Date().toISOString(),
    Atualizado_Em: new Date().toISOString()
  });

  return {
    success: true,
    profissional: {
      ID: prof.ID,
      Nome: prof.Nome,
      Email: prof.Email,
      Telefone: prof.Telefone,
      Especialidade: prof.Especialidade,
      CRP_CRN_CREF: prof.Registro_Profissional,
      Plano: (prof.Plano || 'FREE').toLowerCase(),
      Status_Assinatura: prof.Status_Assinatura || 'ativo'
    }
  };
}

function addPaciente(data) {
  validateRequired(data, ['profId', 'nome']);
  const sheet = getSheet(CONFIG.SHEETS.pacientes, PACIENTES_HEADERS);
  const rows = getObjects(sheet).filter(r => r.Prof_ID === data.profId && (r.Status || 'ativo') !== 'inativo');
  const cpf = normalizeCpf(data.cpf);
  const nome = normalizeText(data.nome);
  const email = normalizeEmail(data.email || '');
  const dup = rows.find(r =>
    (cpf && normalizeCpf(r.CPF) === cpf) ||
    (nome && normalizeText(r.Nome) === nome) ||
    (email && normalizeEmail(r.Email) === email)
  );
  if (dup) return { success: false, error: 'Paciente já cadastrado!', paciente: dup, isDuplicate: true };

  const now = new Date().toISOString();
  const record = {
    ID: createId('pac'),
    Prof_ID: data.profId,
    Nome: String(data.nome || '').trim(),
    CPF: String(data.cpf || '').trim(),
    Email: String(data.email || '').trim(),
    Telefone: String(data.telefone || '').trim(),
    Data_Nascimento: String(data.dataNascimento || '').trim(),
    Sexo: String(data.sexo || '').trim(),
    Convenio: String(data.convenio || '').trim(),
    Observacoes: String(data.observacoes || '').trim(),
    Status: 'ativo',
    Data_Cadastro: now,
    Atualizado_Em: now
  };
  appendObject(sheet, PACIENTES_HEADERS, record);
  return { success: true, id: record.ID };
}

function getPacientes(data) {
  validateRequired(data, ['profId']);
  const rows = getObjects(getSheet(CONFIG.SHEETS.pacientes, PACIENTES_HEADERS))
    .filter(r => r.Prof_ID === data.profId && (r.Status || 'ativo') === 'ativo');
  return { success: true, pacientes: rows };
}

function updatePaciente(data) {
  validateRequired(data, ['id']);
  const sheet = getSheet(CONFIG.SHEETS.pacientes, PACIENTES_HEADERS);
  updateRowById(sheet, PACIENTES_HEADERS, data.id, {
    Nome: String(data.nome || '').trim(),
    CPF: String(data.cpf || '').trim(),
    Email: String(data.email || '').trim(),
    Telefone: String(data.telefone || '').trim(),
    Data_Nascimento: String(data.dataNascimento || '').trim(),
    Sexo: String(data.sexo || '').trim(),
    Convenio: String(data.convenio || '').trim(),
    Observacoes: String(data.observacoes || '').trim(),
    Atualizado_Em: new Date().toISOString()
  });
  return { success: true };
}

function deletePaciente(data) {
  validateRequired(data, ['id']);
  const sheet = getSheet(CONFIG.SHEETS.pacientes, PACIENTES_HEADERS);
  updateRowById(sheet, PACIENTES_HEADERS, data.id, { Status: 'inativo', Atualizado_Em: new Date().toISOString() });
  return { success: true };
}

function addAgendamento(data) {
  validateRequired(data, ['profId', 'data', 'horaInicio']);
  const sheet = getSheet(CONFIG.SHEETS.agendamentos, AGENDAMENTOS_HEADERS);
  const record = {
    ID: createId('agd'),
    Prof_ID: data.profId,
    Paciente_ID: String(data.pacienteId || '').trim(),
    Paciente_Nome: String(data.pacienteNome || '').trim(),
    Data: String(data.data || '').trim(),
    Hora_Inicio: String(data.horaInicio || '').trim(),
    Hora_Fim: String(data.horaFim || '').trim(),
    Tipo: String(data.tipo || 'consulta').trim(),
    Status: String(data.status || 'agendado').trim(),
    Valor: Number(data.valor || 0),
    Observacoes: String(data.observacoes || '').trim(),
    Criado_Em: new Date().toISOString(),
    Atualizado_Em: new Date().toISOString()
  };
  appendObject(sheet, AGENDAMENTOS_HEADERS, record);
  return { success: true, id: record.ID };
}

function getAgendamentos(data) {
  validateRequired(data, ['profId']);
  const rows = getObjects(getSheet(CONFIG.SHEETS.agendamentos, AGENDAMENTOS_HEADERS))
    .filter(r => r.Prof_ID === data.profId);
  return { success: true, agendamentos: rows };
}

function updateAgendamento(data) {
  validateRequired(data, ['id']);
  const sheet = getSheet(CONFIG.SHEETS.agendamentos, AGENDAMENTOS_HEADERS);
  updateRowById(sheet, AGENDAMENTOS_HEADERS, data.id, {
    Paciente_ID: String(data.pacienteId || '').trim(),
    Paciente_Nome: String(data.pacienteNome || '').trim(),
    Data: String(data.data || '').trim(),
    Hora_Inicio: String(data.horaInicio || '').trim(),
    Hora_Fim: String(data.horaFim || '').trim(),
    Tipo: String(data.tipo || 'consulta').trim(),
    Status: String(data.status || 'agendado').trim(),
    Valor: Number(data.valor || 0),
    Observacoes: String(data.observacoes || '').trim(),
    Atualizado_Em: new Date().toISOString()
  });
  return { success: true };
}

function deleteAgendamento(data) {
  validateRequired(data, ['id']);
  updateRowById(getSheet(CONFIG.SHEETS.agendamentos, AGENDAMENTOS_HEADERS), AGENDAMENTOS_HEADERS, data.id, {
    Status: 'cancelado',
    Atualizado_Em: new Date().toISOString()
  });
  return { success: true };
}

function addTreino(data) {
  validateRequired(data, ['profId', 'nomeTreino', 'modalidade']);
  const sheet = getSheet(CONFIG.SHEETS.treinos, TREINOS_HEADERS);
  const record = {
    ID: createId('trn'),
    Prof_ID: data.profId,
    Paciente_ID: String(data.pacienteId || '').trim(),
    Paciente_Nome: String(data.pacienteNome || '').trim(),
    Nome_Treino: String(data.nomeTreino || '').trim(),
    Modalidade: String(data.modalidade || '').trim(),
    Exercicios_JSON: JSON.stringify(data.exercicios || []),
    Observacoes: String(data.observacoes || '').trim(),
    Status: 'ativo',
    Data_Criacao: new Date().toISOString(),
    Atualizado_Em: new Date().toISOString()
  };
  appendObject(sheet, TREINOS_HEADERS, record);
  return { success: true, id: record.ID };
}

function getTreinos(data) {
  validateRequired(data, ['profId']);
  const rows = getObjects(getSheet(CONFIG.SHEETS.treinos, TREINOS_HEADERS))
    .filter(r => r.Prof_ID === data.profId && (r.Status || 'ativo') === 'ativo');
  return { success: true, treinos: rows };
}

function updateTreino(data) {
  validateRequired(data, ['id']);
  updateRowById(getSheet(CONFIG.SHEETS.treinos, TREINOS_HEADERS), TREINOS_HEADERS, data.id, {
    Paciente_ID: String(data.pacienteId || '').trim(),
    Paciente_Nome: String(data.pacienteNome || '').trim(),
    Nome_Treino: String(data.nomeTreino || '').trim(),
    Modalidade: String(data.modalidade || '').trim(),
    Exercicios_JSON: JSON.stringify(data.exercicios || []),
    Observacoes: String(data.observacoes || '').trim(),
    Atualizado_Em: new Date().toISOString()
  });
  return { success: true };
}

function deleteTreino(data) {
  validateRequired(data, ['id']);
  updateRowById(getSheet(CONFIG.SHEETS.treinos, TREINOS_HEADERS), TREINOS_HEADERS, data.id, {
    Status: 'inativo',
    Atualizado_Em: new Date().toISOString()
  });
  return { success: true };
}

function addLancamento(data) {
  validateRequired(data, ['profId', 'tipo', 'valor', 'data']);
  const sheet = getSheet(CONFIG.SHEETS.financeiro, FINANCEIRO_HEADERS);
  const record = {
    ID: createId('fin'),
    Prof_ID: data.profId,
    Paciente_ID: String(data.pacienteId || '').trim(),
    Descricao: String(data.descricao || '').trim(),
    Tipo: String(data.tipo || '').trim(),
    Valor: Number(data.valor || 0),
    Data: String(data.data || '').trim(),
    Forma_Pagamento: String(data.formaPagamento || '').trim(),
    Status: 'recebido',
    Observacoes: String(data.observacoes || '').trim(),
    Criado_Em: new Date().toISOString(),
    Atualizado_Em: new Date().toISOString()
  };
  appendObject(sheet, FINANCEIRO_HEADERS, record);
  return { success: true, id: record.ID };
}

function getLancamentos(data) {
  validateRequired(data, ['profId']);
  let rows = getObjects(getSheet(CONFIG.SHEETS.financeiro, FINANCEIRO_HEADERS))
    .filter(r => r.Prof_ID === data.profId);
  if (data.mes) rows = rows.filter(r => String(r.Data || '').indexOf(data.mes) === 0);
  return { success: true, lancamentos: rows };
}

const PROFISSIONAIS_HEADERS = [
  'ID','Nome','Email','Telefone','Especialidade','Registro_Profissional','Senha_Hash','Plano','Status_Assinatura','Stripe_Customer_ID','Criado_Em','Atualizado_Em','Ultimo_Login_Em'
];
const PACIENTES_HEADERS = [
  'ID','Prof_ID','Nome','CPF','Email','Telefone','Data_Nascimento','Sexo','Convenio','Observacoes','Status','Data_Cadastro','Atualizado_Em'
];
const AGENDAMENTOS_HEADERS = [
  'ID','Prof_ID','Paciente_ID','Paciente_Nome','Data','Hora_Inicio','Hora_Fim','Tipo','Status','Valor','Observacoes','Criado_Em','Atualizado_Em'
];
const TREINOS_HEADERS = [
  'ID','Prof_ID','Paciente_ID','Paciente_Nome','Nome_Treino','Modalidade','Exercicios_JSON','Observacoes','Status','Data_Criacao','Atualizado_Em'
];
const FINANCEIRO_HEADERS = [
  'ID','Prof_ID','Paciente_ID','Descricao','Tipo','Valor','Data','Forma_Pagamento','Status','Observacoes','Criado_Em','Atualizado_Em'
];

function getSpreadsheet() {
  return CONFIG.SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(name, headers) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  ensureHeaders(sheet, headers);
  return sheet;
}

function ensureHeaders(sheet, headers) {
  const current = sheet.getLastColumn() ? sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0] : [];
  const same = headers.length === current.length && headers.every((h, i) => String(current[i] || '') === h);
  if (!same) sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
}

function getObjects(sheet) {
  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  if (lastRow < 2 || lastCol === 0) return [];
  const values = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  const headers = values[0];
  return values.slice(1).filter(r => r.some(cell => cell !== '')).map(row => {
    const obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function appendObject(sheet, headers, obj) {
  const row = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  sheet.appendRow(row);
}

function updateRowById(sheet, headers, id, updates) {
  const rows = getObjects(sheet);
  const index = rows.findIndex(r => String(r.ID) === String(id));
  if (index === -1) throw new Error('Registro não encontrado: ' + id);
  const rowNumber = index + 2;
  const current = rows[index];
  const merged = headers.map(h => updates[h] !== undefined ? updates[h] : current[h]);
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([merged]);
}

function validateRequired(data, fields) {
  fields.forEach(function(field) {
    const value = data[field];
    if (value === undefined || value === null || String(value).trim() === '') {
      throw new Error('Campo obrigatório: ' + field);
    }
  });
}

function hashPassword(raw) {
  const input = String(raw || '') + '|' + CONFIG.SCRIPT_SALT;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, input, Utilities.Charset.UTF_8);
  return bytes.map(function(b) {
    const v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function createId(prefix) {
  return prefix + '_' + Utilities.getUuid().replace(/-/g, '').slice(0, 20);
}

function normalizeEmail(v) {
  return String(v || '').trim().toLowerCase();
}

function normalizeCpf(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeText(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function jsonOutput(obj) {
  return HtmlService
    .createHtmlOutput(JSON.stringify(obj))
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function test() {
  const sheet = getSheet(CONFIG.SHEETS.profissionais, PROFISSIONAIS_HEADERS);
  Logger.log(sheet.getName());
}