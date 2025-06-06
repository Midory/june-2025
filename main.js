// Constants
const SAVE_KEY = 'clickerSave';
const MONSTERS_PER_LEVEL = 10; // Number of monsters per level
const LEVELS_PER_WORLD = 100; // Number of levels in each world
const INITIAL_CLICK_VALUE = 1; // Initial click value
const INITIAL_UPGRADE_COST = 10; // Initial cost for click upgrade
const version = '1.0.0';

// Game state object
const gameState = {
    points: 0,
    ownedHeroes: { 1: 1 }, // Start with 1 Warrior
    currentLevel: 1 // Track current level in game state
};

// DOM elements
const pointsDisplay = document.getElementById('points');
const resetBtn = document.getElementById('reset-btn');
const heroesList = document.getElementById('heroes-list');
const progressBarInner = document.getElementById('progress-bar-inner');
const monsterImg = document.getElementById('monster-img');
const totalDpsDisplay = document.getElementById('total-dps');
const worldMap = document.getElementById('world-map');
const currentWorldDisplay = document.getElementById('current-world');
const heroPointsDisplay = document.getElementById('hero-points');

// Load heroes from JSON file (for now, fetch locally)
let heroes = [];

// Monster system
let monsters = [];
let currentMonsterIndex = 0;
let currentMonster = null;
let monsterHP = 0;
let monstersDefeated = 0;

// Monster UI elements
const monsterNameDisplay = document.getElementById('monster-name');
const monsterHPBar = document.getElementById('monster-hp-bar');
const monsterHPBarInner = document.getElementById('monster-hp-bar-inner');

// --- WORLD SYSTEM (v0.5) ---
let worlds = [];
let currentWorldId = 1;

async function loadWorlds() {
    try {
        const response = await fetch('worlds.json');
        if (!response.ok) throw new Error('Failed to load worlds.json');
        worlds = await response.json();
        // Only spawn monster after both monsters and worlds are loaded
        if (monsters && monsters.length > 0) {
            spawnMonster();
        }
    } catch (e) {
        console.error('Error loading worlds:', e);
        // Fallback: at least one world
        worlds = [
            { id: 1, name: 'Greenwood Forest', theme: 'forest', color: '#43e97b', bg: '#e0cfa9', monsterIds: [1,2,3,6], music: 'forest', unlocked: true }
        ];
        if (monsters && monsters.length > 0) {
            spawnMonster();
        }
    }
}

function getCurrentWorld() {
    return worlds.find(w => w.id === currentWorldId);
}

function unlockNextWorld() {
    const idx = worlds.findIndex(w => w.id === currentWorldId);
    if (idx < worlds.length - 1) {
        worlds[idx+1].unlocked = true;
    }
}

function renderWorldMap() {
    const map = document.getElementById('world-map');
    if (!map) return;
    map.innerHTML = worlds.map(world => `
        <button class="world-btn" data-world-id="${world.id}" ${!world.unlocked ? 'disabled' : ''}
            style="background:${world.bg};color:${world.color};border:2px solid ${world.color};margin:0.5rem 0.7rem;padding:0.7rem 1.2rem;border-radius:18px;font-family:'MedievalSharp',cursive;font-size:1.1rem;box-shadow:0 0 12px ${world.color}55;cursor:${world.unlocked?'pointer':'not-allowed'};opacity:${world.unlocked?1:0.5};">
            ${world.name}
        </button>
    `).join('');
    map.querySelectorAll('.world-btn').forEach(btn => {
        btn.onclick = () => {
            const wid = parseInt(btn.getAttribute('data-world-id'));
            if (getCurrentWorld().id !== wid) {
                currentWorldId = wid;
                monstersDefeated = 0;
                gameState.currentLevel = 1; // Reset level to 1 when changing world
                spawnMonster();
                updateWorldUI();
            }
        };
    });
}

function getCurrentLevel() {
    return gameState.currentLevel;
}

function getMonsterForLevel(world, level, monsterIndex) {
    // Each level contains 10 monsters, cycling through world.monsterIds
    const monsterId = world.monsterIds[monsterIndex % world.monsterIds.length];
    const baseMonster = monsters.find(m => m.id === monsterId);
    // HP scaling: base HP * (1 + 0.15 * (level-1))
    const hpScale = 1 + 0.15 * (level - 1);
    return {
        ...baseMonster,
        hp: Math.floor(baseMonster.hp * hpScale),
        reward: Math.floor(baseMonster.reward * hpScale)
    };
}

