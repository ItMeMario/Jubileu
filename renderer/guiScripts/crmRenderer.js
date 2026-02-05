// renderer/guiScripts/crmRenderer.js

const btnCreateInstance = document.getElementById('btn-create-crm-instance');
const instancesList = document.getElementById('crm-instances-list');

// Função para renderizar a lista de instâncias
async function renderInstances() {
    if (!instancesList) return;

    instancesList.innerHTML = '<div class="loading">Carregando instâncias...</div>';

    try {
        const result = await window.crmAPI.getInstances();
        
        if (result.success) {
            const instances = result.instances;
            
            if (instances.length === 0) {
                instancesList.innerHTML = '<div class="empty-state">Nenhuma instância CRM criada.</div>';
                return;
            }

            instancesList.innerHTML = '';
            instances.forEach(instance => {
                const card = document.createElement('div');
                card.className = 'instance-crm-card';
                card.innerHTML = `
                    <div class="instance-header">
                        <h4>${instance.name}</h4>
                        <span class="status-badge ${instance.status}">${instance.status}</span>
                    </div>
                    <div class="instance-info">
                        <p>ID: ${instance.instance_id}</p>
                    </div>
                `;
                instancesList.appendChild(card);
            });
        } else {
            instancesList.innerHTML = `<div class="error">Erro ao carregar: ${result.error}</div>`;
        }
    } catch (error) {
        console.error("Erro ao carregar instâncias:", error);
        instancesList.innerHTML = `<div class="error">Erro crítico: ${error.message}</div>`;
    }
}

// Handler para criar instância
if (btnCreateInstance) {
    btnCreateInstance.addEventListener('click', async () => {
        const name = prompt("Nome da nova instância CRM:");
        if (!name) return;

        try {
            const result = await window.crmAPI.createInstance(name);
            if (result.success) {
                alert(`Instância '${result.instance.name}' criada com sucesso!`);
                renderInstances(); // Atualiza a lista
            } else {
                alert(`Erro ao criar instância: ${result.message || result.error}`);
            }
        } catch (error) {
            console.error("Erro ao criar instância:", error);
            alert("Erro ao criar instância. Verifique o console.");
        }
    });
}

// Inicializa
document.addEventListener('DOMContentLoaded', () => {
    renderInstances();
});
