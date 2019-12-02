const deferred = () => {
  let _resolve = undefined;
  let _reject = undefined;
  const promise = new Promise((resolve, reject) => {
    _resolve = resolve;
    _reject = reject;
  });

  promise.resolve = _resolve;
  promise.reject = _reject;

  return promise;
};

const cache = new Map();

export default class Texture {
  constructor(instance, url, { anisotropy = false } = {}) {
    if (cache.get(url)) {
      return cache.get(url);
    }

    cache.set(url, this);

    this.instance = instance;
    this.gl = this.instance.gl;
    this.url = url;
    this.anisotropy = anisotropy;
    this.loading = deferred();

    const gl = this.gl;

    this.texture = gl.createTexture();
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      1,
      1,
      0,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      new Uint8Array(4)
    );

    this.load();
  }

  load() {
    this.image = new Image();
    this.image.crossOrigin = "anonymous";
    this.image.onload = this.onLoad.bind(this);
    this.image.src = this.url;
  }

  onLoad() {
    const gl = this.gl;

    //TODO: make it power of two?
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

    if (this.anisotropy && this.instance.anisotropy) {
      const ext = this.instance.anisotropy;
      const max = gl.getParameter(ext.MAX_TEXTURE_MAX_ANISOTROPY_EXT);
      gl.texParameterf(gl.TEXTURE_2D, ext.TEXTURE_MAX_ANISOTROPY_EXT, max);
    }

    gl.texImage2D(
      gl.TEXTURE_2D,
      0,
      gl.RGBA,
      gl.RGBA,
      gl.UNSIGNED_BYTE,
      this.image
    );

    this.loading.resolve(this);
  }
}
