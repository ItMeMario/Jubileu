function getMultiLineInput(initialContent = '') {
    console.log('\nEnter your message (Ctrl+D to finish on Linux/Mac, Ctrl+Z on Windows):');
    
    if (initialContent) {
        console.log(`\nCurrent content:\n${initialContent}\n`);
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
    getMultiLineInput,
    askQuestion
};