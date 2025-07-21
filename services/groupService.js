const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
const GROUPS_FILE = path.join(DATA_DIR, 'groups.json');
const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const CITIES_FILE = path.join(DATA_DIR, 'cities.json');
const CITIES_MESSAGE_DIR = path.join(DATA_DIR, 'citiesMessageTxt');
const DEFAULT_MODE = 'SINGLE';

class GroupService {
  constructor() {
    this.groups = [];
    this.config = { mode: DEFAULT_MODE };
    this._ensureDataDirExists();
    this._loadData();
  }

  /* ──────────────────────────────
     utilidades internas
  ────────────────────────────── */
  _ensureDataDirExists() {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    // Garantir que o diretório de mensagens também existe
    if (!fs.existsSync(CITIES_MESSAGE_DIR)) {
      fs.mkdirSync(CITIES_MESSAGE_DIR, { recursive: true });
    }
  }

  /**
   * Carrega mensagem personalizada do arquivo .txt
   * @param {string} cityId - ID da cidade
   * @returns {string|null} - Mensagem ou null se não existir
   */
  _loadCityMessage(cityId) {
    try {
      const messagePath = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
      if (fs.existsSync(messagePath)) {
        const message = fs.readFileSync(messagePath, 'utf8').trim();
        console.log(`[DEBUG] Mensagem carregada para cidade ${cityId}: ${message.substring(0, 50)}...`);
        return message;
      }
      console.log(`[DEBUG] Arquivo de mensagem não encontrado para cidade ${cityId}`);
      return null;
    } catch (error) {
      console.error(`[DEBUG] Erro ao carregar mensagem para cidade ${cityId}:`, error);
      return null;
    }
  }

  /**
   * Salva mensagem personalizada no arquivo .txt
   * @param {string} cityId - ID da cidade
   * @param {string} message - Mensagem a ser salva
   */
  _saveCityMessage(cityId, message) {
    try {
      if (!message || !message.trim()) {
        // Se mensagem vazia, remove o arquivo
        const messagePath = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
        if (fs.existsSync(messagePath)) {
          fs.unlinkSync(messagePath);
          console.log(`[DEBUG] Arquivo de mensagem removido para cidade ${cityId}`);
        }
        return;
      }

      const messagePath = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
      fs.writeFileSync(messagePath, message.trim(), 'utf8');
      console.log(`[DEBUG] Mensagem salva para cidade ${cityId}`);
    } catch (error) {
      console.error(`[DEBUG] Erro ao salvar mensagem para cidade ${cityId}:`, error);
    }
  }

  /**
   * Remove arquivo de mensagem quando cidade é deletada
   * @param {string} cityId - ID da cidade
   */
  _deleteCityMessage(cityId) {
    try {
      const messagePath = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
      if (fs.existsSync(messagePath)) {
        fs.unlinkSync(messagePath);
        console.log(`[DEBUG] Arquivo de mensagem removido para cidade ${cityId}`);
      }
    } catch (error) {
      console.error(`[DEBUG] Erro ao remover mensagem para cidade ${cityId}:`, error);
    }
  }

