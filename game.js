document.addEventListener("DOMContentLoaded", () => {

/* ===============================
   STATE - MOVED UP
================================= */

let gameState = "idle";
let score = 0;
let screenShake = 0;

/* ===============================
   UI - MOVED UP
================================= */

const loginScreen = document.getElementById("loginScreen");
const nameScreen = document.getElementById("nameScreen");
const popup = document.getElementById("gameOverPopup");

const logoutBtn = document.getElementById("logoutBtn");
const leaderboardList = document.getElementById("leaderboardList");
const finalScoreText = document.getElementById("finalScore");
const highScoreText = document.getElementById("highScore");

const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");

/* ===============================
   FIREBASE CONFIG
================================= */

const firebaseConfig = {
  apiKey: "AIzaSyBpjz3UKNmkX4Y-ksthYe4KXcbWBZ3QqIE",
  authDomain: "flappy-bird-5b163.firebaseapp.com",
  projectId: "flappy-bird-5b163"

};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

auth.onAuthStateChanged(user => {
  if (user) {
    // User is already logged in
    loginScreen.style.display = "none";
    nameScreen.style.display = "flex";
  } else {
    // No user
    loginScreen.style.display = "flex";
    nameScreen.style.display = "none";
  }
});


/* ===============================
   CANVAS SETUP
================================= */

const canvas = document.getElementById("gameCanvas");
const gameContainer = document.querySelector(".game-wrapper");
const ctx = canvas.getContext("2d");

console.log("Page loaded. Canvas element:", canvas);
console.log("GameContainer element:", gameContainer);
console.log("Canvas context (ctx):", ctx);

const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

// Function to set canvas size responsively
function resizeCanvas() {
  const container = canvas.parentElement;
  const maxWidth = Math.min(window.innerWidth, 800);
  const maxHeight = Math.min(window.innerHeight, 600);
  
  // Maintain 800:600 aspect ratio
  const aspectRatio = BASE_WIDTH / BASE_HEIGHT;
  let width = maxWidth;
  let height = width / aspectRatio;
  
  if (height > maxHeight) {
    height = maxHeight;
    width = height * aspectRatio;
  }
  
  canvas.width = BASE_WIDTH;
  canvas.height = BASE_HEIGHT;
  
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  
  // Redraw if game is active
  if (gameState !== "idle" && gameState !== "loading" && gameState !== "start") {
    draw();
  }
}

// Initial canvas setup
resizeCanvas();

// Handle window resize
window.addEventListener('resize', resizeCanvas);
window.addEventListener('orientationchange', () => {
  setTimeout(resizeCanvas, 100);
});

/* ===============================
   CANVAS SETUP - CONTINUED
================================= */

if (logoutBtn) {
  logoutBtn.addEventListener("click", async () => {
    await auth.signOut();
    location.reload();
  });
}

const provider = new firebase.auth.GoogleAuthProvider();
const googleBtn = document.getElementById("googleLoginBtn");

if (googleBtn) {
  googleBtn.addEventListener("click", async () => {
    try {
      // Use signInWithRedirect on mobile, signInWithPopup on desktop
      if (/mobile|android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        // Mobile: Use redirect method
        await auth.signInWithRedirect(provider);
      } else {
        // Desktop: Use popup method
        await auth.signInWithPopup(provider);
      }
      loginScreen.style.display = "none";
      nameScreen.style.display = "flex";
    } catch (err) {
      console.error("Google Auth Error:", err);
      alert("Google Login Error: " + err.message);
    }
  });
}

// Handle redirect result on page load
auth.getRedirectResult().then((result) => {
  if (result && result.user) {
    loginScreen.style.display = "none";
    nameScreen.style.display = "flex";
  }
}).catch((error) => {
  console.error("Redirect result error:", error);
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    await auth.signInWithEmailAndPassword(
      emailInput.value,
      passwordInput.value
    );

    loginScreen.style.display = "none";
    nameScreen.style.display = "flex";

  } catch (err) {
    alert(err.message);
  }
});

document.getElementById("signupBtn").addEventListener("click", async () => {
  try {
    await auth.createUserWithEmailAndPassword(
      emailInput.value,
      passwordInput.value
    );
    alert("Account created! Now login.");
  } catch (err) {
    alert(err.message);
  }
});

/* ===============================
   START BUTTON
================================= */

document.getElementById("startBtn").addEventListener("click", (e) => {
  e.preventDefault();
  console.log("START button clicked!");
  
  nameScreen.style.display = "none";
  
  // Show canvas directly
  gameContainer.style.display = "flex";
  
  resizeCanvas();
  startLoading();
  
  console.log("Game started. Canvas visible:", canvas.offsetParent !== null);
});

/* ===============================
   RESTART
================================= */

document.getElementById("restartBtn").addEventListener("click", (e) => {
  e.preventDefault();
  console.log("RESTART button clicked!");
  popup.style.display = "none";
  resetGame();
  startLoading();
});

/* ===============================
   LOADING
================================= */

function startLoading() {
  gameState = "loading";

  setTimeout(() => {
    gameState = "start";
  }, 1000);
}


/* ===============================
   SOUND
================================= */

const flapSound = new Audio("sounds/flap.wav");
const crashSound = new Audio("sounds/crash.wav");
const pointSound = new Audio("sounds/point.wav");

function playSound(sound) {
  sound.currentTime = 0;
  sound.play().catch(()=>{});
}

/* ===============================
   BACKGROUND
================================= */

let clouds = [
  {x:100,y:100,speed:0.3},
  {x:400,y:150,speed:0.4},
  {x:650,y:80,speed:0.35}
];

let mountains = [];
for(let i=0;i<8;i++){
  mountains.push({
    x:i*200,
    width:250,
    height:120+Math.random()*60,
    speed:0.1
  });
}

let buildings = [];
for (let i = 0; i < 15; i++) {
  buildings.push({
    x: i * 70,
    width: 50 + Math.random() * 30,
    height: 100 + Math.random() * 120,
    speed: 0.2
  });
}


/* ===============================
   BIRD
================================= */

let bird={
  x:200,
  y:300,
  radius:20,
  velocity:0,
  gravity:0.12,
  flap:-5.5,
  maxFall:9,
  wingAngle:0
};

/* ===============================
   PIPES
================================= */

let pipes=[];
let pipeWidth=80;
let pipeGap=180;
let pipeSpeed=3;

/* ===============================
   INPUT
================================= */

function handleInput(){
  if(gameState==="start") gameState="playing";
  else if(gameState==="playing"){
    bird.velocity=bird.flap;
    playSound(flapSound);
  }
}

document.addEventListener("keydown",e=>{
  if(e.code==="Space") {
    e.preventDefault();
    handleInput();
  }
});

document.addEventListener("touchstart",(e)=>{
  // Don't prevent default on interactive elements - let them handle their own events
  if(e.target.tagName === "INPUT" || e.target.tagName === "BUTTON") {
    return;
  }
  e.preventDefault();
  handleInput();
}, {passive: false});

document.addEventListener("click",()=>{
  if(gameState==="start" || gameState==="playing") handleInput();
});

/* ===============================
   RESET
================================= */

function resetGame(){
  bird.y=300;
  bird.velocity=0;
  pipes=[];
  score=0;
}

/* ===============================
   UPDATE
================================= */

function update() {

  bird.wingAngle += 0.2;

  if (gameState === "start") {
    bird.y = 300 + Math.sin(Date.now() * 0.005) * 5;
  }

  if (gameState === "playing") {

    bird.velocity += bird.gravity;
    if (bird.velocity > bird.maxFall)
      bird.velocity = bird.maxFall;

    bird.y += bird.velocity;

    pipes.forEach(pipe => {
      pipe.x -= pipeSpeed;

      if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
        pipe.passed = true;
        score++;
        playSound(pointSound);
      }

      if (
        bird.x + bird.radius > pipe.x &&
        bird.x - bird.radius < pipe.x + pipeWidth &&
        (bird.y - bird.radius < pipe.topHeight ||
         bird.y + bird.radius > pipe.bottomY)
      ) {
        triggerGameOver();
      }
    });

    if (bird.y + bird.radius > BASE_HEIGHT)
      triggerGameOver();
  }

  // PARALLAX MOVEMENT

  clouds.forEach(c => {
    c.x -= c.speed;
    if (c.x < -100) c.x = BASE_WIDTH;
  });

  mountains.forEach(m => {
    m.x -= m.speed;
    if (m.x + m.width < 0) m.x = BASE_WIDTH;
  });

  buildings.forEach(b => {
    b.x -= b.speed;
    if (b.x + b.width < 0) b.x = BASE_WIDTH;
  });
}


