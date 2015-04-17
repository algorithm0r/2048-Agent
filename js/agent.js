// helper functions
function swap(lst, a, b) {
    var temp = lst[a];
    lst[a] = lst[b];
    lst[b] = temp;
};

function randomInt(n) {
    return Math.floor(Math.random() * n);
};

function mutationRate(rate) {
    return Math.random() < rate;
};

// Permutation doubles as a strategy and a node in a trie
function Permutation(perm) {
    this.children = [null, null, null, null];

    if (perm) {
        this.perm = perm;
    } else {
        var lst = [0, 1, 2, 3];
        this.perm = [];
        while (lst.length > 0) {
            var index = randomInt(lst.length);
            this.perm.push(lst[index]);
            lst.splice(index, 1);
        }
    }
};

Permutation.prototype.clone = function () {
    var perm = [];
    for (var i = 0; i < this.perm.length; i++) {
        perm.push(this.perm[i]);
    }
    return new Permutation(perm);
};

Permutation.prototype.mutate = function () {
    var a = randomInt(this.perm.length);
    var b = randomInt(this.perm.length);
    swap(this.perm, a, b);
};

// Trie stores differnt strategies based on last sequence of moves
function Trie() {
    this.root = new Permutation();
};

Trie.prototype.evalRecurse = function (prefix, perm) {
    //console.log("Recurse");
    //console.log(prefix);
    //console.log(perm.perm);
    //console.log(perm.children[0]);

    if (prefix.length > 0 && perm.children[prefix[0]] !== null) {
        var index = prefix[0];
        return this.evalRecurse(prefix.splice(0, 1), perm.children[index]);
    }
    else
        return perm;
};

Trie.prototype.evaluate = function (prefix) {
    return this.evalRecurse(prefix, this.root);
};

Trie.prototype.mutateRecurse = function (rate, perm, grow) {
    if (mutationRate(rate)) perm.mutate();
    var growChild = randomInt(perm.children.length);
    for (var i = 0; i < perm.children.length; i++) {
        if (perm.children[i] !== null) {
            var g = i === growChild && grow;
            this.mutateRecurse(rate, perm.children[i], g);
        } else {
            if (i === growChild) perm.children[i] = new Permutation();
        }
    }
};

Trie.prototype.mutate = function (rate) {
    var growTrie = mutationRate(rate);
    this.mutateRecurse(rate, this.root, growTrie);
};

Trie.prototype.cloneRecurse = function (perm) {
    var newPerm = perm.clone();
    for (var i = 0; i < perm.children.length; i++) {
        if (perm.children[i] !== null) {
            newPerm.children[i] = this.cloneRecurse(perm.children[i]);
        } else {
            newPerm.children[i] = null;
        }
    }
    return newPerm;
};

Trie.prototype.clone = function () {
    return new Trie(this.cloneRecurse(this.root));
};

function BlindAgent(trie) {
    this.actions = [];
    this.mutationRate = 0.10;

    this.score = 0;

    if (trie) {
        this.trie = trie;
    } else {
        this.trie = new Trie();
        this.trie.mutate(this.mutationRate);
    }
};

BlindAgent.prototype.selectMove = function () {
    if (this.actions.length > 200) this.actions.splice(100, 100);

    var action = this.trie.evaluate(this.actions);

    return action;
};

BlindAgent.prototype.cloneAndMutate = function () {
    var newTrie = this.trie.clone();
    newTrie.mutate(this.mutationRate);

    return new BlindAgent(newTrie);
};

function AgentBrain(gameEngine) {
    this.size = 4;
    this.previousState = gameEngine.grid.serialize();
    this.reset();
};

AgentBrain.prototype.reset = function() {
    this.grid = new Grid(this.previousState.size, this.previousState.cells);
};

// Adds a tile in a random position
AgentBrain.prototype.addRandomTile = function () {
    if (this.grid.cellsAvailable()) {
        var value = Math.random() < 0.9 ? 2 : 4;
        var tile = new Tile(this.grid.randomAvailableCell(), value);

        this.grid.insertTile(tile);
    }
};

