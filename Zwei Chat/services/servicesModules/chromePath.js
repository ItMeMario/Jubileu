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

const puppeteerArgs = [
    '--no-sandbox', 
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--no-first-run',
    '--no-zygote',
    '--disable-gpu'
];

module.exports = {
    getChromeExecutablePath,
    puppeteerArgs
};
