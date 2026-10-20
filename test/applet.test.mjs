import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const ROOT = process.cwd();

test('Simplified Single-Player HUD in src/App.tsx excludes speed sliders, notation script bar, and multiplayer lobby', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');

  // Must include simplified game & camera controls
  for (const requiredId of [
    'btn-side-toggle',
    'btn-ai-move',
    'btn-reset',
    'btn-cam-player',
    'btn-cam-top',
    'btn-cam-side',
    'btn-cam-wide',
    'btn-hide-ui',
    'controls-hint',
    'captured-tray'
  ]) {
    assert.ok(appTsx.includes(`id="${requiredId}"`), `Missing required HUD control #${requiredId}`);
  }

  // Must NOT include camera speed sliders, script mode bar, or multiplayer lobby
  for (const forbiddenId of [
    'cam-speed-wrap',
    'input-cam-speed',
    'rot-speed-wrap',
    'input-rot-speed',
    'script-bar',
    'btn-script-modal',
    'btn-script-prev',
    'btn-script-next',
    'btn-lobby',
    'lobby-modal',
    'room-pill',
    'btn-checkmate-stepback'
  ]) {
    assert.ok(!appTsx.includes(forbiddenId), `Forbidden UI element #${forbiddenId} found in App.tsx`);
  }
});

test('All 7 compressed 3D assets (.glb.gz.b64) decode and gunzip to valid glTF 2.0 binary models', () => {
  const expectedModels = [
    'option8_cathedral',
    'pawn_white',
    'rook_white',
    'knight_white',
    'bishop_white',
    'queen_white',
    'king_white'
  ];

  for (const name of expectedModels) {
    const b64Path = path.join(ROOT, 'public/assets/glb', `${name}.glb.gz.b64`);
    assert.ok(fs.existsSync(b64Path), `Missing 3D asset ${b64Path}`);
    const b64Text = fs.readFileSync(b64Path, 'utf-8').trim();
    assert.ok(b64Text.length > 1000, `Asset ${name}.glb.gz.b64 is unexpectedly small`);

    const gzBuf = Buffer.from(b64Text, 'base64');
    const glbBuf = zlib.gunzipSync(gzBuf);

    const magic = glbBuf.toString('ascii', 0, 4);
    const version = glbBuf.readUInt32LE(4);
    const totalLen = glbBuf.readUInt32LE(8);
    assert.equal(magic, 'glTF', `Invalid glTF magic header for ${name}`);
    assert.equal(version, 2, `Invalid glTF version for ${name}`);
    assert.equal(totalLen, glbBuf.length, `Mismatched glTF byte length for ${name}`);
  }
});

test('Sound Effects toggle button is present in HUD controls and wired to sound engine', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engineJs = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');
  const soundEngineTs = fs.readFileSync(path.join(ROOT, 'src/soundEngine.ts'), 'utf-8');

  // Must include Sound Effects toggle button with id="btn-sound-toggle"
  assert.ok(appTsx.includes('id="btn-sound-toggle"'), 'Missing #btn-sound-toggle in App.tsx');
  assert.ok(appTsx.includes('Sound Effects: ON'), 'Missing Sound Effects: ON label in App.tsx');
  assert.ok(appTsx.includes('Sound Effects: Muted'), 'Missing Sound Effects: Muted label in App.tsx');

  // Engine imports and invokes soundEngine methods
  assert.ok(engineJs.includes('soundEngine'), 'wizardChessEngine.js must import or use soundEngine');
  assert.ok(engineJs.includes('playStoneShatterSound'), 'wizardChessEngine.js must trigger playStoneShatterSound on capture');
  assert.ok(engineJs.includes('playMoveSlideSound'), 'wizardChessEngine.js must trigger playMoveSlideSound on piece move');
  assert.ok(engineJs.includes('playKingFallSound'), 'wizardChessEngine.js must trigger playKingFallSound on checkmate impact');

  // Sound engine provides ambient cathedral sound and piece audio toggles
  assert.ok(soundEngineTs.includes('toggleSound'), 'soundEngine.ts must export toggleSound');
  assert.ok(soundEngineTs.includes('startAmbientCathedral'), 'soundEngine.ts must implement ambient cathedral sounds');
  assert.ok(soundEngineTs.includes('playStoneShatterSound'), 'soundEngine.ts must implement piece interaction audio');
});

test('Cinematic Mode toggle is present in HUD controls, orbits cathedral, and focuses on capture sequences', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engineJs = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  // Must include Cinematic Mode toggle button with id="btn-cinematic-toggle"
  assert.ok(appTsx.includes('id="btn-cinematic-toggle"'), 'Missing #btn-cinematic-toggle in App.tsx');
  assert.ok(appTsx.includes('Cinematic Mode') || appTsx.includes('Cinematic: ON'), 'Missing Cinematic Mode label in App.tsx');

  // Engine must implement cinematic mode functions and orbit angle
  assert.ok(engineJs.includes('cinematicModeActive'), 'wizardChessEngine.js must declare cinematicModeActive');
  assert.ok(engineJs.includes('toggleCinematicMode'), 'wizardChessEngine.js must export toggleCinematicMode');
  assert.ok(engineJs.includes('cinematicOrbitAngle'), 'wizardChessEngine.js must maintain cinematicOrbitAngle');

  // Capture sequence must focus on pieces and transition back into orbit
  assert.ok(engineJs.includes('evalQuadraticBezier'), 'wizardChessEngine.js must use Bezier capture focusing');
  assert.ok(engineJs.includes('orbitExitPos'), 'wizardChessEngine.js must smoothly exit capture into cinematic orbit');
});

test('Cathedral Lighting toggle button cycles through Day, Candlelight, and Midnight presets', () => {
  const appTsx = fs.readFileSync(path.join(ROOT, 'src/App.tsx'), 'utf-8');
  const engineJs = fs.readFileSync(path.join(ROOT, 'src/wizardChessEngine.js'), 'utf-8');

  // Must include Cathedral Lighting toggle button with id="btn-lighting-toggle"
  assert.ok(appTsx.includes('id="btn-lighting-toggle"'), 'Missing #btn-lighting-toggle in App.tsx');
  assert.ok(appTsx.includes('Lighting: Day'), 'Missing Lighting: Day in App.tsx');
  assert.ok(appTsx.includes('Lighting: Candlelight'), 'Missing Lighting: Candlelight in App.tsx');
  assert.ok(appTsx.includes('Lighting: Midnight'), 'Missing Lighting: Midnight in App.tsx');

  // Engine must implement lighting presets and cycling
  assert.ok(engineJs.includes('LIGHTING_PRESETS'), 'wizardChessEngine.js must define LIGHTING_PRESETS');
  assert.ok(engineJs.includes('applyLightingPreset'), 'wizardChessEngine.js must define applyLightingPreset');
  assert.ok(engineJs.includes('cycleLightingPreset'), 'wizardChessEngine.js must define cycleLightingPreset');

  // Day preset includes sunlight shafts
  assert.ok(engineJs.includes('createCathedralSunlightShafts'), 'wizardChessEngine.js must implement sunlight shafts');
  assert.ok(engineJs.includes('cathedralSunlightShafts'), 'wizardChessEngine.js must manage sunlight shafts');
});



