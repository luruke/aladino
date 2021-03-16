export default class Material {
  constructor(
    instance,
    {
      vertex = `
      attribute vec2 position;
      attribute vec2 uv;

      uniform mat4 projection;
      uniform vec2 size;
      uniform float time;

      void main() {
        vec4 p = vec4(position, 0.0, 1.0);
        gl_Position = projection * p;
      }
    `,
      fragment = `
      precision highp float;

      void main() {
        gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
      }
    `,
      uniforms = {},
    } = {}
  ) {
    this.uniforms = uniforms;
    this.instance = instance;
    this.gl = this.instance.gl;
    this.program = this.createProgram(this.gl, vertex, fragment);
    this.parse();
  }

  setUniforms(uniforms) {
    this.texUnit = -1;
    for (const key in uniforms) {
      this.setUniform(key, uniforms[key]);
    }
  }

  parse(gl = this.gl) {
    this.uniformsList = new Map();
    this.attributesList = new Map();

    this.uniformsLoc = new Map();
    this.attributeLoc = new Map();

    for (
      let i = 0;
      i < gl.getProgramParameter(this.program, gl.ACTIVE_UNIFORMS);
      i++
    ) {
      let uniform = gl.getActiveUniform(this.program, i);
      this.uniformsList.set(uniform.name, uniform);
      this.uniformsLoc.set(
        uniform.name,
        gl.getUniformLocation(this.program, uniform.name)
      );
    }

    for (
      let i = 0;
      i < gl.getProgramParameter(this.program, gl.ACTIVE_ATTRIBUTES);
      i++
    ) {
      let attrib = gl.getActiveAttrib(this.program, i);
      this.attributesList.set(attrib.name, attrib);
      this.attributeLoc.set(
        attrib.name,
        gl.getAttribLocation(this.program, attrib.name)
      );
    }
  }

  setUniform(name, value) {
    const uniform = this.uniformsList.get(name);

    if (!uniform) {
      return;
    }

    const gl = this.gl;
    const type = uniform.type;
    const location = this.uniformsLoc.get(name);

    if (type === 35678) {
      return;
    }

    // Merci OGL - https://github.com/oframe/ogl/blob/master/src/core/Program.js
    switch (type) {
      case 5126:
        return value.length
          ? gl.uniform1fv(location, value)
          : gl.uniform1f(location, value); // FLOAT
      case 35664:
        return gl.uniform2fv(location, value); // FLOAT_VEC2
      case 35665:
        return gl.uniform3fv(location, value); // FLOAT_VEC3
      case 35666:
        return gl.uniform4fv(location, value); // FLOAT_VEC4
      case 35670: // BOOL
      case 5124: // INT
      case 35678: // SAMPLER_2D
      case 35680:
        return value.length
          ? gl.uniform1iv(location, value)
          : gl.uniform1i(location, value); // SAMPLER_CUBE
      case 35671: // BOOL_VEC2
      case 35667:
        return gl.uniform2iv(location, value); // INT_VEC2
      case 35672: // BOOL_VEC3
      case 35668:
        return gl.uniform3iv(location, value); // INT_VEC3
      case 35673: // BOOL_VEC4
      case 35669:
        return gl.uniform4iv(location, value); // INT_VEC4
      case 35674:
        return gl.uniformMatrix2fv(location, false, value); // FLOAT_MAT2
      case 35675:
        return gl.uniformMatrix3fv(location, false, value); // FLOAT_MAT3
      case 35676:
        return gl.uniformMatrix4fv(location, false, value); // FLOAT_MAT4
    }
  }

  createShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      return shader;
    }

    console.error(gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
  }

  createProgram(gl, vertex, fragment) {
    const v = this.createShader(gl, gl.VERTEX_SHADER, vertex);
    const f = this.createShader(gl, gl.FRAGMENT_SHADER, fragment);
    const program = gl.createProgram();

    gl.attachShader(program, v);
    gl.attachShader(program, f);
    gl.linkProgram(program);

    gl.deleteShader(v);
    gl.deleteShader(f);

    if (gl.getProgramParameter(program, gl.LINK_STATUS)) {
      return program;
    }

    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
  }
}
