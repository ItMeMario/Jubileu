// renderer/guiScripts/sentinelaRenderer.js

import UtilitySM from "./sentinelaModules/utilitySM.js";
import TabsSM from "./sentinelaModules/tabsSM.js";
import ImportSM from "./sentinelaModules/importSM.js";
import RecordsSM from "./sentinelaModules/recordsSM.js";
import MapSM from "./sentinelaModules/mapSM.js";
import CalendarSM from "./sentinelaModules/calendarSM.js";
import CitiesSM from "./sentinelaModules/citiesSM.js";

class SentinelaRenderer {
    constructor() {
        // State Management
        this.currentCSVContent = null;
        this.currentPage = 0;
        this.pageSize = 50;
        this.currentDDDFilter = '';
        this.globalDDDStats = {};
        this.currentMapMode = 'ddds';
        this.municipiosData = [];
        this.allEventsData = [];
        this.mapChart = null;
        this.originalMapOption = null;
        this.calendar = null;

        // Inicializa quando o DOM estiver pronto
        if (document.readyState === "loading") {
            document.addEventListener("DOMContentLoaded", () => this.init());
        } else {
            this.init();
        }
    }

    async init() {
        console.log("👁️ Inicializando SentinelaRenderer...");

        // Inicializa módulos
        this.initModules();

        // Configura ações síncronas
        this.tabs.initTabs();
        this.import.initImport();
        this.records.initRegistros();
        
        // Aguarda carregar dados básicos
        await this.cities.loadMunicipios();
        
        // Configura o calendário (que depende dos dados básicos mas pode inicializar a view)
        await this.calendarSM.initCalendar();
        
        // Carrega eventos e stats
        await this.cities.fetchAllEvents();
        await this.calendarSM.loadTimeline();
        await this.records.loadStats(); 
        
        // Configura mapa
        await this.map.initMap();
        this.map.initMapToggles();

        console.log("✅ SentinelaRenderer inicializado com sucesso");
    }

    initModules() {
        this.utility = new UtilitySM(this);
        this.tabs = new TabsSM(this);
        this.import = new ImportSM(this);
        this.records = new RecordsSM(this);
        this.map = new MapSM(this);
        this.calendarSM = new CalendarSM(this);
        this.cities = new CitiesSM(this);

        console.log("📦 Módulos do Sentinela inicializados:", [
            "utility",
            "tabs",
            "import",
            "records",
            "map",
            "calendarSM",
            "cities"
        ]);
    }
}

// Inicializa o renderer
const sentinelaRenderer = new SentinelaRenderer();

export default sentinelaRenderer;
