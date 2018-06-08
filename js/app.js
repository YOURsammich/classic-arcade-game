let allEnemies = [];
let allItems = [];
let gameData = {
    level: 0,
    section: 0,
    score: 0,
    moveMapUpBy: 0,
    pause: true
};

/*
    --Level data structure--
    
    Each array represents one level, there are 10 levels
    Each array contains 5 inner arrays the first 4 representing the 4 stone rows in the game
    The last inner array is for special items like gems or hearts
    The first entry in each of the the inner arrays contains item id for that row like a bug or rock wall
    Any additional entries in the inner array repesents properties of the item
    
    // Examples
    [gameItem, itemProperty1, itemProperty2]
    
    [bug, speed, reverse]
    [rock, opening]
*/

const gameItems = ['Bug', 'Rock', 'Star', 'Heart'];
const bugSpeeds = [50, 100, 150, 200, 250];

const levels = [
    [[0, 3, 1], [1, 3], [0, 4], [0, 3], [2, 0, 1]],      // 1
    [[0, 2], [1, 2], [0, 3, 1], [1, 1], [3, 0, 1]],      // 2
    [[0, 2, 1], [0, 3, 1], [0, 2], [0, 3], [2, 1, 1]],   // 3
    [[1, 2], [0, 2], [1, 4], [0, 2], [3, 1, 2]],         // 4
    [[1, 0], [0, 1], [0, 3], [1, 4], [2, 3, 2]],         // 5
    [[1, 3], [0, 4], [0, 4, 1], [0, 3], [2, 0, 2]],      // 6
    [[0, 4], [1, 0], [0, 3, 1], [0, 4], [2, 4, 3]],      // 7
    [[0, 4], [1, 1], [0, 4], [1, 3], [2, 0, 3]],         // 8
    [[0, 2], [0, 3, 1], [0, 4], [0, 4, 1], [2, 3, 3]],   // 9
    [[0, 4, 1], [1, 0], [0, 1], [1, 3], [2, 3, 1]]       // 10
];

// basic constructor all items in the game extend from
class Item {
    constructor(x, y, sprite) {
        this.x = x;
        this.y = y;
        
        // The image/sprite for our item, this uses
        // a helper we've provided to easily load images
        this.sprite = sprite;
    }
}

// Enemies our player must avoid
class Enemy extends Item {
    constructor (x, y, speed, reverse) {
        super(x, y, 'images/enemy-bug.png');
        this.speed = speed;
        this.reverse = reverse;
    }
    
    // Update the enemy's position, required method for game
    // Parameter: dt, a time delta between ticks
    update(dt) {
        // You should multiply any movement by the dt parameter
        // which will ensure the game runs at the same speed for
        // all computers.
        if (this.reverse) {
            // bug comes from right to left
            this.x -= (dt * this.speed);
            if (this.x < -101) this.x = 101 * 6;   
        } else {
            // left to right
            this.x += (dt * this.speed);
            if (this.x > 101 * 5) this.x = -101;
        }
    }
    
    // Draw the enemy on the screen, required method for game
    render() {
        // Enemies are locked to a y-axis grid only, not a x-axis grid
        let x = this.x;
        let y = (this.y * 83) + gameData.moveMapUpBy;
        
        // if reversed, flip bug image
        if (this.reverse) {
            ctx.save();  
            ctx.translate(x + 101, y);
            x = y = 0;
            ctx.scale(-1, 1);
        }
        ctx.drawImage(Resources.get(this.sprite), x, y - 25);
        if (this.reverse) ctx.restore();
    }
} 

// Now write your own player class
// This class requires an update(), render() and
// a handleInput() method.

class Player extends Item {
    constructor () {
        super(2, 5, 'images/char-boy.png');
        this.health = 3;
        this.dir = {
            left: false,
            right: false,
            up: false,
            down: false
        }
    }
    
    update() {
        let tx = this.x;
        let ty = this.y;
        
        if (this.dir === 'right') {
            if (tx < 4) tx++;
        } else if (this.dir === 'left') {
            if (tx > 0) tx--;
        } else if (this.dir === 'up') {
            if (ty > 0) ty--;
        } else if (this.dir === 'down') {
            //can't move down if map is scrolling
            //so user doesn't go back into old level
            if (ty < 5 && !gameData.moveMapUpBy) ty++;
        }
        
        //get item in this cell
        let cellHas = cellHasItem(tx, ty);
        
        // check if cell has rock
        if (cellHas !== 'images/Rock.png') {
            this.x = tx;
            this.y = ty;
            
            //if cell has item, remove item from drawing
            if (cellHas) {
                if (cellHas === 'images/Heart.png') player.health++;
                if (cellHas === 'images/Star.png') gameData.score++;
                
                allItems.splice(-1, 1);
                updateStatusBar();
            }
        }
        
        this.dir = '';
    }
    
