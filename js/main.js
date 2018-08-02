'use strict';

class Piece {

    constructor(x, y, r, reporter) {

        this.state_ = false;
        this.isAnimating_ = false;
        this.r_ = r;

        this.shape_ = new createjs.Shape();
        this.shape_.graphics.beginFill("#FF0000").drawCircle(0, 0, r);
        this.shape_.scaleX = 1;
        this.shape_.scaleY = 1;
        this.shape_.x = x;
        this.shape_.y = y;
        this.shape_.alpha = 0;

        this.neighbors_ = [];
        this.neighbor_indexes_ = [];

        this.shape_.addEventListener('click', () => {
            if (this.doClick()) {
                reporter.onPlayerMove();
            }
        });

        this.shape_.addEventListener('touchstart', () => {
            if (this.doClick()) {
                reporter.onPlayerMove();
            }
        });
    }

    doClick(animate = true) {
        const canClick = !this.isAnimating && !this.neighbors_.some(n => n.isAnimating_);
        if (canClick) {
            this.toggle(animate);
            this.neighbors_.forEach(n => {
                n.toggle(animate);
            });
        }
        return canClick;
    }

    disableInput() {
        this.shape_.removeAllEventListeners('click');
        this.shape_.removeAllEventListeners('touchstart');
    }

    toggle(animate = true) {

        var scale_target = 0.5;
        var duration = 500;
        var ease = createjs.Ease.bounceOut;

        if (!animate) {
            this.shape_.scaleX = this.state_ ? 1 : scale_target;
            this.shape_.scaleY = this.state_ ? 1 : scale_target;
            this.state_ = !this.state_;
            this.shape_.graphics.clear().beginFill(this.state_ ? "#000000" : "#FF0000").drawCircle(0, 0, this.r_);
            return;
        }

        this.shape_.graphics.clear().beginFill(this.state_ ? "#FF0000" : "#000000").drawCircle(0, 0, this.r_);

        if (this.state_) {
            createjs.Tween.get(this.shape_, { loop: false })
                .to({ scaleX: 1, scaleY: 1 }, duration, ease)
                .call(() => this.isAnimating_ = false);
        } else {
            createjs.Tween.get(this.shape_, { loop: false })
                .to({ scaleX: scale_target, scaleY: scale_target }, duration, ease)
                .call(() => this.isAnimating_ = false);
        }

        this.isAnimating_ = true;
        this.state_ = !this.state_;
    }

    animateInwards(index) {

        const base_x = this.shape_.x
            , base_y = this.shape_.y
            , xs = (Math.random() * 500) + 500
            , ys = (Math.random() * 500) + 500
            , offset_x = (Math.random() > 0.5) ? -xs : xs
            , offset_y = (Math.random() > 0.5) ? -ys : ys
            , wait_time = index * 10;

        createjs.Tween.get(this.shape_, { loop: false })
            .call(() => this.isAnimating_ = true)
            .to({ x: base_x + offset_x, y: base_y + offset_y }, 0, createjs.Ease.linear)
            .wait(wait_time)
            .call(() => this.shape_.alpha = 1)
            .to({ x: base_x, y: base_y }, 500, createjs.Ease.sineOut)
            .call(() => this.isAnimating_ = false);

    }

}

const GameState = {
    Start: 0,
    Playing: 1,
    Rackup: 2,
    Rackin: 3,
}

class Game {

    constructor() {
        this.canvas_ = null;
        this.stage_ = null;
        this.start_text_ = null;
        this.background_ = null;
        this.pieces_ = [];
        this.level_state_ = [];
        this.board_size_ = 3;
        this.required_moves_ = 2;
        this.player_moves_ = 0;

        this.game_state_ = GameState.Start;

        this.menu_button_ = document.getElementById('menu_button');
        this.back_button_ = document.getElementById('back_button');
        this.reset_button_ = document.getElementById('reset_button');
        this.info_button_ = document.getElementById('info_button');
        this.start_button_ = document.getElementById('start_button');
        this.start_button_group_ = document.getElementById('start_button_group');
    }

    serializeState() {
        return this.pieces_.map(p => p.state_);
    }

    deserializeState(state) {
        state.forEach((s, i) => {
            if (s) {
                this.pieces_[i].toggle(false);
            }
        });
    }

    updateInfo() {
        const text = `LEVEL: ${this.required_moves_}&nbsp;&nbsp;-&nbsp;&nbsp;MOVES: ${this.player_moves_}`;
        this.info_button_.innerHTML = text;
    }

    resetStage() {
        let width, height;
        try {
            width = Windows.UI.ViewManagement.ApplicationView.getForCurrentView().visibleBounds.width;
            height = Windows.UI.ViewManagement.ApplicationView.getForCurrentView().visibleBounds.height;
        } catch (e) {
            width = window.innerWidth;
            height = window.innerHeight;
        }

        this.canvas_.width = width;
        this.canvas_.height = height;

        this.stage_.removeAllChildren();
        this.stage_.setBounds(0, 0, width, height);

        this.background_ = new createjs.Shape();
        this.background_.graphics.beginLinearGradientFill(['#C9C9C9', '#FFFFFF'], [0, 1], 0, 0, 0, height);
        this.background_.graphics.drawRect(0, 0, width, height);
        this.background_.x = 0;
        this.background_.y = 0;
        this.background_.alpha = 0;

        this.stage_.addChild(this.background_);
    }