function spawnMonster() {
    const world = getCurrentWorld();
    const monsterIndex = monstersDefeated % MONSTERS_PER_LEVEL;
    currentMonster = getMonsterForLevel(world, gameState.currentLevel, monsterIndex);
    monsterHP = currentMonster.hp;
    setMonsterSvgImage(currentMonster.image);
    updateMonsterUI();
    updateWorldUI();
}

function defeatMonster() {
    monstersDefeated++;
    gameState.points += currentMonster.reward;
    // Advance to next level after every 10 monsters
    log.info(`Defeated monster: ${currentMonster.name}, Reward: ${currentMonster.reward} points`);
    if (monstersDefeated == MONSTERS_PER_LEVEL) {
        gameState.currentLevel++;
        log.info(`Level up! Now at level ${gameState.currentLevel}`);
        monstersDefeated = 0; // Reset monstersDefeated for new level
    }
    updateUI();
    spawnMonster();
}

function updateWorldUI() {
    const world = getCurrentWorld();
    document.body.style.background = world.bg;
    const worldDisplay = document.getElementById('current-world');
    if (worldDisplay) {
        worldDisplay.textContent = `World: ${world.name}`;
        worldDisplay.style.color = world.color;
    }
    // Show world progress (level and monsters defeated in level)
    const worldProgress = document.getElementById('world-progress');
    if (worldProgress) {
        worldProgress.textContent = `Level: ${gameState.currentLevel} / ${LEVELS_PER_WORLD}  |  Monster ${((monstersDefeated % MONSTERS_PER_LEVEL) + 1)} / ${MONSTERS_PER_LEVEL}`;
        worldProgress.style.display = '';
    }
}

// Update spawnMonster to use world-specific monsters
function spawnMonster() {
    const world = getCurrentWorld();
    const monsterIndex = monstersDefeated % MONSTERS_PER_LEVEL;
    currentMonster = getMonsterForLevel(world, gameState.currentLevel, monsterIndex);
    monsterHP = currentMonster.hp;
    if (monsterImg && currentMonster.image) {
        monsterImg.onerror = null;
        monsterImg.src = currentMonster.image;
    }
    updateMonsterUI();
    updateWorldUI();
}

/**
 * Fetch heroes data from heroes.json and store in heroes array.
 */
async function loadHeroes() {
    try {
        const response = await fetch('heroes.json');
        if (!response.ok) throw new Error('Failed to load heroes.json');
        heroes = await response.json();
        renderHeroes();
    } catch (e) {
        console.error('Error loading heroes:', e);
        if (heroesList) heroesList.innerHTML = '<p>Error loading heroes.</p>';
    }
}

/**
 * Fetch monsters data from monsters.json and store in monsters array.
 */
async function loadMonsters() {
    try {
        const response = await fetch('monsters.json');
        if (!response.ok) throw new Error('Failed to load monsters.json');
        monsters = await response.json();
        // Only spawn monster after both monsters and worlds are loaded
        if (worlds && worlds.length > 0) {
            spawnMonster();
        }
    } catch (e) {
        console.error('Error loading monsters:', e);
    }
}

/**
 * Attempt to purchase a hero by id.
 * @param {number} heroId
 */
function purchaseHero(heroId) {
    const hero = heroes.find(h => h.id === heroId);
    if (!hero) return;
    const count = gameState.ownedHeroes[heroId] || 0;
    // Calculate current price (base cost * 1.15^count)
    const price = Math.floor(hero.cost * Math.pow(1.15, count));
    if (gameState.points < price) return; // Not enough points
    gameState.points -= price;
    gameState.ownedHeroes[heroId] = count + 1;
    updateUI();
    saveProgress();
    renderHeroes();
}

/**
 * Spawn a new monster (progressively harder).
 */
function spawnMonster() {
    const world = getCurrentWorld();
    const monsterIndex = monstersDefeated % MONSTERS_PER_LEVEL;
    currentMonster = getMonsterForLevel(world, gameState.currentLevel, monsterIndex);
    monsterHP = currentMonster.hp;
    // Set monster image to local SVG only, and remove any onerror handler
    if (monsterImg && currentMonster.image) {
        monsterImg.onerror = null; // Ensure no fallback
        monsterImg.src = currentMonster.image;
    }
    updateMonsterUI();
    updateWorldUI();
}

