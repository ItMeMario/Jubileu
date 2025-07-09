function getMultiLine(prompt = '', initialContent = '') {
    if (prompt) console.log('\n' + prompt);

    console.log('(Finalize com Ctrl+D no Linux/Mac ou Ctrl+Z no Windows)\n');

    if (initialContent) {
        console.log(`\nConteúdo atual:\n${initialContent}\n`);
    }

    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    let input = '';
    return new Promise((resolve) => {
        process.stdin.on('data', (chunk) => {
            input += chunk;
        });

        process.stdin.on('end', () => {
            process.stdin.pause();
            resolve(input.trim());
        });
    });
}

function askQuestion(question) {
    return new Promise((resolve) => {
        process.stdout.write(question);

        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        process.stdin.once('data', (data) => {
            process.stdin.pause();
            resolve(data.toString().trim());
        });
    });
}

module.exports = {
    askQuestion,
    getMultiLine
};