    resetGame() {

        this.resetStage();

        const width = this.canvas_.width;
        const height = this.canvas_.height;

        this.pieces_ = [];

        const get_index = (x, y) => {
            return (y * this.board_size_) + x;
        }

        this.player_moves_ = 0;

        const minSpan = Math.min(width, height);
        const maxSpan = Math.max(width, height);
        const x_offset = maxSpan > width ? (maxSpan - width) / 2 : 0;
        const y_offset = maxSpan > height ? (maxSpan - height) / 2 : 0;
        const size = minSpan / (this.board_size_ + 1);

        for (var y = 0; y < this.board_size_; ++y) {
            for (var x = 0; x < this.board_size_; ++x) {

                const xpos = size + (size * x) + y_offset;
                const ypos = size + (size * y) + x_offset;

                const piece = new Piece(xpos, ypos, (size / 2) * 0.9, this);

                // determine the neighbor indexes
                const neighbors = [];
                if (x - 1 >= 0) neighbors.push(get_index(x - 1, y));
                if (x + 1 <= (this.board_size_ - 1)) neighbors.push(get_index(x + 1, y));
                if (y - 1 >= 0) neighbors.push(get_index(x, y - 1));
                if (y + 1 <= (this.board_size_ - 1)) neighbors.push(get_index(x, y + 1));
                piece.neighbor_indexes_ = neighbors;

                this.stage_.addChild(piece.shape_);
                this.pieces_.push(piece);
            }
        }

        this.pieces_.forEach(piece => {
            piece.neighbors_ = piece.neighbor_indexes_.map(i => this.pieces_[i]);
        });
    }

    onPlayerMove() {
        this.player_moves_ += 1;
        this.updateInfo();
    }

    shufflePieces() {

        var num_moves = this.required_moves_;

        this.level_state_ = [];

        var i = Math.floor(Math.random() * this.pieces_.length);
        do {
            this.level_state_.push(i);
            const s = new Set(this.level_state_.slice(-3));
            while (s.has(i)) {
                i = this.pieces_[i].neighbor_indexes_[Math.floor(Math.random() * this.pieces_[i].neighbor_indexes_.length)];
            }
        } while (--num_moves);

        if (this.pieces_.length) {
            this.level_state_.forEach(i => {
                this.pieces_[i].doClick(false);
            });
        }
    }

    animatePiecesInwards() {
        this.pieces_.forEach((piece, index) => {
            piece.animateInwards(index);
        });
    }

    forceShowPieces() {
        this.pieces_.forEach(p => p.shape_.alpha = 1);
    }

    createStartScreen() {
        this.resetStage();
        this.createLogo();
    }

    createLogo() {
        const info = JSON.parse(lginfo);
        const radius = this.canvas_.width / 150;
        const x_offset = (this.canvas_.width / 2) - (info.width * (radius / 2));
        const y_offset = (this.canvas_.height / 3) - (info.height * (radius / 2));

        info.points.forEach(p => {
            const shape = new createjs.Shape();
            shape.graphics.beginFill('#000').drawCircle(0, 0, radius * p.scale);
            shape.setTransform(x_offset + (p.x * radius), y_offset + (p.y * radius));
            const wait_ms = ((p.x * 50) + (p.y * 50)) / 1;

            createjs.Tween.get(shape)
                .wait(wait_ms).play(
                    createjs.Tween.get(shape, { paused: true, loop: true })
                        .to({ scaleX: 0.2, scaleY: 0.2 }, 500, createjs.Ease.sineIn)
                        .to({ scaleX: 1, scaleY: 1 }, 500, createjs.Ease.sineOut)
            );

            this.stage_.addChild(shape);
        });
    }

    createLogoGenerate() {

        const text = new createjs.Text('circles', '40px Arial', '#000000');
        const metrics = text.getMetrics();
        const radius = this.canvas_.width / 150;

        const offsets = [
            [0, -1], [0, 1], [-1, 0], [1, 0]
        ];

        const x_offset = (this.canvas_.width / 2) - (metrics.width * (radius / 2));
        const y_offset = (this.canvas_.height / 3) - (metrics.height * (radius / 2));

        const info = {
            width: metrics.width,
            height: metrics.height,
            points: []
        }

        for (var y = 0; y < metrics.height; y += 2) {
            for (var x = 0; x < metrics.width; x += 2) {

                var total = 0;
                offsets.forEach(offset => {
                    total += text.hitTest(x + offset[0], y + offset[1]);
                });
                const scale = total / 4;

                if (scale > 0) {

                    info.points.push({x, y, scale});

                    const shape = new createjs.Shape();
                    shape.graphics.beginFill('#000').drawCircle(0, 0, radius * scale);
                    shape.setTransform(x_offset + (x * radius), y_offset + (y * radius));
                    const wait_ms = ((x * 50) + (y * 50)) / 1;

                    createjs.Tween.get(shape)
                        .wait(wait_ms).play(
                        createjs.Tween.get(shape, { paused: true, loop: true })
                            .to({ scaleX: 0.2, scaleY: 0.2 }, 500, createjs.Ease.sineIn)
                            .to({ scaleX: 1, scaleY: 1 }, 500, createjs.Ease.sineOut)
                    );

                    this.stage_.addChild(shape);
                }
            }
        }

        //console.log(JSON.stringify(info));
    }