/**
 * Render the list of heroes in the UI, with purchase buttons.
 */
function renderHeroes() {
    if (!heroesList) return;
    if (!heroes.length) {
        heroesList.innerHTML = '<p>No heroes available.</p>';
        return;
    }
    // Only show heroes we own, can afford, or the next unaffordable hero in the list
    let shownNext = false;
    heroesList.innerHTML = heroes.map((hero, idx) => {
        const count = gameState.ownedHeroes[hero.id] || 0;
        const price = Math.floor(hero.cost * Math.pow(1.15, count));
        const canAfford = gameState.points >= price;
        // Show if owned, can afford, or (first unaffordable hero after all previous are hidden)
        if (count > 0 || canAfford) {
            shownNext = false;
        } else if (!shownNext) {
            shownNext = true;
        } else {
            return '';
        }
        let heroSvg = '';
        if (hero.id === 1) {
            heroSvg = `<img src="images/hero_warrior.svg" width="48" height="48" alt="Warrior" />`;
        } else if (hero.id === 2) {
            heroSvg = `<img src="images/hero_archer.svg" width="48" height="48" alt="Archer" />`;
        } else if (hero.id === 3) {
            heroSvg = `<img src="images/hero_mage.svg" width="48" height="48" alt="Mage" />`;
        } else {
            heroSvg = `<svg width='48' height='48' xmlns='http://www.w3.org/2000/svg'><rect x='8' y='8' width='32' height='32' rx='8' fill='#${(hero.id*1234567).toString(16).slice(0,6)}' stroke='#333' stroke-width='3'/><ellipse cx='20' cy='28' rx='4' ry='6' fill='#fff'/><ellipse cx='28' cy='28' rx='4' ry='6' fill='#fff'/><ellipse cx='20' cy='30' rx='2' ry='3' fill='#222'/><ellipse cx='28' cy='30' rx='2' ry='3' fill='#222'/></svg>`;
        }
        return `
        <div class="hero-card">
            <div class="hero-svg">${heroSvg}</div>
            <div class="hero-info">
                <div class="hero-main">
                    <div class="hero-name">${hero.name}</div>
                    <div class="hero-desc">${hero.description}</div>
                </div>
                <div class="hero-stats">
                    <div><strong>DPS:</strong> ${hero.baseDPS}</div>
                    <div><strong>Owned:</strong> ${count}</div>
                    <div><strong>Cost:</strong> ${price}</div>
                </div>
                <button class="buy-hero-btn" data-hero-id="${hero.id}" ${gameState.points < price ? 'disabled' : ''}>
                    Buy
                </button>
            </div>
        </div>
        `;
    }).join('');
    // Add event listeners for buy buttons
    document.querySelectorAll('.buy-hero-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            const heroId = parseInt(btn.getAttribute('data-hero-id'));
            purchaseHero(heroId);
        });
    });
}

/**
 * Update all UI elements to reflect the current game state.
 */
function updateUI() {
    if (heroPointsDisplay) {
        heroPointsDisplay.textContent = `Points: ${gameState.points}`;
    }
    // Remove pointsDisplay.textContent assignment (pointsDisplay is null)
    // if (pointsDisplay) {
    //     pointsDisplay.textContent = '';
    // }
    // Remove click value and upgrade UI
    // upgradeLevelDisplay.textContent = `Upgrade Level: ${gameState.upgradeLevel}`;
    // upgradeBtn.textContent = `Upgrade Click (Cost: ${gameState.upgradeCost})`;
    // upgradeBtn.disabled = gameState.points < gameState.upgradeCost;
    // clickValueDisplay.textContent = `Click Value: ${gameState.clickValue}`;
    updateProgressBar();
    // Highlight total DPS
    if (totalDpsDisplay) {
        const dps = getTotalHeroDPS();
        totalDpsDisplay.textContent = `Total DPS: ${dps}`;
        totalDpsDisplay.style.fontWeight = dps > 0 ? 'bold' : 'normal';
        totalDpsDisplay.style.color = dps > 0 ? '#43e97b' : '#fff';
        totalDpsDisplay.style.fontSize = '1.3rem';
        totalDpsDisplay.style.textShadow = dps > 0 ? '0 0 8px #43e97b88' : 'none';
    }
}

/**
 * Update the progress bar for points toward next upgrade.
 */
