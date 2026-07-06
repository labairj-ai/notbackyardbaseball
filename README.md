# Not Backyard Baseball

A mobile-first, browser-based baseball game inspired by classic backyard sports
games. It is built with vanilla JavaScript, Canvas, Web Audio, and Vite.

Play the deployed game:
[labairj-ai.github.io/notbackyardbaseball](https://labairj-ai.github.io/notbackyardbaseball/)

## Gameplay

- Three-inning games between the Backyard Bombers and Rival Rascals
- Player pitching with fastball, curveball, and change-up choices
- Normal and power swings with different contact and extra-base-hit tradeoffs
- Player-specific Power and Speed ratings using balanced stat budgets
- Sequential baserunning around every base on doubles and triples
- One-tap fielding with automatic base targeting
- Visible ball landing, fielder pursuit, base coverage, and relay throws
- Random inning music, sound effects, and a separate home-screen theme

## Controls

### Batting

1. Select **Normal** or **Power**. The pitch waits for a selection.
2. Tap **Swing** as the ball reaches the plate.
3. When prompted, choose whether to advance a runner.

Normal swings provide a larger contact window and favor singles. Power swings
have a smaller contact window but improve extra-base-hit odds on solid contact.

### Pitching and fielding

1. Select a pitch type.
2. Tap **Pitch**.
3. After fielding a live ball, tap the large **Throw** button.

The defense automatically selects the appropriate target. Infield ground balls
are directed to first base.

## Baseball rules represented

- Foul lines count as fair territory.
- A ball landing outside an infield foul line is a dead foul.
- An ordinary foul adds a strike only when the batter has fewer than two.
- A caught foul tip can result in strike three.
- A caught foul fly is an out.
- Runs do not score when the third out is a force out or the batter-runner is
  retired before first.
- On a non-force timing play, a run crossing home before the third out counts.

The game intentionally simplifies substitutions, appeals, steals, bunts, errors,
and several other professional rules.

## Development

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev
```

Create and preview a production build:

```bash
npm run build
npm run preview
```

The production build is written to `dist/`.

## Project structure

```text
src/
  main.js        Canvas setup, responsive scaling, input, and game loop
  game.js        State machine, entities, physics, scoring, and rules
  ui.js          Scoreboard and control rendering
  field.js       Baseball field rendering
  characters.js Team rosters, ratings, and character rendering
  sounds.js      Web Audio music and sound effects
  constants.js   Field geometry, game rules, pitches, and states
```

## Deployment

Pushes to `main` trigger the GitHub Actions workflow in
`.github/workflows/deploy.yml`, which builds the project and deploys `dist/` to
GitHub Pages.
