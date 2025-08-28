class DatabaseView {
  static showTables(tables) {
    console.log("\n📋 === TABELAS DO BANCO DE DADOS ===");
    if (tables.length === 0) {
      console.log("❌ Nenhuma tabela encontrada.");
      return;
    }
    console.log(`📊 Total: ${tables.length}\n`);
    tables.forEach((t, i) => console.log(`${i + 1}. ${t}`));
  }

  static showTableDetails(tableName, tableInfo) {
    console.log(`\n🔍 Estrutura da tabela: ${tableName}`);
    tableInfo.forEach((col) => {
      let msg = `📌 ${col.name} (${col.type})`;
      if (col.pk === 1) msg += " 🔑 PK";
      if (col.notnull === 1) msg += " ⚠️ NOT NULL";
      if (col.dflt_value !== null) msg += ` 🔧 DEFAULT: ${col.dflt_value}`;
      console.log(msg);
    });
  }

  static showIndexes(table, indexes) {
    if (indexes.length > 0) {
      console.log(`\n📊 Tabela: ${table}`);
      indexes.forEach((i) =>
        console.log(`   🔍 ${i.name}${i.unique === 1 ? " (UNIQUE)" : ""}`)
      );
    }
  }

  static showTriggers(triggers) {
    console.log("\n⚡ === TRIGGERS ===");
    if (triggers.length === 0) {
      console.log("❌ Nenhum trigger encontrado.");
      return;
    }
    triggers.forEach((tr, i) => {
      console.log(`\n${i + 1}. 📛 Nome: ${tr.name}`);
      console.log(`   📊 Tabela: ${tr.tbl_name}`);
      console.log(`   🔧 SQL:\n   ${tr.sql}`);
    });
  }

  static showPrimaryCity(city) {
    console.log("\n⭐ === CIDADE PRIMÁRIA ===");
    if (!city) {
      console.log("❌ Nenhuma cidade marcada.");
      return;
    }
    console.log(`🏙️ ID: ${city.id} | Nome: ${city.name}`);
    console.log(`   Link: ${city.link || "Não informado"}`);
    console.log(`   Msg: ${city.message || "Sem mensagem"}`);
  }

  static showTableCounts(counts) {
    console.log("\n📊 === CONTAGEM DE REGISTROS ===");
    Object.keys(counts).forEach((t) =>
      console.log(`📋 ${t}: ${counts[t]} registro(s)`)
    );
  }

  static showDatabaseInfo(stats, dbPath) {
    console.log("\n🗃️ === INFO GERAIS DO BANCO ===");
    console.log(`📁 Localização: ${dbPath}`);
    console.log(`📊 Tamanho: ${(stats.size / 1024).toFixed(2)} KB`);
    console.log(`📅 Criado em: ${stats.birthtime.toLocaleString()}`);
    console.log(`🔄 Modificado: ${stats.mtime.toLocaleString()}`);
    console.log(`🔧 Tipo: SQLite Database`);
  }
}

module.exports = DatabaseView;
