const fs = require('fs');
const path = require('path');

class CityRepository {
    constructor() {
        this.filePath = path.join(__dirname, '../data/cities.json');
        this.initFile();
    }

    initFile() {
        if (!fs.existsSync(this.filePath)) {
            fs.writeFileSync(this.filePath, '[]', 'utf8');
        }
    }

    async getAll() {
        const data = await fs.promises.readFile(this.filePath, 'utf8');
        return JSON.parse(data);
    }

    async saveAll(cities) {
        await fs.promises.writeFile(this.filePath, JSON.stringify(cities, null, 2), 'utf8');
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
        }
    }

    async delete(id) {
        const cities = await this.getAll();
        const filtered = cities.filter(c => c.id !== id);
        await this.saveAll(filtered);
    }
}

module.exports = CityRepository;