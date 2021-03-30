⚠️⚠️ BETA! ⚠️⚠️
(Most likely I won't maintain this...)

# 🧞‍♂️ Aladino – your magic WebGL carpet

Aladino is a tiny (around ~5kb gzipped) and dependency-free javascript library that allows to enhance your site using "shader effects".  
The library is using WebGL1 and has progressive enhancement and accessibility in mind.

Because examples are worth thousand of words: [https://luruke.github.io/aladino/](https://luruke.github.io/aladino/)

It was developed during some R&D time at [EPIC Agency](https://epic.net), back in 2019, and it's currently used on:

- [https://days.epic.net](https://days.epic.net)
- [https://luruke.com](https://luruke.com)

<p float="left">
  <a href="https://luruke.github.io/aladino/#slider.html"><img src="docs/assets/demo/1.gif" width="250" /></a>
  <a href="https://luruke.github.io/aladino/#scroll.html"><img src="docs/assets/demo/2.gif" width="250" /></a>
  <a href="https://luruke.github.io/aladino/#basic.html"><img src="docs/assets/demo/3.gif" width="250" /></a>
</p>

## 🤷‍ Even why?

CSS is cool and powerful, you can build complex responsive layouts and more. Unfortunately the creative interactions you can achieve are very limited (only basic transforms, basic set of CSS filters).

Following the footsteps of an old and depracated CSS spec [(Custom filters aka CSS Shaders)](https://developers.google.com/web/updates/2013/03/Introduction-to-Custom-Filters-aka-CSS-Shaders) this library allow to "augment" your DOM elements.

## 🔎 How it even works?

Aladino operates on a full-screen canvas as `position: fixed`. You'll likely want this canvas to be as background or foreground of your site.
When any `Element` is added to aladino, the original DOM element will be hidden (via `opacity: 0`), and a WebGL plane with the exact same size and position will be created in the canvas.

At resize and page scroll, aladino will make sure the WebGL plane matches the position and size of your DOM element.

Instead of using an orthographic camera, a perspective one is used, so you can make fancy perspective effects easily.

## 📏 Tailor-made rendering

The library itself is tiny and doesn't support many of the WebGL capabilities (stencil, cube maps, array uniforms...). The rendering approach is very tailored for this specific use case.

If you need to render 3D objects and do more complex things, you might want to use libraries like pixi, ogl or three.js and build the dom->gl layer yourself.

Some features:

- Reduce WebGL state change to the strict minimum (try to, without getting too complex, it can be greatly improved).
- Use VAO (via `OES_vertex_array_object`).
- Use a single geometry (a plane) for all the draw calls.
- Automatically cache textures via the URL.
- Uses [ResizeObserver](https://developer.mozilla.org/en-US/docs/Web/API/ResizeObserver) where available to track Element size.
- Postprocessing using a [big-triangle technique](https://michaldrobot.com/2014/04/01/gcn-execution-patterns-in-full-screen-passes/).

## 🌎 Browser support

The library should work on [every browser supporting WebGL](https://caniuse.com/#feat=webgl), eventually you might want to add a [polyfill for OES_vertex_array_object](https://github.com/greggman/oes-vertex-array-object-polyfill).  
For older browsers, you might need to transpile the code in order to support ES features like `class, Map, destructuring`.

## 📝 How to use it

The library has three main concepts:

- **Aladino**, the main instance, you'll generally have only one in your app.
- **Carpet**, the representation of your DOM element on the canvas (a plane mesh).
- **Material**, the WebGL program (vertex + fragment shader) that will be used by your carpets.

A very basic example:

```javascript
import Aladino from "aladino";

const aladino = new Aladino();
document.body.appendChild(aladino.canvas);

aladino.carpet(document.querySelector(".element"), {
  material: aladino.material({
    vertex: `
      attribute vec2 position;
      attribute vec2 uv;

      uniform mat4 projection;
      uniform float time;

      void main() {
        vec4 p = vec4(position, 0.0, 1.0);
        p.z += sin(uv.x * 3.0 + time * 0.003);

        gl_Position = projection * p;
      }
    `,
    fragment: `
      precision highp float;

      void main() {
        gl_FragColor = vec4(0.0, 1.0, 0.0, 1.0);
      }
    `,
  }),
});
```

Running this piece of code, will create a green animating box, that replace your `.element`.

## 🐝 API

Arguments with the default values and methods.

---

### Aladino

```javascript
const aladino = new Aladino({
  // HTMLCanvasElement – The canvas to use
  canvas: document.createElement("canvas"),

  // Number – Pixel ratio to use (example for retina displays)
  dpr: Math.min(devicePixelRatio, 2),

  // Number – Define horizontal and vertical mesh density of the plane
  density: 1,

  // Boolean – Whether need to track the page scroll (`scroll` on `window`)
  autoScroll: true,

  // WebGLContextAttributes – An object for WebGL context attributes
  attribs: { antialias: true },

  // Object { fragment: String, uniforms: Object } - Enable postprocessing using a big-triangle
  post: false,
});

// WebGLRenderingContext - The WebGL context used by aladino
aladino.gl;

// Number – Read/set the horizontal scrolling in px
aladino.x;

// Number – Read/set the vertical scrolling in px
aladino.y;

// Map - All carpets instances
aladino.carpets;

// Carpet - Get the carpet instance of a specific Element
aladino.carpets.get(document.querySelector(".element"));

// Force the resize
aladino.resize();

// Destroy the instance
aladino.destroy();
```

---

### Material

```javascript
const material = aladino.material({
  // String – Vertex shader
  vertex: `
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

  // String – Fragment shader
  fragment: `
    precision highp float;

    void main() {
      gl_FragColor = vec4(1.0, 0.0, 0.0, 1.0);
    }
  `,

  // Object - Uniforms shared across all the carpets using this material
  uniforms: {},
  /*
    {
      enable: false,         // uniform bool enable;
      speed: 0.4,            // uniform float speed;
      scale: [1, 1.2],       // uniform vec2 scale;
      color: [1, 0, 0],      // uniform vec3 color;
      color2: [1, 0, 0, 1],  // uniform vec4 color2;
      tex: aladino.texture() // uniform sampler2D tex;
    }
  */
});
```

Default attributes / uniforms:

```glsl
attribute vec2 position;
attribute vec2 uv;

uniform mat4 projection;
uniform vec2 size; // Size in px of your carpet
uniform vec2 viewport;
uniform float time; // current time

// When using a `sampler2D` texture, it will automatically send the size in px of the texture
uniform vec2 size$SAMPLER_UNIFORM_NAME;
```

---

### Carpet

```javascript
const carpet = aladino.carpet(Element, {
  // Aladino Material – The material to use for this carpet
  material,

  // Boolean – Use gl.LINES
  wireframe: false,

  // Array[Number, Number] – Offset in px [x, y]
  position: [0, 0],

  // Array[Number, Number] – Scale multiplier [width, height]
  scale: [1, 1],

  // Number - order of depth of the carpet in the scene
  order: 10,

  // Uniforms – Uniforms specific to this carpet
  uniforms: {},
});

// Force the resize of the carpet
// Note, aladino uses `ResizeObserver` API, so already tracks some element changes
carpet.resize();

// Destroy the carpet
carpet.destroy();

// Boolean – Indicate if the carpet is active, so if needs to be drawn an updated
carpet.active;
```

After creating a carpet, the DOM Element will be set as `opacity: 0` and a CSS class `aladino` will be added.

---

### Texture

```javascript
// String – URL of the texture
const texture = aladino.texture(url, {
  // Boolean - Apply anisotropy texture filtering via `EXT_texture_filter_anisotropic`
  anisotropy: false,
});

// Promise<Texture>
texture.loading;
```

Texture instances can be passed as regular uniforms.

---

## 🏎 Tips 4 Performance

If you encour in performance issues:

- Try to lower dpr.
- Try to lower geometry density.
- Try to disable antialias. (Expecially on retina displays, you might want to look into use `GL_OES_standard_derivatives` instead)
- Try to share the same Material as much as possible on your carpets.
- When possible, share uniforms per program then per single carpet.
- Prefer vertex calculation then per pixel, exploiting the linear interpolation given by varyings variables.

Usually the biggest "price to pay" for this technique is the compositing phase between the canvas and the DOM due how browsers works internally.

## 🤔 Things to consider for Dev / Design

- The library automatically tracks your scroll and keep in sync the WebGL, but in case of frame dropping during scroll, you will notice the DOM to be "smoother", that's because the browser prioritise it's own rendering instead of Javascript tasks - consider to use a "virtual scrolling" if needed.

- If you're using a custom font, makes sure to "resize" aladino after the font is loaded (as it might cause a layout shifting).

- The library tracks the position of your DOM elements at page load and resize and with `ResizeObserver` API if available. If you change the position of your item, you'll have to remember to use `.resize()` method.

## 🔨 TODO

- Support video texture?
- Add a method to verify WebGL support?
- Test canvas position fixed vs `transform: translate()`?
- Culling?
- Blending modes?
- Support text?
- Create components for react / vue.js?
- See if magicshader can be implemented easily?