/* ===============================
   GAME OVER
================================= */

async function triggerGameOver(){

  if(gameState!=="gameover"){

    gameState="gameover";
    playSound(crashSound);

    finalScoreText.innerText=score;

    let high=localStorage.getItem("highScore")||0;
    if(score>high){
      high=score;
      localStorage.setItem("highScore",high);
    }
    highScoreText.innerText=high;

    popup.style.display="flex";

    await saveScore();
    loadLeaderboard();
  }
}

/* ===============================
   SAVE SCORE (FIREBASE TOKEN)
================================= */

async function saveScore(){

  const user = auth.currentUser;
  if(!user) return;

  const token = await user.getIdToken();

  await fetch("/save-score",{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "Authorization":"Bearer "+token
    },
    body:JSON.stringify({score})
  });
}

/* ===============================
   LEADERBOARD
================================= */

function loadLeaderboard(){
  fetch("/leaderboard")
  .then(res=>res.json())
  .then(data=>{
    leaderboardList.innerHTML="";
    data.forEach((player,index)=>{
      const li=document.createElement("li");
      li.innerHTML=`<span>${index+1}. ${player.name}</span><span>${player.maxScore}</span>`;
      leaderboardList.appendChild(li);
    });
  });
}

/* ===============================
   DRAW
================================= */

