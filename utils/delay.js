const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
module.exports = delay;

module.exports = function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
};