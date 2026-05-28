// ===================================
// GARDEN DEFENSE PROFESSIONAL ENGINE
// ADVANCED GAME LOGIC V2.0
// ===================================

(function() {
    'use strict';

    // -----------------------------------
    // GLOBAL STATE & VARIABLES
    // -----------------------------------
    let sunPoints = 100;
    let currentWave = 1;
    let selectedPlant = null;
    let isShovelActive = false;
    let gameOver = false;
    let levelStarted = false;
    const INFINITE_SUN_TEST = true;
    const maxSelectedPlants = 4;
    const selectedLoadout = new Set();
    
    // Core Game Objects
    const zombies = [];
    const plants = [];
    const projectiles = [];
    const activeSunPool = [];

    // Intervals
    let waveSpawningInterval = null;
    let mainGameInterval = null;
    let randomSunInterval = null;
    let startSequenceActive = false;
    let waveSpawnedCount = 0;
    let waveSpawnTarget = 0;
    let waveClearHandled = false;
    let screenFlashEl = null;
    let hoverPlantPreviewEl = null;
    let cherryRangePreviewEl = null;
    
    // UI Elements
    const DOM = {
        menu: document.getElementById("mainMenu"),
        plantPickerMenu: document.getElementById("plantPickerMenu"),
        plantPickerGrid: document.getElementById("plantPickerGrid"),
        pickerCount: document.getElementById("pickerCount"),
        startGameBtn: document.getElementById("startGameBtn"),
        startLevelBtn: document.getElementById("startLevelBtn"),
        almanacBtn: document.getElementById("almanacBtn"),
        almanacPanel: document.getElementById("almanacPanel"),
        almanacList: document.getElementById("almanacList"),
        almanacCloseBtn: document.getElementById("almanacCloseBtn"),
        board: document.getElementById("gameBoard"),
        gameContainer: document.querySelector(".game-container"),
        sun: document.getElementById("sunCount"),
        wave: document.getElementById("waveCount"),
        overlay: document.getElementById("gameOverlay"),
        overlayText: document.getElementById("overlayText"),
        overlaySubtext: document.getElementById("overlaySubtext"),
        warning: document.getElementById("waveWarning"),
        shovel: document.getElementById("shovelTool"),
        progressFill: document.getElementById("levelProgress"),
        progressFlag: document.getElementById("zombieHeadFlag"),
        restart: document.getElementById("restartBtn")
    };

    // Plant Database
    const PlantDB = {
        "peashooter": {
            cost: 100, hp: 300, shootRate: 1.4, cooldown: 7.5, sprite: 'assets/peashooter1.png',
            shootFrames: ['assets/peashooter1.png', 'assets/peashooter2.png', 'assets/peashooter3.png', 'assets/peashooter4.png', 'assets/peashooter5.png', 'assets/peashooter6.png']
        },
        "repeater": {
            cost: 200, hp: 300, shootRate: 1.4, cooldown: 7.5, sprite: 'assets/repeater1.png',
            shootFrames: ['assets/repeater1.png', 'assets/repeater2.png', 'assets/repeater3.png', 'assets/repeater4.png']
        },
        "bonkchoi": {
            cost: 125, hp: 300, cooldown: 7.5, attackRate: 0.75, attackDamage: 35, attackRange: 190,
            sprite: 'assets/bonkchoiidle1.png',
            idleFrames: ['assets/bonkchoiidle1.png', 'assets/bonkchoiidle2.png', 'assets/bonkchoiidle3.png', 'assets/bonkchoiidle4.png'],
            punchFrames: ['assets/bonkchoipunch1.png', 'assets/bonkchoipunch2.png', 'assets/bonkchoipunch3.png', 'assets/bonkchoipunch4.png', 'assets/bonkchoipunch5.png']
        },
        "sunflower": { cost: 50, hp: 300, sunRate: 24, cooldown: 7.5, sprite: 'assets/sunflower.png' },
        "wallnut": { cost: 50, hp: 5000, cooldown: 30, sprite: 'assets/wallnut.png', sprite_half: 'assets/wallnut_halflife.png' },
        "snowpea": {
            cost: 175, hp: 300, shootRate: 1.4, cooldown: 7.5, sprite: 'assets/snowpea1.png', slowEffect: 0.5,
            shootFrames: ['assets/snowpea1.png', 'assets/snowpea2.png', 'assets/snowpea3.png', 'assets/snowpea4.png', 'assets/snowpea5.png', 'assets/snowpea6.png'],
            bulletSprite: 'assets/snowpeabullet.png'
        },
        "cherry_bomb": { cost: 150, hp: 30000, cooldown: 50, sprite: 'assets/cherry_bomb.png', explodes: true, explodeDelay: 1.2 },
        "potato_mine": { cost: 25, hp: 300, cooldown: 30, sprite_unarmed: 'assets/potato_mine_unarmed.png', sprite: 'assets/potato_mine.png', armTime: 14 }
    };

    // Zombie Database
    const ZombieDB = {
        "zombie": {
            hp: 190, speed: 0.3, bite: 10, sprite: 'assets/zombie1.png',
            walkFrames: ['assets/zombie1.png', 'assets/zombie2.png', 'assets/zombie3.png', 'assets/zombie4.png'],
            bodySprite: 'assets/zombiebody.png',
            headSprite: 'assets/zombiehead.png'
        },
        "slowzombie": { hp: 240, speed: 0.18, bite: 10, sprite: 'assets/slowzombie.png' },
        "buckethead": {
            hp: 190,
            speed: 0.3,
            bite: 10,
            sprite: 'assets/bucketheadzombie1.png',
            walkFrames: [
                'assets/bucketheadzombie1.png',
                'assets/bucketheadzombie2.png',
                'assets/bucketheadzombie3.png',
                'assets/bucketheadzombie4.png',
                'assets/bucketheadzombie5.png',
                'assets/bucketheadzombie6.png'
            ],
            sprite_no_armor: 'assets/zombie1.png',
            armor: 1100,
            armor_clink: true
        }
    };

    // Wave Progression Balancer
    const LevelDB = {
        totalWaves: 10,
        1: { zombieSpawnCount: 1 },
        2: { zombieSpawnCount: 2 },
        3: { zombieSpawnCount: 3 },
        4: { zombieSpawnCount: 4 },
        5: { zombieSpawnCount: 6 },
        6: { zombieSpawnCount: 8 },
        7: { zombieSpawnCount: 10 },
        8: { zombieSpawnCount: 12 },
        9: { zombieSpawnCount: 15 },
        10: { zombieSpawnCount: 20, huge: true }
    };


    // -----------------------------------
    // AUDIO ENGINE
    // -----------------------------------
    const AudioEngine = {
        sounds: {},
        init: function() {
            const audioTags = document.querySelectorAll('audio');
            audioTags.forEach(tag => { this.sounds[tag.id] = tag; });
        },
        play: function(id) {
            if (this.sounds[id]) {
                if(this.sounds[id].paused) {
                    this.sounds[id].currentTime = 0;
                    this.sounds[id].play().catch(e => console.error("Audio block: " + id));
                } else {
                    let clone = this.sounds[id].cloneNode();
                    clone.play().catch(e => console.error("Audio block: " + id));
                }
            }
        },
        playWithCooldown: function(id, cooldownMs) {
            if (this.sounds[id] && !this.sounds[id].onCooldown) {
                this.play(id);
                this.sounds[id].onCooldown = true;
                setTimeout(() => this.sounds[id].onCooldown = false, cooldownMs);
            }
        },
        stop: function(id) {
            if (this.sounds[id]) { this.sounds[id].pause(); }
        }
    };


    // -----------------------------------
    // UPDATE UI FUNCTIONS
    // -----------------------------------
    function updateSunUI() {
        DOM.sun.textContent = INFINITE_SUN_TEST ? "∞" : sunPoints;
        refreshPlantAffordability();
    }
    function updateWaveUI() { DOM.wave.textContent = currentWave; }

    function updateProgressBar() {
        const totalLevelTime = (LevelDB.totalWaves * 45) - 45; // Based on wave delay
        if (!levelStarted || gameOver) return;
        let elapsedWaves = currentWave - 1;
        let progress = (elapsedWaves / LevelDB.totalWaves) * 100;
        DOM.progressFill.style.width = progress + "%";
        DOM.progressFlag.style.left = progress + "%";
    }


    // -----------------------------------
    // SELECTION & SHOVEL SYSTEM
    // -----------------------------------
    document.querySelectorAll(".plant-card").forEach(card => {
        card.addEventListener("click", () => {
            if (gameOver || card.dataset.onCooldown === "true" || card.dataset.locked === "true") return;
            const pType = card.dataset.plant;
            const pData = PlantDB[pType];
            if (!INFINITE_SUN_TEST && pData && sunPoints < pData.cost) {
                AudioEngine.play('notEnoughSound');
                return;
            }
            deactivateShovel();
            clearPlantHoverPreview();
            selectedPlant = card;
            DOM.shovel.classList.remove('active-shovel');
            card.classList.add('selected-card');
        });
    });

    DOM.shovel.addEventListener("click", () => {
        if (gameOver) return;
        toggleShovel();
    });

    function deactivatePlantSelection() {
        document.querySelectorAll(".plant-card").forEach(c => c.classList.remove('selected-card'));
        selectedPlant = null;
        clearPlantHoverPreview();
    }

    function toggleShovel() {
        if (isShovelActive) { deactivateShovel(); } 
        else {
            deactivatePlantSelection();
            clearPlantHoverPreview();
            isShovelActive = true;
            DOM.shovel.classList.add('active-shovel');
        }
    }

    function deactivateShovel() {
        isShovelActive = false;
        DOM.shovel.classList.remove('active-shovel');
    }

    function clearPlantHoverPreview() {
        if (hoverPlantPreviewEl) {
            hoverPlantPreviewEl.remove();
            hoverPlantPreviewEl = null;
        }
        if (cherryRangePreviewEl) {
            cherryRangePreviewEl.remove();
            cherryRangePreviewEl = null;
        }
    }

    function showPlantHoverPreview(cell) {
        if (!selectedPlant || isShovelActive || gameOver || cell.hasPlant) {
            clearPlantHoverPreview();
            return;
        }

        const pType = selectedPlant.dataset.plant;
        const pData = PlantDB[pType];
        if (!pData) return;

        clearPlantHoverPreview();

        const preview = document.createElement("img");
        preview.className = "hover-plant-preview";
        preview.src = (pType === "potato_mine" ? pData.sprite_unarmed : pData.sprite);
        preview.style.left = `${cell.offsetLeft + ((cell.offsetWidth - 80) / 2)}px`;
        preview.style.top = `${cell.offsetTop + (cell.offsetHeight - 84)}px`;
        DOM.board.appendChild(preview);
        hoverPlantPreviewEl = preview;

        if (pType === "cherry_bomb") {
            const range = document.createElement("span");
            range.className = "cherry-range-preview";
            range.style.left = `${cell.offsetLeft + (cell.offsetWidth / 2)}px`;
            range.style.top = `${cell.offsetTop + (cell.offsetHeight / 2)}px`;
            DOM.board.appendChild(range);
            cherryRangePreviewEl = range;
        } else if (pType === "bonkchoi") {
            const range = document.createElement("span");
            range.className = "bonkchoi-range-preview";
            range.style.left = `${cell.offsetLeft + (cell.offsetWidth / 2)}px`;
            range.style.top = `${cell.offsetTop + (cell.offsetHeight / 2)}px`;
            DOM.board.appendChild(range);
            cherryRangePreviewEl = range;
        }
    }

    function initPlantPicker() {
        if (!DOM.plantPickerGrid) return;
        DOM.plantPickerGrid.innerHTML = '';
        const allCards = Array.from(document.querySelectorAll(".plant-panel .plant-card"));

        allCards.forEach((card, index) => {
            const pickerCard = card.cloneNode(true);
            pickerCard.classList.remove('selected-card', 'cooldown-on');
            pickerCard.classList.add('picker-plant-card');
            pickerCard.dataset.onCooldown = "false";
            if (index < maxSelectedPlants) {
                pickerCard.classList.add('picker-selected');
                selectedLoadout.add(pickerCard.dataset.plant);
            }
            pickerCard.addEventListener('click', () => togglePickerPlant(pickerCard));
            DOM.plantPickerGrid.appendChild(pickerCard);
        });

        updatePickerUI();
        applyPlantLoadout();
    }

    function togglePickerPlant(card) {
        const plantType = card.dataset.plant;
        if (selectedLoadout.has(plantType)) {
            selectedLoadout.delete(plantType);
            card.classList.remove('picker-selected');
        } else {
            if (selectedLoadout.size >= maxSelectedPlants) return;
            selectedLoadout.add(plantType);
            card.classList.add('picker-selected');
        }
        updatePickerUI();
    }

    function updatePickerUI() {
        if (DOM.pickerCount) DOM.pickerCount.textContent = `${selectedLoadout.size} / ${maxSelectedPlants} selected`;
        if (DOM.startLevelBtn) DOM.startLevelBtn.disabled = selectedLoadout.size === 0;
    }

    function applyPlantLoadout() {
        const allCards = Array.from(document.querySelectorAll(".plant-panel .plant-card"));
        allCards.forEach(card => {
            const enabled = selectedLoadout.has(card.dataset.plant);
            card.dataset.locked = enabled ? "false" : "true";
            card.classList.toggle('locked-card', !enabled);
            card.classList.remove('selected-card');
            card.dataset.onCooldown = "false";
            const cdOverlay = card.querySelector(".cooldown");
            if (cdOverlay) cdOverlay.style.height = "0%";
        });
        selectedPlant = null;
        refreshPlantAffordability();
    }

    function refreshPlantAffordability() {
        document.querySelectorAll(".plant-panel .plant-card").forEach(card => {
            const cost = parseInt(card.dataset.cost || "0", 10);
            const isLocked = card.dataset.locked === "true";
            card.classList.toggle("insufficient-sun", !INFINITE_SUN_TEST && !isLocked && sunPoints < cost);
        });
    }

    function openPlantPicker() {
        if (gameOver || levelStarted || startSequenceActive) return;
        clearPlantHoverPreview();
        if (DOM.menu) DOM.menu.classList.add("hidden");
        if (DOM.plantPickerMenu) DOM.plantPickerMenu.classList.remove("hidden");
    }


    // -----------------------------------
    // PLANTING LOGIC
    // -----------------------------------
    document.querySelectorAll(".cell").forEach(cell => {
        cell.addEventListener("mouseover", () => {
            if (gameOver) return;
            if (selectedPlant && !cell.hasPlant) {
                cell.classList.add('cell-hover-plant');
                showPlantHoverPreview(cell);
            }
            if (isShovelActive && cell.hasPlant) cell.classList.add('cell-hover-shovel');
        });
        
        cell.addEventListener("mouseout", () => {
            cell.classList.remove('cell-hover-plant');
            cell.classList.remove('cell-hover-shovel');
            clearPlantHoverPreview();
        });
        
        cell.addEventListener("click", () => handleCellClick(cell));
    });

    function handleCellClick(cell) {
        if (gameOver) return;

        // SHOVEL USE CASE
        if (isShovelActive) {
            if (cell.hasPlant) removePlant(cell);
            deactivateShovel();
            cell.classList.remove('cell-hover-shovel');
            clearPlantHoverPreview();
            return;
        }

        // PLANT USE CASE
        if (!selectedPlant) return;
        if (cell.hasPlant) { deactivatePlantSelection(); return; }

        const pType = selectedPlant.dataset.plant;
        const dataData = PlantDB[pType];

        if (!INFINITE_SUN_TEST && sunPoints < dataData.cost) { deactivatePlantSelection(); return; }

        // Place plant
        if (!INFINITE_SUN_TEST) sunPoints -= dataData.cost;
        updateSunUI();
        createPlant(pType, cell);
        spawnPlantingDirt(cell);
        AudioEngine.play('plantSound');
        applyCooldown(selectedPlant, dataData.cooldown);
        deactivatePlantSelection();
        cell.classList.remove('cell-hover-plant');
        clearPlantHoverPreview();
    }


    // -----------------------------------
    // CREATE PLANT OBJECT
    // -----------------------------------
    function createPlant(type, cell) {
        const pData = PlantDB[type];
        
        const plantObj = document.createElement("img");
        plantObj.src = (type === 'potato_mine' ? pData.sprite_unarmed : pData.sprite);
        plantObj.classList.add("plant");
        cell.appendChild(plantObj);
        
        cell.hasPlant = true;
        
        const newPlant = {
            id: 'plant_' + Date.now(),
            type: type,
            dom: plantObj,
            cell: cell,
            hp: pData.hp,
            row: parseInt(cell.dataset.row),
            col: parseInt(cell.dataset.col)
        };
        
        plants.push(newPlant);

        // Advanced mechanics based on type
        if (type === "peashooter" || type === "snowpea" || type === "repeater") {
            newPlant.shootInterval = setInterval(() => shoot(newPlant), pData.shootRate * 1000);
        }

        if (type === "bonkchoi") {
            startBonkChoiIdleAnimation(newPlant, pData);
            newPlant.bonkInterval = setInterval(() => bonkChoiAttack(newPlant), pData.attackRate * 1000);
        }

        if (type === "sunflower") {
            startSunflowerProductionCycle(newPlant, pData.sunRate * 1000);
        }

        if (type === "cherry_bomb") {
            setTimeout(() => explode(newPlant), pData.explodeDelay * 1000);
        }

        if (type === "potato_mine") {
            newPlant.armed = false;
            setTimeout(() => {
                newPlant.armed = true;
                newPlant.dom.src = pData.sprite;
            }, pData.armTime * 1000);
        }
    }

    function removePlant(cell) {
        const index = plants.findIndex(p => p.cell === cell);
        if (index !== -1) {
            const p = plants[index];
            if (p.shootInterval) clearInterval(p.shootInterval);
            if (p.bonkInterval) clearInterval(p.bonkInterval);
            if (p.frameInterval) clearInterval(p.frameInterval);
            if (p.restoreIdleTimeout) clearTimeout(p.restoreIdleTimeout);
            if (p.sunInterval) clearInterval(p.sunInterval);
            if (p.sunGlowTimeout) clearTimeout(p.sunGlowTimeout);
            if (p.sunCycleTimeout) clearTimeout(p.sunCycleTimeout);
            p.dom.remove();
            plants.splice(index, 1);
            cell.hasPlant = false;
        }
    }

    function startBonkChoiIdleAnimation(plant, pData) {
        if (!plant.dom || !pData.idleFrames) return;
        let idx = 0;
        plant.frameInterval = setInterval(() => {
            if (gameOver || !plant.dom || !plant.dom.isConnected) {
                clearInterval(plant.frameInterval);
                plant.frameInterval = null;
                return;
            }
            idx = (idx + 1) % pData.idleFrames.length;
            plant.dom.src = pData.idleFrames[idx];
        }, 140);
    }

    function bonkChoiAttack(plant) {
        if (!levelStarted || gameOver || !plant || !plant.dom || !plant.dom.isConnected) return;
        const pData = PlantDB.bonkchoi;
        const hitTarget = zombies.find(z =>
            z.row === plant.row &&
            parseFloat(z.style.left) >= (plant.cell.offsetLeft - 12) &&
            parseFloat(z.style.left) <= (plant.cell.offsetLeft + pData.attackRange)
        );
        if (!hitTarget) return;

        if (plant.frameInterval) {
            clearInterval(plant.frameInterval);
            plant.frameInterval = null;
        }

        const punchFrames = pData.punchFrames || [];
        let frame = 0;
        const runPunch = () => {
            if (!plant.dom || !plant.dom.isConnected) return;
            if (frame >= punchFrames.length) {
                startBonkChoiIdleAnimation(plant, pData);
                return;
            }
            plant.dom.src = punchFrames[frame];
            frame++;
            plant.restoreIdleTimeout = setTimeout(runPunch, 55);
        };
        runPunch();

        if (hitTarget.armor_hp > 0) {
            hitTarget.armor_hp -= pData.attackDamage;
        } else {
            hitTarget.hp -= pData.attackDamage;
        }
        applyZombieHitEffect(hitTarget, 'normal');
        AudioEngine.playWithCooldown('punchSound', 120);
    }

    function startSunflowerProductionCycle(plant, cycleMs) {
        const glowLeadMs = 900;
        const runCycle = () => {
            if (gameOver || !levelStarted || !plant.dom.isConnected) return;

            plant.dom.classList.remove('sunflower-ready');
            plant.dom.classList.add('sunflower-glow');

            plant.sunGlowTimeout = setTimeout(() => {
                if (!plant.dom.isConnected || gameOver) return;
                plant.dom.classList.remove('sunflower-glow');
                plant.dom.classList.add('sunflower-ready');
                generateSun(plant.cell, true);
                setTimeout(() => {
                    if (plant.dom.isConnected) {
                        plant.dom.classList.remove('sunflower-ready');
                    }
                }, 240);
            }, glowLeadMs);

            plant.sunCycleTimeout = setTimeout(runCycle, cycleMs);
        };

        plant.sunCycleTimeout = setTimeout(runCycle, cycleMs);
    }


    // -----------------------------------
    // SHOOT SYSTEM
    // -----------------------------------
    function shoot(plant) {
        if (!levelStarted || gameOver) return;
        
        // Advanced smart shooting logic
        const row = plant.row;
        const hasZombieInLane = zombies.some(z => z.row === row && z.offsetLeft < DOM.board.offsetWidth);
        if (!hasZombieInLane) return;

        const pData = PlantDB[plant.type];
        triggerShootAnimation(plant, pData);
        fireProjectileFromPlant(plant, pData);

        if (plant.type === "repeater") {
            setTimeout(() => {
                if (!levelStarted || gameOver || !plant.dom || !plant.dom.isConnected) return;
                const stillHasZombieInLane = zombies.some(z => z.row === row && z.offsetLeft < DOM.board.offsetWidth);
                if (!stillHasZombieInLane) return;
                fireProjectileFromPlant(plant, pData);
            }, 180);
        }
    }

    function fireProjectileFromPlant(plant, pData) {
        let projectile;
        if (plant.type === 'snowpea' && pData.bulletSprite) {
            projectile = document.createElement("img");
            projectile.src = pData.bulletSprite;
            projectile.classList.add("pea", "snowpea-bullet");
        } else {
            projectile = document.createElement("div");
            projectile.classList.add("pea");
            projectile.classList.add(plant.type === 'snowpea' ? 'snow-pea-proj' : 'pea-proj');
        }

        const yPos = (plant.row * (DOM.board.offsetHeight / 5)) + 30;
        projectile.style.top = yPos + "px";
        projectile.style.left = plant.cell.offsetLeft + 50 + "px";

        DOM.board.appendChild(projectile);

        const newProj = {
            dom: projectile,
            row: plant.row,
            slow: (plant.type === 'snowpea' ? pData.slowEffect : 0)
        };

        projectiles.push(newProj);
        AudioEngine.play('shootSound');
    }

    function triggerShootAnimation(plant, pData) {
        if (!plant || !plant.dom || !pData || !Array.isArray(pData.shootFrames)) return;
        if (plant.shootAnimRunning) return;
        plant.shootAnimRunning = true;

        const originalSrc = pData.sprite;
        let idx = 0;
        const run = () => {
            if (!plant.dom || !plant.dom.isConnected) {
                plant.shootAnimRunning = false;
                return;
            }
            if (idx >= pData.shootFrames.length) {
                plant.dom.src = originalSrc;
                plant.shootAnimRunning = false;
                return;
            }
            plant.dom.src = pData.shootFrames[idx];
            idx++;
            setTimeout(run, 45);
        };
        run();
    }


    // -----------------------------------
    // SUN SYSTEM
    // -----------------------------------
    function generateSun(cell, fromPlant = false) {
        if (!levelStarted || gameOver) return;

        const sun = document.createElement("img");
        sun.src = "assets/sun_icon.png";
        sun.classList.add("sun");
        sun.onclick = function() { collectSun(sun); };
        
        const yStart = (fromPlant ? cell.offsetTop : -60);
        sun.style.top = yStart + "px";
        sun.style.left = (fromPlant ? cell.offsetLeft : (Math.random() * (DOM.board.offsetWidth - 100) + 10)) + "px";
        
        DOM.board.appendChild(sun);
        
        if (!fromPlant) {
            // Random floating effect
            let floatSpeed = 1.2;
            let floatAngle = Math.random() * Math.PI * 2;
            let newObj = {dom: sun, vy: 0.5, vx: Math.cos(floatAngle) * 0.2, y: yStart, x: parseFloat(sun.style.left)};
            activeSunPool.push(newObj);
        }
        
        // Sun disappear timer
        setTimeout(() => { if (sun.parentElement) sun.remove(); }, 12000);
    }

    function collectSun(sunDom) {
        sunPoints += 25;
        updateSunUI();
        AudioEngine.play('sunCollectSound');
        
        // Collection animation
        sunDom.style.pointerEvents = 'none';
        sunDom.style.transition = 'top 0.4s ease-in, left 0.4s ease-in, opacity 0.4s';
        sunDom.style.top = "-50px";
        sunDom.style.left = "30px";
        sunDom.style.opacity = '0';
        
        setTimeout(() => sunDom.remove(), 400);
    }


    // -----------------------------------
    // ADVANCED ZOMBIE SPAWN & MECHANICS
    // -----------------------------------
    function spawnZombie(forcedType = null) {
        if (!levelStarted || gameOver) return;
        
        const wData = LevelDB[currentWave];
        if (!wData) return;
        
        const allowedTypes = getAllowedZombieTypesForWave(currentWave);
        const zombieType = (forcedType && allowedTypes.includes(forcedType))
            ? forcedType
            : allowedTypes[Math.floor(Math.random() * allowedTypes.length)];
        const zData = ZombieDB[zombieType];
        
        const zombieObj = document.createElement("img");
        zombieObj.src = zData.sprite;
        zombieObj.classList.add("zombie");
        
        const row = Math.floor(Math.random() * 5);
        zombieObj.row = row;
        zombieObj.zType = zombieType;
        zombieObj.armor_hp = zData.armor || 0;
        zombieObj.hp = zData.hp;
        zombieObj.baseSpeed = zData.speed;
        zombieObj.slowFactor = 1;
        zombieObj.isCone = false;
        zombieObj.isBucket = (zombieType === 'buckethead');
        zombieObj.isSlowType = (zombieType === 'slowzombie');
        if (zombieObj.isSlowType) zombieObj.classList.add('slow-zombie');
        
        const yPos = row * (DOM.board.offsetHeight / 5);
        zombieObj.style.top = yPos + "px";
        zombieObj.style.left = DOM.board.offsetWidth + "px";
        
        DOM.board.appendChild(zombieObj);
        startZombieWalkAnimation(zombieObj, zombieType);
        zombies.push(zombieObj);
    }

    function startZombieWalkAnimation(zombie, zombieType) {
        const zData = ZombieDB[zombieType];
        if (!zData || !Array.isArray(zData.walkFrames) || zData.walkFrames.length <= 1) return;

        let frameIndex = 0;
        zombie.walkAnimInterval = setInterval(() => {
            if (gameOver || !zombie.isConnected) {
                clearInterval(zombie.walkAnimInterval);
                zombie.walkAnimInterval = null;
                return;
            }
            frameIndex = (frameIndex + 1) % zData.walkFrames.length;
            zombie.src = zData.walkFrames[frameIndex];
        }, 110);
    }

    function spawnZombieSplitDeath(zombie) {
        const zData = ZombieDB[zombie.zType] || ZombieDB.zombie;
        const bodySprite = zData.bodySprite || 'assets/zombiebody.png';
        const headSprite = zData.headSprite || 'assets/zombiehead.png';
        const baseLeft = parseFloat(zombie.style.left) || 0;
        const baseTop = parseFloat(zombie.style.top) || 0;
        const rollDirection = (Math.random() < 0.5) ? -1 : 1;
        const rollDistance = 88 + Math.random() * 46;

        const body = document.createElement('img');
        body.src = bodySprite;
        body.className = 'zombie-body-fall';
        body.style.left = `${baseLeft}px`;
        body.style.top = `${baseTop}px`;
        DOM.board.appendChild(body);

        const head = document.createElement('img');
        head.src = headSprite;
        head.className = 'zombie-head-fall';
        head.style.left = `${baseLeft + 28}px`;
        head.style.top = `${baseTop - 8}px`;
        head.style.setProperty('--head-roll-x', `${rollDistance * rollDirection}px`);
        head.style.setProperty('--head-roll-y', `54px`);
        head.style.setProperty('--head-rot', `${rollDirection * 680}deg`);
        DOM.board.appendChild(head);

        setTimeout(() => {
            body.remove();
            head.remove();
        }, 1100);
    }

    function getAllowedZombieTypesForWave(waveNumber) {
        if (waveNumber >= 5) return ["zombie", "slowzombie", "buckethead"];
        if (waveNumber >= 3) return ["zombie", "slowzombie"];
        return ["zombie"];
    }

    function applyZombieHitEffect(zombie, hitType = 'normal') {
        const leftNow = parseFloat(zombie.style.left) || 0;
        zombie.style.left = (leftNow + 3) + "px";

        zombie.classList.remove('zombie-hit-red', 'zombie-hit-blue');
        void zombie.offsetWidth; // restart short hit flash animation
        zombie.classList.add(hitType === 'snow' ? 'zombie-hit-blue' : 'zombie-hit-red');
        clearTimeout(zombie.hitFxTimer);
        zombie.hitFxTimer = setTimeout(() => {
            zombie.classList.remove('zombie-hit-red', 'zombie-hit-blue');
        }, 120);
    }

    function createPeaSplatParticles(x, y, count = 6) {
        for (let i = 0; i < count; i++) {
            const particle = document.createElement('span');
            particle.classList.add('pea-splat-particle');
            const angle = (Math.PI * 2 * i) / count;
            const spread = 6 + Math.random() * 14;
            const dx = Math.cos(angle) * spread;
            const dy = Math.sin(angle) * spread;

            particle.style.left = x + "px";
            particle.style.top = y + "px";
            particle.style.setProperty('--dx', dx + "px");
            particle.style.setProperty('--dy', dy + "px");
            particle.style.animationDelay = (Math.random() * 40) + "ms";

            DOM.board.appendChild(particle);
            setTimeout(() => particle.remove(), 380);
        }
    }

    function showWaveWarning(text, durationMs = 1500) {
        DOM.warning.textContent = text;
        DOM.warning.classList.remove('hidden');
        setTimeout(() => DOM.warning.classList.add('hidden'), durationMs);
    }

    function getZombieAlmanacDescription(zombieType) {
        if (zombieType === 'zombie') return 'Basic zombie. Balanced speed and health.';
        if (zombieType === 'slowzombie') return 'Moves slowly but has higher health. Good at soaking damage.';
        if (zombieType === 'buckethead') return 'Heavy armor unit. Strip bucket armor first before health damage.';
        return 'Unknown zombie.';
    }

    function renderZombieAlmanac() {
        if (!DOM.almanacList) return;
        DOM.almanacList.innerHTML = '';

        Object.entries(ZombieDB).forEach(([type, data]) => {
            const item = document.createElement('article');
            item.className = 'almanac-item';

            const armorValue = data.armor || 0;
            item.innerHTML = `
                <img src="${data.sprite}" alt="${type}" class="almanac-zombie-img">
                <div class="almanac-item-text">
                    <h3>${type.toUpperCase()}</h3>
                    <p>${getZombieAlmanacDescription(type)}</p>
                    <div class="almanac-stats">
                        <span>HP: ${data.hp}</span>
                        <span>Speed: ${data.speed}</span>
                        <span>Armor: ${armorValue}</span>
                    </div>
                </div>
            `;
            DOM.almanacList.appendChild(item);
        });
    }

    function openAlmanac() {
        if (!DOM.almanacPanel) return;
        DOM.almanacPanel.classList.remove('hidden');
        DOM.almanacPanel.setAttribute('aria-hidden', 'false');
    }

    function closeAlmanac() {
        if (!DOM.almanacPanel) return;
        DOM.almanacPanel.classList.add('hidden');
        DOM.almanacPanel.setAttribute('aria-hidden', 'true');
    }

    function triggerScreenFlash() {
        if (!screenFlashEl) return;
        screenFlashEl.classList.remove('flash-active');
        void screenFlashEl.offsetWidth;
        screenFlashEl.classList.add('flash-active');
    }

    function runReadySetPlantSequence(onDone) {
        AudioEngine.play('readySetPlantSound');
        const countdown = [
            { text: "READY...", duration: 900 },
            { text: "SET...", duration: 900 },
            { text: "PLANT!", duration: 1000 }
        ];
        let step = 0;
        const runStep = () => {
            if (step >= countdown.length) {
                onDone();
                return;
            }
            const currentStep = countdown[step];
            showWaveWarning(currentStep.text, currentStep.duration);
            setTimeout(() => {
                step++;
                runStep();
            }, currentStep.duration);
        };
        runStep();
    }

    function showZombieRoadPreview(onDone) {
        if (!DOM.board || !DOM.gameContainer) {
            onDone();
            return;
        }

        const previewZombies = [];
        const incomingTypes = ["zombie", "slowzombie", "buckethead"];
        const panMs = 380;
        const holdMs = 6000;
        const totalPreviewMs = (panMs * 2) + holdMs;

        for (let lane = 0; lane < 5; lane++) {
            const zType = incomingTypes[lane % incomingTypes.length];
            const zData = ZombieDB[zType];
            if (!zData) continue;

            const zombieImg = document.createElement('img');
            zombieImg.src = zData.sprite;
            zombieImg.className = 'road-preview-zombie';
            zombieImg.style.top = `${DOM.board.offsetTop + (lane * (DOM.board.offsetHeight / 5)) + 4}px`;
            zombieImg.style.left = `${846 + (lane * 3)}px`;
            zombieImg.style.animationDelay = `${lane * 0.08}s`;
            DOM.gameContainer.appendChild(zombieImg);
            previewZombies.push(zombieImg);
        }

        const cleanupPreview = () => {
            DOM.gameContainer.classList.remove('camera-pan-right');
            DOM.gameContainer.classList.remove('camera-pan-motion');
            DOM.gameContainer.classList.remove('wind-burst');
            DOM.gameContainer.classList.remove('show-roadside-preview');
            previewZombies.forEach(z => z.remove());
            onDone();
        };

        DOM.gameContainer.classList.add('show-roadside-preview');
        DOM.gameContainer.classList.add('camera-pan-right');
        DOM.gameContainer.classList.add('camera-pan-motion');
        DOM.gameContainer.classList.add('wind-burst');
        AudioEngine.play('whoosh1Sound');
        showWaveWarning("ZOMBIES ARE COMING...", totalPreviewMs - 180);

        setTimeout(() => {
            DOM.gameContainer.classList.remove('camera-pan-motion');
            DOM.gameContainer.classList.remove('wind-burst');
        }, panMs);

        setTimeout(() => {
            DOM.gameContainer.classList.add('camera-pan-motion');
            DOM.gameContainer.classList.add('wind-burst');
            DOM.gameContainer.classList.remove('camera-pan-right');
            AudioEngine.play('whoosh2Sound');
        }, panMs + holdMs);

        setTimeout(() => {
            DOM.gameContainer.classList.remove('camera-pan-motion');
            DOM.gameContainer.classList.remove('wind-burst');
        }, (panMs * 2) + holdMs);

        setTimeout(cleanupPreview, totalPreviewMs);
    }

    function handleWaveCompletion() {
        if (!levelStarted || gameOver || waveClearHandled) return;
        if (waveSpawnedCount < waveSpawnTarget) return;
        if (zombies.length > 0) return;

        waveClearHandled = true;

        if (currentWave < LevelDB.totalWaves) {
            const nextWave = currentWave + 1;
            if (nextWave === LevelDB.totalWaves) {
                showWaveWarning("A HUGE WAVE OF ZOMBIES IS APPROACHING!", 2600);
                AudioEngine.play('warningSound');
                setTimeout(() => {
                    if (gameOver || !levelStarted) return;
                    currentWave = nextWave;
                    updateWaveUI();
                    showWaveWarning(`WAVE ${currentWave}`, 1000);
                    startWaveSpawning();
                }, 2700);
                return;
            }
            currentWave++;
            updateWaveUI();
            showWaveWarning(`WAVE ${currentWave}`, 1000);
            startWaveSpawning();
        } else {
            endGameWin();
        }
    }


    // -----------------------------------
    // MAIN GAME LOOP ENGINE (50Hz)
    // -----------------------------------
    function mainGameUpdate() {
        if (gameOver) return;

        // 1. Random Falling Sun
        // (Handled by sunRandomSpawninginterval in startGame)

        // 2. Projectile Movement & Collision
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            if (!p || !p.dom || !p.dom.isConnected) {
                projectiles.splice(i, 1);
                continue;
            }

            const oldLeft = parseFloat(p.dom.style.left) || p.dom.offsetLeft || 0;
            p.dom.style.left = (oldLeft + 6) + "px";
            
            // Boundary check
            if (parseFloat(p.dom.style.left) > DOM.board.offsetWidth) {
                p.dom.remove();
                projectiles.splice(i, 1);
                continue;
            }
            
            // Collision with Zombies
            let hitZombie = null;
            for (let j = zombies.length - 1; j >= 0; j--) {
                const z = zombies[j];
                if (z.row === p.row && Math.abs(parseFloat(p.dom.style.left) - (parseFloat(z.style.left) + 20)) < 20) {
                    hitZombie = z;
                    break;
                }
            }

            if (hitZombie) {
                const impactX = parseFloat(p.dom.style.left) + 6;
                const impactY = parseFloat(p.dom.style.top) + 8;
                
                p.dom.remove();
                projectiles.splice(i, 1);
                AudioEngine.playWithCooldown('splatSound', 50);
                applyZombieHitEffect(hitZombie, p.slow > 0 ? 'snow' : 'normal');
                createPeaSplatParticles(impactX, impactY);

                // Armor damage logic
                if (hitZombie.armor_hp > 0) {
                    hitZombie.armor_hp -= 20;
                    if (hitZombie.isCone) hitZombie.classList.add('cone-dmg');
                    if (hitZombie.isBucket) hitZombie.classList.add('bucket-dmg');

                    // Break armor
                    if (hitZombie.armor_hp <= 0) {
                        if (hitZombie.isCone) { hitZombie.classList.remove('cone-dmg'); }
                        if (hitZombie.isBucket) { 
                            if (hitZombie.walkAnimInterval) {
                                clearInterval(hitZombie.walkAnimInterval);
                                hitZombie.walkAnimInterval = null;
                            }
                            hitZombie.zType = 'zombie';
                            hitZombie.src = ZombieDB['buckethead'].sprite_no_armor; 
                            hitZombie.classList.remove('bucket-dmg'); 
                            hitZombie.isBucket = false;
                            startZombieWalkAnimation(hitZombie, 'zombie');
                            AudioEngine.play('clinkSound'); // Clink sound on break
                        }
                    }
                } else {
                    hitZombie.hp -= 20;
                }

                // Snow Pea effect
                if (p.slow > 0) {
                    hitZombie.classList.add('zombie-slow');
                    hitZombie.slowFactor = Math.max(0.2, 1 - parseFloat(p.slow));
                    clearTimeout(hitZombie.slowTimer);
                    hitZombie.slowTimer = setTimeout(() => {
                        hitZombie.classList.remove('zombie-slow');
                        hitZombie.slowFactor = 1;
                    }, 4000);
                }
            }
        }

        // 3. Zombie Movement & Mechanics
        for (let i = zombies.length - 1; i >= 0; i--) {
            const z = zombies[i];
            
            // Slow calculation
            const moveSpeed = z.baseSpeed * (z.slowFactor || 1);
            
            // Check plant collision
            let blockedByPlant = false;
            plants.forEach(p => {
                if (z.row === p.row && Math.abs(parseFloat(z.style.left) - (parseFloat(p.dom.parentElement.offsetLeft) + 30)) < 15) {
                    // Armed potato mine explodes on contact before it can be eaten.
                    if (p.type === 'potato_mine' && p.armed) {
                        blockedByPlant = true;
                        z.hp = -10000;
                        z.armor_hp = 0;
                        z.isAsh = true;
                        explode({dom: p.dom, cell: p.cell, row: p.row, explodingPotato: true});
                        removePlant(p.cell);
                        z.classList.remove('zombie-eating');
                        return;
                    }
                    
                    blockedByPlant = true;
                    // Eating logic
                    AudioEngine.playWithCooldown('biteSound', 200); // FIX: Nawala eating sound
                    z.classList.add('zombie-eating');
                    p.hp -= ZombieDB['zombie'].bite;
                    
                    // Death of plant
                    if (p.hp <= 0) {
                        removePlant(p.cell);
                        z.classList.remove('zombie-eating');
                    } else if (p.type === 'wallnut' && p.hp <= (PlantDB.wallnut.hp / 2)) {
                        // Swap to cracked wall-nut art at half health.
                        p.dom.src = PlantDB.wallnut.sprite_half;
                    }
                }
            });

            if (!blockedByPlant) {
                z.classList.remove('zombie-eating');
                z.style.left = (parseFloat(z.style.left) - moveSpeed) + "px";
            }
            
            // Lose condition
            if (parseFloat(z.style.left) < 10) {
                const mower = document.querySelector(`.mower[data-lane="${z.row}"]`);
                if(mower && !mower.isActive) {
                    activateLawnmower(mower);
                } else if (!mower) {
                    endGameLose();
                }
            }
            
            // Death of zombie
            if (z.hp <= 0 && z.armor_hp <= 0) {
                if (z.isAsh) {
                    z.classList.remove('zombie-eating', 'zombie-slow', 'zombie-hit-red', 'zombie-hit-blue');
                    z.classList.add('zombie-ash');
                    setTimeout(() => z.remove(), 900);
                } else {
                    spawnZombieSplitDeath(z);
                    z.remove();
                }
                if (z.walkAnimInterval) clearInterval(z.walkAnimInterval);
                zombies.splice(i, 1);
                AudioEngine.play('zombieDieSound');
            }
        }

        // 4. Random sun movement update
        activeSunPool.forEach(obj => {
            if(obj.y < 300) {
                obj.x += obj.vx;
                obj.y += obj.vy;
                obj.dom.style.left = obj.x + 'px';
                obj.dom.style.top = obj.y + 'px';
            }
        });

        // 5. Update ProgressBar
        updateProgressBar();
        handleWaveCompletion();
    }


    // -----------------------------------
    // EXPLOSION MECHANICS
    // -----------------------------------
    function explode(origin) {
        // Cherry Bomb or Potato Mine
        boardShake();
        if (origin.dom && origin.dom.remove) origin.dom.remove();
        spawnExplodeEffect(origin.cell);
        AudioEngine.play('splatSound'); // Replace with boom if available

        if(!origin.explodingPotato) {
            // Ensure cherry bomb cell is really freed to avoid locked tiles.
            removePlant(origin.cell);
            triggerScreenFlash();
            // Cherry Bomb 3x3 grid damage
            const zData = ZombieDB['zombie'];
            zombies.forEach(z => {
                const rowDiff = Math.abs(z.row - origin.row);
                // Cherry Bomb approximate range based on cell size
                if(rowDiff <= 1 && Math.abs(parseFloat(z.style.left) - origin.cell.offsetLeft) < 120 ) {
                    z.hp = -10000;
                    z.armor_hp = 0;
                    z.isAsh = true;
                }
            });
        }
        
        // Visual effect
        origin.cell.classList.add('cell-explode');
        setTimeout(() => origin.cell.classList.remove('cell-explode'), 1000);
    }

    function spawnExplodeEffect(cell) {
        if (!cell || !DOM.board) return;
        const effect = document.createElement('img');
        effect.className = 'explode-effect';
        effect.src = 'assets/explodeeffect.png';
        effect.style.left = `${cell.offsetLeft + (cell.offsetWidth / 2)}px`;
        effect.style.top = `${cell.offsetTop + (cell.offsetHeight / 2)}px`;
        DOM.board.appendChild(effect);
        setTimeout(() => effect.remove(), 520);
    }

    function boardShake() {
        DOM.board.parentElement.parentElement.classList.add('board-shake');
        setTimeout(() => DOM.board.parentElement.parentElement.classList.remove('board-shake'), 400);
    }

    function spawnPlantingDirt(cell) {
        const baseX = cell.offsetLeft + (cell.offsetWidth * 0.5);
        const baseY = cell.offsetTop + (cell.offsetHeight * 0.72);
        const particleCount = 10;

        for (let i = 0; i < particleCount; i++) {
            const dirt = document.createElement('span');
            dirt.className = 'dirt-particle';

            const angle = (-Math.PI / 1.15) + (Math.random() * (Math.PI / 1.7));
            const speed = 12 + Math.random() * 20;
            const dx = Math.cos(angle) * speed;
            const dy = Math.sin(angle) * speed;
            const size = 4 + Math.random() * 5;

            dirt.style.left = `${baseX - (size * 0.5)}px`;
            dirt.style.top = `${baseY - (size * 0.5)}px`;
            dirt.style.width = `${size}px`;
            dirt.style.height = `${size}px`;
            dirt.style.setProperty('--dx', `${dx}px`);
            dirt.style.setProperty('--dy', `${dy}px`);

            DOM.board.appendChild(dirt);
            setTimeout(() => dirt.remove(), 500);
        }

        const puff = document.createElement('span');
        puff.className = 'dirt-puff';
        puff.style.left = `${baseX - 20}px`;
        puff.style.top = `${baseY - 16}px`;
        DOM.board.appendChild(puff);
        setTimeout(() => puff.remove(), 380);
    }


    // -----------------------------------
    // LAWNMOWER MECHANICS
    // -----------------------------------
    function activateLawnmower(mowerDom) {
        if(mowerDom.isActive) return;
        mowerDom.isActive = true;
        AudioEngine.play('mowerSound');
        const lane = mowerDom.dataset.lane;
        
        const mowerInterval = setInterval(() => {
            if(gameOver) clearInterval(mowerInterval);
            const oldLeft = parseFloat(mowerDom.style.left) || 0;
            const newLeft = oldLeft + 12;
            mowerDom.style.left = newLeft + "px";
            
            // Destroy zombies in lane
            zombies.forEach(z => {
                if(z.row == lane && Math.abs(parseFloat(z.style.left) - newLeft) < 55) {
                    z.hp = -10000;
                    z.armor_hp = 0;
                    z.isAsh = false;
                }
            });
            
            // Disappear
            if(parseFloat(mowerDom.style.left) > DOM.board.offsetWidth) {
                mowerDom.remove();
                clearInterval(mowerInterval);
            }
        }, 20);
    }


    // -----------------------------------
    // WAVE SYSTEM & GAME START
    // -----------------------------------
    function startLevel() {
        if (levelStarted || gameOver || startSequenceActive) return;
        if (selectedLoadout.size === 0) return;
        startSequenceActive = true;
        clearPlantHoverPreview();
        if (DOM.menu) DOM.menu.classList.add("hidden");
        if (DOM.plantPickerMenu) DOM.plantPickerMenu.classList.add("hidden");
        closeAlmanac();

        applyPlantLoadout();
        deactivatePlantSelection();
        updateSunUI();
        updateWaveUI();
        DOM.progressFlag.style.left = "0%";
        DOM.progressFill.style.width = "0%";

        showZombieRoadPreview(() => {
            runReadySetPlantSequence(() => {
                levelStarted = true;
                startSequenceActive = false;
                AudioEngine.play('bgm');
                AudioEngine.play('warningSound');
                startGameLoops();
            });
        });
    }

    function startGameLoops() {
        // Main Logic loop
        mainGameInterval = setInterval(mainGameUpdate, 20); // 50Hz for smoother movement
        
        // Falling sun
        randomSunInterval = setInterval(() => generateSun(DOM.board, false), 10000);
        
        // Balanced Wave Spawner
        startWaveSpawning();
        showWaveWarning(`WAVE ${currentWave}`, 1000);
    }

    function startWaveSpawning() {
        const wData = LevelDB[currentWave];
        let spawnedInWave = 0;
        waveSpawnTarget = wData.zombieSpawnCount;
        waveSpawnedCount = 0;
        waveClearHandled = false;
        
        clearInterval(waveSpawningInterval);
        waveSpawningInterval = setInterval(() => {
            if (spawnedInWave < wData.zombieSpawnCount) {
                if (currentWave >= 3 && spawnedInWave === 0) {
                    spawnZombie('slowzombie');
                } else {
                    spawnZombie();
                }
                spawnedInWave++;
                waveSpawnedCount++;
            } else {
                clearInterval(waveSpawningInterval);
            }
        }, wData.huge ? 500 : 2000); // Balancer: spawn rate based on wave type
    }

    // -----------------------------------
    // UTILS
    // -----------------------------------
    function applyCooldown(card, seconds) {
        card.classList.add('cooldown-on');
        card.dataset.onCooldown = "true";
        const cdOverlay = card.querySelector(".cooldown");
        cdOverlay.style.height = "100%";
        
        let timeLeft = seconds;
        const tick = setInterval(() => {
            timeLeft -= 0.1;
            const progress = (timeLeft / seconds) * 100;
            cdOverlay.style.height = progress + "%";
            
            if (timeLeft <= 0) {
                card.classList.remove('cooldown-on');
                card.dataset.onCooldown = "false";
                clearInterval(tick);
            }
        }, 100);
    }


    // -----------------------------------
    // END GAME FUNCTIONS
    // -----------------------------------
    function endGameLose() {
        gameOver = true;
        levelStarted = false;
        clearPlantHoverPreview();
        AudioEngine.stop('bgm');
        AudioEngine.play('defeatSound');
        clearIntervals();
        DOM.overlayText.innerHTML = "THE ZOMBIES ATE<br>YOUR BRAINS!";
        if (DOM.overlaySubtext) DOM.overlaySubtext.textContent = "Your garden has fallen. Press PLAY AGAIN to retry.";
        DOM.overlay.classList.add("defeat-mode");
        DOM.restart.textContent = "PLAY AGAIN";
        DOM.overlay.classList.remove("hidden");
        DOM.overlay.style.display = "flex";
        DOM.overlay.style.visibility = "visible";
        DOM.overlay.style.opacity = "1";
    }

    function endGameWin() {
        gameOver = true;
        levelStarted = false;
        clearPlantHoverPreview();
        AudioEngine.stop('bgm');
        AudioEngine.play('victorySound');
        clearIntervals();
        plants.forEach(p => p.cell.classList.add('win-dance'));
        DOM.progressFill.style.width = "100%";
        DOM.progressFlag.style.left = "100%";
        DOM.overlayText.textContent = "YOU WIN!";
        if (DOM.overlaySubtext) DOM.overlaySubtext.textContent = "Outstanding defense. Play again for a better run.";
        DOM.overlay.classList.remove("defeat-mode");
        DOM.restart.textContent = "PLAY AGAIN";
        DOM.overlay.classList.remove("hidden");
        DOM.overlay.style.display = "flex";
        DOM.overlay.style.visibility = "visible";
        DOM.overlay.style.opacity = "1";
    }

    function clearIntervals() {
        clearInterval(mainGameInterval);
        clearInterval(randomSunInterval);
        clearInterval(waveSpawningInterval);
        plants.forEach(p => {
            if (p.shootInterval) clearInterval(p.shootInterval);
            if (p.bonkInterval) clearInterval(p.bonkInterval);
            if (p.frameInterval) clearInterval(p.frameInterval);
            if (p.restoreIdleTimeout) clearTimeout(p.restoreIdleTimeout);
            if (p.sunInterval) clearInterval(p.sunInterval);
            if (p.sunGlowTimeout) clearTimeout(p.sunGlowTimeout);
            if (p.sunCycleTimeout) clearTimeout(p.sunCycleTimeout);
        });
        zombies.forEach(z => {
            clearTimeout(z.slowTimer);
            clearTimeout(z.hitFxTimer);
            if (z.walkAnimInterval) clearInterval(z.walkAnimInterval);
        });
        projectiles.forEach(p => {
            if (p && p.dom && p.dom.remove) p.dom.remove();
        });
        projectiles.length = 0;
    }


    // -----------------------------------
    // INITIALIZATION
    // -----------------------------------
    window.addEventListener("load", () => {
        AudioEngine.init();
        screenFlashEl = document.createElement('div');
        screenFlashEl.className = 'screen-flash';
        document.body.appendChild(screenFlashEl);
        if (DOM.menu) DOM.menu.classList.remove("hidden");
        renderZombieAlmanac();
        initPlantPicker();
        updateSunUI();
        updateWaveUI();
        DOM.progressFlag.style.left = "0%";
    });

    if (DOM.startGameBtn) {
        DOM.startGameBtn.addEventListener('click', openPlantPicker);
    }
    if (DOM.startLevelBtn) DOM.startLevelBtn.addEventListener('click', startLevel);
    if (DOM.almanacBtn) DOM.almanacBtn.addEventListener('click', openAlmanac);
    if (DOM.almanacCloseBtn) DOM.almanacCloseBtn.addEventListener('click', closeAlmanac);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAlmanac();
    });
    DOM.progressFlag.addEventListener('click', openPlantPicker);
    DOM.restart.addEventListener('click', () => location.reload());

})();
