const PLAYER_SPEED = 10;
const ENEMY_SPEED = 10;
const ENEMY_QTY = 3;

const VEHICLE_WIDTH = 130;
const VEHICLE_HEIGHT = 160;
const MIN_ENEMY_CLEARANCE = VEHICLE_HEIGHT * 3;

const ROAD_LINE_WIDTH = 10;
const ROAD_LINE_COLOR = 'rgba(255, 255, 255, 0.7)';
const TRANSPARENT_COLOR = 'rgba(0, 0, 0, 0)';
const ROAD_LINES_QTY = 5;
const LANES_QTY = 3;

const MAX_WIDTH = window.innerWidth / 3;
const MAX_HEIGHT = window.innerHeight;

const ARROW_LEFT = 'ArrowLeft';
const ARROW_RIGHT = 'ArrowRight';
const ARROW_UP = 'ArrowUp'  ;
const ARROW_DOWN = 'ArrowDown';

const BEST_SCORE_KEY = '@BEST_SCORE';

const PLAYER_IMG = '../assets/img/player.png';
const ENEMY_IMG = '../assets/img/enemy.png';


// DOM ELEMENTS

const roadArea = getEl('#road-area');

const startCard = getEl('#start-card');
const endCard = getEl('#end-card');
const scoreCard = getEl('#score-card');

const startBtn = getEl('#start-btn');
const restartBtn = getEl('#restart-btn');

const currentScoreEl = getEl('.current-score');
const finalScoreEl = getEl('.final-score');
const bestScoreEls = getEl('.best-score', true);
const newBestEl = getEl('.new-best');


// tag names and classes

const DIV_TAG = 'div';
const IMG_TAG = 'img';
const CLASS_VEHICLE = 'vehicle';
const CLASS_ROAD_LINE = 'road-line';
const CLASS_HIDDEN = 'hidden';


// ------------------------- classes ---------------------------


class BaseObject {
  constructor(x, y, width, height, dx, dy, color, el, isRandomReset) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.dx = dx;
    this.dy = dy;
    this.color = color || TRANSPARENT_COLOR;
    this.el = el;
    this.isRandomReset = isRandomReset;

    this.updateStyles();
    renderElementIntoDom(this.el, roadArea);
  }

  updateStyles() {
    /**
     *
     * @TODO - find alternative to assign all style props at once
     *       - method inefficient as DOM style is updated at every single line
     *
     * */
    this.el.style.width = addPx(this.width);
    this.el.style.height = addPx(this.height);
    this.el.style.top = addPx(this.y);
    this.el.style.left = addPx(this.x);
    this.el.style.backgroundColor = this.color;
  }

  moveY () {
    this.y += this.dy;
    this.updateStyles();
  }

  restartToTop() {
    this.y = this.isRandomReset ?
      -getRandomInteger(MIN_ENEMY_CLEARANCE, MAX_HEIGHT)
      :  -this.height;
    this.updateStyles();
  }
}


class RoadLine extends BaseObject {
  constructor(initialVerticalPosition, lineHeight) {
    const el = createNewElement(DIV_TAG, [CLASS_ROAD_LINE]);
    super(
      (MAX_WIDTH / 2) - (ROAD_LINE_WIDTH / 2),
      initialVerticalPosition,
      ROAD_LINE_WIDTH,
      lineHeight,
      0,                    // road lane does not move horizontally
      PLAYER_SPEED,         // road line speed determined by player speed
      ROAD_LINE_COLOR,
      el,
      false,
    );
  }
}


class Vehicle extends BaseObject {
  constructor(y, dy, lane, isEnemy, isRandomReset, el) {
    const x = convertLaneToPixel(lane);

    el.classList.add(CLASS_VEHICLE);

    super(x, y, VEHICLE_WIDTH, VEHICLE_HEIGHT, 0, dy, null, el, isRandomReset);
    this.lane = lane;
  }

  changeLane(toLane) {
    this.lane = toLane;
    this.x = convertLaneToPixel(toLane);
    this.el.style.left = addPx(this.x);
  }
}


class Player extends Vehicle {
  constructor() {
    super(
      MAX_HEIGHT - VEHICLE_HEIGHT,
      0, // player does not move vertically
      0, //player starts at left-most lane
      false,
      false,
      playerImg,
    );

    this.distanceTravelled = 0;
    this.addMovementListeners();
  }

  addMovementListeners() {
    document.onkeydown = (e) => {
      e = e || window.event;

      switch(e.key) {
        case ARROW_LEFT:
          this.handleMoveLeft();
          break;
        case ARROW_RIGHT:
          this.handleMoveRight();
          break;
        default:
      }
    }
  }

  handleMoveLeft() {
    if (this.lane > 0) this.changeLane(this.lane - 1);
  }

  handleMoveRight() {
    if (this.lane < LANES_QTY - 1) this.changeLane(this.lane + 1);
  }