  _loadData() {
    try {
      // PRIORIDADE 1: Carregar cidades do cities.json
      console.log('[DEBUG] Verificando existência do cities.json:', CITIES_FILE);
      console.log('[DEBUG] Arquivo existe?', fs.existsSync(CITIES_FILE));
      
      if (fs.existsSync(CITIES_FILE)) {
        console.log('[DEBUG] Carregando cities.json...');
        const rawData = fs.readFileSync(CITIES_FILE, 'utf8');
        console.log('[DEBUG] Dados brutos do cities.json:', rawData);
        
        const citiesData = JSON.parse(rawData);
        console.log('[DEBUG] Dados parseados:', citiesData);
        console.log('[DEBUG] Tipo dos dados:', Array.isArray(citiesData) ? 'Array' : typeof citiesData);
        
        if (!Array.isArray(citiesData)) {
          console.error('[DEBUG] cities.json não é um array válido');
          throw new Error('cities.json deve conter um array');
        }
        
        // Converter formato cities.json para formato groups
        this.groups = citiesData.map(city => {
          console.log('[DEBUG] Processando cidade:', city);
          
          // Carregar mensagem do arquivo .txt (não do JSON)
          const messageFromFile = this._loadCityMessage(city.id);
          
          return {
            id: city.id,
            link: city.link,
            name: city.name.toLowerCase(),
            descricao: city.name.toLowerCase(), // usar name como descrição
            isPrimary: city.isPrimary || false,
            createdAt: city.createdAt || new Date().toISOString(),
            updatedAt: city.updatedAt || new Date().toISOString(),
            // Não armazenar message aqui - será carregada dinamicamente
            _messageFromFile: messageFromFile // Cache temporário interno
          };
        });
        
        console.log(`[DEBUG] Carregadas ${this.groups.length} cidades do cities.json`);
        console.log('[DEBUG] Grupos após conversão:', this.groups.map(g => ({
          id: g.id,
          name: g.name,
          hasMessage: !!g._messageFromFile
        })));
      }
      // FALLBACK: Carregar do groups.json se cities.json não existir
      else if (fs.existsSync(GROUPS_FILE)) {
        console.log('[DEBUG] cities.json não encontrado, tentando groups.json...');
        this.groups = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'));
        
        // Para grupos carregados do formato antigo, tentar carregar mensagens dos arquivos
        this.groups.forEach(group => {
          const messageFromFile = this._loadCityMessage(group.id);
          if (messageFromFile) {
            group._messageFromFile = messageFromFile;
          }
        });
        
        console.log(`[DEBUG] Carregadas ${this.groups.length} grupos do groups.json`);
      } else {
        console.log('[DEBUG] Nenhum arquivo de dados encontrado, inicializando array vazio');
        this.groups = [];
        this._saveGroups();
      }

      // config
      if (fs.existsSync(CONFIG_FILE)) {
        console.log('[DEBUG] Carregando config.json...');
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } else {
        console.log('[DEBUG] config.json não encontrado, criando com padrões...');
        this.config = { mode: DEFAULT_MODE };
        this._saveConfig();
      }

      // garante grupo primário em SINGLE
      if (this.config.mode === 'SINGLE' &&
          this.groups.length &&
          !this.groups.some(g => g.isPrimary)) {
        this.groups[0].isPrimary = true;
        this._saveGroups();
      }

      // DEBUG: Log da estrutura carregada
      console.log(`[DEBUG] Total de grupos carregados: ${this.groups.length}`);
      console.log('[DEBUG] Estrutura dos grupos:', this.groups.map(g => ({
        id: g.id,
        name: g.name,
        isPrimary: g.isPrimary,
        hasMessage: !!g._messageFromFile
      })));

    } catch (err) {
      console.error('[DEBUG] Erro ao carregar dados - Detalhes completos:', err);
      console.error('[DEBUG] Stack trace:', err.stack);
      console.error('[DEBUG] Arquivo cities.json existe?', fs.existsSync(CITIES_FILE));
      console.error('[DEBUG] Caminho absoluto do cities.json:', path.resolve(CITIES_FILE));
      
      // Tentar ler o arquivo mesmo assim para debug
      try {
        if (fs.existsSync(CITIES_FILE)) {
          const rawContent = fs.readFileSync(CITIES_FILE, 'utf8');
          console.error('[DEBUG] Conteúdo bruto do arquivo:', rawContent.substring(0, 200));
        }
      } catch (readErr) {
        console.error('[DEBUG] Erro ao tentar ler o arquivo para debug:', readErr);
      }
      
      this.groups = [];
      this.config = { mode: DEFAULT_MODE };
    }
  }

  _saveGroups() { 
    fs.writeFileSync(GROUPS_FILE, JSON.stringify(this.groups, null, 2)); 
    
    // NOVO: Também salvar no formato cities.json para manter compatibilidade
    if (this.groups.length > 0) {
      const citiesFormat = this.groups.map(group => ({
        id: group.id,
        name: group.name.charAt(0).toUpperCase() + group.name.slice(1), // Capitalizar
        link: group.link,
        // Não salvar message no JSON - fica apenas nos arquivos .txt
        isPrimary: group.isPrimary,
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }));
      
      try {
        fs.writeFileSync(CITIES_FILE, JSON.stringify(citiesFormat, null, 2));
        console.log('[DEBUG] cities.json atualizado (sem mensagens inline)');
      } catch (err) {
        console.error('Erro ao salvar cities.json:', err);
      }
    }
  }
  
