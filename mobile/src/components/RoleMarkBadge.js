import { useCallback, useEffect, useRef, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { GLView } from 'expo-gl';
import { Renderer } from 'expo-three';
import * as THREE from 'three';
import { ROLE_MARKS } from '../models/roleMarks3d';

// Slow turntable, matching the identity prototype's autorotate speed.
const ROTATE_RADIANS_PER_SECOND = 0.6;

/**
 * A small live 3D badge for a Revesta role (collector / disposer /
 * recycler) — the same marks as the identity prototype, auto-rotating,
 * fills its container. No orbit/zoom interaction; this is a decorative
 * icon replacement, not the full stage.
 *
 * Fills whatever box it's placed in (pass a sized/aspect-ratio'd parent,
 * not a `size` prop) and waits for that box's real, settled layout before
 * mounting the GL surface. Mounting immediately - before a flex/aspectRatio
 * parent has resolved its final size - is what left the mark rendered
 * against a stale, wrong-sized surface on Android (expo-gl's surface is a
 * native layer that doesn't always repaint in step with a still-settling
 * JS layout, especially inside a ScrollView).
 */
export default function RoleMarkBadge({ role }) {
  const rafRef = useRef(0);
  const markRef = useRef(null);
  const rendererRef = useRef(null);
  const [layoutSize, setLayoutSize] = useState(null);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
      // Geometries are fresh per mark instance — safe to dispose. Materials
      // are shared singletons across every RoleMarkBadge on screen (see
      // roleMarks3d.js), so they're left alone here.
      markRef.current?.traverse((o) => {
        if (o.isMesh) o.geometry.dispose();
      });
      rendererRef.current?.dispose();
    };
  }, []);

  const onLayout = useCallback((e) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setLayoutSize((prev) => (prev && prev.width === width && prev.height === height ? prev : { width, height }));
    }
  }, []);

  const onContextCreate = useCallback((gl) => {
    const buildMark = ROLE_MARKS[role];
    if (!buildMark) return;

    const renderer = new Renderer({ gl, alpha: true });
    rendererRef.current = renderer;
    renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight);
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      40,
      gl.drawingBufferWidth / gl.drawingBufferHeight,
      0.01,
      100
    );

    // Same neutral studio wash as the full stage, minus the shadow catcher
    // — not worth the cost at badge size.
    scene.add(new THREE.HemisphereLight(0xffffff, 0xd8d2c4, 1.1));
    const key = new THREE.DirectionalLight(0xffffff, 2.2);
    key.position.set(4, 7, 5);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xfff4e6, 0.5);
    fill.position.set(-5, 3, -4);
    scene.add(fill);

    const mark = buildMark();
    markRef.current = mark;
    scene.add(mark);

    // Frame the camera to the mark's bounds from a fixed angle, so all
    // three roles read at a consistent size despite differing shapes.
    const box = new THREE.Box3().setFromObject(mark);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    const dist = (sphere.radius / Math.tan((camera.fov * Math.PI) / 360)) * 0.62;
    const dir = new THREE.Vector3(1, 0.55, 1.25).normalize();
    camera.position.copy(sphere.center).add(dir.multiplyScalar(dist));
    camera.lookAt(sphere.center);

    let last = Date.now();
    const tick = () => {
      const now = Date.now();
      const dt = (now - last) / 1000;
      last = now;
      mark.rotation.y += ROTATE_RADIANS_PER_SECOND * dt;
      renderer.render(scene, camera);
      gl.endFrameEXP();
      rafRef.current = requestAnimationFrame(tick);
    };
    tick();
  }, [role]);

  return (
    <View style={styles.fill} onLayout={onLayout}>
      {layoutSize && (
        <GLView
          key={`${layoutSize.width}x${layoutSize.height}`}
          style={StyleSheet.absoluteFill}
          onContextCreate={onContextCreate}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { width: '100%', height: '100%', overflow: 'hidden' },
});
