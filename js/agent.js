// Wait till the browser is ready to render the game (avoids glitches)
function Agent(gameManager) {
    this.gameManager = gameManager;
    this.strategy = 1; // 0 = random, 1 = down, right, left up
};

Agent.prototype.selectMove = function () {
    // 0: up, 1: right, 2: down, 3: left
    if (this.gameManager.over) setTimeout(this.gameManager.restart.bind(this.gameManager),1000);

    if (this.strategy === 0) {
        var move = Math.floor(Math.random() * 4);
        while (!this.gameManager.move(move) && !this.gameManager.over)
            move = Math.floor(Math.random() * 4);
    }

    if (this.strategy === 1) {
        if (!this.gameManager.move(2))
            if (!this.gameManager.move(1))
                if (!this.gameManager.move(3))
                    this.gameManager.move(0);
    }

    var down = false;
    if (this.strategy === 2) {
        if (down) {
            if (!this.gameManager.move(2))
                if (!this.gameManager.move(1))
                    if (!this.gameManager.move(3)) {
                        this.gameManager.move(0);
                        down = false;
                    }
                    else down = true;
        }
        else {
            if (!this.gameManager.move(1))
                if (!this.gameManager.move(2))
                    if (!this.gameManager.move(3)) {
                        this.gameManager.move(0);
                        down = false;
                    }
                    else down = true;
        }
        down = !down;
    }
    
};