  _saveConfig() { 
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2)); 
  }

  /* ──────────────────────────────
     CRUD de grupos
  ────────────────────────────── */
  addGroup(link, setAsPrimary = false, name = '', descricao = '', message = '') {
    const newGroup = {
      id: Date.now().toString(),
      link,
      name: name.toLowerCase(),          // opcional
      descricao: descricao.toLowerCase(),// opcional
      isPrimary: setAsPrimary || !this.groups.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    if (newGroup.isPrimary) this.groups.forEach(g => g.isPrimary = false);
    
    // Salvar mensagem em arquivo separado se fornecida
    if (message && message.trim()) {
      this._saveCityMessage(newGroup.id, message);
      newGroup._messageFromFile = message; // Cache temporário
    }
    
    this.groups.push(newGroup);
    this._saveGroups();
    return newGroup;
  }

  updateGroup(id, updates = {}) {
    const group = this.groups.find(g => g.id === id);
    if (!group) return false;

    // Se há mensagem nos updates, salvar em arquivo separado
    if (updates.hasOwnProperty('message')) {
      this._saveCityMessage(id, updates.message);
      group._messageFromFile = updates.message; // Atualizar cache
      delete updates.message; // Remover do objeto antes de fazer assign
    }

    Object.assign(group, updates, { updatedAt: new Date().toISOString() });
    this._saveGroups();
    return true;
  }

  deleteGroup(id) {
    const idx = this.groups.findIndex(g => g.id === id);
    if (idx === -1) return false;

    const [removed] = this.groups.splice(idx, 1);
    
    // Remover arquivo de mensagem
    this._deleteCityMessage(id);
    
    if (removed.isPrimary && this.groups.length) this.groups[0].isPrimary = true;
    this._saveGroups();
    return true;
  }

  setPrimaryGroup(id) {
    const group = this.groups.find(g => g.id === id);
    if (!group) return false;

    this.groups.forEach(g => g.isPrimary = false);
    group.isPrimary = true;
    group.updatedAt = new Date().toISOString();
    this._saveGroups();
    return true;
  }

  /* ──────────────────────────────
     getters
  ────────────────────────────── */
  getPrimaryGroup() { 
    const primary = this.groups.find(g => g.isPrimary) || this.groups[0];
    if (primary) {
      // Enriquecer com mensagem do arquivo
      return this._enrichGroupWithMessage(primary);
    }
    return primary;
  }
  
  getPrimaryGroupLink() { 
    const g = this.getPrimaryGroup(); 
    return g ? g.link : ''; 
  }
  
  getAllGroupLinks() { 
    return this.groups.map(g => g.link); 
  }
  
  getAllGroups() { 
    console.log(`[DEBUG] getAllGroups() retornando ${this.groups.length} grupos`);
    // Enriquecer todos os grupos com suas mensagens
    return this.groups.map(group => this._enrichGroupWithMessage(group));
  }
  
  getGroupById(id) { 
    const group = this.groups.find(g => g.id === id);
    return group ? this._enrichGroupWithMessage(group) : null;
  }
  
  getCurrentMode() { 
    return this.config.mode; 
  }

  getActiveGroups() {
    if (this.config.mode === 'SINGLE') {
      const primary = this.getPrimaryGroup();
      return primary ? [primary] : [];
    }
    console.log(`[DEBUG] Modo MULTI: retornando ${this.groups.length} grupos ativos`);
    return this.getAllGroups(); // Já enriquecidos com mensagens
  }

  /**
   * Enriquece um grupo com sua mensagem do arquivo .txt
   * @param {Object} group - Objeto do grupo
   * @returns {Object} - Grupo enriquecido com propriedade 'message'
   */
  _enrichGroupWithMessage(group) {
    if (!group) return group;
    
    // Criar uma cópia para não modificar o original
    const enrichedGroup = { ...group };
    
    // Usar cache se disponível, senão carregar do arquivo
    let message = group._messageFromFile;
    if (!message) {
      message = this._loadCityMessage(group.id);
    }
    
    // Adicionar mensagem ou usar padrão
    enrichedGroup.message = message || `Bem vindo a ${group.name}`;
    
    // Remover cache interno do objeto retornado
    delete enrichedGroup._messageFromFile;
    
    return enrichedGroup;
  }

  /* ──────────────────────────────
     modo de operação
  ────────────────────────────── */
  setMode(newMode) {
    if (!['SINGLE', 'MULTI'].includes(newMode)) return false;
    console.log(`[DEBUG] Alterando modo de ${this.config.mode} para ${newMode}`);
    this.config.mode = newMode;
    this._saveConfig();

    if (newMode === 'SINGLE' && this.groups.length && !this.groups.some(g => g.isPrimary)) {
      this.groups[0].isPrimary = true;
      this._saveGroups();
    }
    return true;
  }

  moveToFirstPosition(groupId) {
    const idx = this.groups.findIndex(g => g.id === groupId);
    if (idx > 0) {
      const [g] = this.groups.splice(idx, 1);
      this.groups.unshift(g);
      this._saveGroups();
      return true;
    }
    return false;
  }

  /* ──────────────────────────────
     NOVO: encontrar cidade pelo input
     - aceita texto (nome/descrição) ou número do menu (1,2,3...)
  ────────────────────────────── */
  findCityByInput(input, cityList = []) {
    if (!input) return null;
    const entrada = input.toString().trim().toLowerCase();

    // Use a lista interna se nenhuma for fornecida (enriquecida com mensagens)
    const listaParaUsar = cityList.length > 0 ? cityList : this.getAllGroups();

    console.log(`[DEBUG] findCityByInput: "${entrada}" em lista de ${listaParaUsar.length} itens`);

    // 1) Se for número, usa índice baseado na lista fornecida
    if (/^\d+$/.test(entrada)) {
      const idx = parseInt(entrada, 10) - 1;
      const resultado = listaParaUsar[idx] || null;
      console.log(`[DEBUG] Busca por índice ${idx + 1}: ${resultado ? resultado.name : 'não encontrado'}`);
      return resultado;
    }

    // 2) Match exato
    const resultado = listaParaUsar.find(g =>
      g.name === entrada || g.descricao === entrada
    ) || null;
    
    console.log(`[DEBUG] Busca exata por "${entrada}": ${resultado ? resultado.name : 'não encontrado'}`);
    return resultado;
  }

  /* ──────────────────────────────
     NOVO: método para recarregar dados
  ────────────────────────────── */
  reloadData() {
    console.log('[DEBUG] Recarregando dados do GroupService...');
    this._loadData();
  }

  /* ──────────────────────────────
     NOVO: métodos para gerenciar mensagens
  ────────────────────────────── */
  
  /**
   * Atualiza apenas a mensagem de uma cidade
   * @param {string} cityId - ID da cidade
   * @param {string} message - Nova mensagem
   */
  updateCityMessage(cityId, message) {
    const group = this.groups.find(g => g.id === cityId);
    if (!group) return false;
    
    this._saveCityMessage(cityId, message);
    group._messageFromFile = message; // Atualizar cache
    group.updatedAt = new Date().toISOString();
    this._saveGroups(); // Atualizar timestamp
    
    return true;
  }

  /**
   * Obtém mensagem de uma cidade específica
   * @param {string} cityId - ID da cidade
   */
  getCityMessage(cityId) {
    return this._loadCityMessage(cityId) || `Bem vindo a ${this.getGroupById(cityId)?.name || 'nossa cidade'}`;
  }

  /**
   * Lista arquivos de mensagem órfãos (sem cidade correspondente)
   */
  getOrphanMessageFiles() {
    try {
      const messageFiles = fs.readdirSync(CITIES_MESSAGE_DIR)
        .filter(file => file.endsWith('.txt'))
        .map(file => file.replace('.txt', ''));
      
      const validCityIds = this.groups.map(g => g.id);
      const orphans = messageFiles.filter(fileId => !validCityIds.includes(fileId));
      
      return orphans.map(orphanId => ({
        id: orphanId,
        file: `${orphanId}.txt`,
        path: path.join(CITIES_MESSAGE_DIR, `${orphanId}.txt`)
      }));
    } catch (error) {
      console.error('[DEBUG] Erro ao buscar arquivos órfãos:', error);
      return [];
    }
  }

  /**
   * Remove arquivos de mensagem órfãos
   */
  cleanupOrphanMessageFiles() {
    const orphans = this.getOrphanMessageFiles();
    orphans.forEach(orphan => {
      try {
        fs.unlinkSync(orphan.path);
        console.log(`[DEBUG] Arquivo órfão removido: ${orphan.file}`);
      } catch (error) {
        console.error(`[DEBUG] Erro ao remover arquivo órfão ${orphan.file}:`, error);
      }
    });
    return orphans.length;
  }

  /* ──────────────────────────────
     NOVO: método para debug
  ────────────────────────────── */
  getDebugInfo() {
    const orphans = this.getOrphanMessageFiles();
    
    return {
      totalGroups: this.groups.length,
      mode: this.config.mode,
      primaryGroup: this.getPrimaryGroup()?.name || 'nenhum',
      citiesFileExists: fs.existsSync(CITIES_FILE),
      citiesFilePath: path.resolve(CITIES_FILE),
      groupsFileExists: fs.existsSync(GROUPS_FILE),
      groupsFilePath: path.resolve(GROUPS_FILE),
      configFileExists: fs.existsSync(CONFIG_FILE),
      messagesDirExists: fs.existsSync(CITIES_MESSAGE_DIR),
      messagesDirPath: path.resolve(CITIES_MESSAGE_DIR),
      totalMessageFiles: fs.existsSync(CITIES_MESSAGE_DIR) ? 
        fs.readdirSync(CITIES_MESSAGE_DIR).filter(f => f.endsWith('.txt')).length : 0,
      orphanMessageFiles: orphans.length,
      groupsStructure: this.groups.map(g => ({
        id: g.id,
        name: g.name,
        isPrimary: g.isPrimary,
        hasLink: !!g.link,
        hasMessageFile: fs.existsSync(path.join(CITIES_MESSAGE_DIR, `${g.id}.txt`)),
        messagePreview: this._loadCityMessage(g.id)?.substring(0, 50) + '...' || 'sem mensagem'
      }))
    };
  }

  /* ──────────────────────────────
     NOVO: método para debug de caminhos
  ────────────────────────────── */
  debugPaths() {
    console.log('[DEBUG PATHS] __dirname:', __dirname);
    console.log('[DEBUG PATHS] CITIES_FILE:', CITIES_FILE);
    console.log('[DEBUG PATHS] CITIES_FILE absoluto:', path.resolve(CITIES_FILE));
    console.log('[DEBUG PATHS] CITIES_MESSAGE_DIR:', CITIES_MESSAGE_DIR);
    console.log('[DEBUG PATHS] cities.json existe?:', fs.existsSync(CITIES_FILE));
    console.log('[DEBUG PATHS] citiesMessageTxt/ existe?:', fs.existsSync(CITIES_MESSAGE_DIR));
    
    // Tentar diferentes caminhos possíveis
    const possiblePaths = [
      path.join(__dirname, '../cities.json'),
      path.join(__dirname, '../../cities.json'),
      path.join(__dirname, './cities.json'),
      path.join(process.cwd(), 'cities.json'),
      path.join(process.cwd(), 'src/cities.json'),
      path.join(process.cwd(), 'data/cities.json')
    ];
    
    console.log('[DEBUG PATHS] Testando caminhos possíveis:');
    possiblePaths.forEach((caminho, index) => {
      const existe = fs.existsSync(caminho);
      console.log(`[DEBUG PATHS] ${index + 1}. ${caminho} - ${existe ? 'EXISTE' : 'não existe'}`);
      
      if (existe) {
        try {
          const conteudo = fs.readFileSync(caminho, 'utf8');
          const dados = JSON.parse(conteudo);
          console.log(`[DEBUG PATHS] Conteúdo encontrado: ${dados.length} itens`);
        } catch (err) {
          console.log(`[DEBUG PATHS] Erro ao ler: ${err.message}`);
        }
      }
    });
  }

  /* ──────────────────────────────
     NOVO: método para forçar reload com caminho específico
  ────────────────────────────── */
  forceReloadWithPath(customPath = null) {
    const pathToUse = customPath || CITIES_FILE;
    console.log(`[DEBUG RELOAD] Tentando recarregar com caminho: ${pathToUse}`);
    
    try {
      if (fs.existsSync(pathToUse)) {
        const rawData = fs.readFileSync(pathToUse, 'utf8');
        const citiesData = JSON.parse(rawData);
        
        this.groups = citiesData.map(city => {
          const messageFromFile = this._loadCityMessage(city.id);
          
          return {
            id: city.id,
            link: city.link,
            name: city.name.toLowerCase(),
            descricao: city.name.toLowerCase(),
            isPrimary: city.isPrimary || false,
            createdAt: city.createdAt || new Date().toISOString(),
            updatedAt: city.updatedAt || new Date().toISOString(),
            _messageFromFile: messageFromFile
          };
        });
        
        console.log(`[DEBUG RELOAD] Sucesso! ${this.groups.length} grupos carregados`);
        return true;
      } else {
        console.log('[DEBUG RELOAD] Arquivo não encontrado no caminho especificado');
        return false;
      }
    } catch (err) {
      console.error('[DEBUG RELOAD] Erro:', err);
      return false;
    }
  }
}

module.exports = new GroupService();