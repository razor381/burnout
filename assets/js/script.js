const PLAYER_SPEED = 10;
const PLAYER_COLOR = 'blue';

const ENEMY_SPEED = 10;
const ENEMY_QTY = 3;
const ENEMY_COLOR = 'red';

const VEHICLE_WIDTH = 130;
const VEHICLE_HEIGHT = 160;
const MIN_ENEMY_CLEARANCE = VEHICLE_HEIGHT * 3;

const ROAD_LINE_WIDTH = 10;
const ROAD_LINE_COLOR = 'rgba(255, 255, 255, 0.7)';
const ROAD_LINES_QTY = 5;
const LANES_QTY = 3;

const MAX_WIDTH = window.innerWidth / 3;
const MAX_HEIGHT = window.innerHeight;

const ARROW_LEFT = 'ArrowLeft';
const ARROW_RIGHT = 'ArrowRight';
const ARROW_UP = 'ArrowUp'  ;
const ARROW_DOWN = 'ArrowDown';

const roadArea = getEl('#road-area');

const startCard = getEl('#start-card');
const endCard = getEl('#end-card');
const scoreCard = getEl('#score-card');

const startBtn = getEl('#start-btn');
const restartBtn = getEl('#restart-btn');

// DOM element tags and classes
const DIV_TAG = 'div';
const CLASS_VEHICLE = 'vehicle';
const CLASS_PLAYER_VEHICLE = 'player-vehicle';
const CLASS_ENEMY_VEHICLE = 'enemy-vehicle';
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
    this.color = color;
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
  constructor(y, dy, color, lane, isEnemy, isRandomReset) {
    const x = convertLaneToPixel(lane);
    const el = createNewElement(
      DIV_TAG,
      [CLASS_VEHICLE, isEnemy ? CLASS_PLAYER_VEHICLE : CLASS_PLAYER_VEHICLE],
    );

    super(x, y, VEHICLE_WIDTH, VEHICLE_HEIGHT, 0, dy, color, el, isRandomReset);
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
      PLAYER_COLOR,
      0, //player starts at left-most lane
      false,
      false,
    );

    this.score = 0;
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

  }

  updateScore() {

  }
}


class Enemy extends Vehicle {
  constructor(lane) {
    super(
      -getRandomInteger(VEHICLE_HEIGHT, MAX_HEIGHT) - lane * MAX_HEIGHT,
      ENEMY_SPEED,
      ENEMY_COLOR,
      lane,
      true,
      true,
    );
  }
}



// ------------------------- functions ---------------------------

function convertLaneToPixel(lane) {
  return lane * (MAX_WIDTH / 3);
}

function addPx(val) {
  return val + 'px';
}

function renderElementIntoDom(el, parentEl) {
  parentEl.appendChild(el);
}

function createNewElement(tag, classes) {
  const newEl = document.createElement('div');
  newEl.classList.add(...classes);
  return newEl;
}

function getEl(name) {
  return document.querySelector(name);
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
    enemies.push(new Enemy(i % LANES_QTY));
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

function checkBelowScreen(obj) {
  if (obj.y > MAX_HEIGHT) {
    obj.restartToTop();
  }
}

function isCollisionFree(player, enemies) {
  /**
   *
   * @TODO find cleaner alternative
   *
   * */
  return enemies.some((enemy) => {
    return (enemy.lane === player.lane) &&
    ((player.y > enemy.y) && (enemy.height < (player.y - enemy.y))) ||
      ((player.y < enemy.y) && (player.height < (enemy.y - player.y)));
  });
}

function animateMotion(player, enemies, roadLines) {
  (function animate() {
    [...enemies, ...roadLines].forEach((obj) => {
      obj.moveY();
      checkBelowScreen(obj);
    });

    isCollisionFree(player, enemies) && requestAnimationFrame(animate);
  })();
}

// --------------------- logic --------------------------------


roadArea.style.width = MAX_WIDTH + 'px';
roadArea.style.height = MAX_HEIGHT + 'px';

function game() {
  startCard.classList.add('hidden');
  const roadLines = generateRoadLines();
  const player = new Player();
  const enemies = generateEnemies();

  animateMotion(player, enemies, roadLines);
}

startBtn.addEventListener('click', () => {
  game();
});



