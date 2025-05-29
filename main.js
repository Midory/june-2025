// Constants
const INITIAL_CLICK_VALUE = 1;
const INITIAL_UPGRADE_COST = 10;
const UPGRADE_COST_MULTIPLIER = 1.5;
const SAVE_KEY = 'clickerSave';
const version = '1.0.0';

// Game state object
const gameState = {
    points: 0,
    clickValue: INITIAL_CLICK_VALUE,
    upgradeLevel: 0,
    upgradeCost: INITIAL_UPGRADE_COST,
    ownedHeroes: {} // Track owned heroes and their counts
};

// DOM elements
const pointsDisplay = document.getElementById('points');
const upgradeBtn = document.getElementById('upgrade-btn');
const upgradeLevelDisplay = document.getElementById('upgrade-level');
const clickValueDisplay = document.getElementById('click-value');
const clickFeedback = document.getElementById('click-feedback');
const resetBtn = document.getElementById('reset-btn');
const heroesList = document.getElementById('heroes-list');
const progressBarInner = document.getElementById('progress-bar-inner');
const monsterImg = document.getElementById('monster-img');
const totalDpsDisplay = document.getElementById('total-dps');
const worldMap = document.getElementById('world-map');
const currentWorldDisplay = document.getElementById('current-world');

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
                spawnMonster();
                updateWorldUI();
            }
        };
    });
}

function updateWorldUI() {
    const world = getCurrentWorld();
    document.body.style.background = world.bg;
    const worldDisplay = document.getElementById('current-world');
    if (worldDisplay) {
        worldDisplay.textContent = `World: ${world.name}`;
        worldDisplay.style.color = world.color;
    }
    // Show world progress (monsters defeated / needed)
    const worldProgress = document.getElementById('world-progress');
    if (worldProgress) {
        // Only show progress if there is a next world to unlock
        const idx = worlds.findIndex(w => w.id === currentWorldId);
        if (idx < worlds.length - 1) {
            const remaining = 10 - monstersDefeated;
            worldProgress.textContent = `Defeated: ${monstersDefeated} / 10 monsters to unlock next world (${remaining > 0 ? remaining + ' left' : 'ready!'})`;
            worldProgress.style.display = '';
        } else {
            worldProgress.textContent = `All worlds unlocked! Monsters defeated in this world: ${monstersDefeated}`;
            worldProgress.style.display = '';
        }
    }
}

// Update spawnMonster to use world-specific monsters
function spawnMonster() {
    const world = getCurrentWorld();
    const ids = world.monsterIds;
    const idx = monstersDefeated % ids.length;
    const monsterId = ids[idx];
    currentMonster = { ...monsters.find(m => m.id === monsterId) };
    const scale = 1 + Math.floor(monstersDefeated / ids.length) * 0.25;
    currentMonster.hp = Math.floor(currentMonster.hp * scale);
    currentMonster.reward = Math.floor(currentMonster.reward * scale);
    monsterHP = currentMonster.hp;
    if (monsterImg && currentMonster.image) {
        monsterImg.onerror = null;
        monsterImg.src = currentMonster.image;
    }
    updateMonsterUI();
    updateWorldUI();
}

function defeatMonster() {
    if (monsterImg) {
        monsterImg.classList.add('fade-out');
        setTimeout(() => {
            monsterImg.classList.remove('fade-out');
            monstersDefeated++;
            gameState.points += currentMonster.reward;
            updateUI();
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
    const ids = world.monsterIds;
    const idx = monstersDefeated % ids.length;
    const monsterId = ids[idx];
    currentMonster = { ...monsters.find(m => m.id === monsterId) };
    // Increase difficulty for each cycle
    const scale = 1 + Math.floor(monstersDefeated / ids.length) * 0.25;
    currentMonster.hp = Math.floor(currentMonster.hp * scale);
    currentMonster.reward = Math.floor(currentMonster.reward * scale);
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
    heroesList.innerHTML = heroes.map(hero => {
        const count = gameState.ownedHeroes[hero.id] || 0;
        const price = Math.floor(hero.cost * Math.pow(1.15, count));
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
    pointsDisplay.textContent = `Points: ${gameState.points}`;
    upgradeLevelDisplay.textContent = `Upgrade Level: ${gameState.upgradeLevel}`;
    upgradeBtn.textContent = `Upgrade Click (Cost: ${gameState.upgradeCost})`;
    upgradeBtn.disabled = gameState.points < gameState.upgradeCost;
    clickValueDisplay.textContent = `Click Value: ${gameState.clickValue}`;
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
    monsterHPBarInner.style.width = (monsterHP / currentMonster.hp * 100) + '%';
    monsterHPBarInner.textContent = `${monsterHP} / ${currentMonster.hp}`;
    // Set monster image to local SVG only, and remove any onerror handler
    if (monsterImg && currentMonster.image) {
        monsterImg.onerror = null; // Ensure no fallback
        monsterImg.src = currentMonster.image;
    }
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
        monsterHPBarInner.classList.add('shake');
        setTimeout(() => monsterHPBarInner.classList.remove('shake'), 200);
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
 * Handle upgrade button click event.
 */
function handleUpgrade() {
    if (gameState.points >= gameState.upgradeCost) {
        gameState.points -= gameState.upgradeCost;
        gameState.upgradeLevel++;
        gameState.clickValue++;
        gameState.upgradeCost = Math.floor(gameState.upgradeCost * UPGRADE_COST_MULTIPLIER);
        updateUI();
        saveProgress();
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

// Add a play button for the chiptune theme
window.addEventListener('DOMContentLoaded', () => {
    const btn = document.createElement('button');
    btn.textContent = 'Play 16-bit Theme';
    btn.style = 'margin:0.5rem 0 1.5rem 0;padding:0.5rem 1.2rem;font-size:1.1rem;background:#ffd600;color:#3e2723;border-radius:8px;border:2px solid #bfa76a;box-shadow:0 0 8px #bfa76a88;cursor:pointer;font-family:MedievalSharp,cursive;';
    btn.onclick = playChiptuneTheme;
    const container = document.getElementById('audio-theme-container') || document.body;
    container.insertBefore(btn, container.firstChild);
});

// Start hero DPS interval
setInterval(() => {
    const dps = getTotalHeroDPS();
    if (dps > 0 && currentMonster && monsterHP > 0) {
        damageMonster(dps);
        updateUI();
        saveProgress();
    }
}, 100);

// Event listeners
upgradeBtn.addEventListener('click', handleUpgrade);
resetBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset your progress?')) {
        resetProgress();
    }
});

window.addEventListener('DOMContentLoaded', async () => {
    loadProgress();
    updateUI();
    await loadHeroes();
    await loadWorlds();
    await loadMonsters();
    renderWorldMap();
    updateWorldUI();
    // Remove clickBtn event and make monsterImg clickable
    if (monsterImg) {
        monsterImg.style.cursor = 'pointer';
        //monsterImg.addEventListener('click', handleClick);
    }
});