function draw() {
  // Debug: Check if draw is being called
  if (!window.drawCallCount) {
    window.drawCallCount = 0;
  }
  window.drawCallCount++;
  
  if (window.drawCallCount === 1) {
    console.log("Draw function called for first time. gameState:", gameState);
  }

  ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  // SKY
  const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
  gradient.addColorStop(0, "#70c5ce");
  gradient.addColorStop(1, "#ffffff");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

  // CLOUDS
  ctx.fillStyle = "white";
  clouds.forEach(c => {
    ctx.beginPath();
    ctx.arc(c.x, c.y, 30, 0, Math.PI * 2);
    ctx.arc(c.x + 25, c.y, 25, 0, Math.PI * 2);
    ctx.arc(c.x - 25, c.y, 20, 0, Math.PI * 2);
    ctx.fill();
  });

  // MOUNTAINS (FAR - slowest)
  ctx.fillStyle = "#8ecae6";
  mountains.forEach(m => {
    ctx.beginPath();
    ctx.moveTo(m.x, BASE_HEIGHT - 60);
    ctx.lineTo(m.x + m.width / 2, BASE_HEIGHT - m.height - 60);
    ctx.lineTo(m.x + m.width, BASE_HEIGHT - 60);
    ctx.closePath();
    ctx.fill();
  });

  // BUILDINGS (MID)
  ctx.fillStyle = "#5d6d7e";
  buildings.forEach(b => {
    ctx.fillRect(
      b.x,
      BASE_HEIGHT - b.height - 60,
      b.width,
      b.height
    );

    ctx.fillStyle = "#d6eaf8";
    for (let wy = BASE_HEIGHT - b.height - 50; wy < BASE_HEIGHT - 60; wy += 20) {
      for (let wx = b.x + 8; wx < b.x + b.width - 10; wx += 18) {
        ctx.fillRect(wx, wy, 8, 10);
      }
    }
    ctx.fillStyle = "#5d6d7e";
  });

  // GRASS GROUND
  ctx.fillStyle = "#2d5016";
  ctx.fillRect(0, BASE_HEIGHT - 60, BASE_WIDTH, 60);
  
  // Grass texture (blade details)
  ctx.fillStyle = "#3a6b1f";
  for (let x = 0; x < BASE_WIDTH; x += 15) {
    ctx.fillRect(x, BASE_HEIGHT - 60, 8, 12);
  }

  // PIPES
  pipes.forEach(pipe => {

  // === PIPE BODY ===
  ctx.fillStyle = "#ff006d";
  ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
  ctx.fillRect(pipe.x, pipe.bottomY, pipeWidth, BASE_HEIGHT);

  // === DARK BORDER ===
  ctx.strokeStyle = "#b30050";
  ctx.lineWidth = 4;
  ctx.strokeRect(pipe.x, 0, pipeWidth, pipe.topHeight);
  ctx.strokeRect(pipe.x, pipe.bottomY, pipeWidth, BASE_HEIGHT);

  // === HIGHLIGHT STRIP (3D effect) ===
  ctx.fillStyle = "#ff66b2";
  ctx.fillRect(pipe.x + 8, 0, 10, pipe.topHeight);
  ctx.fillRect(pipe.x + 8, pipe.bottomY, 10, BASE_HEIGHT);

  // === PIPE CAP (TOP) ===
  ctx.fillStyle = "#e91e63";
  ctx.fillRect(pipe.x - 6, pipe.topHeight - 20, pipeWidth + 12, 20);
  ctx.strokeRect(pipe.x - 6, pipe.topHeight - 20, pipeWidth + 12, 20);

  // === PIPE CAP (BOTTOM) ===
  ctx.fillStyle = "#e91e63";
  ctx.fillRect(pipe.x - 6, pipe.bottomY, pipeWidth + 12, 20);
  ctx.strokeRect(pipe.x - 6, pipe.bottomY, pipeWidth + 12, 20);

});


  // CAT ROTATION
  ctx.save();
  ctx.translate(bird.x, bird.y);

  let rotation = Math.max(-0.5, Math.min(0.8, bird.velocity * 0.05));
  ctx.rotate(rotation);
  ctx.translate(-bird.x, -bird.y);

  // CAT BODY (HEAD)
  let catGradient = ctx.createRadialGradient(
    bird.x - 5, bird.y - 5, 5,
    bird.x, bird.y, bird.radius
  );
  catGradient.addColorStop(0, "#ffb347");
  catGradient.addColorStop(1, "#ff8c42");

  ctx.fillStyle = catGradient;
  ctx.beginPath();
  ctx.arc(bird.x, bird.y, bird.radius, 0, Math.PI * 2);
  ctx.fill();

  // CAT EARS (LEFT)
  ctx.fillStyle = "#ff8c42";
  ctx.beginPath();
  ctx.moveTo(bird.x - 12, bird.y - 20);
  ctx.lineTo(bird.x - 8, bird.y - 28);
  ctx.lineTo(bird.x - 4, bird.y - 20);
  ctx.closePath();
  ctx.fill();

  // CAT EARS (RIGHT)
  ctx.beginPath();
  ctx.moveTo(bird.x + 12, bird.y - 20);
  ctx.lineTo(bird.x + 8, bird.y - 28);
  ctx.lineTo(bird.x + 4, bird.y - 20);
  ctx.closePath();
  ctx.fill();

  // BLUE TURBAN BASE
  ctx.fillStyle = "#1e3a8a";
  ctx.beginPath();
  ctx.ellipse(bird.x, bird.y - 22, 26, 12, 0, 0, Math.PI * 2);
  ctx.fill();

  // BLUE TURBAN WRAP
  ctx.strokeStyle = "#2563eb";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(bird.x - 2, bird.y - 22, 24, 0, Math.PI * 2);
  ctx.stroke();

  // TURBAN DECORATION (JEWEL)
  ctx.fillStyle = "#fbbf24";
  ctx.beginPath();
  ctx.arc(bird.x, bird.y - 24, 4, 0, Math.PI * 2);
  ctx.fill();

  // EYES
  ctx.fillStyle = "white";
  ctx.beginPath();
  ctx.arc(bird.x - 6, bird.y - 2, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bird.x + 6, bird.y - 2, 5, 0, Math.PI * 2);
  ctx.fill();

  // PUPILS
  ctx.fillStyle = "black";
  ctx.beginPath();
  ctx.arc(bird.x - 5, bird.y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(bird.x + 7, bird.y - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // NOSE
  ctx.fillStyle = "#ff69b4";
  ctx.beginPath();
  ctx.arc(bird.x, bird.y + 5, 3, 0, Math.PI * 2);
  ctx.fill();

  // MOUTH
  ctx.strokeStyle = "black";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(bird.x, bird.y + 8, 3, 0, Math.PI);
  ctx.stroke();

  // WHISKERS
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(bird.x - 10, bird.y + 3);
  ctx.lineTo(bird.x - 18, bird.y + 1);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bird.x + 10, bird.y + 3);
  ctx.lineTo(bird.x + 18, bird.y + 1);
  ctx.stroke();

  if (gameState === "loading") {
  ctx.fillStyle = "black";
  ctx.font = "bold 36px Arial";
  ctx.textAlign = "center";
  ctx.fillText("LOADING...", BASE_WIDTH / 2, BASE_HEIGHT / 2);
}


  ctx.restore();

  // SCORE
  ctx.fillStyle = "black";
  ctx.font = "bold 32px Arial";
  ctx.fillText(score, 20, 50);

 if (gameState === "start") {

  // Floating animation
  const floatY = Math.sin(Date.now() * 0.004) * 8;

  ctx.textAlign = "center";

  // Shadow (3D effect)
  ctx.fillStyle = "black";
  ctx.font = "bold 32px 'Press Start 2P'";
  ctx.fillText("PRESS SPACE / TAP", BASE_WIDTH / 2 + 3, 320 + floatY + 3);

  // Main Text
  ctx.fillStyle = "#ffffff";
  ctx.fillText("PRESS SPACE / TAP", BASE_WIDTH / 2, 320 + floatY);
}

}

/* ===============================
   LOOP
================================= */

function gameLoop(){
  update();
  draw();
  requestAnimationFrame(gameLoop);
}
gameLoop();

/* ===============================
   PIPE SPAWN
================================= */

setInterval(()=>{
  if(gameState==="playing"){
    let gapY=Math.random()*250+100;
    pipes.push({
      x:BASE_WIDTH,
      topHeight:gapY,
      bottomY:gapY+pipeGap,
      passed:false
    });
  }
},2000);

});