    render() {
        const img = Resources.get(this.sprite);
        const gridX = this.x * 101;
        const gridY = this.y * 83;
        ctx.drawImage(img, gridX, (gridY + gameData.moveMapUpBy) - 35);
    }
    
    handleInput(dir) {
        this.dir = dir;
    }
}

// Now instantiate your objects.
// Place all enemy objects in an array called allEnemies
// Place the player object in a variable called player
player = new Player();

// return item in given cell
// or false if cell has no item
function cellHasItem (x, y) {
    var cellFilled = false;
    allItems.forEach(function (item) {
        if (item.x === x && item.y === y) {
            cellFilled = item.sprite;
        }
    });
    
    return cellFilled;
}

/* If touching an enemy reset player position */
function checkCollisions () {
    const playerX = player.x * 101;
    
    allEnemies.forEach(function(enemy) {
        const dis = playerX - enemy.x;
        if (dis <= 75 && dis >= -77 && enemy.y === player.y) {
            if (!--player.health) {
                // if no more health game is over
                showLosePanel();
            } else {
                // reset level and player
                gameData.score -= 10;
                player.x = 2;
                reset();
            }
        }
    });
}

// return all items and enemies that belong to given level
function generateMap (level) {
    const levelData = levels[level];
    let newItems = [];
    let newEnemies = [];
    for (let i = 0; i < levelData.length; i++) {
        const itemId = gameItems[levelData[i][0]];
        if (itemId === 'Bug') {
            const [, speed, reverse] = levelData[i];
            
            //add bug to the game with the given properties
            newEnemies.push(new Enemy(-101, i + 1, bugSpeeds[speed], reverse));
        } else if (itemId === 'Rock') {
            const [, opening] = levelData[i];
            
            //add a rock along the row, skipping over "opening"
            for (let x = 0; x < 5; x++) {
                if (x !== opening) {
                    newItems.push(new Item(x, i + 1, 'images/Rock.png'));   
                }
            }
        } else {
            const [, x, y] = levelData[i];
            newItems.push(new Item(x, y, `images/${itemId}.png`));
        }
    }
    
    return {newItems, newEnemies}
}

function updateStatusBar () {
    document.getElementById('score').textContent = gameData.score * 10;
    document.getElementById('level').textContent = gameData.level + 1;
    document.getElementById('health-bar').style.width = (player.health * 30) + 'px';
}

// set/reset all items in current level
function reset() {
    const newLevel = generateMap(gameData.level);
    allEnemies = newLevel.newEnemies;
    allItems = newLevel.newItems;
    player.y = 5;
    updateStatusBar();
}

// run on game lose
function showLosePanel () {
    gameData.pause = true;
    gameData.level = 0;
    gameData.score = 0;
    player.health = 3;
    document.getElementById('losePanel').classList.toggle('hidden');
}

// run on game win
function showWinPanel () {
    document.getElementById('win-score').textContent = gameData.score * 10;
    document.getElementById('winPanel').classList.toggle('hidden');
    gameData.pause = true;
    gameData.level = 0;
    gameData.score = 0;
    player.health = 3;
}

document.getElementById('nextLevel').addEventListener('click', function () {
    document.getElementById('winPanel').classList.toggle('hidden');
    gameData.pause = false;
    reset();
});

document.getElementById('retry').addEventListener('click', function () {
    document.getElementById('losePanel').classList.toggle('hidden');
    gameData.pause = false;
    reset();
});

// character selection
document.getElementById('character-select').addEventListener('click', function (e) {
    const targetClass = e.target.classList;

    if (targetClass.contains('character')) {
        console.log('char-' + targetClass[1] + '.png');
        player.sprite = 'images/char-' + targetClass[1] + '.png';
    }
});

document.getElementById('startGame').addEventListener('click', function () {
    gameData.pause = false;
    document.getElementById('menuPanel').classList.toggle('hidden');
});


// This listens for key presses and sends the keys to your
// Player.handleInput() method. You don't need to modify this.
document.addEventListener('keyup', function(e) {
    e.preventDefault();
    const allowedKeys = {
        37: 'left',
        38: 'up',
        39: 'right',
        40: 'down',
        65: 'left',
        87: 'up',
        68: 'right',
        83 : 'down'
    };

    if (!gameData.pause) player.handleInput(allowedKeys[e.keyCode]);
});
