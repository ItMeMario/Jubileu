const fs = require('fs');
const path = require('path');

async function download() {
    const res = await fetch('https://raw.githubusercontent.com/kelvins/Municipios-Brasileiros/main/json/municipios.json');
    const municipios = await res.json();
    const simplified = municipios.map(m => ({
        id: m.codigo_ibge,
        nome: m.nome,
        lat: m.latitude,
        lng: m.longitude,
        uf: m.codigo_uf
    }));
    fs.writeFileSync(path.join(__dirname, '../renderer/data/municipios.json'), JSON.stringify(simplified));
    console.log('Saved');
}

download();
