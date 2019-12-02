export default class Plane {
  constructor(instance) {
    const gl = instance.gl;
    const { position, index, uv } = this.build(instance.density);

    this.index = gl.createBuffer();
    this.position = gl.createBuffer();
    this.uv = gl.createBuffer();

    this.n = index.length;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.index);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, index, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.position);
    gl.bufferData(gl.ARRAY_BUFFER, position, gl.STATIC_DRAW);

    gl.bindBuffer(gl.ARRAY_BUFFER, this.uv);
    gl.bufferData(gl.ARRAY_BUFFER, uv, gl.STATIC_DRAW);
  }

  // Merci OGL - https://raw.githubusercontent.com/oframe/ogl/master/src/extras/Plane.js
  build(density) {
    const u = 0;
    const v = 1;
    const w = 2;
    const uDir = 1;
    const vDir = -1;
    let i = 0;
    let ii = 0;

    const width = 1;
    const height = 1;
    const depth = 0;

    const widthSegments = density;
    const heightSegments = density;

    const wSegs = widthSegments;
    const hSegs = heightSegments;

    const num = (wSegs + 1) * (hSegs + 1);
    const numIndices = wSegs * hSegs * 6;

    const position = new Float32Array(num * 2);
    // const normal = new Float32Array(num * 3);
    const uv = new Float32Array(num * 2);
    const index =
      num > 65536 ? new Uint32Array(numIndices) : new Uint16Array(numIndices);

    const io = i;
    const segW = width / wSegs;
    const segH = height / hSegs;

    for (let iy = 0; iy <= hSegs; iy++) {
      let y = iy * segH - height / 2;

      for (let ix = 0; ix <= wSegs; ix++, i++) {
        let x = ix * segW - width / 2;

        position[i * 2 + u] = x * uDir;
        position[i * 2 + v] = y * vDir;
        // position[i * 3 + w] = depth / 2;

        // normal[i * 3 + u] = 0;
        // normal[i * 3 + v] = 0;
        // normal[i * 3 + w] = depth >= 0 ? 1 : -1;

        uv[i * 2] = ix / wSegs;
        uv[i * 2 + 1] = 1 - iy / hSegs;

        if (iy === hSegs || ix === wSegs) continue;
        let a = io + ix + iy * (wSegs + 1);
        let b = io + ix + (iy + 1) * (wSegs + 1);
        let c = io + ix + (iy + 1) * (wSegs + 1) + 1;
        let d = io + ix + iy * (wSegs + 1) + 1;

        index[ii * 6] = a;
        index[ii * 6 + 1] = b;
        index[ii * 6 + 2] = d;
        index[ii * 6 + 3] = b;
        index[ii * 6 + 4] = c;
        index[ii * 6 + 5] = d;
        ii++;
      }
    }

    return {
      position,
      uv,
      index,
    };
  }
}
