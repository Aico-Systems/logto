import { OrbitControls, TransformControls, useAnimations, useGLTF } from '@react-three/drei';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box3,
  Color,
  DoubleSide,
  Group,
  LoopPingPong,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  SkinnedMesh,
  Vector3,
} from 'three';

import styles from './index.module.scss';

type ThreeHandLayerProps = {
  modelUrl: string;
  reduceMotion: boolean;
  onProjectionUpdate?: (projection: HandProjectionData) => void;
};

export type HandProjectionPoint = {
  x: number;
  y: number;
  intensity: number;
};

export type HandProjectionSegment = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  intensity: number;
};

export type HandProjectionData = {
  points: HandProjectionPoint[];
  segments: HandProjectionSegment[];
};

type HandTransformMode = 'translate' | 'rotate' | 'scale';

type DebugSnapshot = {
  hand: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  };
  camera: {
    position: [number, number, number];
    fov: number;
  };
};

// One place for all hand tuning values so positioning/rotation is easy to tweak.
const HAND_LAYOUT = {
  scale: 1.338,
  position: { x: -16.554, y: 10.701, z: 5.821 },
  rotation: { x: -1.486, y: -0.462, z: -1.977 },
} as const;

const HAND_MOTION = {
  animationTimeScale: 0.25,
} as const;

const HAND_CAMERA = {
  position: [-87.531, 421.482, -45.449] as const,
  fov: 50,
} as const;

// Flip this to `false` to hide the hand mesh while keeping dot interaction active.
const HAND_RENDER_VISIBLE = false;

const isHandDebugEnabled = () => {
  if (typeof window === 'undefined') {
    return false;
  }

  return new URLSearchParams(window.location.search).get('handDebug') === '1';
};

const round = (value: number) => Number(value.toFixed(3));

const isMeshObject = (object: Object3D): object is Mesh => {
  return (object as Mesh).isMesh === true;
};

const createHandMaterial = () => {
  const material = new MeshBasicMaterial({
    color: new Color('#67e7ff'),
    wireframe: true,
    transparent: true,
    opacity: 1,
    side: DoubleSide,
  });

  material.visible = HAND_RENDER_VISIBLE;

  return material;
};

type HandMeshProps = ThreeHandLayerProps & {
  debug: boolean;
  onHandGroupChange: (group: Group | null) => void;
};

type ProjectionSample = {
  mesh: Mesh | SkinnedMesh;
  pointIndices: number[];
  requiredIndices: number[];
  edges: Array<[number, number]>;
};

