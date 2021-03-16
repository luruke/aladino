function map(value, start1, stop1, start2, stop2) {
  return ((value - start1) / (stop1 - start1)) * (stop2 - start2) + start2
}

export default class Pointer {
  constructor() {
    this.viewport = [0, 0];
    this.coords = [0, 0];
    // this.normalized = [0, 0];
    this.ndc = [0, 0];

    this.onMove = this.onMove.bind(this);
    this.onResize = this.onResize.bind(this);

    this.onResize();
    this.bind();
  }

  bind() {
    window.addEventListener('mousemove', this.onMove);
    window.addEventListener('resize', this.onResize);
  }

  destroy() {
    window.removeEventListener('mousemove', this.onMove);
    window.removeEventListener('resize', this.onResize);
  }

  onResize() {
    this.viewport[0] = window.innerWidth;
    this.viewport[1] = window.innerHeight;
  }

  onMove(e) {
    this.coords[0] = e.clientX;
    this.coords[1] = e.clientY;

    this.ndc[0] = map(this.coords[0], 0, this.viewport[0], -1, 1);
    this.ndc[1] = map(this.coords[1], 0, this.viewport[1], 1, -1);
  }
}
