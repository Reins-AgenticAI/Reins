"use client";

import { useEffect, useRef } from "react";

export function EvidenceGraph() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let disposed = false;
    let renderer:
      | { dispose: () => void; setAnimationLoop: (callback: (() => void) | null) => void }
      | undefined;
    void import("three")
      .then(
        ({
          Scene,
          PerspectiveCamera,
          WebGLRenderer,
          SphereGeometry,
          MeshBasicMaterial,
          Mesh,
          LineBasicMaterial,
          BufferGeometry,
          Line,
        }) => {
          if (disposed || !canvasRef.current) return;
          const canvas = canvasRef.current;
          const scene = new Scene();
          const camera = new PerspectiveCamera(45, 1, 0.1, 100);
          camera.position.z = 5;
          const webgl = new WebGLRenderer({ canvas, antialias: true, alpha: true });
          renderer = webgl;
          const nodes = [-1.6, 0, 1.6].map((x, index) => {
            const mesh = new Mesh(
              new SphereGeometry(0.35, 20, 20),
              new MeshBasicMaterial({ color: index === 1 ? 0x17375e : 0x6a86a8 }),
            );
            mesh.position.x = x;
            scene.add(mesh);
            return mesh;
          });
          scene.add(
            new Line(
              new BufferGeometry().setFromPoints(nodes.map((node) => node.position)),
              new LineBasicMaterial({ color: 0x9aaec5 }),
            ),
          );
          const resize = () => {
            const rect = canvas.getBoundingClientRect();
            webgl.setSize(rect.width, Math.max(180, rect.height), false);
            camera.aspect = rect.width / Math.max(180, rect.height);
            camera.updateProjectionMatrix();
            webgl.render(scene, camera);
          };
          const observer = new ResizeObserver(resize);
          observer.observe(canvas);
          resize();
          return () => observer.disconnect();
        },
      )
      .catch(() => undefined);
    return () => {
      disposed = true;
      renderer?.setAnimationLoop(null);
      renderer?.dispose();
    };
  }, []);
  return (
    <div className="graphFrame">
      <canvas
        ref={canvasRef}
        aria-label="Evidence relationship graph showing policy, provider, and lifecycle nodes"
        role="img"
      />
      <p className="graphFallback">
        The graph is optional. Use the evidence table and timeline below when WebGL is unavailable.
      </p>
    </div>
  );
}
