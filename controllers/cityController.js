function generateSimpleId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
}

const { 
    showCityManagementMenu,
    showCityList,
    promptForCityName,
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
        }
    }

    async addCity(rl) {
        console.log('\n=== Adicionar Nova Cidade ===');
        const name = await promptForCityName(rl);
        
        if (name) {
            const newCity = {
                id: generateSimpleId(),
                name,
                isPrimary: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            await this.cityRepository.add(newCity);
            console.log('\n✅ Cidade adicionada com sucesso!');
        }
    }

    async editCity(rl) {
        console.log('\n=== Editar Cidade ===');
        const cities = await this.cityRepository.getAll();
        
        if (cities.length === 0) {
            console.log('\n❌ Nenhuma cidade cadastrada para editar.');
            return;
        }
        
        const index = await promptForCitySelection(rl, cities, 'editar');
        if (index === null) return;
        
        const cityToEdit = cities[index];
        const newName = await promptForCityName(rl, cityToEdit.name);
        
        if (newName) {
            const updatedCity = {
                ...cityToEdit,
                name: newName,
                updatedAt: new Date().toISOString()
            };
            
            await this.cityRepository.update(updatedCity);
            console.log('\n✅ Cidade atualizada com sucesso!');
        }
    }

    async setPrimaryCity(rl) {
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
        
        // Remove primary status from all cities
        await Promise.all(cities.map(async city => {
            if (city.isPrimary) {
                await this.cityRepository.update({ ...city, isPrimary: false });
            }
        }));
        
        // Set new primary city
        await this.cityRepository.update({ 
            ...selectedCity, 
            isPrimary: true,
            updatedAt: new Date().toISOString()
        });
        
        console.log('\n✅ Cidade primária definida com sucesso!');
    }

    async viewCities(rl) {
        console.log('\n=== Visualizar Cidades ===');
        const cities = await this.cityRepository.getAll();
        showCityList(cities, true);
        
        if (cities.length > 0) {
            await new Promise(resolve => {
                rl.question('\nPressione qualquer tecla para continuar...', resolve);
            });
        }
    }

    async deleteCity(rl) {
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
            return;
        }
        
        const confirm = await confirmAction(rl, `excluir a cidade "${cityToDelete.name}"`);
        if (!confirm) return;
        
        await this.cityRepository.delete(cityToDelete.id);
        console.log('\n✅ Cidade excluída com sucesso!');
    }
}

// Exportação como instância pronta (padrão que você está usando para outros controllers)
module.exports = new CityController();