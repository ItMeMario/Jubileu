const fs = require('fs');
const https = require('https');
const path = require('path');

const url = 'https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json';
const dest = path.join(__dirname, '../renderer/data/municipios.json');

console.log('Downloading...', url);
https.get(url, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            if (data.charCodeAt(0) === 0xFEFF) data = data.slice(1);
            const municipios = JSON.parse(data);
            const simplified = municipios.map(m => ({
                id: m.codigo_ibge,
                nome: m.nome,
                lat: m.latitude,
                lng: m.longitude,
                uf: m.codigo_uf // we'd need state names, but uf code is fine, or we can just ignore for now
            }));
            fs.writeFileSync(dest, JSON.stringify(simplified));
            console.log('Saved to', dest);
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
}).on('error', err => {
    console.error('Error downloading:', err);
});
