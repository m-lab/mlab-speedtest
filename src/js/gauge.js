/**
 * Canvas progress gauge for speed test visualization.
 */
const ProgressGauge = {
  canvas: null,
  ctx: null,

  init() {
    this.canvas = document.getElementById('activeProgress');
    this.ctx = this.canvas.getContext('2d');
    this.create();
  },

  setInactive() {
    this.draw(1);
    this.canvas.classList.remove('activeGauge');
    this.canvas.classList.add('inactiveGauge');
  },

  reset() {
    this.draw(0);
    this.canvas.classList.remove('inactiveGauge');
    this.canvas.classList.add('activeGauge');
  },

  draw(percentage) {
    const quarterTurn = Math.PI / 2;
    const endingAngle = (2 * percentage * Math.PI) - quarterTurn;
    const startingAngle = 0 - quarterTurn;

    // Clear canvas
    this.canvas.width = this.canvas.width;
    this.ctx.lineCap = 'square';

    this.ctx.beginPath();
    this.ctx.lineWidth = 20;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.arc(137.5, 137.5, 111, startingAngle, endingAngle);
    this.ctx.stroke();
  },

  create() {
    const quarterTurn = Math.PI / 2;
    const endingAngle = (2 * Math.PI) - quarterTurn;
    const startingAngle = 0 - quarterTurn;

    this.ctx.beginPath();
    this.ctx.lineCap = 'square';
    this.ctx.lineWidth = 20;
    this.ctx.strokeStyle = '#FFFFFF';
    this.ctx.arc(137.5, 137.5, 111, startingAngle, endingAngle);
    this.ctx.stroke();

    this.setInactive();
  },

  progress(value) {
    this.draw(value);
  }
};