function updateProgressBar() {
    if (!progressBarInner) return;
    const nextUpgradeCost = gameState.upgradeCost;
    const percent = Math.min(100, (gameState.points / nextUpgradeCost) * 100);
    progressBarInner.style.width = percent + '%';
}

/**
 * Save the current game state to localStorage.
 */
function saveProgress() {
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
    } catch (e) {
        console.error('Failed to save progress:', e);
    }
}

/**
 * Load the game state from localStorage, if available.
 */
function loadProgress() {
    try {
        const saveData = localStorage.getItem(SAVE_KEY);
        if (saveData) {
            const data = JSON.parse(saveData);
            gameState.points = data.points ?? 0;
            gameState.clickValue = data.clickValue ?? INITIAL_CLICK_VALUE;
            gameState.upgradeLevel = data.upgradeLevel ?? 0;
            gameState.upgradeCost = data.upgradeCost ?? INITIAL_UPGRADE_COST;
            gameState.ownedHeroes = data.ownedHeroes ?? {}; // Now an object
            gameState.currentLevel = data.currentLevel ?? 1;
        }
    } catch (e) {
        console.error('Failed to load progress:', e);
    }
}

/**
 * Reset the game state to initial values and update UI/storage.
 */
function resetProgress() {
    gameState.points = 0;
    gameState.clickValue = INITIAL_CLICK_VALUE;
    gameState.upgradeLevel = 0;
    gameState.upgradeCost = INITIAL_UPGRADE_COST;
    gameState.ownedHeroes = {}; // Now an object
    gameState.currentLevel = 1;
    saveProgress();
    updateUI();
}

/**
 * Enhance click feedback with particle effect
 */
function spawnParticle(x, y) {
    const particle = document.createElement('span');
    particle.className = 'particle';
    particle.textContent = '+' + gameState.clickValue;
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    document.body.appendChild(particle);
    setTimeout(() => particle.remove(), 1000);
}

/**
 * Update monster UI (name, HP bar, image).
 */
function updateMonsterUI() {
    if (!currentMonster) return;
    monsterNameDisplay.textContent = currentMonster.name;
    // Update monster HP bar in SVG
    updateMonsterHpBar(monsterHP, currentMonster.hp);
    // Update monster image in SVG
    setMonsterSvgImage(currentMonster.image);
}

/**
 * Update monster HP bar in SVG
 */
function updateMonsterHpBar(current, max) {
    const hpBar = document.getElementById('monster-hp-bar-inner-svg');
    const hpText = document.getElementById('monster-hp-text');
    if (!hpBar || !hpText) return;
    const percent = Math.max(0, Math.min(1, current / max));
    hpBar.setAttribute('width', (140 * percent).toString());
    hpText.textContent = `${Math.ceil(current)} / ${Math.ceil(max)} HP`;
}

/**
 * Update monster image in SVG
 */
function setMonsterSvgImage(src) {
    const img = document.getElementById('monster-img-svg');
    if (img) img.setAttribute('href', src);
}

/**
 * Damage the monster and handle defeat.
 * @param {number} dmg
 */
function damageMonster(dmg) {
    if (!currentMonster) return;
    monsterHP -= dmg;
    if (monsterHP < 0) monsterHP = 0;
    updateMonsterUI();
    if (monsterHP === 0) {
        defeatMonster();
    } else {
        // Animate HP bar
        //monsterHPBarInner.classList.add('shake');
        //setTimeout(() => monsterHPBarInner.classList.remove('shake'), 200);
    }
}

/**
 * Handle monster defeat: reward player, spawn new monster, animate.
 */
function defeatMonster() {
    // Fade out animation
    if (monsterImg) {
        monsterImg.classList.add('fade-out');
        setTimeout(() => {
            monsterImg.classList.remove('fade-out');
            monstersDefeated++;
            gameState.points += currentMonster.reward;
            updateUI();
            // Unlock next world after 10 monsters
            if (monstersDefeated === 10) unlockNextWorld();
            spawnMonster();
        }, 400);
    } else {
        monstersDefeated++;
        gameState.points += currentMonster.reward;
        updateUI();
        if (monstersDefeated === 10) unlockNextWorld();
        spawnMonster();
    }
}

/**
 * Show feedback animation when clicking.
 */
function showClickFeedback() {
    clickFeedback.textContent = `+${gameState.clickValue}`;
    clickFeedback.classList.remove('active');
    // Force reflow to restart animation
    void clickFeedback.offsetWidth;
    clickFeedback.classList.add('active');
}

