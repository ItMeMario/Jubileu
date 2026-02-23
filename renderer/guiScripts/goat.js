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

    document.addEventListener('keydown', (event) => {
        const key = event.key.toLowerCase();
        
        if (displayMapping[key]) {
            const content = displayMapping[key];
            
            // Adjust font size for 'De novo 🔙' as it is longer
            if (key === 'r') {
                emojiDisplay.style.fontSize = '8rem';
            } else {
                emojiDisplay.style.fontSize = '15rem';
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
        }
    });
});