    createRackupScreen() {

        const span = Math.max(this.canvas_.width, this.canvas_.height) / 2;

        let circle = new createjs.Shape();
        circle.graphics.beginFill("#FF0000").drawCircle(0, 0, span);
        circle.scaleX = 0;
        circle.scaleY = 0;
        circle.x = this.canvas_.width / 2;
        circle.y = this.canvas_.height / 2;

        const scale_target = 1.5;
        const duration = 1000;

        this.stage_.addChildAt(circle, 1);

        createjs.Tween.get(circle, { loop: false })
            .to({ scaleX: scale_target, scaleY: scale_target }, duration, createjs.Ease.linear)
            .call(() => this.pieces_.forEach(p => this.stage_.removeChild(p.shape_)))
            .to({ scaleX: 0, scaleY: 0 }, duration, createjs.Ease.linear)
            .call(() => this.startGame());

        this.menu_button_.setAttribute('style', 'display: none');
        this.info_button_.setAttribute('style', 'display: none');
    }

    startGame() {
        this.game_state_ = GameState.Playing;
        this.resetGame();
        this.shufflePieces();
        this.animatePiecesInwards();
        this.menu_button_.setAttribute('style', 'display: block');
        this.info_button_.setAttribute('style', 'display: block');
        this.start_button_group_.setAttribute('style', 'display: none');
        this.updateInfo();
    }

    resetLevel() {
        this.resetGame();
        if (this.pieces_.length) {
            this.level_state_.forEach(i => {
                this.pieces_[i].doClick(false);
            });
        }
        this.animatePiecesInwards();
    }

    enterStartState() {
        this.game_state_ = GameState.Start;
        this.board_size_ = 3;
        this.createStartScreen();
        this.menu_button_.setAttribute('style', 'display: none');
        this.info_button_.setAttribute('style', 'display: none');
        this.start_button_group_.setAttribute('style', '');
    }

    init() {

        this.canvas_ = document.getElementById('mainCanvas');
        this.stage_ = new createjs.Stage('mainCanvas');
        this.stage_.enableMouseOver(10);
        this.board_size_ = 3;
        this.player_moves_ = 0;

        createjs.Ticker.interval = 16;
        createjs.Ticker.addEventListener('tick', event => {
            this.tick(event);
        });

        document.onkeydown = event => {
            if (event.key === 'q') {
                this.enterStartState();
            }
            if (event.key === 'r') {
                this.startGame();
            }
            if (event.key === 'u') {
                this.adjustDifficulty(1);
                this.startGame();
            }
            if (event.key === 'd') {
                this.adjustDifficulty(-1);
                this.startGame();
            }
            if (event.key === 'e') {
                this.game_state_ = GameState.Rackup;
                this.createRackupScreen();
            }
            if (event.key === 'i') {
                this.game_state_ = GameState.Rackin;
                this.createRackinScreen();
            }
        }

        window.addEventListener('resize', () => {
            if (this.game_state_ === GameState.Playing) {
                const state = this.serializeState();
                this.resetGame();
                this.deserializeState(state);
                this.forceShowPieces();
            } else if (this.game_state_ === GameState.Start) {
                this.createStartScreen();
            }
        });

        this.back_button_.onclick = e => {
            this.enterStartState();
        }

        this.start_button_.onclick = e => {
            const offset = parseInt(e.target.getAttribute('data-level-offset'));
            this.required_moves_ = offset;
            this.adjustDifficulty(0);
            this.startGame();
        }

        this.reset_button_.onclick = e => {
            this.resetLevel();
        }

        const option_buttons = document.getElementsByClassName('start-option');
        for (let i = 0; i < option_buttons.length; i++) {
            const button = option_buttons[i];
            button.onclick = e => {
                const attr = 'data-level-offset';
                this.start_button_.setAttribute(attr, e.target.getAttribute(attr));
                this.start_button_.innerHTML = 'START GAME - ' + e.target.innerHTML.toUpperCase();
            }
        }

        this.enterStartState();
    }

    tick(event) {

        // check to see if the player has completed the puzzle
        if (this.game_state_ === GameState.Playing) {
            // the puzzle is solved if no pieces are moving or toggled
            if (!this.pieces_.some(p => p.isAnimating_ || p.state_)) {
                this.pieces_.forEach(p => p.disableInput());
                this.game_state_ = GameState.Rackup;
                this.adjustDifficulty(1);
                this.createRackupScreen();
            }
        }

        this.stage_.update(event);
    }

    adjustDifficulty(inc) {
        this.required_moves_ += inc;
        this.board_size_ = 3 + Math.floor(this.required_moves_ / 4);
    }

}

const game = new Game();
game.init();