// Polyfills for browser APIs that might not be available during SSR

if (typeof window !== 'undefined') {
  // DOMMatrix polyfill for PDF.js compatibility
  if (!window.DOMMatrix) {
    (window as any).DOMMatrix = class DOMMatrix {
      constructor(init?: string | number[]) {
        // Simple DOMMatrix implementation for PDF.js
        this.a = 1;
        this.b = 0;
        this.c = 0;
        this.d = 1;
        this.e = 0;
        this.f = 0;
        
        if (init) {
          if (typeof init === 'string') {
            // Parse matrix string
            const values = init.match(/-?[\d.]+/g);
            if (values && values.length >= 6) {
              this.a = parseFloat(values[0]);
              this.b = parseFloat(values[1]);
              this.c = parseFloat(values[2]);
              this.d = parseFloat(values[3]);
              this.e = parseFloat(values[4]);
              this.f = parseFloat(values[5]);
            }
          } else if (Array.isArray(init) && init.length >= 6) {
            this.a = init[0];
            this.b = init[1];
            this.c = init[2];
            this.d = init[3];
            this.e = init[4];
            this.f = init[5];
          }
        }
      }
      
      a: number;
      b: number;
      c: number;
      d: number;
      e: number;
      f: number;
      
      translate(tx: number, ty: number) {
        return new DOMMatrix([this.a, this.b, this.c, this.d, this.e + tx, this.f + ty]);
      }
      
      scale(sx: number, sy?: number) {
        const scaleY = sy !== undefined ? sy : sx;
        return new DOMMatrix([this.a * sx, this.b * sx, this.c * scaleY, this.d * scaleY, this.e, this.f]);
      }
      
      rotate(angle: number) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        return new DOMMatrix([
          this.a * cos - this.b * sin,
          this.a * sin + this.b * cos,
          this.c * cos - this.d * sin,
          this.c * sin + this.d * cos,
          this.e,
          this.f
        ]);
      }
      
      multiply(other: DOMMatrix) {
        return new DOMMatrix([
          this.a * other.a + this.c * other.b,
          this.b * other.a + this.d * other.b,
          this.a * other.c + this.c * other.d,
          this.b * other.c + this.d * other.d,
          this.a * other.e + this.c * other.f + this.e,
          this.b * other.e + this.d * other.f + this.f
        ]);
      }
      
      toString() {
        return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
      }
    };
  }
}
