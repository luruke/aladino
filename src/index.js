import Material from "./material.js";
import Carpet from "./carpet.js";
import Plane from "./plane.js";
import Texture from "./texture.js";

export default class Aladino {
  constructor({
    canvas = document.createElement("canvas"),
    dpr = Math.min(devicePixelRatio, 2),
    density = 1,
    autoScroll = true,
    post = false,
    attribs = {
      antialias: true,
    },
    autoTick = true,
  } = {}) {
    this.dpr = dpr;
    this.canvas = canvas;
    this.density = density;
    this.autoScroll = autoScroll;
    this.carpets = new Map();
    this.lastProgramUsed = null;
    this.post = post;
    this.autoTick = autoTick;
    this.x = 0;
    this.y = 0;

    if (this.post) {
      // Force antialias false when using postprocessing
      attribs.antialias = false;
    }

    // TODO: context loss
    try {
      this.gl =
        canvas.getContext("webgl", attribs) ||
        canvas.getContext("experimental-webgl", attribs);
      this.vao = this.gl.getExtension("OES_vertex_array_object");
    } catch (e) {
      // throw new Error(e);
      console.error("WebGL or VAO not available");
      return;
    }

    this.anisotropy =
      this.gl.getExtension("EXT_texture_filter_anisotropic") ||
      this.gl.getExtension("MOZ_EXT_texture_filter_anisotropic") ||
      this.gl.getExtension("WEBKIT_EXT_texture_filter_anisotropic");

    this.gl.enable(this.gl.DEPTH_TEST);
    this.gl.clearColor(0, 0, 0, 0);

    this.plane = new Plane(this);
    this.init();
  }

  init() {
    this.resize = this.resize.bind(this);
    this.draw = this.draw.bind(this);

    window.addEventListener("resize", this.resize);

    if (this.autoScroll) {
      this.scroll = this.scroll.bind(this);
      window.addEventListener("scroll", this.scroll);
      this.scroll();
    }

    this.resize();

    if (this.post) {
      this.setupPost();
    }

    if (this.autoTick) {
      this.draw();
    }
  }

  destroy() {
    window.removeEventListener("resize", this.resize);

    this.requestID && cancelAnimationFrame(this.requestID);
  }

  scroll() {
    const doc = document.documentElement;

    this.x = (window.pageXOffset || doc.scrollLeft) - (doc.clientLeft || 0);
    this.y = window.pageYOffset || document.documentElement.scrollTop;
  }

  resize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.aspect = this.width / this.height;

    const gl = this.gl;

    gl.canvas.width = this.width * this.dpr;
    gl.canvas.height = this.height * this.dpr;

    Object.assign(this.gl.canvas.style, {
      position: "fixed",
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      width: `${this.width}px`,
      height: `${this.height}px`,
      pointerEvents: "none",
    });

    this.carpets.forEach((carpet) => carpet.resize());

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);

    if (this.post && this.postTexture) {
      gl.bindTexture(gl.TEXTURE_2D, this.postTexture);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.canvas.width,
        gl.canvas.height,
        0,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        null
      );
    }

    this.reset = true;
  }

  material(args) {
    return new Material(this, args);
  }

  carpet(dom, args) {
    const el = new Carpet(this, dom, args);
    this.carpets.set(dom, el);

    this.reset = true;
    return el;
  }

  texture(url, args) {
    return new Texture(this, url, args);
  }

  setupPost() {
    const gl = this.gl;

    this.postTexture = gl.createTexture();
    this.postFb = gl.createFramebuffer();

    gl.bindTexture(gl.TEXTURE_2D, this.postTexture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.canvas.width,
      gl.canvas.height,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      null
    );
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.postFb);
    gl.framebufferTexture2D(
      gl.FRAMEBUFFER,
      gl.COLOR_ATTACHMENT0,
      gl.TEXTURE_2D,
      this.postTexture,
      0
    );
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    this.postMaterial = this.material({
      vertex: `
        attribute vec2 position;

        void main() {
          gl_Position = vec4(position, 0.0, 1.0);
        }
      `,
      fragment:
        this.post.fragment ||
        `
        precision highp float;

        uniform vec2 viewport;
        uniform sampler2D image;

        void main() {
          vec2 uv = gl_FragCoord.xy / viewport;
          vec4 color = texture2D(image, uv);
          gl_FragColor = color;
        }
      `,
      uniforms: this.post.uniforms || {},
    });

    this.postTriangle = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.postTriangle);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1.0, -1.0, 3.0, -1.0, -1.0, 3.0]),
      gl.STATIC_DRAW
    );

    this.postVao = this.vao.createVertexArrayOES();
    this.vao.bindVertexArrayOES(this.postVao);

    const positionLoc = this.postMaterial.attributeLoc.get("position");
    gl.enableVertexAttribArray(positionLoc);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.postTriangle);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    this.vao.bindVertexArrayOES(null);
  }

  setTextures(material, list) {
    const gl = this.gl;

    let current = 0;
    material.uniformsList.forEach((uniform) => {
      if (uniform.type === 35678) {
        const tex = list[uniform.name];

        if (!tex) {
          return;
        }

        gl.activeTexture(gl.TEXTURE0 + current);
        gl.bindTexture(gl.TEXTURE_2D, tex.texture);
        gl.uniform1i(material.uniformsLoc.get(uniform.name), current);

        const imageName = uniform.name;
        const sizeName =
          "size" + imageName.charAt(0).toUpperCase() + imageName.substring(1);
        material.setUniform(sizeName, [tex.image.width, tex.image.height]);

        current++;
      }
    });
  }

  draw(time = performance.now()) {
    if (this.autoTick) {
      this.requestID = requestAnimationFrame(this.draw);
    }

    const gl = this.gl;
    let currentProgram = undefined;

    const width = gl.canvas.width;
    const height = gl.canvas.height;

    if (this.post) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.postFb);
    }

    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    // TODO sort drawing by material?
    this.carpets.forEach((carpet) => {
      if (!carpet.active) {
        return;
      }

      if (carpet.material.program !== this.lastProgramUsed || this.reset) {
        gl.useProgram(carpet.material.program);
        this.vao.bindVertexArrayOES(carpet.vao);
        this.setTextures(carpet.material, carpet.material.uniforms);

        this.reset = false;
      }

      if (carpet.material.program !== currentProgram) {
        carpet.material.uniforms.time = time;
        carpet.material.uniforms.viewport = [width, height];

        carpet.material.setUniforms(carpet.material.uniforms);
      }

      this.setTextures(carpet.material, carpet.uniforms);
      carpet.material.setUniforms(carpet.uniforms);
      carpet.draw();

      currentProgram = carpet.material.program;
      this.lastProgramUsed = carpet.material.program;
    });

    if (this.post) {
      const material = this.postMaterial;

      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.useProgram(material.program);

      material.uniforms.time = time;
      material.uniforms.viewport = [width, height];
      material.setUniforms(material.uniforms);

      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_2D, this.postTexture);
      gl.uniform1i(material.uniformsLoc.get("image"), 0);

      this.vao.bindVertexArrayOES(this.postVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      this.reset = true;
    }
  }
}
