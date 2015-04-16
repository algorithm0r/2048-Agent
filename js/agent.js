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

// This code runs the simulation and sends the selected moves to the game
function AgentManager(gameManager) {
    this.gameManager = gameManager;

    this.numAgents = 100;
    this.numRuns = 3;
    this.runs = 0;
    this.averageScore = 0;

    this.population = [];

    for (var i = 0; i < this.numAgents; i++) {
        this.population.push(new BlindAgent());
    }

    this.agent = 0;
    this.gen = 0;

};

AgentManager.prototype.selectMove = function () {
    // 0: up, 1: right, 2: down, 3: left

    // game over
    if (this.gameManager.over) {
        console.log("Agent " + this.agent + " Run " + this.runs + " Score " + this.gameManager.score);
        var score = this.gameManager.score;
        this.averageScore += score / this.numRuns;
        this.runs++;
        if (this.runs === this.numRuns) {
            this.population[this.agent].score = this.averageScore;
            this.averageScore = 0;
            this.runs = 0;
            console.log("Agent " + this.agent + " Averarge Score " + this.population[this.agent].score);

            this.agent++;
            if (this.agent === this.numAgents) {
                this.population.sort(function (a, b) {
                    return a.score - b.score;
                });

                //for (var i = 0; i < this.numAgents; i++) {
                //    console.log(this.population[i].score);
                //}

                console.log("GENERATION " + this.gen++);
                console.log("Max Score " + this.population[this.population.length - 1].score);

                this.population.splice(0, this.numAgents / 2);
                var len = this.population.length;
                for (var i = 0; i < this.numAgents - this.numAgents / 2; i++) {
                    var index = randomInt(len);
                    this.population.push(this.population[index].cloneAndMutate());
                }

                this.agent = 0;
            }
        }
        setTimeout(this.gameManager.restart.bind(this.gameManager), 1000);

    } else { // game ongoing
        var agent = this.population[this.agent];
        var perm = agent.selectMove().perm;

        if (!this.gameManager.move(perm[0]))
            if (!this.gameManager.move(perm[1]))
                if (!this.gameManager.move(perm[2])) {
                    this.gameManager.move(perm[3]);
                    agent.actions.splice(0, 0, perm[3]);
                } else agent.actions.splice(0, 0, perm[2]);
            else agent.actions.splice(0, 0, perm[1]);
        else agent.actions.splice(0, 0, perm[0]);
    }
};