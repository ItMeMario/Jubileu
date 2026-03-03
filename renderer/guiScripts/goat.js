document.addEventListener('DOMContentLoaded', () => {
    const emojiDisplay = document.getElementById('emoji-display');
    const goatTitle = document.getElementById('goat-title');

    // Mapeamento de teclas para exibição
    const displayMapping = {
        'q': '🙁 🔴',
        'w': '😐 🔵',
        'e': '🤩 🟢',
        'r': 'De novo 🔙'
    };

    // Função de delay baseada na lógica do randomDelay.js
    async function delay(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }

    let currentActionId = 0;

    document.addEventListener('keydown', async (event) => {
        const key = event.key.toLowerCase();
        
        if (displayMapping[key]) {
            currentActionId++;
            const myActionId = currentActionId;

            const content = displayMapping[key];
            
            // Adjust font size for 'De novo 🔙' as it is longer
            if (key === 'r') {
                emojiDisplay.style.fontSize = '8rem';
                emojiDisplay.classList.add('with-placeholder');
            } else {
                emojiDisplay.style.fontSize = '15rem';
                emojiDisplay.classList.remove('with-placeholder');
            }
            
            emojiDisplay.textContent = content;
            
            // Reduzir opacidade do título para dar destaque ao emoji
            if (goatTitle) {
                goatTitle.style.opacity = '0.05';
            }

            // Animação de pop
            emojiDisplay.classList.remove('changed');
            // Força o reflow para reiniciar a transição
            void emojiDisplay.offsetWidth;
            emojiDisplay.classList.add('changed');
            
            // Volta ao tamanho normal após a transição
            setTimeout(() => {
                emojiDisplay.classList.remove('changed');
            }, 150);

            // Intervalo de 15s em que a tela fica com o emoji
            await delay(15000);

            // Retorna ao default se nenhuma outra tecla correspondente foi apertada
            if (currentActionId === myActionId) {
                emojiDisplay.textContent = '';
                emojiDisplay.classList.remove('with-placeholder');
                if (goatTitle) {
                    goatTitle.style.opacity = '1';
                }
            }
        }
    });
});