/**
 * Calculate total DPS from all owned heroes.
 */
function getTotalHeroDPS() {
    let total = 0;
    for (const hero of heroes) {
        const count = gameState.ownedHeroes[hero.id] || 0;
        total += hero.baseDPS * count;
    }
    return total;
}

// 16-bit style chiptune theme using Web Audio API
function playChiptuneTheme() {
    if (window.chiptuneThemePlaying) return;
    window.chiptuneThemePlaying = true;
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const tempo = 120; // BPM
    const notes = [
        523.25, 587.33, 659.25, 698.46, 783.99, 659.25, 523.25, 392.00, // C D E F G E C G
        392.00, 440.00, 523.25, 587.33, 659.25, 587.33, 523.25, 392.00  // G A C D E D C G
    ];
    let step = 0;
    function playNote(freq, duration) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.value = freq;
        gain.gain.value = 0.18;
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
        osc.onended = () => gain.disconnect();
    }
    function loop() {
        playNote(notes[step % notes.length], 60/tempo*0.9);
        step++;
        setTimeout(loop, 60/tempo*1000);
    }
    loop();
}



// Start hero DPS interval
setInterval(() => {
    const dps = getTotalHeroDPS();
    if (dps > 0 && currentMonster && monsterHP > 0) {
        damageMonster(dps);
        updateUI();
        saveProgress();
    }
}, 100);

// --- CANVAS AUTO-BATTLE SYSTEM (v1.0) ---
const battleCanvas = document.getElementById('battle-canvas');
const battleCtx = battleCanvas ? battleCanvas.getContext('2d') : null;

function drawBattleScene() {
    if (!battleCtx || !battleCanvas) return;
    // Clear
    battleCtx.clearRect(0, 0, battleCanvas.width, battleCanvas.height);
    // Draw background
    battleCtx.fillStyle = '#fff8e1';
    battleCtx.fillRect(0, 0, battleCanvas.width, battleCanvas.height);
    // Draw heroes (owned)
    const ownedHeroes = heroes.filter(h => gameState.ownedHeroes[h.id]);
    ownedHeroes.forEach((hero, i) => {
        // Position heroes vertically spaced on left
        const y = 60 + i * 60;
        drawHeroSprite(hero, 60, y, 48, 48);
    });
    // Draw monster (right side)
    if (currentMonster) {
        drawMonsterSprite(currentMonster, battleCanvas.width - 120, battleCanvas.height / 2 - 48, 96, 96);
    }
    // Draw floating damage numbers, effects, etc. (future)
}

function drawHeroSprite(hero, x, y, w, h) {
    // Use SVG or fallback block
    let img = new window.Image();
    if (hero.id === 1) img.src = 'images/hero_warrior.svg';
    else if (hero.id === 2) img.src = 'images/hero_archer.svg';
    else if (hero.id === 3) img.src = 'images/hero_mage.svg';
    else img = null;
    if (img) {
        img.onload = () => battleCtx.drawImage(img, x, y, w, h);
        if (img.complete) battleCtx.drawImage(img, x, y, w, h);
    } else {
        // Fallback: colored block
        battleCtx.fillStyle = '#bfa76a';
        battleCtx.fillRect(x, y, w, h);
    }
}

function drawMonsterSprite(monster, x, y, w, h) {
    let img = new window.Image();
    img.src = monster.image;
    img.onload = () => battleCtx.drawImage(img, x, y, w, h);
    if (img.complete) battleCtx.drawImage(img, x, y, w, h);
}

function battleLoop() {
    drawBattleScene();
    window.requestAnimationFrame(battleLoop);
}
if (battleCanvas && battleCtx) {
    window.requestAnimationFrame(battleLoop);
}

// Event listeners
resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset your progress?')) {
        resetProgress();
    }
});

window.addEventListener('DOMContentLoaded', async () => {
    // Lower music volume to 5%
    const audio = document.getElementById('audio-theme');
    if (audio) audio.volume = 0.05;
    loadProgress();
    updateUI();
    await loadHeroes();
    await loadWorlds();
    await loadMonsters();
    renderWorldMap();
    updateWorldUI();
    if (monsterImg) {
        monsterImg.style.cursor = 'pointer';
        //monsterImg.addEventListener('click', handleClick);
    }
});
