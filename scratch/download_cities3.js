const https = require('https');
const fs = require('fs');
const path = require('path');

const dest = path.join(__dirname, '../renderer/data/municipios.json');

https.get('https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json', (res) => {
    let chunks = [];
    res.on('data', chunk => chunks.push(chunk));
    res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        // Try latin1
        let data = buffer.toString('latin1');
        try {
            const municipios = JSON.parse(data);
            const simplified = municipios.map(m => ({
                id: m.codigo_ibge,
                nome: m.nome,
                lat: m.latitude,
                lng: m.longitude,
                uf: m.codigo_uf
            }));
            fs.writeFileSync(dest, JSON.stringify(simplified));
            console.log('Saved to', dest);
        } catch (e) {
            console.error('Error parsing JSON:', e);
        }
    });
});
