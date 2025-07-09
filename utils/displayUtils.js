function displayWelcome() {
    console.clear();
    console.log('📝 Initial Message Editor\n');
}

function displayMenu() {
    console.log('\nOptions:');
    console.log('[1] Create new message');
    console.log('[2] Edit existing message');
    console.log('[3] Paste from clipboard');
    console.log('[4] View all messages');
    console.log('[5] Check last inserted message');
    console.log('[0] Exit');
}

async function displayRecentMessages(messages) {
    if (messages.length > 0) {
        console.log('🔍 Last 3 messages:');
        messages.forEach((msg, i) => {
            console.log(`\n[${i + 1}] ID: ${msg.id}`);
            console.log(`   Content: ${msg.content.substring(0, 60)}${msg.content.length > 60 ? '...' : ''}`);
            console.log(`   Created at: ${new Date(msg.created_at).toLocaleString()}`);
            console.log(`   Default: ${msg.is_default ? '✅' : '❌'}`);
        });
    } else {
        console.log('\nℹ️ No messages found in database.');
    }
}

module.exports = {
    displayWelcome,
    displayMenu,
    displayRecentMessages
};
