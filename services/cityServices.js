const fs = require('fs');
const path = require('path');
const { saveCityMessage, loadCityMessage, deleteCityMessage } = require('../utils/cityMessageUtils');

class CityRepository {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.filePath = path.join(this.dataDir, 'cities.json');
        this.ensureDataFileExists();
    }

    ensureDataFileExists() {
        if (!fs.existsSync(this.dataDir)) {
            fs.mkdirSync(this.dataDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, '[]', 'utf8');
        }
    }

    async getAll() {
        try {
            const data = await fs.promises.readFile(this.filePath, 'utf8');
            const cities = JSON.parse(data);
            
            // Carregar mensagens dos arquivos .txt para cada cidade
            for (const city of cities) {
                city.message = await loadCityMessage(city.id);
            }
            
            return cities;
        } catch (error) {
            console.error('❌ Erro ao ler arquivo de cidades:', error);
            return [];
        }
    }

    async saveAll(cities) {
        try {
            // Criar uma cópia das cidades sem o campo message para salvar no JSON
            const citiesToSave = cities.map(city => {
                const { message, ...cityWithoutMessage } = city;
                return cityWithoutMessage;
            });
            
            await fs.promises.writeFile(this.filePath, JSON.stringify(citiesToSave, null, 2), 'utf8');
            
            // Salvar mensagens em arquivos separados
            for (const city of cities) {
                if (city.message !== undefined) {
                    await saveCityMessage(city.id, city.message);
                }
            }
        } catch (error) {
            console.error('❌ Erro ao salvar arquivo de cidades:', error);
            throw error;
        }
    }

    async add(city) {
        try {
            const cities = await this.getAll();
            cities.push(city);
            await this.saveAll(cities);
            console.log(`✅ Cidade "${city.name}" adicionada com sucesso!`);
            return city;
        } catch (error) {
            console.error('❌ Erro ao adicionar cidade:', error);
            throw error;
        }
    }

    async update(updatedCity) {
        try {
            const cities = await this.getAll();
            const index = cities.findIndex(c => c.id === updatedCity.id);
            
            if (index !== -1) {
                cities[index] = updatedCity;
                await this.saveAll(cities);
                console.log(`✅ Cidade "${updatedCity.name}" atualizada com sucesso!`);
                return updatedCity;
            }
            
            console.log(`⚠️ Cidade com ID ${updatedCity.id} não encontrada.`);
            return null;
        } catch (error) {
            console.error('❌ Erro ao atualizar cidade:', error);
            throw error;
        }
    }

    async delete(id) {
        try {
            const cities = await this.getAll();
            const cityToDelete = cities.find(c => c.id === id);
            
            if (!cityToDelete) {
                console.log(`⚠️ Cidade com ID ${id} não encontrada.`);
                return null;
            }
            
            // Remover cidade do array
            const filteredCities = cities.filter(c => c.id !== id);
            await this.saveAll(filteredCities);
            
            // Deletar arquivo de mensagem
            await deleteCityMessage(id);
            
            console.log(`✅ Cidade "${cityToDelete.name}" removida com sucesso!`);
            return id;
        } catch (error) {
            console.error('❌ Erro ao deletar cidade:', error);
            throw error;
        }
    }

    async findById(id) {
        try {
            const cities = await this.getAll();
            return cities.find(c => c.id === id) || null;
        } catch (error) {
            console.error('❌ Erro ao buscar cidade por ID:', error);
            return null;
        }
    }

    async getPrimary() {
        try {
            const cities = await this.getAll();
            return cities.find(c => c.isPrimary === true) || null;
        } catch (error) {
            console.error('❌ Erro ao buscar cidade primária:', error);
            return null;
        }
    }
}

module.exports = CityRepository;