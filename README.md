# Tetris Game - React

Um jogo de Tetris moderno e responsivo construído com React, TypeScript e Tailwind CSS.

## Recursos

- 🎮 **Controles intuitivos** (teclado e mobile)
- 👻 **Peça fantasma** (mostra onde a peça atual vai cair)
- 📊 **Estatísticas detalhadas** (pontuação, linhas, nível, peças usadas)
- 🏆 **Recorde pessoal** (salvo localmente)
- ⚙️ **Configurações personalizáveis** (tamanho da grade, peça fantasma)
- 📱 **Design responsivo** (funciona em desktop e mobile)

## Como Jogar

### Controles do Teclado

- **← →** - Mover para esquerda/direita
- **↓** - Acelerar queda
- **↑ ou Espaço** - Rotacionar peça
- **D** - Queda rápida (drop instantâneo)
- **P** - Pausar o jogo
- **M** - Silenciar efeitos sonoros

### Controles Mobile

- Botões na tela para todas as ações

## Configurações

- **Peça fantasma**: Ativa/desativa a visualização da peça fantasma
- **Tamanho da grade**: Escolha entre pequeno, médio ou grande

## Tecnologias Utilizadas

- React
- TypeScript
- Tailwind CSS
- Lucide React (ícones)

## Instalação

1. Clone o repositório:
```bash
git clone https://github.com/seu-usuario/tetris-react.git
```

2. Instale as dependências:
```bash
cd tetris-react
npm install
npm install lucide-react
npm install -D tailwindcss@3.3.0 postcss autoprefixer
npx tailwindcss init -p
```

4. Configurações necessárias:
```bash
**tailwind.config.js**:
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};

**src/index.css**:
@tailwind base;
@tailwind components;
@tailwind utilities;
O arquivo index.css deve estar em src/index.css e conter apenas as três diretivas do Tailwind

**postcss.config.js**:
module.exports = {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

4. Execute o projeto:
```bash
npm start
```

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues ou enviar pull requests.

## Licença

MIT