# The Battles of the Iron Work

[Read in English](README.md)

Uma aventura em pixel art que roda no navegador. Um meteoro cai sobre a floresta de Bosque Alto e dele saem visitantes que não são deste mundo. Com o seu robô você explora a cidade, conversa com os moradores, pega missões e enfrenta robôs e aliens nos ringues da Liga de Robôs e nas fugas das fábricas, usando o tablet de combate. Os créditos que você ganha são gastos em peças na Oficina do Cristal para melhorar o robô.

As batalhas são jogadas com cartas. Cada robô tem uma classe, elementos e gadgets, você monta um deck, joga as cartas da mão e administra a barra de fúria e os efeitos de status, com chefes que têm regras próprias e uma plateia reagindo em volta do ringue. Fora das lutas tem a garagem para montar o robô, a loja, a casa, um companheiro, cutscenes, uma história que leva até o final e alguns segredos escondidos pelo mapa.

O jogo roda numa engine própria e pequena, escrita em TypeScript dentro do Next.js, com sprites, câmera, efeitos, áudio e controles por teclado ou por toque com joystick virtual. O mapa e as peças dos robôs são preparados por scripts da pasta scripts.

## Como usar

Você precisa do Node.js e do pnpm. Clone o repositório, rode pnpm install e depois pnpm dev e abra localhost na porta 3000. O pnpm test:world confere os dados do mundo. O pnpm export:game gera uma versão independente do jogo que funciona offline e salva na pasta dist, dentro de bosque-alto. Para salvar em outro lugar, defina a variável de ambiente EXPORT_DIR.

## Tempo de desenvolvimento

O jogo levou duas semanas para ser feito e está finalizado.
