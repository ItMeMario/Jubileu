function generateSimpleId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

const { 
    showCityManagementMenu,
    showCityList,
    promptForCityName,
    promptForCityLink,
    promptForCityMessage,
    promptForCitySelection,
    confirmAction
} = require('../views/cityViews');
const CityRepository = require('../services/cityServices');

class CityController {
    constructor() {
        this.cityRepository = new CityRepository();
    }

    async handleCities(rl) {
        let exit = false;
        
        while (!exit) {
            try {
                const cities = await this.cityRepository.getAll();
                const choice = await showCityManagementMenu(rl, cities);
                
                switch (choice) {
                    case '1':
                        await this.addCity(rl);
                        break;
                    case '2':
                        await this.editCity(rl);
                        break;
                    case '3':
                        await this.setPrimaryCity(rl);
                        break;
                    case '4':
                        await this.viewCities(rl);
                        break;
                    case '5':
                        await this.deleteCity(rl);
                        break;
                    case '0':
                        exit = true;
                        break;
                    default:
                        console.log('\n❌ Opção inválida!');
                }
            } catch (error) {
                console.error('\n❌ Erro no menu de cidades:', error);
                console.log('\nPressione qualquer tecla para continuar...');
                await new Promise(resolve => rl.question('', resolve));
            }
        }
    }

