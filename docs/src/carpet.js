import { Mat4 } from "./mat4.js";

export default class Carpet {
  constructor(
    instance,
    dom,
    {
      material,
      wireframe = false,
      uniforms = {},
      position = [0, 0],
      scale = [1, 1],
      order = 10,
    } = {}
  ) {
    if (!material) {
      return console.error("Missing material");
    }

    this.instance = instance;
    this.plane = this.instance.plane;
    this.dom = dom;
    this.material = material;
    this.wireframe = wireframe;
    this.uniforms = uniforms;
    this.position = position;
    this.scale = scale;
    this.order = order;

    this.active = true;

    this.vao = this.instance.vao.createVertexArrayOES();
    this.setupVao();
    this.resize();

    this.dom.classList.add("aladino");
    this.dom.style.opacity = "0";

    if (typeof ResizeObserver !== "undefined") {
      this.observer = new ResizeObserver(() => this.resize());
      this.observer.observe(this.dom);
    }
  }

  destroy() {
    this.active = false;
  }

  resize() {
    if (!this.active) {
      return;
    }

    if (!this.dom) {
      this.destroy();
      return;
    }

    const bounding = this.dom.getBoundingClientRect();

    this.bounds = {
      top: bounding.top + this.instance.y,
      left: bounding.left + this.instance.x,
      width: bounding.width,
      height: bounding.height,
    };

    this.uniforms.size = [this.bounds.width, this.bounds.height];

    this.updateProjection();
  }

  updateProjection() {
    this.projection = new Mat4();

    const aspect = this.instance.aspect;

    const fov = 45 * (Math.PI / 180);
    const distance = this.order;

    const camHeight = 2 * Math.tan(fov / 2) * distance;
    const camWidth = camHeight * aspect;

    const scaleX = (this.bounds.width / this.instance.width) * camWidth;
    const scaleY = (this.bounds.height / this.instance.height) * camHeight;

    this.projection.fromPerspective({
      fov,
      aspect,
      near: 0.01,
      far: 100,
    });

    this.projection.translate([0, 0, -distance, 0]);

    this.projection.translate([
      -(camWidth / 2) + scaleX / 2,
      camHeight / 2 - scaleY / 2,
      0,
      0,
    ]);

    // TODO: Cache part of the projection and update only at resize
    const offsetX = this.instance.x - this.position[0];
    const offsetY = this.instance.y - this.position[1];

    this.projection.translate([
      ((this.bounds.left - offsetX) / this.instance.width) * camWidth,
      -((this.bounds.top - offsetY) / this.instance.height) * camHeight,
      0,
      0,
    ]);

    this.projection.scale([
      scaleX * this.scale[0],
      scaleY * this.scale[1],
      1,
      1,
    ]);
  }

  setupVao() {
    // TODO: Move on the material?
    const gl = this.instance.gl;
    this.instance.vao.bindVertexArrayOES(this.vao);

    const positionLoc = this.material.attributeLoc.get("position");

    if (typeof positionLoc !== "undefined") {
      gl.enableVertexAttribArray(positionLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.plane.position);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
    }

    const uvLoc = this.material.attributeLoc.get("uv");

    if (typeof uvLoc !== "undefined") {
      gl.enableVertexAttribArray(uvLoc);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.plane.uv);
      gl.vertexAttribPointer(uvLoc, 2, gl.FLOAT, false, 0, 0);
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.plane.index);

    this.instance.vao.bindVertexArrayOES(null);
  }

  draw() {
    const gl = this.instance.gl;

    this.updateProjection();

    gl.uniformMatrix4fv(
      this.material.uniformsLoc.get("projection"),
      false,
      this.projection
    );
    gl.drawElements(
      this.wireframe ? gl.LINES : gl.TRIANGLES,
      this.plane.n,
      gl.UNSIGNED_SHORT,
      0
    );
  }
}
