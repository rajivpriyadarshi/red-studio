import * as T from "three";

export function makeBenchGround() {
  const geometry = new T.PlaneGeometry(23, 23);
  geometry.rotateX(-Math.PI / 2);
  const ground = new T.Group();
  ground.position.y = -.012;

  const grid = new T.Mesh(geometry, new T.ShaderMaterial({
    uniforms: {
      ruling: { value: new T.Color("#425e52") },
      register: { value: new T.Color("#ab3928") },
    },
    transparent: true, depthWrite: false, toneMapped: false,
    vertexShader: `
      varying vec2 paper;
      varying vec4 clipPoint;
      void main() {
        paper = position.xz;
        clipPoint = projectionMatrix * modelViewMatrix * vec4(position, 1.);
        gl_Position = clipPoint;
      }`,
    fragmentShader: `
      varying vec2 paper;
      varying vec4 clipPoint;
      uniform vec3 ruling, register;

      float lineAt(float distanceToLine, float pixel, float halfWidth) {
        return 1. - smoothstep(0., 1., distanceToLine / pixel - halfWidth + .5);
      }
      float rule(vec2 point, vec2 pixel, float pitch, float halfWidth) {
        vec2 d = abs(fract(point / pitch + .5) - .5) * pitch;
        return max(lineAt(d.x, pixel.x, halfWidth), lineAt(d.y, pixel.y, halfWidth));
      }
      void main() {
        vec2 p = paper + vec2(.21, .14);
        vec2 pixel = max(fwidth(p), vec2(.0001));
        float minor = rule(p, pixel, .52, .43);
        float major = rule(p, pixel, 2.08, .66);
        vec2 d = abs(fract(p / 2.08 + .5) - .5) * 2.08;
        vec2 arms = 1. - smoothstep(vec2(.074) - pixel, vec2(.074) + pixel, d);
        float crossMark = max(lineAt(d.x, pixel.x, .81) * arms.y,
                              lineAt(d.y, pixel.y, .81) * arms.x);
        float extent = length((paper - vec2(-.15, .30)) / vec2(5.9, 6.7));
        vec2 screen = abs(clipPoint.xy / clipPoint.w);
        float margin = (1. - smoothstep(.82, 1., screen.x)) * (1. - smoothstep(.83, 1., screen.y));
        float fade = (1. - smoothstep(.38, 1., extent)) * margin;
        float alpha = max(max(.23 * minor, .37 * major), .76 * crossMark);
        gl_FragColor = vec4(mix(ruling, register, crossMark), fade * alpha);
        #include <colorspace_fragment>
      }`,
  }));
  grid.rotation.y = -.24;
  grid.renderOrder = -3;
  ground.add(grid);

  const shadows = new T.Mesh(geometry, new T.ShadowMaterial({
    color: 0x363329, opacity: .25, depthWrite: false, toneMapped: false,
  }));
  shadows.material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec4 groundClip;\n' + shader.vertexShader.replace(
      '#include <project_vertex>', '#include <project_vertex>\n groundClip = gl_Position;');
    shader.fragmentShader = 'varying vec4 groundClip;\n' + shader.fragmentShader.replace(
      '#include <tonemapping_fragment>', `
        vec2 edge = abs(groundClip.xy / groundClip.w);
        gl_FragColor.a *= 1. - smoothstep(.82, 1., max(edge.x, edge.y));
        #include <tonemapping_fragment>
      `);
  };
  shadows.receiveShadow = true;
  shadows.renderOrder = -2;
  ground.add(shadows);
  // Ground markings and shadows never intercept a pointer aimed at a prop.
  grid.raycast = shadows.raycast = () => {};
  return ground;
}