const HandMesh = ({
  modelUrl,
  reduceMotion,
  debug,
  onHandGroupChange,
  onProjectionUpdate,
}: HandMeshProps) => {
  const handGroupRef = useRef<Group>(null);
  const materialsRef = useRef<MeshBasicMaterial[]>([]);
  const debugInitializedRef = useRef(false);
  const projectionSamplesRef = useRef<ProjectionSample[]>([]);
  const positionCacheRef = useRef(new Vector3());

  const gltf = useGLTF(modelUrl);
  const model = gltf.scene as Group;
  const { actions } = useAnimations(gltf.animations, handGroupRef);

  useEffect(() => {
    onHandGroupChange(handGroupRef.current);

    return () => {
      onHandGroupChange(null);
    };
  }, [onHandGroupChange]);

  useEffect(() => {
    materialsRef.current = [];
    projectionSamplesRef.current = [];

    model.traverse((object: Object3D) => {
      if (!isMeshObject(object)) {
        return;
      }

      const material = createHandMaterial();
      object.material = material;
      object.frustumCulled = false;
      object.castShadow = false;
      object.receiveShadow = false;
      materialsRef.current.push(material);

      const positionAttribute = object.geometry.getAttribute('position');
      if (!positionAttribute || positionAttribute.count === 0) {
        return;
      }

      const pointIndices: number[] = [];
      const sampleCount = 200;
      const stride = Math.max(1, Math.floor(positionAttribute.count / sampleCount));

      for (let i = 0; i < positionAttribute.count; i += stride) {
        pointIndices.push(i);
      }

      const projectionMesh = (object as SkinnedMesh).isSkinnedMesh
        ? (object as SkinnedMesh)
        : object;
      const edgeSet = new Set<string>();
      const edges: Array<[number, number]> = [];
      const maxEdgeSamples = 380;

      const addEdge = (a: number, b: number) => {
        if (a === b) {
          return;
        }

        const low = Math.min(a, b);
        const high = Math.max(a, b);
        const key = `${low}:${high}`;
        if (edgeSet.has(key)) {
          return;
        }

        edgeSet.add(key);
        edges.push([low, high]);
      };

      const indexAttribute = object.geometry.getIndex();
      if (indexAttribute) {
        const triangleStride = Math.max(1, Math.floor(indexAttribute.count / (maxEdgeSamples * 3)));
        for (let i = 0; i + 2 < indexAttribute.count; i += 3 * triangleStride) {
          const a = indexAttribute.getX(i);
          const b = indexAttribute.getX(i + 1);
          const c = indexAttribute.getX(i + 2);
          addEdge(a, b);
          addEdge(b, c);
          addEdge(c, a);
        }
      } else {
        const triangleStride = Math.max(
          1,
          Math.floor(positionAttribute.count / (maxEdgeSamples * 3))
        );
        for (let i = 0; i + 2 < positionAttribute.count; i += 3 * triangleStride) {
          addEdge(i, i + 1);
          addEdge(i + 1, i + 2);
          addEdge(i + 2, i);
        }
      }

      const requiredIndexSet = new Set<number>(pointIndices);
      for (const [a, b] of edges) {
        requiredIndexSet.add(a);
        requiredIndexSet.add(b);
      }

      projectionSamplesRef.current.push({
        mesh: projectionMesh,
        pointIndices,
        requiredIndices: [...requiredIndexSet],
        edges,
      });
    });

    const box = new Box3().setFromObject(model);
    const center = box.getCenter(new Vector3());

    model.position.sub(center);

    return () => {
      onProjectionUpdate?.({ points: [], segments: [] });

      for (const material of materialsRef.current) {
        material.dispose();
      }
    };
  }, [model, onProjectionUpdate]);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const animationAction = Object.values(actions).find(
      (action) => action && action.getClip().duration > 0
    );

    if (!animationAction) {
      return;
    }

    animationAction.reset();
    animationAction.setLoop(LoopPingPong, Infinity);
    animationAction.timeScale = debug ? 0 : HAND_MOTION.animationTimeScale;
    animationAction.play();

    return () => {
      animationAction.stop();
    };
  }, [actions, debug, reduceMotion]);

  useFrame(({ camera, size }) => {
    const handGroup = handGroupRef.current;
    if (!handGroup) {
      return;
    }

    if (debug) {
      if (!debugInitializedRef.current) {
        handGroup.scale.setScalar(HAND_LAYOUT.scale);
        handGroup.position.set(
          HAND_LAYOUT.position.x,
          HAND_LAYOUT.position.y,
          HAND_LAYOUT.position.z
        );
        handGroup.rotation.set(
          HAND_LAYOUT.rotation.x,
          HAND_LAYOUT.rotation.y,
          HAND_LAYOUT.rotation.z
        );
        debugInitializedRef.current = true;
      }

      return;
    }

    handGroup.scale.setScalar(HAND_LAYOUT.scale);
    handGroup.position.set(HAND_LAYOUT.position.x, HAND_LAYOUT.position.y, HAND_LAYOUT.position.z);
    handGroup.rotation.set(HAND_LAYOUT.rotation.x, HAND_LAYOUT.rotation.y, HAND_LAYOUT.rotation.z);

    if (!onProjectionUpdate) {
      return;
    }

    handGroup.updateMatrixWorld(true);

    const points: HandProjectionPoint[] = [];
    const segments: HandProjectionSegment[] = [];
    const worldPosition = positionCacheRef.current;
    const projectedByIndex = new Map<number, { x: number; y: number; visible: boolean }>();

    for (const sample of projectionSamplesRef.current) {
      const positionAttribute = sample.mesh.geometry.getAttribute('position');
      if (!positionAttribute) {
        continue;
      }

      projectedByIndex.clear();

      for (const index of sample.requiredIndices) {
        if (sample.mesh instanceof SkinnedMesh) {
          sample.mesh.getVertexPosition(index, worldPosition);
        } else {
          worldPosition.fromBufferAttribute(positionAttribute, index);
        }

        sample.mesh.localToWorld(worldPosition);
        worldPosition.project(camera);

        if (worldPosition.z < -1 || worldPosition.z > 1) {
          projectedByIndex.set(index, { x: 0, y: 0, visible: false });
          continue;
        }

        projectedByIndex.set(index, {
          x: ((worldPosition.x + 1) / 2) * size.width,
          y: ((1 - worldPosition.y) / 2) * size.height,
          visible: true,
        });
      }

      for (const index of sample.pointIndices) {
        const projected = projectedByIndex.get(index);
        if (!projected || !projected.visible) {
          continue;
        }

        points.push({
          x: projected.x,
          y: projected.y,
          intensity: 0.8,
        });
      }

      for (const [a, b] of sample.edges) {
        const pa = projectedByIndex.get(a);
        const pb = projectedByIndex.get(b);
        if (!pa || !pb || !pa.visible || !pb.visible) {
          continue;
        }

        segments.push({
          x1: pa.x,
          y1: pa.y,
          x2: pb.x,
          y2: pb.y,
          intensity: 0.35,
        });
      }
    }

    onProjectionUpdate({ points, segments });
  });

  return (
    <group ref={handGroupRef}>
      <primitive object={model} />
    </group>
  );
};

