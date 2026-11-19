// services/servicesModules/chromePath.js

function getChromeExecutablePath() {
    const platform = process.platform;
    if (platform === "win32") {
        const possiblePaths = [
            "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
            "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
            process.env.LOCALAPPDATA + "\\Google\\Chrome\\Application\\chrome.exe",
        ];
        return possiblePaths[0];
    } else if (platform === "darwin") {
        return "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    } else {
        return "/usr/bin/google-chrome";
    }
}

const LAUNCH_TIMEOUT_MS = 90000;
const AUTH_TIMEOUT_MS = 90000;

const puppeteerArgs = [
    '--window-position=-10000,-10000',
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu',
    '--disable-background-timer-throttling',
    '--disable-backgrounding-occluded-windows',
    '--disable-renderer-backgrounding',
    '--disable-ipc-flooding-protection',
    '--disable-extensions',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--mute-audio',
    '--disable-software-rasterizer',
    '--disable-dev-tools',
    '--disable-webgl',
    '--disable-threaded-animation',
    '--disable-threaded-scrolling',
    '--disable-in-process-stack-traces',
    '--disable-histogram-customizer',
    '--disable-gl-extensions',
    '--disable-composited-antialiasing',
    '--disable-canvas-aa',
    '--disable-3d-apis',
    '--disable-breakpad',
    '--disable-component-update',
    '--disable-print-preview',
    '--disable-background-networking',
    '--disable-features=TranslateUI,AudioServiceOutOfProcess,IsolateOrigins,site-per-process',
    '--disable-blink-features=AutomationControlled',
];

function getPuppeteerOptions(overrides = {}) {
    return {
        executablePath: getChromeExecutablePath(),
        headless: true,
        timeout: LAUNCH_TIMEOUT_MS,
        args: [...puppeteerArgs],
        ...overrides,
    };
}

module.exports = {
    getChromeExecutablePath,
    puppeteerArgs,
    getPuppeteerOptions,
    LAUNCH_TIMEOUT_MS,
    AUTH_TIMEOUT_MS,
};
