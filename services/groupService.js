const fs = require('fs');
const path = require('path');
const { debug } = require('./debugService'); // Nova importação do sistema de debug

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
  async _loadCityMessage(cityId) {
    try {
      const messagePath = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
      if (fs.existsSync(messagePath)) {
        const message = fs.readFileSync(messagePath, 'utf8').trim();
        await debug(`Mensagem carregada para cidade ${cityId}: ${message.substring(0, 50)}...`);
        return message;
      }
      await debug(`Arquivo de mensagem não encontrado para cidade ${cityId}`);
      return null;
    } catch (error) {
      await debug(`Erro ao carregar mensagem para cidade ${cityId}:`, error);
      return null;
    }
  }

  /**
   * Salva mensagem personalizada no arquivo .txt
   * @param {string} cityId - ID da cidade
   * @param {string} message - Mensagem a ser salva
   */
  async _saveCityMessage(cityId, message) {
    try {
      if (!message || !message.trim()) {
        // Se mensagem vazia, remove o arquivo
        const messagePath = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
        if (fs.existsSync(messagePath)) {
          fs.unlinkSync(messagePath);
          await debug(`Arquivo de mensagem removido para cidade ${cityId}`);
        }
        return;
      }

      const messagePath = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
      fs.writeFileSync(messagePath, message.trim(), 'utf8');
      await debug(`Mensagem salva para cidade ${cityId}`);
    } catch (error) {
      await debug(`Erro ao salvar mensagem para cidade ${cityId}:`, error);
    }
  }

  /**
   * Remove arquivo de mensagem quando cidade é deletada
   * @param {string} cityId - ID da cidade
   */
  async _deleteCityMessage(cityId) {
    try {
      const messagePath = path.join(CITIES_MESSAGE_DIR, `${cityId}.txt`);
      if (fs.existsSync(messagePath)) {
        fs.unlinkSync(messagePath);
        await debug(`Arquivo de mensagem removido para cidade ${cityId}`);
      }
    } catch (error) {
      await debug(`Erro ao remover mensagem para cidade ${cityId}:`, error);
    }
  }

  async _loadData() {
    try {
      // PRIORIDADE 1: Carregar cidades do cities.json
      await debug('Verificando existência do cities.json:', CITIES_FILE);
      await debug('Arquivo existe?', fs.existsSync(CITIES_FILE));
      
      if (fs.existsSync(CITIES_FILE)) {
        await debug('Carregando cities.json...');
        const rawData = fs.readFileSync(CITIES_FILE, 'utf8');
        await debug('Dados brutos do cities.json:', rawData);
        
        const citiesData = JSON.parse(rawData);
        await debug('Dados parseados:', citiesData);
        await debug('Tipo dos dados:', Array.isArray(citiesData) ? 'Array' : typeof citiesData);
        
        if (!Array.isArray(citiesData)) {
          await debug('cities.json não é um array válido');
          throw new Error('cities.json deve conter um array');
        }
        
        // Converter formato cities.json para formato groups
        this.groups = [];
        for (const city of citiesData) {
          await debug('Processando cidade:', city);
          
          // Carregar mensagem do arquivo .txt (não do JSON)
          const messageFromFile = await this._loadCityMessage(city.id);
          
          this.groups.push({
            id: city.id,
            link: city.link,
            name: city.name.toLowerCase(),
            descricao: city.name.toLowerCase(), // usar name como descrição
            isPrimary: city.isPrimary || false,
            createdAt: city.createdAt || new Date().toISOString(),
            updatedAt: city.updatedAt || new Date().toISOString(),
            // Não armazenar message aqui - será carregada dinamicamente
            _messageFromFile: messageFromFile // Cache temporário interno
          });
        }
        
        await debug(`Carregadas ${this.groups.length} cidades do cities.json`);
        await debug('Grupos após conversão:', this.groups.map(g => ({
          id: g.id,
          name: g.name,
          hasMessage: !!g._messageFromFile
        })));
      }
      // FALLBACK: Carregar do groups.json se cities.json não existir
      else if (fs.existsSync(GROUPS_FILE)) {
        await debug('cities.json não encontrado, tentando groups.json...');
        this.groups = JSON.parse(fs.readFileSync(GROUPS_FILE, 'utf8'));
        
        // Para grupos carregados do formato antigo, tentar carregar mensagens dos arquivos
        for (const group of this.groups) {
          const messageFromFile = await this._loadCityMessage(group.id);
          if (messageFromFile) {
            group._messageFromFile = messageFromFile;
          }
        }
        
        await debug(`Carregadas ${this.groups.length} grupos do groups.json`);
      } else {
        await debug('Nenhum arquivo de dados encontrado, inicializando array vazio');
        this.groups = [];
        this._saveGroups();
      }

      // config
      if (fs.existsSync(CONFIG_FILE)) {
        await debug('Carregando config.json...');
        this.config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
      } else {
        await debug('config.json não encontrado, criando com padrões...');
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
      await debug(`Total de grupos carregados: ${this.groups.length}`);
      await debug('Estrutura dos grupos:', this.groups.map(g => ({
        id: g.id,
        name: g.name,
        isPrimary: g.isPrimary,
        hasMessage: !!g._messageFromFile
      })));

    } catch (err) {
      await debug('Erro ao carregar dados - Detalhes completos:', err);
      await debug('Stack trace:', err.stack);
      await debug('Arquivo cities.json existe?', fs.existsSync(CITIES_FILE));
      await debug('Caminho absoluto do cities.json:', path.resolve(CITIES_FILE));
      
      // Tentar ler o arquivo mesmo assim para debug
      try {
        if (fs.existsSync(CITIES_FILE)) {
          const rawContent = fs.readFileSync(CITIES_FILE, 'utf8');
          await debug('Conteúdo bruto do arquivo:', rawContent.substring(0, 200));
        }
      } catch (readErr) {
        await debug('Erro ao tentar ler o arquivo para debug:', readErr);
      }
      
      this.groups = [];
      this.config = { mode: DEFAULT_MODE };
    }
  }

  async _saveGroups() { 
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
        await debug('cities.json atualizado (sem mensagens inline)');
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
  async addGroup(link, setAsPrimary = false, name = '', descricao = '', message = '') {
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
      await this._saveCityMessage(newGroup.id, message);
      newGroup._messageFromFile = message; // Cache temporário
    }
    
    this.groups.push(newGroup);
    await this._saveGroups();
    return newGroup;
  }

  async updateGroup(id, updates = {}) {
    const group = this.groups.find(g => g.id === id);
    if (!group) return false;

    // Se há mensagem nos updates, salvar em arquivo separado
    if (updates.hasOwnProperty('message')) {
      await this._saveCityMessage(id, updates.message);
      group._messageFromFile = updates.message; // Atualizar cache
      delete updates.message; // Remover do objeto antes de fazer assign
    }

    Object.assign(group, updates, { updatedAt: new Date().toISOString() });
    await this._saveGroups();
    return true;
  }

  async deleteGroup(id) {
    const idx = this.groups.findIndex(g => g.id === id);
    if (idx === -1) return false;

    const [removed] = this.groups.splice(idx, 1);
    
    // Remover arquivo de mensagem
    await this._deleteCityMessage(id);
    
    if (removed.isPrimary && this.groups.length) this.groups[0].isPrimary = true;
    await this._saveGroups();
    return true;
  }

  async setPrimaryGroup(id) {
    const group = this.groups.find(g => g.id === id);
    if (!group) return false;

    this.groups.forEach(g => g.isPrimary = false);
    group.isPrimary = true;
    group.updatedAt = new Date().toISOString();
    await this._saveGroups();
    return true;
  }

  /* ──────────────────────────────
     getters
  ────────────────────────────── */
  async getPrimaryGroup() { 
    const primary = this.groups.find(g => g.isPrimary) || this.groups[0];
    if (primary) {
      // Enriquecer com mensagem do arquivo
      return await this._enrichGroupWithMessage(primary);
    }
    return primary;
  }
  
  async getPrimaryGroupLink() { 
    const g = await this.getPrimaryGroup(); 
    return g ? g.link : ''; 
  }
  
  getAllGroupLinks() { 
    return this.groups.map(g => g.link); 
  }
  
  async getAllGroups() { 
    await debug(`getAllGroups() retornando ${this.groups.length} grupos`);
    // Enriquecer todos os grupos com suas mensagens
    const enrichedGroups = [];
    for (const group of this.groups) {
      enrichedGroups.push(await this._enrichGroupWithMessage(group));
    }
    return enrichedGroups;
  }
  
  async getGroupById(id) { 
    const group = this.groups.find(g => g.id === id);
    return group ? await this._enrichGroupWithMessage(group) : null;
  }
  
  getCurrentMode() { 
    return this.config.mode; 
  }

  async getActiveGroups() {
    if (this.config.mode === 'SINGLE') {
      const primary = await this.getPrimaryGroup();
      return primary ? [primary] : [];
    }
    await debug(`Modo MULTI: retornando ${this.groups.length} grupos ativos`);
    return await this.getAllGroups(); // Já enriquecidos com mensagens
  }

  /**
   * Enriquece um grupo com sua mensagem do arquivo .txt
   * @param {Object} group - Objeto do grupo
   * @returns {Object} - Grupo enriquecido com propriedade 'message'
   */
  async _enrichGroupWithMessage(group) {
    if (!group) return group;
    
    // Criar uma cópia para não modificar o original
    const enrichedGroup = { ...group };
    
    // Usar cache se disponível, senão carregar do arquivo
    let message = group._messageFromFile;
    if (!message) {
      message = await this._loadCityMessage(group.id);
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
  async setMode(newMode) {
    if (!['SINGLE', 'MULTI'].includes(newMode)) return false;
    await debug(`Alterando modo de ${this.config.mode} para ${newMode}`);
    this.config.mode = newMode;
    this._saveConfig();

    if (newMode === 'SINGLE' && this.groups.length && !this.groups.some(g => g.isPrimary)) {
      this.groups[0].isPrimary = true;
      await this._saveGroups();
    }
    return true;
  }

  async moveToFirstPosition(groupId) {
    const idx = this.groups.findIndex(g => g.id === groupId);
    if (idx > 0) {
      const [g] = this.groups.splice(idx, 1);
      this.groups.unshift(g);
      await this._saveGroups();
      return true;
    }
    return false;
  }

  /* ──────────────────────────────
     NOVO: encontrar cidade pelo input
     - aceita texto (nome/descrição) ou número do menu (1,2,3...)
  ────────────────────────────── */
  async findCityByInput(input, cityList = []) {
    if (!input) return null;
    const entrada = input.toString().trim().toLowerCase();

    // Use a lista interna se nenhuma for fornecida (enriquecida com mensagens)
    const listaParaUsar = cityList.length > 0 ? cityList : await this.getAllGroups();

    await debug(`findCityByInput: "${entrada}" em lista de ${listaParaUsar.length} itens`);

    // 1) Se for número, usa índice baseado na lista fornecida
    if (/^\d+$/.test(entrada)) {
      const idx = parseInt(entrada, 10) - 1;
      const resultado = listaParaUsar[idx] || null;
      await debug(`Busca por índice ${idx + 1}: ${resultado ? resultado.name : 'não encontrado'}`);
      return resultado;
    }

    // 2) Match exato
    const resultado = listaParaUsar.find(g =>
      g.name === entrada || g.descricao === entrada
    ) || null;
    
    await debug(`Busca exata por "${entrada}": ${resultado ? resultado.name : 'não encontrado'}`);
    return resultado;
  }

  /* ──────────────────────────────
     NOVO: método para recarregar dados
  ────────────────────────────── */
  async reloadData() {
    await debug('Recarregando dados do GroupService...');
    await this._loadData();
  }

  /* ──────────────────────────────
     NOVO: métodos para gerenciar mensagens
  ────────────────────────────── */
  
  /**
   * Atualiza apenas a mensagem de uma cidade
   * @param {string} cityId - ID da cidade
   * @param {string} message - Nova mensagem
   */
  async updateCityMessage(cityId, message) {
    const group = this.groups.find(g => g.id === cityId);
    if (!group) return false;
    
    await this._saveCityMessage(cityId, message);
    group._messageFromFile = message; // Atualizar cache
    group.updatedAt = new Date().toISOString();
    await this._saveGroups(); // Atualizar timestamp
    
    return true;
  }

  /**
   * Obtém mensagem de uma cidade específica
   * @param {string} cityId - ID da cidade
   */
  async getCityMessage(cityId) {
    const message = await this._loadCityMessage(cityId);
    const group = await this.getGroupById(cityId);
    return message || `Bem vindo a ${group?.name || 'nossa cidade'}`;
  }

  /**
   * Lista arquivos de mensagem órfãos (sem cidade correspondente)
   */
  async getOrphanMessageFiles() {
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
      await debug('Erro ao buscar arquivos órfãos:', error);
      return [];
    }
  }

  /**
   * Remove arquivos de mensagem órfãos
   */
  async cleanupOrphanMessageFiles() {
    const orphans = await this.getOrphanMessageFiles();
    for (const orphan of orphans) {
      try {
        fs.unlinkSync(orphan.path);
        await debug(`Arquivo órfão removido: ${orphan.file}`);
      } catch (error) {
        await debug(`Erro ao remover arquivo órfão ${orphan.file}:`, error);
      }
    }
    return orphans.length;
  }

  /* ──────────────────────────────
     NOVO: método para debug
  ────────────────────────────── */
  async getDebugInfo() {
    const orphans = await this.getOrphanMessageFiles();
    
    const debugInfo = {
      totalGroups: this.groups.length,
      mode: this.config.mode,
      primaryGroup: (await this.getPrimaryGroup())?.name || 'nenhum',
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
      groupsStructure: []
    };

    // Enriquecer com estrutura dos grupos
    for (const g of this.groups) {
      debugInfo.groupsStructure.push({
        id: g.id,
        name: g.name,
        isPrimary: g.isPrimary,
        hasLink: !!g.link,
        hasMessageFile: fs.existsSync(path.join(CITIES_MESSAGE_DIR, `${g.id}.txt`)),
        messagePreview: (await this._loadCityMessage(g.id))?.substring(0, 50) + '...' || 'sem mensagem'
      });
    }

    return debugInfo;
  }

  /* ──────────────────────────────
     NOVO: método para debug de caminhos
  ────────────────────────────── */
  async debugPaths() {
    await debug('__dirname:', __dirname);
    await debug('CITIES_FILE:', CITIES_FILE);
    await debug('CITIES_FILE absoluto:', path.resolve(CITIES_FILE));
    await debug('CITIES_MESSAGE_DIR:', CITIES_MESSAGE_DIR);
    await debug('cities.json existe?:', fs.existsSync(CITIES_FILE));
    await debug('citiesMessageTxt/ existe?:', fs.existsSync(CITIES_MESSAGE_DIR));
    
    // Tentar diferentes caminhos possíveis
    const possiblePaths = [
      path.join(__dirname, '../cities.json'),
      path.join(__dirname, '../../cities.json'),
      path.join(__dirname, './cities.json'),
      path.join(process.cwd(), 'cities.json'),
      path.join(process.cwd(), 'src/cities.json'),
      path.join(process.cwd(), 'data/cities.json')
    ];
    
    await debug('Testando caminhos possíveis:');
    for (let index = 0; index < possiblePaths.length; index++) {
      const caminho = possiblePaths[index];
      const existe = fs.existsSync(caminho);
      await debug(`${index + 1}. ${caminho} - ${existe ? 'EXISTE' : 'não existe'}`);
      
      if (existe) {
        try {
          const conteudo = fs.readFileSync(caminho, 'utf8');
          const dados = JSON.parse(conteudo);
          await debug(`Conteúdo encontrado: ${dados.length} itens`);
        } catch (err) {
          await debug(`Erro ao ler: ${err.message}`);
        }
      }
    }
  }

  /* ──────────────────────────────
     NOVO: método para forçar reload com caminho específico
  ────────────────────────────── */
  async forceReloadWithPath(customPath = null) {
    const pathToUse = customPath || CITIES_FILE;
    await debug(`Tentando recarregar com caminho: ${pathToUse}`);
    
    try {
      if (fs.existsSync(pathToUse)) {
        const rawData = fs.readFileSync(pathToUse, 'utf8');
        const citiesData = JSON.parse(rawData);
        
        this.groups = [];
        for (const city of citiesData) {
          const messageFromFile = await this._loadCityMessage(city.id);
          
          this.groups.push({
            id: city.id,
            link: city.link,
            name: city.name.toLowerCase(),
            descricao: city.name.toLowerCase(),
            isPrimary: city.isPrimary || false,
            createdAt: city.createdAt || new Date().toISOString(),
            updatedAt: city.updatedAt || new Date().toISOString(),
            _messageFromFile: messageFromFile
          });
        }
        
        await debug(`Sucesso! ${this.groups.length} grupos carregados`);
        return true;
      } else {
        await debug('Arquivo não encontrado no caminho especificado');
        return false;
      }
    } catch (err) {
      await debug('Erro:', err);
      return false;
    }
  }
}

module.exports = new GroupService();