    async addCity(rl) {
        try {
            console.log('\n=== Adicionar Nova Cidade ===');
            
            const name = await promptForCityName(rl);
            if (!name) {
                console.log('\n⚠️ Nome da cidade é obrigatório!');
                return;
            }
            
            // Verificar se já existe uma cidade com esse nome
            const existingCities = await this.cityRepository.getAll();
            const nameExists = existingCities.some(city => 
                city.name.toLowerCase().trim() === name.toLowerCase().trim()
            );
            
            if (nameExists) {
                console.log('\n❌ Já existe uma cidade com esse nome!');
                return;
            }
            
            const link = await promptForCityLink(rl);
            const message = await promptForCityMessage(rl);
            
            const newCity = {
                id: generateSimpleId(),
                name: name.trim(),
                link: (link || '').trim(),
                message: (message || '').trim(),
                isPrimary: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await this.cityRepository.add(newCity);
            console.log('\n✅ Cidade adicionada com sucesso!');
            
        } catch (error) {
            console.error('\n❌ Erro ao adicionar cidade:', error);
        }
    }

    async editCity(rl) {
        try {
            console.log('\n=== Editar Cidade ===');
            const cities = await this.cityRepository.getAll();

            if (cities.length === 0) {
                console.log('\n❌ Nenhuma cidade cadastrada para editar.');
                return;
            }

            const index = await promptForCitySelection(rl, cities, 'editar');
            if (index === null) return;

            const cityToEdit = cities[index];

            console.log(`\n📝 Editando cidade: ${cityToEdit.name}`);
            console.log('(Pressione Enter para manter o valor atual)\n');

            const newName = await promptForCityName(rl, cityToEdit.name);
            if (!newName) {
                console.log('\n⚠️ Operação cancelada - nome é obrigatório.');
                return;
            }

            // Verificar se o novo nome já existe (exceto para a cidade atual)
            const existingCities = await this.cityRepository.getAll();
            const nameExists = existingCities.some(city => 
                city.id !== cityToEdit.id && 
                city.name.toLowerCase().trim() === newName.toLowerCase().trim()
            );
            
            if (nameExists) {
                console.log('\n❌ Já existe outra cidade com esse nome!');
                return;
            }

            const newLink = await promptForCityLink(rl, cityToEdit.link);
            const newMessage = await promptForCityMessage(rl, cityToEdit.message || '');

            const updatedCity = {
                ...cityToEdit,
                name: newName.trim(),
                link: (newLink !== undefined ? newLink : cityToEdit.link).trim(),
                message: newMessage !== undefined ? newMessage.trim() : (cityToEdit.message || '').trim(),
                updatedAt: new Date().toISOString()
            };

            await this.cityRepository.update(updatedCity);
            console.log('\n✅ Cidade atualizada com sucesso!');

        } catch (error) {
            console.error('\n❌ Erro ao editar cidade:', error);
        }
    }

    async setPrimaryCity(rl) {
        try {
            console.log('\n=== Definir Cidade Primária ===');
            const cities = await this.cityRepository.getAll();
            
            if (cities.length === 0) {
                console.log('\n❌ Nenhuma cidade cadastrada para definir como primária.');
                return;
            }
            
            const index = await promptForCitySelection(rl, cities, 'definir como primária');
            if (index === null) return;
            
            const selectedCity = cities[index];
            
            if (selectedCity.isPrimary) {
                console.log('\n⚠️ Esta cidade já é a primária!');
                return;
            }
            
            const confirm = await confirmAction(rl, `definir "${selectedCity.name}" como cidade primária`);
            if (!confirm) return;
            
            // Remover status primário de todas as cidades
            for (const city of cities) {
                if (city.isPrimary) {
                    city.isPrimary = false;
                    city.updatedAt = new Date().toISOString();
                    await this.cityRepository.update(city);
                }
            }
            
            // Definir nova cidade primária
            const updatedCity = { 
                ...selectedCity, 
                isPrimary: true,
                updatedAt: new Date().toISOString()
            };
            
            await this.cityRepository.update(updatedCity);
            console.log('\n✅ Cidade primária definida com sucesso!');

        } catch (error) {
            console.error('\n❌ Erro ao definir cidade primária:', error);
        }
    }

    async viewCities(rl) {
        try {
            console.log('\n=== Visualizar Cidades ===');
            const cities = await this.cityRepository.getAll();
            showCityList(cities, true);
            
            if (cities.length > 0) {
                console.log('\n📋 Detalhes das mensagens:');
                cities.forEach((city, index) => {
                    const messagePreview = city.message 
                        ? (city.message.length > 50 
                            ? `${city.message.substring(0, 50)}...` 
                            : city.message)
                        : 'Sem mensagem';
                    console.log(`   ${index + 1}. ${city.name}: "${messagePreview}"`);
                });
                
                await new Promise(resolve => {
                    rl.question('\nPressione qualquer tecla para continuar...', resolve);
                });
            }
        } catch (error) {
            console.error('\n❌ Erro ao visualizar cidades:', error);
        }
    }

    async deleteCity(rl) {
        try {
            console.log('\n=== Excluir Cidade ===');
            const cities = await this.cityRepository.getAll();
            
            if (cities.length === 0) {
                console.log('\n❌ Nenhuma cidade cadastrada para excluir.');
                return;
            }
            
            const index = await promptForCitySelection(rl, cities, 'excluir');
            if (index === null) return;
            
            const cityToDelete = cities[index];
            
            if (cityToDelete.isPrimary) {
                console.log('\n❌ Não é possível excluir a cidade primária!');
                console.log('💡 Dica: Defina outra cidade como primária primeiro.');
                return;
            }
            
            // Mostrar informações da cidade antes de excluir
            console.log(`\n🗑️ Cidade a ser excluída:`);
            console.log(`   Nome: ${cityToDelete.name}`);
            console.log(`   Link: ${cityToDelete.link || 'Não definido'}`);
            console.log(`   Mensagem: ${cityToDelete.message ? 'Definida' : 'Não definida'}`);
            
            const confirm = await confirmAction(rl, `excluir a cidade "${cityToDelete.name}"`);
            if (!confirm) return;
            
            await this.cityRepository.delete(cityToDelete.id);
            console.log('\n✅ Cidade excluída com sucesso!');

        } catch (error) {
            console.error('\n❌ Erro ao excluir cidade:', error);
        }
    }

    // Método utilitário para obter cidade primária
    async getPrimaryCity() {
        return await this.cityRepository.getPrimary();
    }

    // Método utilitário para buscar cidade por ID
    async getCityById(id) {
        return await this.cityRepository.findById(id);
    }
}

module.exports = new CityController();