AgentBrain.prototype.moveTile = function (tile, cell) {
    this.grid.cells[tile.x][tile.y] = null;
    this.grid.cells[cell.x][cell.y] = tile;
    tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
AgentBrain.prototype.move = function (direction) {
    // 0: up, 1: right, 2: down, 3: left
    var self = this;

    var cell, tile;

    var vector = this.getVector(direction);
    var traversals = this.buildTraversals(vector);
    var moved = false;

    //console.log(vector);

    //console.log(traversals);

    // Traverse the grid in the right direction and move tiles
    traversals.x.forEach(function (x) {
        traversals.y.forEach(function (y) {
            cell = { x: x, y: y };
            tile = self.grid.cellContent(cell);

            if (tile) {
                var positions = self.findFarthestPosition(cell, vector);
                var next = self.grid.cellContent(positions.next);

                // Only one merger per row traversal?
                if (next && next.value === tile.value && !next.mergedFrom) {
                    var merged = new Tile(positions.next, tile.value * 2);
                    merged.mergedFrom = [tile, next];

                    self.grid.insertTile(merged);
                    self.grid.removeTile(tile);

                    // Converge the two tiles' positions
                    tile.updatePosition(positions.next);

                    // Update the score
                    //self.score += merged.value;

                } else {
                    self.moveTile(tile, positions.farthest);
                }

                if (!self.positionsEqual(cell, tile)) {
                    moved = true; // The tile moved from its original cell!
                }
            }
        });
    });
    console.log(moved);
    if (moved) {
        this.addRandomTile();
    }
    return moved;
};

// Get the vector representing the chosen direction
AgentBrain.prototype.getVector = function (direction) {
    // Vectors representing tile movement
    var map = {
        0: { x: 0, y: -1 }, // Up
        1: { x: 1, y: 0 },  // Right
        2: { x: 0, y: 1 },  // Down
        3: { x: -1, y: 0 }   // Left
    };

    return map[direction];
};

// Build a list of positions to traverse in the right order
AgentBrain.prototype.buildTraversals = function (vector) {
    var traversals = { x: [], y: [] };

    for (var pos = 0; pos < this.size; pos++) {
        traversals.x.push(pos);
        traversals.y.push(pos);
    }

    // Always traverse from the farthest cell in the chosen direction
    if (vector.x === 1) traversals.x = traversals.x.reverse();
    if (vector.y === 1) traversals.y = traversals.y.reverse();

    return traversals;
};

AgentBrain.prototype.findFarthestPosition = function (cell, vector) {
    var previous;

    // Progress towards the vector direction until an obstacle is found
    do {
        previous = cell;
        cell = { x: previous.x + vector.x, y: previous.y + vector.y };
    } while (this.grid.withinBounds(cell) &&
             this.grid.cellAvailable(cell));

    return {
        farthest: previous,
        next: cell // Used to check if a merge is required
    };
};

AgentBrain.prototype.positionsEqual = function (first, second) {
    return first.x === second.x && first.y === second.y;
};

function LookAheadAgent() {
    this.mutationRate = 0.10;

    this.score = 0;
};

LookAheadAgent.prototype.selectMove = function (gameManager) {
    var brain = new AgentBrain(gameManager);
    var action = 0;
    var max = -1;

    for (var i = 0; i < 4; i++) {
        if (brain.move(i)) {
            var score = -1;
            for (var j = 0; j < 4; j++) {
                if (brain.move(j)) {
                    var val = this.evaluateGrid(brain.grid);
                    if (val > score) {
                        score = val;
                    }
                }
            }
            if (score === -1) score = this.evaluateGrid(brain.grid);
            if (score > max) {
                max = score;
                action = i;
            }
            console.log("score: " + score + " max: " + max);
        } else {
            console.log("move failed " + i);
            //action++;
        }
        brain.reset();
    }
    console.log(action);
    return action;
};

LookAheadAgent.prototype.evaluateGrid = function (grid) {
    var that = this;

    var count = 0;

    function isEmpty(x, y, cell) {
        if (cell === null) count++;
    };

    grid.eachCell(isEmpty);

    return count;
};

LookAheadAgent.prototype.cloneAndMutate = function () {
    
    return new LookAheadAgent();
};


// This code runs the simulation and sends the selected moves to the game
function AgentManager(gameManager) {
    this.gameManager = gameManager;

    this.agent = new LookAheadAgent();

    //this.numAgents = 100;
    //this.numRuns = 3;
    //this.runs = 0;
    //this.averageScore = 0;

    //this.population = [];

    //for (var i = 0; i < this.numAgents; i++) {
    //    this.population.push(new BlindAgent());
    //}

    //this.agent = 0;
    //this.gen = 0;

};

AgentManager.prototype.selectMove = function () {
    // 0: up, 1: right, 2: down, 3: left
    if (this.gameManager.over) setTimeout(this.gameManager.restart.bind(this.gameManager), 1000);
    else
        if (!this.gameManager.move(this.agent.selectMove(this.gameManager))) console.log("bad move");

    // game over
    //if (this.gameManager.over) {
    //    console.log("Agent " + this.agent + " Run " + this.runs + " Score " + this.gameManager.score);
    //    var score = this.gameManager.score;
    //    this.averageScore += score / this.numRuns;
    //    this.runs++;
    //    if (this.runs === this.numRuns) {
    //        this.population[this.agent].score = this.averageScore;
    //        this.averageScore = 0;
    //        this.runs = 0;
    //        console.log("Agent " + this.agent + " Averarge Score " + this.population[this.agent].score);

    //        this.agent++;
    //        if (this.agent === this.numAgents) {
    //            this.population.sort(function (a, b) {
    //                return a.score - b.score;
    //            });

    //            for (var i = 0; i < this.numAgents; i++) {
    //                console.log(this.population[i].score);
    //            }

    //            console.log("GENERATION " + this.gen++);
    //            console.log("Max Score " + this.population[this.population.length - 1].score);

    //            this.population.splice(0, this.numAgents / 2);
    //            var len = this.population.length;
    //            for (var i = 0; i < this.numAgents - this.numAgents / 2; i++) {
    //                var index = randomInt(len);
    //                this.population.push(this.population[index].cloneAndMutate());
    //            }

    //            this.agent = 0;
    //        }
    //    }
    //    

    //} else { // game ongoing
    //    var agent = this.population[this.agent];
    //    var perm = agent.selectMove().perm;

    //    if (!this.gameManager.move(perm[0]))
    //        if (!this.gameManager.move(perm[1]))
    //            if (!this.gameManager.move(perm[2])) {
    //                this.gameManager.move(perm[3]);
    //                agent.actions.splice(0, 0, perm[3]);
    //            } else agent.actions.splice(0, 0, perm[2]);
    //        else agent.actions.splice(0, 0, perm[1]);
    //    else agent.actions.splice(0, 0, perm[0]);
    //}
};