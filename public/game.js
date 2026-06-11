"use strict";
const MONSTER_CONFIGS = {
    normal: { color: '#e74c3c', eyeColor: '#f1c40f', speed: 0.3, requiredHits: 1 },
    fast: { color: '#2ecc71', eyeColor: '#3498db', speed: 0.6, requiredHits: 1 },
    tank: { color: '#9b59b6', eyeColor: '#e67e22', speed: 0.15, requiredHits: 3 },
};
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const questionText = document.getElementById('question-text');
const optionBtns = document.querySelectorAll('.option-btn');
const hpBar = document.getElementById('hp-bar');
const hpText = document.getElementById('hp-text');
const scoreText = document.getElementById('score-text');
const progressText = document.getElementById('progress-text');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const startBtn = document.getElementById('start-btn');
const MAX_HP = 5;
let hp = MAX_HP;
let score = 0;
let currentIndex = 0;
let questions = [];
let isLocked = false;
let particles = [];
let warrior;
let monster;
let damageFlash = 0;
let animFrame = 0;
function resize() {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
}
window.addEventListener('resize', resize);
resize();
function initPositions() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    warrior = { x: w * 0.2, y: h * 0.55, swinging: false, swingTimer: 0, facingLeft: false };
    monster = { x: w * 0.85, y: h * 0.55, targetX: w * 0.65, alive: false, dying: false, deathTimer: 0, hitFlash: 0, type: 'normal', hits: 0, requiredHits: 1 };
}
initPositions();
function spawnParticles(x, y, count, color) {
    for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        particles.push({
            x, y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 1,
            life: 30 + Math.random() * 20,
            maxLife: 50,
            color,
            size: 2 + Math.random() * 3,
        });
    }
}
function updateParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
        p.life--;
        if (p.life <= 0)
            particles.splice(i, 1);
    }
}
function drawParticles() {
    for (const p of particles) {
        const alpha = p.life / p.maxLife;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.globalAlpha = 1;
}
function drawWarrior() {
    const { x, y, swinging, swingTimer, facingLeft } = warrior;
    ctx.save();
    ctx.translate(x, y);
    if (facingLeft)
        ctx.scale(-1, 1);
    ctx.fillStyle = '#5dade2';
    ctx.fillRect(-10, -30, 20, 25);
    ctx.fillStyle = '#f0d9b5';
    ctx.beginPath();
    ctx.arc(0, -38, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8e44ad';
    ctx.fillRect(-12, -50, 24, 8);
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(-3, -46, 6, 6);
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(-8, -8, 7, 14);
    ctx.fillRect(1, -8, 7, 14);
    ctx.strokeStyle = '#bdc3c7';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(10, -25);
    ctx.lineTo(10, -55);
    ctx.stroke();
    if (swinging) {
        const swingAngle = Math.sin(swingTimer * 0.3) * 1.2;
        ctx.save();
        ctx.translate(10, -50);
        ctx.rotate(-0.5 + swingAngle);
        ctx.fillStyle = '#ecf0f1';
        ctx.fillRect(-2, 0, 4, 22);
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(-5, 20, 10, 4);
        ctx.restore();
    }
    else {
        ctx.fillStyle = '#ecf0f1';
        ctx.save();
        ctx.translate(10, -50);
        ctx.rotate(-0.3);
        ctx.fillRect(-2, 0, 4, 22);
        ctx.fillStyle = '#bdc3c7';
        ctx.fillRect(-5, 20, 10, 4);
        ctx.restore();
    }
    ctx.restore();
}
function drawMonster() {
    if (!monster.alive && !monster.dying)
        return;
    const { x, y, dying, deathTimer, hitFlash, type, hits, requiredHits } = monster;
    const config = MONSTER_CONFIGS[type];
    ctx.save();
    ctx.translate(x, y);
    if (dying) {
        const alpha = 1 - deathTimer / 20;
        ctx.globalAlpha = Math.max(0, alpha);
        const scale = 1 + deathTimer * 0.03;
        ctx.scale(scale, scale);
    }
    const bodyColor = hitFlash > 0 ? '#fff' : config.color;
    const eyeColor = hitFlash > 0 ? config.color : config.eyeColor;
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.ellipse(0, -10, 22, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.moveTo(-15, -35);
    ctx.lineTo(-8, -22);
    ctx.lineTo(-22, -22);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(15, -35);
    ctx.lineTo(8, -22);
    ctx.lineTo(22, -22);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = eyeColor;
    ctx.beginPath();
    ctx.arc(-8, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -14, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.arc(-8, -14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(8, -14, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2c3e50';
    ctx.beginPath();
    ctx.moveTo(-6, -2);
    ctx.lineTo(0, 4);
    ctx.lineTo(6, -2);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = bodyColor;
    ctx.fillRect(-14, 14, 10, 12);
    ctx.fillRect(4, 14, 10, 12);
    if (!dying && monster.alive && currentIndex < questions.length) {
        const q = questions[currentIndex];
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.font = 'bold 14px "Segoe UI", "PingFang SC", sans-serif';
        const tw = ctx.measureText(q.expression).width;
        const bgW = Math.max(tw + 24, 60);
        ctx.fillRect(-bgW / 2, -62, bgW, 22);
        ctx.fillStyle = '#f5c542';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(q.expression, 0, -51);
        if (requiredHits > 1) {
            const hpBgW = 50;
            const hpBarW = hpBgW - 4;
            const hpPct = hits / requiredHits;
            ctx.fillStyle = 'rgba(0,0,0,0.7)';
            ctx.fillRect(-hpBgW / 2, -78, hpBgW, 10);
            ctx.fillStyle = config.color;
            ctx.fillRect(-hpBarW / 2, -76, hpBarW * hpPct, 6);
            ctx.fillStyle = '#fff';
            ctx.font = 'bold 10px "Segoe UI", "PingFang SC", sans-serif';
            ctx.fillText(`${hits}/${requiredHits}`, 0, -73);
        }
    }
    ctx.restore();
}
function drawGround() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    const groundY = h * 0.75;
    const grad = ctx.createLinearGradient(0, groundY, 0, h);
    grad.addColorStop(0, '#2d4a22');
    grad.addColorStop(1, '#1a3212');
    ctx.fillStyle = grad;
    ctx.fillRect(0, groundY, w, h - groundY);
    ctx.strokeStyle = '#3d6a32';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, groundY);
    ctx.lineTo(w, groundY);
    ctx.stroke();
    for (let i = 0; i < 8; i++) {
        const gx = ((i * 120 + animFrame * 0.2) % (w + 40)) - 20;
        ctx.strokeStyle = '#4a8a3a';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(gx, groundY);
        ctx.lineTo(gx - 3, groundY - 8);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(gx, groundY);
        ctx.lineTo(gx + 3, groundY - 8);
        ctx.stroke();
    }
}
function drawDamageFlash() {
    if (damageFlash > 0) {
        ctx.fillStyle = `rgba(231, 76, 60, ${damageFlash / 15})`;
        ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        damageFlash--;
    }
}
function update() {
    animFrame++;
    if (monster.alive && !monster.dying) {
        if (monster.x > monster.targetX) {
            monster.x -= MONSTER_CONFIGS[monster.type].speed;
        }
    }
    if (monster.dying) {
        monster.deathTimer++;
        if (monster.deathTimer >= 20) {
            monster.dying = false;
            monster.alive = false;
        }
    }
    if (warrior.swinging) {
        warrior.swingTimer++;
        if (warrior.swingTimer > 15) {
            warrior.swinging = false;
            warrior.swingTimer = 0;
        }
    }
    if (monster.hitFlash > 0)
        monster.hitFlash--;
    updateParticles();
}
function draw() {
    ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    drawGround();
    drawWarrior();
    drawMonster();
    drawParticles();
    drawDamageFlash();
}
function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}
function updateHUD() {
    const pct = (hp / MAX_HP) * 100;
    hpBar.style.width = pct + '%';
    hpText.textContent = `❤️ ${hp} / ${MAX_HP}`;
    scoreText.textContent = `🏆 ${score}`;
    progressText.textContent = `${currentIndex} / ${questions.length}`;
}
function showQuestion() {
    if (currentIndex >= questions.length) {
        endGame();
        return;
    }
    const q = questions[currentIndex];
    questionText.textContent = q.expression + ' = ?';
    optionBtns.forEach((btn, i) => {
        btn.textContent = String(q.options[i]);
        btn.className = 'option-btn';
        btn.disabled = false;
    });
    const config = MONSTER_CONFIGS[q.monsterType];
    monster.x = canvas.clientWidth * 0.85;
    monster.targetX = canvas.clientWidth * 0.65;
    monster.alive = true;
    monster.dying = false;
    monster.deathTimer = 0;
    monster.hitFlash = 0;
    monster.type = q.monsterType;
    monster.hits = 0;
    monster.requiredHits = config.requiredHits;
    isLocked = false;
}
async function fetchQuestions() {
    const res = await fetch('/api/questions');
    const data = await res.json();
    return data.questions;
}
async function startGame() {
    overlay.classList.add('hidden');
    hp = MAX_HP;
    score = 0;
    currentIndex = 0;
    particles = [];
    damageFlash = 0;
    initPositions();
    updateHUD();
    try {
        questions = await fetchQuestions();
    }
    catch {
        overlay.classList.remove('hidden');
        overlayTitle.textContent = '出错了';
        overlayMsg.textContent = '无法加载题目，请刷新重试';
        startBtn.textContent = '重试';
        return;
    }
    updateHUD();
    showQuestion();
}
function endGame() {
    overlay.classList.remove('hidden');
    if (hp <= 0) {
        overlayTitle.textContent = '💀 勇士倒下了';
        overlayMsg.textContent = `最终得分：${score}  |  已答：${currentIndex} 题`;
    }
    else {
        overlayTitle.textContent = '🎉 通关！';
        overlayMsg.textContent = `全部 ${questions.length} 题完成！得分：${score}`;
    }
    startBtn.textContent = '再来一局';
}
function handleAnswer(idx) {
    if (isLocked || currentIndex >= questions.length)
        return;
    isLocked = true;
    const q = questions[currentIndex];
    const selected = q.options[idx];
    const correct = selected === q.correctAnswer;
    optionBtns.forEach((btn, i) => {
        btn.disabled = true;
        if (q.options[i] === q.correctAnswer) {
            btn.classList.add('correct');
        }
        else if (i === idx) {
            btn.classList.add('wrong');
        }
    });
    if (correct) {
        score += 10;
        warrior.swinging = true;
        warrior.swingTimer = 0;
        monster.hitFlash = 8;
        monster.hits++;
        const config = MONSTER_CONFIGS[monster.type];
        spawnParticles(monster.x, monster.y - 10, 10, config.color);
        if (monster.hits >= monster.requiredHits) {
            setTimeout(() => {
                monster.alive = false;
                monster.dying = true;
                monster.deathTimer = 0;
                spawnParticles(monster.x, monster.y - 10, 25, config.color);
                spawnParticles(monster.x, monster.y - 10, 10, '#f5c542');
            }, 200);
            currentIndex++;
            updateHUD();
            setTimeout(() => {
                showQuestion();
            }, 800);
        }
        else {
            updateHUD();
            setTimeout(() => {
                optionBtns.forEach((btn, i) => {
                    btn.textContent = String(q.options[i]);
                    btn.className = 'option-btn';
                    btn.disabled = false;
                });
                isLocked = false;
            }, 500);
        }
    }
    else {
        hp--;
        damageFlash = 15;
        spawnParticles(warrior.x, warrior.y - 20, 15, '#e74c3c');
        if (hp <= 0) {
            setTimeout(() => {
                isLocked = true;
                endGame();
            }, 800);
            return;
        }
        currentIndex++;
        updateHUD();
        setTimeout(() => {
            showQuestion();
        }, 1000);
    }
}
optionBtns.forEach((btn, i) => {
    btn.addEventListener('click', () => handleAnswer(i));
});
startBtn.addEventListener('click', startGame);
gameLoop();
