/**
 * ANTIGRAVITY ARCADE // Online Lobby
 * The shared flow around a match: create or join a room, ready up, count down,
 * and rematch. A game only supplies the rules of the match itself.
 *
 * Options:
 *   mount          Element the lobby is added to
 *   classes        The game's own CSS classes, so the lobby looks native to it:
 *                  { overlay, box, title, primaryButton, secondaryButton }
 *   rules          One line shown during the countdown
 *   rematchButton  The results screen's button, and rematchLabel for its text
 *   onGesture()    A player clicked: the moment a browser allows audio to start
 *   onCountdown()  A match was agreed: close any results screen
 *   onStart(seed)  The countdown ended: begin the match from this seed
 *   onRelay(data)  Data arrived from the rival
 *   onStatus(text) Connection news for the match screen; empty when it clears
 *   onResult(won, reason)  The match ended. Reason is 'lost', 'forfeit' or 'away'
 *   onBack()       The player backed out of the lobby
 */

(function () {
  'use strict';

  const COUNTDOWN_SECONDS = 3;
  const ERROR_TEXT = {
    'room-not-found': 'NO ROOM WITH THAT CODE',
    'room-full': 'THAT ROOM IS ALREADY FULL',
    'server-full': 'SERVER FULL // TRY AGAIN SOON',
    unreachable: 'CAN\'T REACH THE GAME SERVER // IS IT RUNNING?'
  };

  class ArcadeLobby {
    constructor(options) {
      this.options = options;
      this.room = null;
      this.matchActive = false;     // From the countdown until a result arrives
      this.awaitingResult = false;  // This player lost and is waiting for the server
      this.rematchOpen = false;     // The results screen is up and its button is ours
      this.countdownTimer = null;
      this.rematchDefaultLabel = options.rematchLabel.textContent;
      this.build();
    }

    build() {
      const { overlay, box, title, primaryButton, secondaryButton } = this.options.classes;

      this.root = document.createElement('div');
      this.root.className = `${overlay} arcade-lobby`;
      this.root.innerHTML = `
        <div class="${box}">
          <div class="lobby-badge">ONLINE MATCH</div>
          <h2 class="${title}">FIND A RIVAL</h2>

          <div class="lobby-step" data-lobby="entry">
            <button class="${primaryButton}" data-lobby="create">CREATE ROOM</button>
            <div class="lobby-caption">OR JOIN WITH A CODE</div>
            <div class="lobby-join-row">
              <input class="lobby-code-input" data-lobby="input" maxlength="4" placeholder="CODE" aria-label="Room code" autocomplete="off" autocapitalize="characters" spellcheck="false">
              <button class="${secondaryButton}" data-lobby="join">JOIN</button>
            </div>
          </div>

          <div class="lobby-step" data-lobby="room" hidden>
            <div class="lobby-caption" data-lobby="code-label">ROOM CODE</div>
            <div class="lobby-code" data-lobby="code">----</div>
            <button class="${primaryButton}" data-lobby="ready" disabled>READY</button>
          </div>

          <p class="lobby-status" data-lobby="status" role="status"></p>
          <button class="${secondaryButton}" data-lobby="back">BACK</button>
        </div>
      `;
      this.options.mount.appendChild(this.root);

      const find = (name) => this.root.querySelector(`[data-lobby="${name}"]`);
      this.entryStep = find('entry');
      this.roomStep = find('room');
      this.codeInput = find('input');
      this.codeLabel = find('code-label');
      this.code = find('code');
      this.status = find('status');
      this.readyButton = find('ready');
      this.backButton = find('back');

      const join = () => {
        const code = this.codeInput.value.trim();
        if (code) this.enter((room) => room.join(code));
      };
      find('create').addEventListener('click', () => this.enter((room) => room.create()));
      find('join').addEventListener('click', join);
      this.codeInput.addEventListener('keydown', (e) => {
        if (e.code === 'Enter') join();
      });
      this.readyButton.addEventListener('click', () => {
        this.options.onGesture();
        this.readyButton.disabled = true;
        this.readyButton.textContent = 'WAITING FOR RIVAL...';
        this.room.ready();
      });
      this.backButton.addEventListener('click', () => {
        this.leave();
        this.options.onBack();
      });
    }

    open() {
      ArcadeRoom.wake();
      this.codeInput.value = '';
      this.status.textContent = '';
      this.backButton.hidden = false;
      this.showStep(this.entryStep);
      this.root.classList.add('active');
    }

    close() {
      this.root.classList.remove('active');
    }

    showStep(step) {
      this.entryStep.hidden = step !== this.entryStep;
      this.roomStep.hidden = step !== this.roomStep;
    }

    enter(connect) {
      if (this.room) return;
      this.options.onGesture();
      this.status.textContent = 'CONNECTING...';
      this.room = new ArcadeRoom((msg) => this.handleEvent(msg));
      connect(this.room);
    }

    handleEvent(msg) {
      switch (msg.t) {
        case 'joined':
          this.codeLabel.textContent = 'ROOM CODE';
          this.code.textContent = msg.code;
          this.showStep(this.roomStep);
          this.setRivalPresent(msg.peer);
          break;
        case 'peer-joined':
          this.setRivalPresent(true);
          this.options.onStatus('');
          this.setRematch('REMATCH', true);
          break;
        case 'peer-ready':
          this.status.textContent = 'RIVAL IS READY';
          this.setRematch('RIVAL WANTS A REMATCH', true);
          break;
        case 'peer-left':
          this.setRivalPresent(false);
          this.options.onStatus('RIVAL LEFT');
          this.setRematch('RIVAL LEFT', false);
          break;
        case 'peer-away':
          this.options.onStatus('RIVAL RECONNECTING');
          break;
        case 'peer-back':
          this.options.onStatus('');
          break;
        case 'start':
          this.beginCountdown(msg.seed);
          break;
        case 'relay':
          this.options.onRelay(msg.d);
          break;
        case 'result':
          this.finish(msg.winner === this.room.slot, msg.reason);
          break;
        case 'waking':
          this.status.textContent = 'WAKING THE GAME SERVER // THIS CAN TAKE A MINUTE';
          break;
        case 'reconnecting':
          this.options.onStatus('YOUR CONNECTION DROPPED // RETRYING');
          break;
        case 'reconnected':
          this.options.onStatus('');
          if (this.awaitingResult) this.room.lost(); // In case the first report was lost with the socket
          break;
        case 'gone':
          this.handleConnectionLost();
          break;
        case 'error':
          this.room.leave();
          this.room = null;
          this.status.textContent = ERROR_TEXT[msg.reason] || 'SOMETHING WENT WRONG';
          break;
      }
    }

    setRivalPresent(present) {
      this.readyButton.hidden = false;
      this.readyButton.disabled = !present;
      this.readyButton.textContent = 'READY';
      this.status.textContent = present
        ? 'RIVAL CONNECTED // PRESS READY'
        : 'SHARE THIS CODE // WAITING FOR A RIVAL';
    }

    beginCountdown(seed) {
      this.matchActive = true;
      this.rematchOpen = false;
      this.options.onCountdown();

      this.showStep(this.roomStep);
      this.readyButton.hidden = true;
      this.backButton.hidden = true;
      this.codeLabel.textContent = 'MATCH STARTS IN';
      this.status.textContent = this.options.rules;
      this.root.classList.add('active');

      let remaining = COUNTDOWN_SECONDS;
      const tick = () => {
        if (remaining === 0) {
          this.close();
          this.options.onStart(seed);
          return;
        }
        this.code.textContent = remaining;
        remaining--;
        this.countdownTimer = setTimeout(tick, 1000);
      };
      tick();
    }

    // Tell the server this player lost. The match ends when it answers
    reportLoss() {
      this.awaitingResult = true;
      this.room.lost();
    }

    finish(won, reason) {
      clearTimeout(this.countdownTimer);
      this.matchActive = false;
      this.awaitingResult = false;
      this.rematchOpen = true;
      this.close();
      this.setRematch('REMATCH', true);
      this.options.onResult(won, reason);
    }

    handleConnectionLost() {
      clearTimeout(this.countdownTimer);
      this.room = null;

      if (this.matchActive) {
        this.finish(false, 'forfeit');
      } else if (this.root.classList.contains('active')) {
        this.open();
        this.status.textContent = 'CONNECTION LOST';
      }
      this.setRematch('CONNECTION LOST', false);
    }

    setRematch(label, enabled) {
      if (!this.rematchOpen) return;
      this.options.rematchLabel.textContent = label;
      this.options.rematchButton.disabled = !enabled;
    }

    requestRematch() {
      if (!this.rematchOpen || !this.room || this.options.rematchButton.disabled) return;
      this.setRematch('WAITING FOR RIVAL...', false);
      this.room.ready();
    }

    // Leaves any room and hands the results screen's button back to the game
    leave() {
      clearTimeout(this.countdownTimer);
      if (this.room) this.room.leave();
      this.room = null;
      this.matchActive = false;
      this.awaitingResult = false;
      this.rematchOpen = false;
      this.options.rematchLabel.textContent = this.rematchDefaultLabel;
      this.options.rematchButton.disabled = false;
      this.close();
    }
  }

  window.ArcadeLobby = ArcadeLobby;
})();
