
// Navegação
document.querySelectorAll('.menu-item').forEach(button => {
    button.addEventListener('click', () => {
        // Remove active class from all buttons and sections
        document.querySelectorAll('.menu-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

        // Add active class to clicked button
        button.classList.add('active');

        // Show corresponding section
        const sectionId = button.dataset.section + '-section';
        document.getElementById(sectionId).classList.add('active');
    });
});

// === Gerenciamento de Mensagens ===
let messages = [];
let editingMessageId = null;

async function loadMessages() {
    const list = document.getElementById('messages-list');
    list.innerHTML = '<div class="empty-state">Carregando...</div>';
    
    try {
        messages = await window.crmAPI.db.getMessages();
        renderMessages();
    } catch (e) {
        list.innerHTML = '<div class="empty-state">Erro ao carregar mensagens</div>';
        console.error(e);
    }
}

function renderMessages() {
    const list = document.getElementById('messages-list');
    list.innerHTML = '';

    if (messages.length === 0) {
        list.innerHTML = '<div class="empty-state">Nenhuma mensagem cadastrada</div>';
        return;
    }

    messages.forEach(msg => {
        const item = document.createElement('div');
        item.className = 'message-item';
        item.innerHTML = `
            <div class="message-header">
                <span class="message-meta">${msg.locale} • ${msg.message_type}</span>
            </div>
            <div class="message-content">${msg.message_content}</div>
        `;
        item.addEventListener('click', () => editMessage(msg));
        list.appendChild(item);
    });
}

function editMessage(msg) {
    editingMessageId = msg.id;
    document.getElementById('message-locale').value = msg.locale;
    document.getElementById('message-type').value = msg.message_type;
    document.getElementById('message-content').value = msg.message_content;
    
    document.getElementById('btn-delete-message').style.display = 'inline-block';
    
    // Highlight
    document.querySelectorAll('.message-item').forEach(el => el.classList.remove('selected'));
    // (Simplificado, ideal seria encontrar o elemento específico e adicionar classe, mas vamos re-renderizar ou so limpar o form)
}

document.getElementById('btn-clear-form').addEventListener('click', () => {
    editingMessageId = null;
    document.getElementById('message-locale').value = '';
    document.getElementById('message-type').value = 'text';
    document.getElementById('message-content').value = '';
    document.getElementById('btn-delete-message').style.display = 'none';
});

document.getElementById('btn-save-message').addEventListener('click', async () => {
    const locale = document.getElementById('message-locale').value;
    const type = document.getElementById('message-type').value;
    const content = document.getElementById('message-content').value;

    if (!locale || !content) {
        alert('Preencha os campos obrigatórios');
        return;
    }

    try {
        if (editingMessageId) {
            await window.crmAPI.db.updateMessage(editingMessageId, locale, type, content);
        } else {
            await window.crmAPI.db.addMessage(locale, type, content);
        }
        await loadMessages();
        document.getElementById('btn-clear-form').click();
        alert('Mensagem salva com sucesso!');
    } catch (e) {
        console.error(e);
        alert('Erro ao salvar mensagem');
    }
});

document.getElementById('btn-delete-message').addEventListener('click', async () => {
    if (!editingMessageId) return;
    if (confirm('Tem certeza que deseja excluir esta mensagem?')) {
        try {
            await window.crmAPI.db.deleteMessage(editingMessageId);
            await loadMessages();
            document.getElementById('btn-clear-form').click();
        } catch (e) {
            console.error(e);
            alert('Erro ao excluir mensagem');
        }
    }
});

// === Modo Dev ===
async function loadDevConfig() {
    try {
        const isDev = await window.crmAPI.db.getConfig('dev_mode');
        const isDebug = await window.crmAPI.db.getConfig('debug_mode');
        const scoutTime = await window.crmAPI.db.getConfig('scout_time');

        updateDevUI(isDev === 'true', isDebug === 'true', scoutTime);
    } catch (e) {
        console.error(e);
    }
}

function updateDevUI(isDev, isDebug, scoutTime) {
    const devBtn = document.getElementById('btn-toggle-dev-mode');
    const debugBtn = document.getElementById('btn-toggle-debug-mode');
    const devInd = document.getElementById('dev-mode-indicator');
    const debugInd = document.getElementById('debug-mode-indicator');

    devBtn.textContent = isDev ? 'Modo: Ativado' : 'Modo: Desativado';
    devBtn.className = isDev ? 'btn btn-toggle active-mode' : 'btn btn-toggle';
    devInd.className = isDev ? 'status-indicator active' : 'status-indicator inactive';
    devInd.textContent = isDev ? '🟢' : '⚪';

    debugBtn.textContent = isDebug ? 'Debug: Ativado' : 'Debug: Desativado';
    debugBtn.className = isDebug ? 'btn btn-toggle active-mode' : 'btn btn-toggle';
    debugInd.className = isDebug ? 'status-indicator active' : 'status-indicator inactive';
    debugInd.textContent = isDebug ? '🟢' : '⚪';

    if (scoutTime) {
        document.getElementById('scout-time-input').value = scoutTime;
    }
}

document.getElementById('btn-toggle-dev-mode').addEventListener('click', async () => {
    const current = document.getElementById('btn-toggle-dev-mode').textContent.includes('Ativado');
    const newState = !current;
    await window.crmAPI.db.setConfig('dev_mode', newState.toString());
    
    // Atualiza UI localmente para rapidez
    updateDevUI(newState, document.getElementById('btn-toggle-debug-mode').textContent.includes('Ativado'), null);
});

document.getElementById('btn-toggle-debug-mode').addEventListener('click', async () => {
    const current = document.getElementById('btn-toggle-debug-mode').textContent.includes('Ativado');
    const newState = !current;
    await window.crmAPI.db.setConfig('debug_mode', newState.toString());
     // Atualiza UI localmente
    updateDevUI(document.getElementById('btn-toggle-dev-mode').textContent.includes('Ativado'), newState, null);
});

document.getElementById('btn-save-scout').addEventListener('click', async () => {
    const time = document.getElementById('scout-time-input').value;
    await window.crmAPI.db.setConfig('scout_time', time);
    alert('Configuração salva!');
});


// Inicialização
loadMessages();
loadDevConfig();