type DebugTrackerProps = {
  enabled: boolean;
  handGroup: Group | null;
  onSnapshot: (snapshot: DebugSnapshot) => void;
};

const DebugTracker = ({ enabled, handGroup, onSnapshot }: DebugTrackerProps) => {
  const { camera } = useThree();

  useFrame(() => {
    if (!enabled) {
      return;
    }

    if (!handGroup) {
      return;
    }

    onSnapshot({
      hand: {
        position: [
          round(handGroup.position.x),
          round(handGroup.position.y),
          round(handGroup.position.z),
        ],
        rotation: [
          round(handGroup.rotation.x),
          round(handGroup.rotation.y),
          round(handGroup.rotation.z),
        ],
        scale: round(handGroup.scale.x),
      },
      camera: {
        position: [round(camera.position.x), round(camera.position.y), round(camera.position.z)],
        fov: round((camera as { fov?: number }).fov ?? 0),
      },
    });
  });

  return null;
};

const ThreeHandLayer = ({ modelUrl, reduceMotion, onProjectionUpdate }: ThreeHandLayerProps) => {
  const [handGroup, setHandGroup] = useState<Group | null>(null);
  const [debugMode] = useState(isHandDebugEnabled);
  const [transformMode, setTransformMode] = useState<HandTransformMode>('translate');
  const [snapshot, setSnapshot] = useState<DebugSnapshot | null>(null);

  const debugCode = useMemo(() => {
    if (!snapshot) {
      return '';
    }

    return [
      `scale: ${snapshot.hand.scale},`,
      `position: { x: ${snapshot.hand.position[0]}, y: ${snapshot.hand.position[1]}, z: ${snapshot.hand.position[2]} },`,
      `rotation: { x: ${snapshot.hand.rotation[0]}, y: ${snapshot.hand.rotation[1]}, z: ${snapshot.hand.rotation[2]} },`,
      `camera: { x: ${snapshot.camera.position[0]}, y: ${snapshot.camera.position[1]}, z: ${snapshot.camera.position[2]}, fov: ${snapshot.camera.fov} },`,
    ].join('\n');
  }, [snapshot]);

  return (
    <>
      <Canvas
        className={
          debugMode ? `${styles.threeCanvas} ${styles.threeCanvasDebug}` : styles.threeCanvas
        }
        gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
        dpr={[1, 1.5]}
        camera={{ position: HAND_CAMERA.position, fov: HAND_CAMERA.fov }}
        onCreated={({ gl }) => {
          gl.setClearColor(new Color('#000000'), 0);
        }}
      >
        <ambientLight intensity={1} color="#9adfff" />
        <Suspense fallback={null}>
          <HandMesh
            modelUrl={modelUrl}
            reduceMotion={reduceMotion}
            debug={debugMode}
            onHandGroupChange={setHandGroup}
            onProjectionUpdate={onProjectionUpdate}
          />
        </Suspense>
        {debugMode && handGroup && <TransformControls object={handGroup} mode={transformMode} />}
        {debugMode && <OrbitControls makeDefault />}
        <DebugTracker enabled={debugMode} handGroup={handGroup} onSnapshot={setSnapshot} />
      </Canvas>
      {debugMode && (
        <div className={styles.handDebugPanel}>
          <div className={styles.handDebugTitle}>Hand Tuner</div>
          <div className={styles.handDebugButtons}>
            <button type="button" onClick={() => setTransformMode('translate')}>
              Move
            </button>
            <button type="button" onClick={() => setTransformMode('rotate')}>
              Rotate
            </button>
            <button type="button" onClick={() => setTransformMode('scale')}>
              Scale
            </button>
          </div>
          <pre className={styles.handDebugCode}>{debugCode}</pre>
        </div>
      )}
    </>
  );
};

useGLTF.preload('/models/rigged-hand.glb');

export default ThreeHandLayer;
