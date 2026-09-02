// tests/testLiveMetaConnection.js
// Teste de conexão real com a Meta Graph API usando as credenciais do .env

require("dotenv").config();
const { metaAccountService } = require("../services/metaAccountService");
const { metaTemplateService } = require("../services/metaTemplateService");

console.log("==================================================");
console.log("🔍 TESTANDO CONEXÃO EM TEMPO REAL COM A META API");
console.log("==================================================\n");

(async () => {
  try {
    console.log("1. Verificando diagnóstico e saúde da conta...");
    const healthResult = await metaAccountService.checkConnectionStatus();

    if (healthResult.success) {
      console.log("✅ CONEXÃO COM A META ESTABELECIDA COM SUCESSO!");
      console.log("--------------------------------------------------");
      console.log("📱 Telefone de Teste/Exibição:", healthResult.data.displayPhoneNumber);
      console.log("🏢 Nome Verificado:", healthResult.data.verifiedName);
      console.log("💚 Quality Rating:", healthResult.data.qualityRating);
      console.log("📊 Limite de Mensagens (Tier):", healthResult.data.messagingLimitTier);
      console.log("--------------------------------------------------\n");

      console.log("2. Sincronizando Message Templates da WABA...");
      const templatesResult = await metaTemplateService.syncTemplates();

      if (templatesResult.success) {
        console.log(`✅ ${templatesResult.count} templates encontrados na conta!`);
        templatesResult.templates.forEach((t, i) => {
          console.log(`   ${i + 1}. [${t.status}] ${t.name} (${t.category}) - ${t.language}`);
        });
      } else {
        console.warn("⚠️ Aviso ao sincronizar templates:", templatesResult.error);
      }
    } else {
      console.error("❌ FALHA NA CONEXÃO COM A META:");
      console.error(healthResult.error);
    }
  } catch (err) {
    console.error("❌ Erro inesperado:", err.message);
  }

  console.log("\n==================================================");
})();
