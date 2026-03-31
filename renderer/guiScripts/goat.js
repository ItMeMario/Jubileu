document.addEventListener('DOMContentLoaded', () => {
    const circle = document.getElementById('color-circle');
    const goatTitle = document.getElementById('goat-title');

    // Suaviza o título
    if (goatTitle) {
        goatTitle.style.opacity = '0.05';
    }

    // Cores vibrantes estilo RGB para o círculo
    const colors = [
        '#ff003c', // Red/Crimson
        '#ffaa00', // Orange
        '#00ff2a', // Green
        '#00d4ff', // Cyan
        '#2a00ff', // Blue
        '#d400ff'  // Magenta
    ];

    let colorIndex = 0;

    // Função de pulse/piscar a cada 1 segundo (ritmo do desfile)
    setInterval(() => {
        circle.style.backgroundColor = colors[colorIndex];
        circle.style.boxShadow = `0 0 60px ${colors[colorIndex]}, 0 0 120px ${colors[colorIndex]}`;
        
        // Ativa o estado ligado
        circle.classList.add('blink-on');
        
        // Desliga após 500ms (meio segundo ligado, meio desligado)
        setTimeout(() => {
            circle.classList.remove('blink-on');
        }, 500);

        // Avança para a próxima cor no ciclo RGB
        colorIndex = (colorIndex + 1) % colors.length;
    }, 1000);
});
