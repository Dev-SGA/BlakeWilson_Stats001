# Blake Wilson — Stats 001

App Next.js (Vercel) para as estatísticas individuais de **Blake Wilson**, focado em situações de 1v1.

O visual segue a mesma base dos relatórios SGA: tema escuro SGA, Source Sans 3 e Good Times.

## Conteúdo

- **Summary (Stats)**: apenas dois focos — **Touches** (total e % que virou Offensive 1v1) e os blocos de **Offensive 1v1** e **Defensive 1v1**.
- **Facing 1v1**: total e quebra por tipo de movimento — Facing 1v1, Get Away from Opposition e Dribble Opponent — cada um com Progressive / Lost / Neutral Plays.
- **Back 1v1**: Progressive / Lost / Neutral Plays.
- **Defensive 1v1**: Won / Lost / Neutral.

## Desenvolvimento

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Dados

Edite `data/gameStats.json`. Cada partida tem `touches`, `offensive1v1`, `defensive1v1`, `facing1v1` (com `moves`) e `back1v1`. A foto do atleta fica em `public/player/` e os escudos em `public/clubs/`.
