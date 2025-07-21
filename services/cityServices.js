const fs = require('fs');
const path = require('path');

class CityRepository {
    constructor() {
        this.dataDir = path.join(__dirname, '../data');
        this.filePath = path.join(this.dataDir, 'cities.json');
    }

    async getAll() {
        try {
            const data = await fs.promises.readFile(this.filePath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error reading cities file:', error);
            return [];
        }
    }

    async saveAll(cities) {
        try {
            await fs.promises.writeFile(this.filePath, JSON.stringify(cities, null, 2), 'utf8');
        } catch (error) {
            console.error('Error saving cities file:', error);
            throw error;
        }
    }

    async add(city) {
        const cities = await this.getAll();
        cities.push(city);
        await this.saveAll(cities);
        return city;
    }

    async update(updatedCity) {
        const cities = await this.getAll();
        const index = cities.findIndex(c => c.id === updatedCity.id);
        
        if (index !== -1) {
            cities[index] = updatedCity;
            await this.saveAll(cities);
            return updatedCity;
        }
        
        return null;
    }

    async delete(id) {
        const cities = await this.getAll();
        const filteredCities = cities.filter(c => c.id !== id);
        await this.saveAll(filteredCities);
        return id;
    }
}

module.exports = CityRepository;