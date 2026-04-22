// renderer/guiScripts/sentinelaModules/tabsSM.js

export default class TabsSM {
    constructor(manager) {
        this.manager = manager;
    }

    initTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');

        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;

                // Update buttons
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Update content
                tabContents.forEach(content => content.classList.remove('active'));
                document.getElementById(`tab-${targetTab}`).classList.add('active');

                // Trigger resize for ECharts when switching to mapa
                if (targetTab === 'mapa') {
                    window.dispatchEvent(new Event('resize'));
                }

                // Load data when switching to registros
                if (targetTab === 'registros') {
                    this.manager.records.loadRegistros();
                    this.manager.records.loadStats();
                }

                // Render calendar when switching to calendario
                if (targetTab === 'calendario') {
                    setTimeout(() => {
                        if (this.manager.calendar) {
                            this.manager.calendar.render();
                        }
                        this.manager.calendarSM.loadTimeline();
                    }, 100);
                }
            });
        });
    }
}