  updateDistanceTravelled() {
    this.distanceTravelled += PLAYER_SPEED;
    currentScoreEl.innerText = this.distanceTravelled;
  }
}


class Enemy extends Vehicle {
  constructor(lane, image) {
    super(
      -getRandomInteger(VEHICLE_HEIGHT, MAX_HEIGHT) - lane * MAX_HEIGHT,
      ENEMY_SPEED,
      lane,
      true,
      true,
      image,
    );
  }
}


class Game {
  constructor() {
    this.initialize();
    this.roadLines = generateRoadLines();
    this.player = new Player();
    this.enemies = generateEnemies();
    this.animateMotion();
  }

  initialize() {
    this.prevBestScore = localStorage.getItem(BEST_SCORE_KEY) || 0;
    this.updateBestScoreElements();
    resetScreen();
  }

  updateBestScoreElements() {
    bestScoreEls.forEach((el) => el.innerText = this.prevBestScore);
  }

  handleGameOver() {
    finalScoreEl.innerText = this.player.distanceTravelled;
    this.updateBestScore()
    endCard.classList.remove(CLASS_HIDDEN);
  }

  updateBestScore() {
    if (this.player.distanceTravelled <= this.prevBestScore) return;

    localStorage.setItem(BEST_SCORE_KEY, this.player.distanceTravelled);
    this.prevBestScore = this.player.distanceTravelled;
    newBestEl.classList.remove(CLASS_HIDDEN);
    this.updateBestScoreElements();
  }

  animateMotion() {
    (function animate() {
      this.player.updateDistanceTravelled();

      [...this.enemies, ...this.roadLines].forEach((obj) => {
        obj.moveY();
        checkBelowScreen(obj);
      });

      this.isCollisionFree() ? requestAnimationFrame(animate.bind(this)) : this.handleGameOver();
    }.bind(this))();
  }

  isCollisionFree() {
    /**
     *
     * @TODO find cleaner alternative
     *
     * */
    return this.enemies.some((enemy) => {
      return (enemy.lane === this.player.lane) &&
      ((this.player.y > enemy.y) && (enemy.height < (this.player.y - enemy.y))) ||
        ((this.player.y < enemy.y) && (this.player.height < (enemy.y - this.player.y)));
    });
  }


}


// ------------------------- functions ---------------------------


function loadImage(src) {
  return new Promise(resolve => {
    let img = new Image();
    img.onload = (() => resolve(img));
    img.src = src;
  });
}

function resetScreen() {
  startCard.classList.add(CLASS_HIDDEN);
  endCard.classList.add(CLASS_HIDDEN);
  newBestEl.classList.add(CLASS_HIDDEN);
  roadArea.textContent = '';
}

function convertLaneToPixel(lane) {
  return lane * (MAX_WIDTH / 3);
}

function addPx(val) {
  return val + 'px';
}

function renderElementIntoDom(el, parentEl) {
  parentEl.appendChild(el);
}

function createNewElement(tag, classes, attributes=[]) {
  const newEl = document.createElement('div');
  newEl.classList.add(...classes);
  return newEl;
}

function getEl(name, all=false) {
  return all?  document.querySelectorAll(name) : document.querySelector(name);
}

function getRandomInteger(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function getRandomLane() {
  return getRandomInteger(0, LANES_QTY);
}

function generateEnemies() {
  let enemies = [];

  for (let i = 0; i < ENEMY_QTY; i++) {
    enemies.push(new Enemy(i % LANES_QTY, enemyImgs[i]));
  }

  return enemies;
}

function generateRoadLines() {
  let roadLines = [];

  for (let i = 0 ; i < ROAD_LINES_QTY + 1; i++) {
    /**
     * @TODO find alternative to make road lines consistent
     * */
    const lineHeight = MAX_HEIGHT / ROAD_LINES_QTY;
    const verticalOffset = i * lineHeight;
    roadLines.push(new RoadLine(verticalOffset, lineHeight - 70));
  }

  return roadLines;
}

async function loadEnemyImages() {
  const enemyImgs = [];

  for (let i = 0; i < ENEMY_QTY; i++) {
    enemyImgs.push(loadImage(ENEMY_IMG));
  }

  return Promise.all(enemyImgs);
}

function checkBelowScreen(obj) {
  if (obj.y > MAX_HEIGHT) {
    obj.restartToTop();
  }
}

function init() {
  const game = new Game();
}


// --------------------- logic --------------------------------


roadArea.style.width = addPx(MAX_WIDTH);
roadArea.style.height = addPx(MAX_HEIGHT);

let playerImg, enemyImgs;

(async function () {
  playerImg = await loadImage(PLAYER_IMG);
  enemyImgs = await loadEnemyImages();

  startBtn.addEventListener('click', () => {
    scoreCard.classList.remove(CLASS_HIDDEN);
    init();
  });

  restartBtn.addEventListener('click', () => {
    init();
  })
})();



