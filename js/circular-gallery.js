/* =========================================================
   SWAN TURBINES FOUNDATION - 3D WEBGL CIRCULAR GALLERY
   Exact ReactBits CircularGallery Engine (OGL Core Embedded)
========================================================= */

(function () {
  'use strict';

  // --- Embedded Minimal OGL Core (Renderer, Camera, Transform, Plane, Mesh, Program, Texture) ---
  
  // Matrix 4 math helpers
  const Mat4 = {
    create() {
      return new Float32Array([
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ]);
    },
    identity(out) {
      out[0] = 1; out[1] = 0; out[2] = 0; out[3] = 0;
      out[4] = 0; out[5] = 1; out[6] = 0; out[7] = 0;
      out[8] = 0; out[9] = 0; out[10] = 1; out[11] = 0;
      out[12] = 0; out[13] = 0; out[14] = 0; out[15] = 1;
      return out;
    },
    perspective(out, fovy, aspect, near, far) {
      const f = 1.0 / Math.tan(fovy / 2);
      const nf = 1 / (near - far);
      out[0] = f / aspect; out[1] = 0; out[2] = 0; out[3] = 0;
      out[4] = 0; out[5] = f; out[6] = 0; out[7] = 0;
      out[8] = 0; out[9] = 0; out[10] = (far + near) * nf; out[11] = -1;
      out[12] = 0; out[13] = 0; out[14] = (2 * far * near) * nf; out[15] = 0;
      return out;
    },
    multiply(out, a, b) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      let b0 = b[0], b1 = b[1], b2 = b[2], b3 = b[3];
      out[0] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[1] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[2] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[3] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[4]; b1 = b[5]; b2 = b[6]; b3 = b[7];
      out[4] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[5] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[6] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[7] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[8]; b1 = b[9]; b2 = b[10]; b3 = b[11];
      out[8] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[9] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[10] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[11] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      b0 = b[12]; b1 = b[13]; b2 = b[14]; b3 = b[15];
      out[12] = b0 * a00 + b1 * a10 + b2 * a20 + b3 * a30;
      out[13] = b0 * a01 + b1 * a11 + b2 * a21 + b3 * a31;
      out[14] = b0 * a02 + b1 * a12 + b2 * a22 + b3 * a32;
      out[15] = b0 * a03 + b1 * a13 + b2 * a23 + b3 * a33;
      return out;
    },
    fromRotationTranslationScale(out, q, v, s) {
      const x = q[0], y = q[1], z = q[2], w = q[3];
      const x2 = x + x, y2 = y + y, z2 = z + z;
      const xx = x * x2, xy = x * y2, xz = x * z2;
      const yy = y * y2, yz = y * z2, zz = z * z2;
      const wx = w * x2, wy = w * y2, wz = w * z2;
      const sx = s[0], sy = s[1], sz = s[2];
      out[0] = (1 - (yy + zz)) * sx;
      out[1] = (xy + wz) * sx;
      out[2] = (xz - wy) * sx;
      out[3] = 0;
      out[4] = (xy - wz) * sy;
      out[5] = (1 - (xx + zz)) * sy;
      out[6] = (yz + wx) * sy;
      out[7] = 0;
      out[8] = (xz + wy) * sz;
      out[9] = (yz - wx) * sz;
      out[10] = (1 - (xx + yy)) * sz;
      out[11] = 0;
      out[12] = v[0];
      out[13] = v[1];
      out[14] = v[2];
      out[15] = 1;
      return out;
    },
    inverse(out, a) {
      const a00 = a[0], a01 = a[1], a02 = a[2], a03 = a[3];
      const a10 = a[4], a11 = a[5], a12 = a[6], a13 = a[7];
      const a20 = a[8], a21 = a[9], a22 = a[10], a23 = a[11];
      const a30 = a[12], a31 = a[13], a32 = a[14], a33 = a[15];
      const b00 = a00 * a11 - a01 * a10;
      const b01 = a00 * a12 - a02 * a10;
      const b02 = a00 * a13 - a03 * a10;
      const b03 = a01 * a12 - a02 * a11;
      const b04 = a01 * a13 - a03 * a11;
      const b05 = a02 * a13 - a03 * a12;
      const b06 = a20 * a31 - a21 * a30;
      const b07 = a20 * a32 - a22 * a30;
      const b08 = a20 * a33 - a23 * a30;
      const b09 = a21 * a32 - a22 * a31;
      const b10 = a21 * a33 - a23 * a31;
      const b11 = a22 * a33 - a23 * a32;
      let det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06;
      if (!det) return null;
      det = 1.0 / det;
      out[0] = (a11 * b11 - a12 * b10 + a13 * b09) * det;
      out[1] = (a02 * b10 - a01 * b11 - a03 * b09) * det;
      out[2] = (a31 * b05 - a32 * b04 + a33 * b03) * det;
      out[3] = (a22 * b04 - a21 * b05 - a23 * b03) * det;
      out[4] = (a12 * b08 - a10 * b11 - a13 * b07) * det;
      out[5] = (a00 * b11 - a02 * b08 + a03 * b07) * det;
      out[6] = (a32 * b02 - a30 * b05 - a33 * b01) * det;
      out[7] = (a20 * b05 - a22 * b02 + a23 * b01) * det;
      out[8] = (a10 * b10 - a11 * b08 + a13 * b06) * det;
      out[9] = (a01 * b08 - a00 * b10 - a03 * b06) * det;
      out[10] = (a30 * b04 - a31 * b02 + a33 * b00) * det;
      out[11] = (a21 * b02 - a20 * b04 - a23 * b00) * det;
      out[12] = (a11 * b07 - a10 * b09 - a12 * b06) * det;
      out[13] = (a00 * b09 - a01 * b07 + a02 * b06) * det;
      out[14] = (a31 * b01 - a30 * b03 - a32 * b00) * det;
      out[15] = (a20 * b03 - a21 * b01 + a22 * b00) * det;
      return out;
    }
  };

  class Vec3 extends Array {
    constructor(x = 0, y = 0, z = 0) {
      super(x, y, z);
    }
    get x() { return this[0]; } set x(v) { this[0] = v; }
    get y() { return this[1]; } set y(v) { this[1] = v; }
    get z() { return this[2]; } set z(v) { this[2] = v; }
    set(x, y, z) {
      this[0] = x; this[1] = y !== undefined ? y : x; this[2] = z !== undefined ? z : x;
      return this;
    }
  }

  class Quat extends Array {
    constructor(x = 0, y = 0, z = 0, w = 1) {
      super(x, y, z, w);
    }
    fromEuler(x, y, z) {
      const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2);
      const s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
      this[0] = s1 * c2 * c3 + c1 * s2 * s3;
      this[1] = c1 * s2 * c3 - s1 * c2 * s3;
      this[2] = c1 * c2 * s3 + s1 * s2 * c3;
      this[3] = c1 * c2 * c3 - s1 * s2 * s3;
      return this;
    }
  }

  class Transform {
    constructor() {
      this.parent = null;
      this.children = [];
      this.position = new Vec3();
      this.scale = new Vec3(1, 1, 1);
      this.rotation = new Vec3();
      this.quaternion = new Quat();
      this.matrix = Mat4.create();
      this.worldMatrix = Mat4.create();
    }
    setParent(parent, notifyParent = true) {
      if (this.parent && notifyParent) {
        const idx = this.parent.children.indexOf(this);
        if (idx >= 0) this.parent.children.splice(idx, 1);
      }
      this.parent = parent;
      if (parent && notifyParent) parent.children.push(this);
    }
    updateMatrixWorld() {
      this.quaternion.fromEuler(this.rotation.x, this.rotation.y, this.rotation.z);
      Mat4.fromRotationTranslationScale(this.matrix, this.quaternion, this.position, this.scale);
      if (this.parent) {
        Mat4.multiply(this.worldMatrix, this.parent.worldMatrix, this.matrix);
      } else {
        this.worldMatrix.set(this.matrix);
      }
      for (let i = 0; i < this.children.length; i++) {
        this.children[i].updateMatrixWorld();
      }
    }
  }

  class Camera extends Transform {
    constructor(gl) {
      super();
      this.gl = gl;
      this.projectionMatrix = Mat4.create();
      this.viewMatrix = Mat4.create();
      this.fov = 45;
      this.aspect = 1;
      this.near = 0.1;
      this.far = 100;
    }
    perspective({ fov = this.fov, aspect = this.aspect, near = this.near, far = this.far } = {}) {
      this.fov = fov;
      this.aspect = aspect;
      this.near = near;
      this.far = far;
      Mat4.perspective(this.projectionMatrix, (fov * Math.PI) / 180, aspect, near, far);
    }
    updateMatrixWorld() {
      super.updateMatrixWorld();
      Mat4.inverse(this.viewMatrix, this.worldMatrix);
    }
  }

  class Geometry {
    constructor(gl, attributes = {}) {
      this.gl = gl;
      this.attributes = attributes;
      this.VAOs = {};
      this.drawRange = { start: 0, count: 0 };
      this.instancedCount = 0;
      this.glState = null;
    }
  }

  class Plane extends Geometry {
    constructor(gl, { width = 1, height = 1, widthSegments = 1, heightSegments = 1 } = {}) {
      const wSegs = widthSegments;
      const hSegs = heightSegments;
      const num = (wSegs + 1) * (hSegs + 1);
      const numIndices = wSegs * hSegs * 6;

      const position = new Float32Array(num * 3);
      const uv = new Float32Array(num * 2);
      const index = num > 65535 ? new Uint32Array(numIndices) : new Uint16Array(numIndices);

      const io = width / wSegs;
      const jo = height / hSegs;
      const uvo = 1 / wSegs;
      const vvo = 1 / hSegs;

      let posIdx = 0;
      let uvIdx = 0;
      for (let j = 0; j <= hSegs; j++) {
        const y = j * jo - height / 2;
        const v = 1 - j * vvo;
        for (let i = 0; i <= wSegs; i++) {
          const x = i * io - width / 2;
          const u = i * uvo;
          position[posIdx++] = x;
          position[posIdx++] = y;
          position[posIdx++] = 0;
          uv[uvIdx++] = u;
          uv[uvIdx++] = v;
        }
      }

      let indexIdx = 0;
      for (let j = 0; j < hSegs; j++) {
        for (let i = 0; i < wSegs; i++) {
          const a = i + (wSegs + 1) * j;
          const b = i + (wSegs + 1) * (j + 1);
          const c = i + 1 + (wSegs + 1) * (j + 1);
          const d = i + 1 + (wSegs + 1) * j;
          index[indexIdx++] = a;
          index[indexIdx++] = b;
          index[indexIdx++] = d;
          index[indexIdx++] = b;
          index[indexIdx++] = c;
          index[indexIdx++] = d;
        }
      }

      super(gl, {
        position: { size: 3, data: position },
        uv: { size: 2, data: uv },
        index: { data: index }
      });
    }
  }

  class Program {
    constructor(gl, { vertex, fragment, uniforms = {}, transparent = false, depthTest = true, depthWrite = true } = {}) {
      this.gl = gl;
      this.uniforms = uniforms;
      this.transparent = transparent;
      this.depthTest = depthTest;
      this.depthWrite = depthWrite;

      const vShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vShader, vertex);
      gl.compileShader(vShader);

      const fShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fShader, fragment);
      gl.compileShader(fShader);

      this.program = gl.createProgram();
      gl.attachShader(this.program, vShader);
      gl.attachShader(this.program, fShader);
      gl.linkProgram(this.program);

      // Cache locations
      this.uniformLocations = new Map();
      this.attributeLocations = new Map();
    }
    use() {
      this.gl.useProgram(this.program);
    }
  }

  class Texture {
    constructor(gl, { generateMipmaps = true } = {}) {
      this.gl = gl;
      this.texture = gl.createTexture();
      this.generateMipmaps = generateMipmaps;
      this._image = null;

      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      // Fallback 1x1 white pixel while loading
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    }
    set image(img) {
      this._image = img;
      if (!img) return;
      const gl = this.gl;
      gl.bindTexture(gl.TEXTURE_2D, this.texture);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      if (this.generateMipmaps && (img.width & (img.width - 1)) === 0 && (img.height & (img.height - 1)) === 0) {
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      } else {
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      }
    }
    get image() {
      return this._image;
    }
  }

  class Mesh extends Transform {
    constructor(gl, { geometry, program } = {}) {
      super();
      this.gl = gl;
      this.geometry = geometry;
      this.program = program;
      this.modelViewMatrix = Mat4.create();

      // Setup buffer attributes
      this.buffers = {};
      for (const key in this.geometry.attributes) {
        const attr = this.geometry.attributes[key];
        const buffer = gl.createBuffer();
        const target = key === 'index' ? gl.ELEMENT_ARRAY_BUFFER : gl.ARRAY_BUFFER;
        gl.bindBuffer(target, buffer);
        gl.bufferData(target, attr.data, gl.STATIC_DRAW);
        this.buffers[key] = buffer;
      }
    }
    draw({ camera } = {}) {
      const gl = this.gl;
      this.program.use();

      // Bind attributes
      for (const key in this.geometry.attributes) {
        if (key === 'index') continue;
        const attr = this.geometry.attributes[key];
        let loc = this.program.attributeLocations.get(key);
        if (loc === undefined) {
          loc = gl.getAttribLocation(this.program.program, key);
          this.program.attributeLocations.set(key, loc);
        }
        if (loc >= 0) {
          gl.bindBuffer(gl.ARRAY_BUFFER, this.buffers[key]);
          gl.enableVertexAttribArray(loc);
          gl.vertexAttribPointer(loc, attr.size, gl.FLOAT, false, 0, 0);
        }
      }

      // Compute modelViewMatrix
      if (camera) {
        Mat4.multiply(this.modelViewMatrix, camera.viewMatrix, this.worldMatrix);
      }

      // Set uniforms
      const setMat4 = (name, mat) => {
        let loc = this.program.uniformLocations.get(name);
        if (loc === undefined) {
          loc = gl.getUniformLocation(this.program.program, name);
          this.program.uniformLocations.set(name, loc);
        }
        if (loc) gl.uniformMatrix4fv(loc, false, mat);
      };

      const set1f = (name, v) => {
        let loc = this.program.uniformLocations.get(name);
        if (loc === undefined) {
          loc = gl.getUniformLocation(this.program.program, name);
          this.program.uniformLocations.set(name, loc);
        }
        if (loc) gl.uniform1f(loc, v);
      };

      const set2fv = (name, v) => {
        let loc = this.program.uniformLocations.get(name);
        if (loc === undefined) {
          loc = gl.getUniformLocation(this.program.program, name);
          this.program.uniformLocations.set(name, loc);
        }
        if (loc) gl.uniform2fv(loc, v);
      };

      if (camera) {
        setMat4('projectionMatrix', camera.projectionMatrix);
        setMat4('modelViewMatrix', this.modelViewMatrix);
      }

      let textureUnit = 0;
      for (const name in this.program.uniforms) {
        const u = this.program.uniforms[name];
        if (u.value instanceof Texture) {
          gl.activeTexture(gl.TEXTURE0 + textureUnit);
          gl.bindTexture(gl.TEXTURE_2D, u.value.texture);
          let loc = this.program.uniformLocations.get(name);
          if (loc === undefined) {
            loc = gl.getUniformLocation(this.program.program, name);
            this.program.uniformLocations.set(name, loc);
          }
          if (loc) gl.uniform1i(loc, textureUnit);
          textureUnit++;
        } else if (typeof u.value === 'number') {
          set1f(name, u.value);
        } else if (Array.isArray(u.value) && u.value.length === 2) {
          set2fv(name, u.value);
        }
      }

      if (this.program.transparent) {
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      } else {
        gl.disable(gl.BLEND);
      }

      if (this.program.depthTest) gl.enable(gl.DEPTH_TEST);
      else gl.disable(gl.DEPTH_TEST);

      // Draw elements
      const indexAttr = this.geometry.attributes.index;
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.buffers.index);
      gl.drawElements(gl.TRIANGLES, indexAttr.data.length, gl.UNSIGNED_SHORT, 0);
    }
  }

  class Renderer {
    constructor({ alpha = true, antialias = true, dpr = 1 } = {}) {
      this.dpr = dpr;
      this.canvas = document.createElement('canvas');
      this.gl = this.canvas.getContext('webgl', { alpha, antialias, premultipliedAlpha: false });
    }
    setSize(width, height) {
      this.width = width;
      this.height = height;
      this.canvas.width = width * this.dpr;
      this.canvas.height = height * this.dpr;
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
      this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    render({ scene, camera }) {
      const gl = this.gl;
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      camera.updateMatrixWorld();
      scene.updateMatrixWorld();

      // Collect render list
      const renderList = [];
      const traverse = (node) => {
        if (node instanceof Mesh) renderList.push(node);
        for (let i = 0; i < node.children.length; i++) {
          traverse(node.children[i]);
        }
      };
      traverse(scene);

      for (let i = 0; i < renderList.length; i++) {
        renderList[i].draw({ camera });
      }
    }
  }

  // --- End Minimal OGL Core ---

  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  function lerp(p1, p2, t) {
    return p1 + (p2 - p1) * t;
  }

  function autoBind(instance) {
    const proto = Object.getPrototypeOf(instance);
    Object.getOwnPropertyNames(proto).forEach(key => {
      if (key !== 'constructor' && typeof instance[key] === 'function') {
        instance[key] = instance[key].bind(instance);
      }
    });
  }

  function wrapText(ctx, text, maxWidth) {
    if (!text) return [];
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (let i = 0; i < words.length; i++) {
      const test = line ? line + ' ' + words[i] : words[i];
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = words[i];
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  function getDonateButtonBounds() {
    const width = 750;
    const height = 1000;
    const padding = 48;
    const buttonHeight = 112;
    const bottom = height - 50;

    return {
      left: padding,
      right: width - padding,
      top: bottom - buttonHeight,
      bottom
    };
  }

  function createOverlayTexture(gl, img, text, description) {
    // 750x1000 canvas matching the 3D card aspect ratio (0.75) — guarantees zero text/image squishing
    const cw = 750;
    const ch = 1000;
    const canvas = document.createElement('canvas');
    canvas.width = cw;
    canvas.height = ch;
    const ctx = canvas.getContext('2d');

    // Draw source image with cover-fit (fill entire canvas, crop excess)
    const imgW = img.naturalWidth || img.width || 800;
    const imgH = img.naturalHeight || img.height || 600;
    const scale = Math.max(cw / imgW, ch / imgH);
    const sw = imgW * scale;
    const sh = imgH * scale;
    const sx = (cw - sw) / 2;
    const sy = (ch - sh) / 2;
    ctx.drawImage(img, sx, sy, sw, sh);

    // Bottom gradient overlay for maximum text contrast
    const gradH = ch * 0.58;
    const grad = ctx.createLinearGradient(0, ch - gradH, 0, ch);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(0.25, 'rgba(0,0,0,0.18)');
    grad.addColorStop(0.65, 'rgba(0,0,0,0.52)');
    grad.addColorStop(1, 'rgba(0,0,0,0.82)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, ch - gradH, cw, gradH);

    // Text padding & wrap width
    const pad = 48;
    const maxTextW = cw - pad * 2;

    const titleSize = 40;
    const descSize = 22;
    const btnSize = 30;

    const titleFont = `700 ${titleSize}px Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const descFont = `400 ${descSize}px Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const btnFont = `600 ${btnSize}px Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const titleLineH = 48;
    const descLineH = 30;
    const btnText = 'Donate Now  →';
    const donateButton = getDonateButtonBounds();
    const pillH = donateButton.bottom - donateButton.top;

    // Wrap text
    ctx.font = titleFont;
    const titleLines = wrapText(ctx, text, maxTextW);
    ctx.font = descFont;
    const descLines = wrapText(ctx, description || '', maxTextW);

    // Layout from bottom up
    const gap1 = 18;
    const gap2 = 14;

    const btnBottom = donateButton.bottom;
    const btnTop = donateButton.top;
    const descBottom = btnTop - gap1;
    const descTop = descBottom - descLines.length * descLineH;
    const titleBottom = descTop - gap2;

    // Draw title
    ctx.font = titleFont;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'bottom';
    ctx.textAlign = 'left';
    ctx.shadowColor = 'rgba(0,0,0,0.7)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 2;
    for (let i = 0; i < titleLines.length; i++) {
      const y = titleBottom - (titleLines.length - 1 - i) * titleLineH;
      ctx.fillText(titleLines[i], pad, y);
    }

    // Draw description
    ctx.font = descFont;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 1;
    for (let i = 0; i < descLines.length; i++) {
      ctx.fillText(descLines[i], pad, descTop + (i + 1) * descLineH);
    }

    // Draw "Donate Now →" pill button
    ctx.font = btnFont;
    const pillW = donateButton.right - donateButton.left;
    const pillR = pillH / 2;

    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.roundRect(donateButton.left, btnTop, pillW, pillH, pillR);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.8;
    ctx.stroke();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#ffffff';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(btnText, donateButton.left + pillW / 2, btnTop + pillH / 2);

    const texture = new Texture(gl, { generateMipmaps: true });
    texture.image = canvas;
    return texture;
  }

  class Media {
    constructor({
      geometry,
      gl,
      image,
      index,
      length,
      renderer,
      scene,
      screen,
      text,
      description,
      url,
      viewport,
      bend,
      textColor,
      borderRadius = 0.05,
      font
    }) {
      this.extra = 0;
      this.geometry = geometry;
      this.gl = gl;
      this.image = image;
      this.index = index;
      this.length = length;
      this.renderer = renderer;
      this.scene = scene;
      this.screen = screen;
      this.text = text;
      this.description = description || '';
      this.url = url;
      this.viewport = viewport;
      this.bend = bend;
      this.textColor = textColor;
      this.borderRadius = borderRadius;
      this.font = font;
      this.createShader();
      this.createMesh();
      this.onResize();
    }
    createShader() {
      const texture = new Texture(this.gl, { generateMipmaps: true });
      this.program = new Program(this.gl, {
        depthTest: false,
        depthWrite: false,
        vertex: `
          precision highp float;
          attribute vec3 position;
          attribute vec2 uv;
          uniform mat4 modelViewMatrix;
          uniform mat4 projectionMatrix;
          uniform float uTime;
          uniform float uSpeed;
          varying vec2 vUv;
          void main() {
            vUv = uv;
            vec3 p = position;
            p.z = (sin(p.x * 4.0 + uTime) * 1.5 + cos(p.y * 2.0 + uTime) * 1.5) * (0.1 + uSpeed * 0.5);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          }
        `,
        fragment: `
          precision highp float;
          uniform vec2 uImageSizes;
          uniform vec2 uPlaneSizes;
          uniform sampler2D tMap;
          uniform float uBorderRadius;
          varying vec2 vUv;
          
          float roundedBoxSDF(vec2 p, vec2 b, float r) {
            vec2 d = abs(p) - b;
            return length(max(d, vec2(0.0))) + min(max(d.x, d.y), 0.0) - r;
          }
          
          void main() {
            vec4 color = texture2D(tMap, vUv);
            
            float d = roundedBoxSDF(vUv - 0.5, vec2(0.5 - uBorderRadius), uBorderRadius);
            
            float edgeSmooth = 0.003;
            float alpha = 1.0 - smoothstep(-edgeSmooth, edgeSmooth, d);
            
            gl_FragColor = vec4(color.rgb, alpha);
          }
        `,
        uniforms: {
          tMap: { value: texture },
          uPlaneSizes: { value: [0, 0] },
          uImageSizes: { value: [800, 600] },
          uSpeed: { value: 0 },
          uTime: { value: 100 * Math.random() },
          uBorderRadius: { value: this.borderRadius }
        },
        transparent: true
      });
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = this.image;
      img.onload = () => {
        // Composite title, description, and Donate Now directly onto the image
        const overlayTex = createOverlayTexture(this.gl, img, this.text, this.description);
        this.program.uniforms.tMap.value = overlayTex;
        this.program.uniforms.uImageSizes.value = [img.naturalWidth || 800, img.naturalHeight || 600];
      };
    }
    createMesh() {
      this.plane = new Mesh(this.gl, {
        geometry: this.geometry,
        program: this.program
      });
      this.plane.setParent(this.scene);
    }
    update(scroll, direction) {
      this.plane.position.x = this.x - scroll.current - this.extra;
      const isMobile = this.screen.width <= 640;

      const x = this.plane.position.x;
      const H = this.viewport.width / 2;

      if (isMobile || this.bend === 0) {
        this.plane.position.y = 0;
        this.plane.rotation.z = 0;
      } else {
        const B_abs = Math.abs(this.bend);
        const R = (H * H + B_abs * B_abs) / (2 * B_abs);
        const effectiveX = Math.min(Math.abs(x), H);

        const arc = R - Math.sqrt(Math.max(R * R - effectiveX * effectiveX, 0));
        if (this.bend > 0) {
          this.plane.position.y = -arc;
          this.plane.rotation.z = -Math.sign(x) * Math.asin(Math.min(effectiveX / R, 1));
        } else {
          this.plane.position.y = arc;
          this.plane.rotation.z = Math.sign(x) * Math.asin(Math.min(effectiveX / R, 1));
        }
      }

      this.speed = scroll.current - scroll.last;
      if (!isMobile) {
        this.program.uniforms.uTime.value += 0.04;
        this.program.uniforms.uSpeed.value = this.speed;
      } else {
        this.program.uniforms.uSpeed.value = 0;
      }

      const planeOffset = this.plane.scale.x / 2;
      const viewportOffset = this.viewport.width / 2;
      this.isBefore = this.plane.position.x + planeOffset < -viewportOffset;
      this.isAfter = this.plane.position.x - planeOffset > viewportOffset;
      if (direction === 'right' && this.isBefore) {
        this.extra -= this.widthTotal;
        this.isBefore = this.isAfter = false;
      }
      if (direction === 'left' && this.isAfter) {
        this.extra += this.widthTotal;
        this.isBefore = this.isAfter = false;
      }
    }
    onResize({ screen, viewport } = {}) {
      if (screen) this.screen = screen;
      if (viewport) {
        this.viewport = viewport;
      }
      this.scale = this.screen.height / 1500;
      const cardAspect = 750 / 1000; // 0.75 exact texture aspect ratio matching canvas
      const isMobileSize = this.screen.width <= 640;

      if (isMobileSize) {
        // Keep a generous main card while leaving a visible edge of the next
        // card. That edge makes the horizontal swipe affordance obvious.
        this.plane.scale.y = this.viewport.height * 0.90;
        this.plane.scale.x = this.plane.scale.y * cardAspect;
        if (this.plane.scale.x > this.viewport.width * 0.84) {
          this.plane.scale.x = this.viewport.width * 0.84;
          this.plane.scale.y = this.plane.scale.x / cardAspect;
        }
        this.padding = this.plane.scale.x * 0.05;
      } else {
        this.plane.scale.y = (this.viewport.height * (1120 * this.scale)) / this.screen.height;
        this.plane.scale.x = this.plane.scale.y * cardAspect;
        this.padding = 1.4;
      }

      this.plane.program.uniforms.uPlaneSizes.value = [this.plane.scale.x, this.plane.scale.y];
      this.width = this.plane.scale.x + this.padding;
      this.widthTotal = this.width * this.length;
      this.x = this.width * this.index;
    }
  }

  class CircularGalleryApp {
    constructor(
      container,
      {
        items,
        bend = 1,
        textColor = '#ffffff',
        borderRadius = 0.05,
        font = 'bold 28px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        scrollSpeed = 2,
        scrollEase = 0.05
      } = {}
    ) {
      this.container = container;
      this.scrollSpeed = scrollSpeed;
      this.scrollEase = scrollEase;
      this.scroll = { ease: scrollEase, current: 0, target: 0, last: 0 };
      this.onCheckDebounce = debounce(this.onCheck.bind(this), 200);
      this.dragStartedAt = 0;
      this.isDragging = false;
      this.dragStartX = 0;
      this.dragStartTarget = 0;
      this.suppressClick = false;
      this.activePointerId = null;
      
      this.createRenderer();
      this.createCamera();
      this.createScene();
      this.onResize();
      this.createGeometry();
      this.createMedias(items, bend, textColor, borderRadius, font);
      this.update();
      this.addEventListeners();
    }
    createRenderer() {
      this.renderer = new Renderer({
        alpha: true,
        antialias: true,
        dpr: Math.min(window.devicePixelRatio || 1, 2)
      });
      this.gl = this.renderer.gl;
      this.container.appendChild(this.renderer.canvas);
    }
    createCamera() {
      this.camera = new Camera(this.gl);
      this.camera.fov = 45;
      this.camera.position.z = 20;
    }
    createScene() {
      this.scene = new Transform();
    }
    createGeometry() {
      this.planeGeometry = new Plane(this.gl, {
        heightSegments: 50,
        widthSegments: 100
      });
    }
    createMedias(items, bend = 1, textColor, borderRadius, font) {
      const defaultItems = [
        { image: 'swan_foundation_img/youth%20action%20against%20hunger.png', text: 'Youth Against Hunger', description: 'Providing nutritious meals to underprivileged children across rural communities.', url: 'campaign-hunger.html?from=home' },
        { image: 'swan_foundation_img/emergency%20relief%20care.png', text: 'Emergency Relief Care', description: 'Rapid disaster response with shelter, food, and medical aid for affected families.', url: 'campaign-relief.html?from=home' },
        { image: 'swan_foundation_img/education%20for%20every%20kid.png', text: 'Education For Every Child', description: 'Building schools and sponsoring students for quality learning opportunities.', url: 'campaign-education.html?from=home' },
        { image: 'swan_foundation_img/Clean%20Water%20%26%20Sanitation%20Initiative.png', text: 'Clean Water Initiative', description: 'Installing borewells and water purifiers in drought-prone villages.', url: 'campaign-water.html?from=home' },
        { image: 'swan_foundation_img/Medical%20Aid%20%26%20Elderly%20Care%20Fund.png', text: 'Medical Aid & Care Fund', description: 'Free health camps and medical support for underserved communities.', url: 'campaign-medical.html?from=home' },
        { image: 'swan_foundation_img/Rural%20Women%20Skill%20%26%20Livelihood.png', text: 'Rural Women Skill Program', description: 'Empowering women through vocational training and entrepreneurship support.', url: 'campaign-women.html?from=home' },
        { image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=900&q=85', text: 'Eco Protection & Energy', description: 'Planting trees and promoting renewable energy in local communities.', url: 'campaign-eco.html?from=home' },
        { image: 'https://images.unsplash.com/photo-1542810634-71277d95dcbb?auto=format&fit=crop&w=900&q=85', text: 'Child Growth & Nutrition', description: 'Comprehensive nutrition programs ensuring healthy growth for every child.', url: 'campaign-nutrition.html?from=home' }
      ];
      const galleryItems = items && items.length ? items : defaultItems;
      this.mediasImages = galleryItems.concat(galleryItems);
      this.medias = this.mediasImages.map((data, index) => {
        return new Media({
          geometry: this.planeGeometry,
          gl: this.gl,
          image: data.image,
          index,
          length: this.mediasImages.length,
          renderer: this.renderer,
          scene: this.scene,
          screen: this.screen,
          text: data.text,
          description: data.description || '',
          url: data.url || 'donate.html',
          viewport: this.viewport,
          bend,
          textColor,
          borderRadius,
          font
        });
      });
    }
    handleClickAt(clientX, clientY) {
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      if (!this.medias || !this.medias.length) return;
      const rect = this.container.getBoundingClientRect();
      const xRel = ((clientX - rect.left) / rect.width) * 2 - 1;
      
      let closestMedia = null;
      let minDistance = Infinity;

      this.medias.forEach(media => {
        const planeXNorm = (media.plane.position.x / (this.viewport.width / 2));
        const dist = Math.abs(planeXNorm - xRel);
        // Use the card's real width instead of a fixed narrow center zone,
        // so the complete visible Donate Now button can be tapped.
        const hitWidth = media.plane.scale.x / this.viewport.width;
        if (dist < minDistance && dist < hitWidth) {
          minDistance = dist;
          closestMedia = media;
        }
      });

      if (closestMedia && closestMedia.url) {
        if (this.isDonateButtonTap(closestMedia, clientX, clientY, rect)) {
          // The CTA opens the campaign represented by this card. Donation is
          // then available from the campaign page rather than sending mobile
          // visitors straight into the donation/login flow.
          window.location.href = closestMedia.url;
          return;
        }
        window.location.href = closestMedia.url;
      }
    }
    isDonateButtonTap(media, clientX, clientY, rect) {
      // The CTA is painted into the WebGL card. On mobile, map the pointer
      // back into that card's 750×1000 artwork so its visible button is also
      // its real donation tap target.
      if (this.screen.width > 640 || !media.plane.scale.x || !media.plane.scale.y) return false;

      const worldX = ((clientX - rect.left) / rect.width - 0.5) * this.viewport.width;
      const worldY = (0.5 - (clientY - rect.top) / rect.height) * this.viewport.height;
      const cardX = ((worldX - media.plane.position.x) / media.plane.scale.x + 0.5) * 750;
      const cardY = (0.5 - (worldY - media.plane.position.y) / media.plane.scale.y) * 1000;
      const button = getDonateButtonBounds();

      return cardX >= button.left && cardX <= button.right && cardY >= button.top && cardY <= button.bottom;
    }
    onPointerDown(e) {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      this.isDragging = true;
      this.activePointerId = e.pointerId;
      this.dragStartX = e.clientX;
      this.dragStartTarget = this.scroll.target;
      this.dragStartedAt = Date.now();
      this.container.setPointerCapture?.(e.pointerId);
    }
    onPointerMove(e) {
      if (!this.isDragging || e.pointerId !== this.activePointerId) return;
      const distance = e.clientX - this.dragStartX;
      if (Math.abs(distance) > 6) {
        this.suppressClick = true;
        // The gallery owns horizontal movement; vertical movement remains a
        // normal page scroll through the CSS touch-action declaration.
        e.preventDefault();
      }
      const rect = this.container.getBoundingClientRect();
      // Negate distance so swipe-left scrolls left (natural direction)
      this.scroll.target = this.dragStartTarget - (distance / rect.width) * this.viewport.width;
    }
    onPointerUp(e) {
      if (!this.isDragging || e.pointerId !== this.activePointerId) return;
      this.isDragging = false;
      this.activePointerId = null;
      this.container.releasePointerCapture?.(e.pointerId);
      this.onCheckDebounce();
    }
    onKeyDown(e) {
      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          this.next();
          break;

        case 'ArrowLeft':
          e.preventDefault();
          this.prev();
          break;

        case 'Home':
          e.preventDefault();
          this.scroll.target = 0;
          this.onCheckDebounce();
          break;

        default:
          break;
      }
    }
    prev() {
      if (!this.medias || !this.medias[0]) return;
      const step = this.medias[0].width;
      this.scroll.target += step;
      this.onCheckDebounce();
    }
    next() {
      if (!this.medias || !this.medias[0]) return;
      const step = this.medias[0].width;
      this.scroll.target -= step;
      this.onCheckDebounce();
    }
    onCheck() {
      if (!this.medias || !this.medias[0]) return;
      const width = this.medias[0].width;
      const itemIndex = Math.round(Math.abs(this.scroll.target) / width);
      const item = width * itemIndex;
      this.scroll.target = this.scroll.target < 0 ? -item : item;
    }
    onResize() {
      const bounds = this.container.getBoundingClientRect();
      const previousWidth = this.medias && this.medias[0] ? this.medias[0].width : 0;
      const previousTotals = this.medias ? this.medias.map(media => media.widthTotal) : [];
      const measuredWidth = Math.round(bounds.width);
      const measuredHeight = Math.round(bounds.height);

      // A container can briefly report zero dimensions while a breakpoint is
      // being applied. Retaining the last valid layout prevents a stretched
      // canvas that only corrects itself after a refresh.
      if (!measuredWidth || !measuredHeight) return;

      this.screen = {
        width: measuredWidth,
        height: measuredHeight
      };
      this.renderer.setSize(this.screen.width, this.screen.height);
      this.camera.perspective({
        aspect: this.screen.width / this.screen.height
      });
      const fov = (this.camera.fov * Math.PI) / 180;
      const height = 2 * Math.tan(fov / 2) * this.camera.position.z;
      const width = height * this.camera.aspect;
      this.viewport = { width, height };
      // On mobile use a smooth but responsive ease (0.12) instead of instant snap
      this.scroll.ease = this.screen.width <= 640 ? 0.12 : this.scrollEase;
      if (this.medias) {
        this.medias.forEach((media, index) => {
          media.onResize({ screen: this.screen, viewport: this.viewport });

          // Wrapped cards use a width-total offset. Scale that offset with the
          // new geometry so cards do not jump off screen after a resize.
          if (previousTotals[index]) {
            media.extra = (media.extra / previousTotals[index]) * media.widthTotal;
          }
        });

        const nextWidth = this.medias[0] ? this.medias[0].width : 0;
        if (previousWidth && nextWidth) {
          const scale = nextWidth / previousWidth;
          this.scroll.current *= scale;
          this.scroll.target *= scale;
          this.scroll.last *= scale;
        }
      }
    }
    update() {
      this.scroll.current = lerp(this.scroll.current, this.scroll.target, this.scroll.ease);
      const direction = this.scroll.current > this.scroll.last ? 'right' : 'left';
      if (this.medias) {
        this.medias.forEach(media => media.update(this.scroll, direction));
      }
      this.renderer.render({ scene: this.scene, camera: this.camera });
      this.scroll.last = this.scroll.current;
      this.raf = window.requestAnimationFrame(this.update.bind(this));
    }
    addEventListeners() {
      this.resizeFrame = null;
      this.boundOnResize = this.scheduleResize.bind(this);
      this.boundOnKeyDown = this.onKeyDown.bind(this);
      this.boundOnClick = (e) => this.handleClickAt(e.clientX, e.clientY);
      this.boundOnPointerDown = this.onPointerDown.bind(this);
      this.boundOnPointerMove = this.onPointerMove.bind(this);
      this.boundOnPointerUp = this.onPointerUp.bind(this);

      window.addEventListener('resize', this.boundOnResize);
      if (typeof ResizeObserver !== 'undefined') {
        this.resizeObserver = new ResizeObserver(this.boundOnResize);
        this.resizeObserver.observe(this.container);
      }
      this.container.addEventListener('click', this.boundOnClick);
      this.container.addEventListener('keydown', this.boundOnKeyDown);
      this.container.addEventListener('pointerdown', this.boundOnPointerDown);
      this.container.addEventListener('pointermove', this.boundOnPointerMove);
      this.container.addEventListener('pointerup', this.boundOnPointerUp);
      this.container.addEventListener('pointercancel', this.boundOnPointerUp);
    }
    scheduleResize() {
      if (this.resizeFrame !== null) window.cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = window.requestAnimationFrame(() => {
        this.resizeFrame = null;
        this.onResize();
      });
    }
    destroy() {
      window.cancelAnimationFrame(this.raf);
      if (this.resizeFrame !== null) window.cancelAnimationFrame(this.resizeFrame);
      window.removeEventListener('resize', this.boundOnResize);
      if (this.resizeObserver) this.resizeObserver.disconnect();
      if (this.boundOnClick) this.container.removeEventListener('click', this.boundOnClick);
      this.container.removeEventListener('keydown', this.boundOnKeyDown);
      this.container.removeEventListener('pointerdown', this.boundOnPointerDown);
      this.container.removeEventListener('pointermove', this.boundOnPointerMove);
      this.container.removeEventListener('pointerup', this.boundOnPointerUp);
      this.container.removeEventListener('pointercancel', this.boundOnPointerUp);
      if (this.renderer && this.renderer.canvas && this.renderer.canvas.parentNode) {
        this.renderer.canvas.parentNode.removeChild(this.renderer.canvas);
      }
    }
  }

  function initApp() {
    const container = document.getElementById('circularGalleryContainer');
    if (container) {
      window.swanCircularGallery = new CircularGalleryApp(container, {
        bend: 1.2,
        textColor: '#ffffff',
        borderRadius: 0.05,
        font: 'bold 28px Figtree, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        scrollSpeed: 2,
        scrollEase: 0.05
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  window.CircularGalleryApp = CircularGalleryApp;
})();
