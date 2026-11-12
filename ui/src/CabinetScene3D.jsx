import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import "./CabinetScene3D.css";

export const PLAN_PIXELS_PER_MM = 0.18;

const MM_TO_METERS = 0.001;

function getFinishColor(value, isCarcass = false) {
  const finish = String(value || "").toLowerCase();
  if (finish.includes("oak") || finish.includes("wood")) return "#b88755";
  if (finish.includes("storm") || finish.includes("grey") || finish.includes("gray")) return "#858a8d";
  if (finish.includes("folkstone")) return "#c8c3b6";
  if (finish.includes("nata")) return "#e2d5be";
  if (finish.includes("paint")) return "#d9e3df";
  if (finish.includes("supermatte")) return "#555c62";
  if (finish.includes("quartz")) return "#c5c6c3";
  if (finish.includes("granite")) return "#42474b";
  if (finish.includes("compact")) return "#8d8982";
  if (finish.includes("block")) return "#b88755";
  return isCarcass ? "#e5e3dd" : "#f1efe9";
}

function addBox(parent, dimensions, position, material, castShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...dimensions), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCornerShape(parent, width, depth, armDepth, thickness, position, material) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.lineTo(width, 0);
  shape.lineTo(width, depth);
  shape.lineTo(armDepth, depth);
  shape.lineTo(armDepth, armDepth);
  shape.lineTo(0, armDepth);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    steps: 1,
  });
  geometry.rotateX(Math.PI / 2);
  geometry.translate(...position);

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createCabinet(unit, roomHeightMeters, worktop) {
  const type = unit.spec.type || "base";
  const width = Math.max(0.15, Number(unit.width) || Number(unit.spec.width) || 600) * MM_TO_METERS;
  const height = Math.max(0.3, Number(unit.height) || Number(unit.spec.height) || 720) * MM_TO_METERS;
  const depth = Math.max(0.2, Number(unit.depth) || Number(unit.spec.depth) || 570) * MM_TO_METERS;
  const x = Math.max(0, Number(unit.x) || 0) / PLAN_PIXELS_PER_MM * MM_TO_METERS;
  const z = Math.max(0, Number(unit.y) || 0) / PLAN_PIXELS_PER_MM * MM_TO_METERS;
  const toeKick = type === "wall" ? 0 : Math.min(0.1, height * 0.12);
  const bodyHeight = Math.max(0.1, height - toeKick);
  const cabinetBottom = type === "wall"
    ? Math.max(0.1, roomHeightMeters - height - 0.6)
    : toeKick;
  const centerX = x + width / 2;
  const centerZ = z + depth / 2;
  const group = new THREE.Group();
  group.userData.unitId = unit.id;

  const carcassMaterial = new THREE.MeshStandardMaterial({
    color: getFinishColor(unit.materials?.carcass, true),
    roughness: 0.72,
  });
  const doorMaterial = new THREE.MeshStandardMaterial({
    color: getFinishColor(unit.materials?.doors),
    roughness: 0.54,
  });
  const darkMaterial = new THREE.MeshStandardMaterial({ color: "#22282d", roughness: 0.28 });
  const metalMaterial = new THREE.MeshStandardMaterial({ color: "#7c858b", metalness: 0.72, roughness: 0.28 });
  const handleMaterial = new THREE.MeshStandardMaterial({ color: "#343a3e", metalness: 0.58, roughness: 0.32 });
  const special = String(unit.spec.special || "").toLowerCase();
  const isCorner = special.includes("corner");
  const armDepth = Math.min(width, depth) * 0.3;
  const frontZ = z + depth + 0.012;

  if (isCorner) {
    addCornerShape(
      group,
      width,
      depth,
      armDepth,
      bodyHeight,
      [x, cabinetBottom + bodyHeight, z],
      carcassMaterial,
    );
  } else {
    addBox(
      group,
      [width, bodyHeight, depth],
      [centerX, cabinetBottom + bodyHeight / 2, centerZ],
      carcassMaterial,
    );
  }

  if (toeKick > 0) {
    if (isCorner) {
      addBox(
        group,
        [Math.max(0.08, armDepth - 0.025), toeKick * 0.72, 0.025],
        [x + armDepth / 2, toeKick * 0.38, z + armDepth + 0.006],
        handleMaterial,
      );
      const sideToeKick = addBox(
        group,
        [Math.max(0.08, depth - armDepth - 0.025), toeKick * 0.72, 0.025],
        [z + (depth + armDepth) / 2, toeKick * 0.38, x + armDepth - 0.006],
        handleMaterial,
      );
      sideToeKick.rotation.y = Math.PI / 2;
    } else {
      addBox(
        group,
        [Math.max(0.08, width - 0.025), toeKick * 0.72, 0.025],
        [centerX, toeKick * 0.38, z + depth + 0.006],
        handleMaterial,
      );
    }
  }

  const doorCount = Math.max(0, Number(unit.doors) || Number(unit.spec.doors) || 0);
  const drawerCount = Math.max(0, Number(unit.drawers) || Number(unit.spec.drawers) || 0);
  const frontHeight = bodyHeight * 0.94;
  const frontY = cabinetBottom + bodyHeight / 2;
  const frontWidth = Math.max(0.08, width - 0.022);

  if (isCorner) {
    const panelThickness = 0.025;
    const panelHeight = frontHeight;
    const panelInset = 0.012;

    addBox(
      group,
      [Math.max(0.08, armDepth - 0.022), panelHeight, panelThickness],
      [x + armDepth / 2, frontY, z + armDepth + panelInset],
      doorMaterial,
    );

    const sidePanel = addBox(
      group,
      [Math.max(0.08, depth - armDepth - 0.022), panelHeight, panelThickness],
      [z + (depth + armDepth) / 2, frontY, x + armDepth - panelInset],
      doorMaterial,
    );
    sidePanel.rotation.y = Math.PI / 2;

    const frontHandle = addBox(
      group,
      [0.012, Math.min(0.14, panelHeight * 0.2), 0.018],
      [x + armDepth * 0.76, frontY, z + armDepth + panelInset + 0.022],
      handleMaterial,
    );
    const sideHandle = addBox(
      group,
      [0.012, Math.min(0.14, panelHeight * 0.2), 0.018],
      [z + (depth + armDepth) / 2, frontY, x + armDepth - panelInset - 0.022],
      handleMaterial,
    );
    frontHandle.rotation.z = Math.PI / 2;
    sideHandle.rotation.y = Math.PI / 2;
    sideHandle.rotation.z = Math.PI / 2;

    const shelfCount = Math.max(0, Number(unit.shelves) || Number(unit.spec.shelves) || 0);
    for (let index = 1; index <= shelfCount; index += 1) {
      const shelfMaterial = carcassMaterial.clone();
      addCornerShape(
        group,
        Math.max(0.08, width - 0.04),
        Math.max(0.08, depth - 0.04),
        Math.max(0.06, armDepth - 0.02),
        0.018,
        [
          x + 0.02,
          cabinetBottom + (bodyHeight * index) / (shelfCount + 1) + 0.009,
          z + 0.02,
        ],
        shelfMaterial,
      );
    }
  } else if (special.includes("fridge")) {
    addBox(group, [frontWidth, frontHeight, 0.025], [centerX, frontY, frontZ], darkMaterial);
    addBox(
      group,
      [0.014, Math.min(0.32, frontHeight * 0.28), 0.025],
      [x + width - 0.065, frontY, frontZ + 0.021],
      metalMaterial,
    );
  } else if (special.includes("oven")) {
    addBox(group, [frontWidth, frontHeight, 0.025], [centerX, frontY, frontZ], doorMaterial);
    const ovenHeight = Math.min(0.42, frontHeight * 0.64);
    addBox(
      group,
      [frontWidth * 0.76, ovenHeight, 0.018],
      [centerX, frontY - 0.035, frontZ + 0.023],
      darkMaterial,
    );
    addBox(
      group,
      [frontWidth * 0.76, 0.035, 0.018],
      [centerX, frontY + ovenHeight / 2 + 0.03, frontZ + 0.023],
      metalMaterial,
    );
  } else if (drawerCount > 0 || unit.frontType === "Drawers") {
    const rows = Math.max(1, drawerCount || 3);
    const gap = 0.006;
    const drawerHeight = (frontHeight - gap * (rows - 1)) / rows;
    for (let index = 0; index < rows; index += 1) {
      const drawerY = cabinetBottom + drawerHeight / 2 + index * (drawerHeight + gap);
      addBox(group, [frontWidth, drawerHeight, 0.025], [centerX, drawerY, frontZ], doorMaterial);
      addBox(
        group,
        [Math.min(0.16, width * 0.24), 0.012, 0.014],
        [centerX, drawerY, frontZ + 0.022],
        handleMaterial,
      );
    }
  } else if (unit.frontType === "Open") {
    const shelfCount = Math.max(1, Number(unit.shelves) || 1);
    for (let index = 1; index <= shelfCount; index += 1) {
      addBox(
        group,
        [width * 0.9, 0.018, depth * 0.84],
        [centerX, cabinetBottom + (bodyHeight * index) / (shelfCount + 1), centerZ],
        carcassMaterial,
      );
    }
  } else if (!special.includes("extractor")) {
    const panels = Math.max(1, doorCount);
    const gap = 0.005;
    const panelWidth = (frontWidth - gap * (panels - 1)) / panels;
    for (let index = 0; index < panels; index += 1) {
      const panelX = x + panelWidth / 2 + index * (panelWidth + gap) + 0.011;
      addBox(group, [panelWidth, frontHeight, 0.025], [panelX, frontY, frontZ], doorMaterial);
      addBox(
        group,
        [0.012, Math.min(0.14, frontHeight * 0.2), 0.018],
        [panelX + panelWidth * 0.37, frontY, frontZ + 0.022],
        handleMaterial,
      );
    }
  }

  if (special.includes("extractor")) {
    addBox(
      group,
      [width * 0.72, 0.055, 0.2],
      [centerX, cabinetBottom + 0.14, frontZ + 0.045],
      metalMaterial,
    );
  }

  if (type === "base" && worktop) {
    const worktopMaterial = new THREE.MeshStandardMaterial({
      color: getFinishColor(worktop.type),
      roughness: String(worktop.type || "").toLowerCase().includes("granite") ? 0.3 : 0.48,
    });
    if (isCorner) {
      addCornerShape(
        group,
        width + 0.025,
        depth + 0.06,
        armDepth + 0.0125,
        0.04,
        [x - 0.0125, height + 0.04, z - 0.02],
        worktopMaterial,
      );
    } else {
      addBox(
        group,
        [width + 0.025, 0.04, depth + 0.06],
        [centerX, height + 0.02, centerZ - 0.01],
        worktopMaterial,
      );
    }
  }

  return group;
}

export default function CabinetScene3D({
  units,
  selectedId,
  onSelect,
  roomWidthMm,
  roomDepthMm,
  roomHeightMm,
  worktop,
}) {
  const mountRef = useRef(null);
  const controlsRef = useRef(null);
  const cabinetGroupsRef = useRef(new Map());
  const viewStateRef = useRef(null);
  const [rendererError, setRendererError] = useState("");

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    let renderer;
    let errorUpdateTimer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    } catch {
      errorUpdateTimer = window.setTimeout(() => {
        setRendererError("This browser or graphics driver could not start WebGL for the 3D view.");
      }, 0);
      return () => window.clearTimeout(errorUpdateTimer);
    }

    errorUpdateTimer = window.setTimeout(() => setRendererError(""), 0);
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#e8edf2");
    scene.add(new THREE.HemisphereLight("#ffffff", "#858078", 1.4));

    const roomHeight = Math.max(1800, Number(roomHeightMm) || 2700) * MM_TO_METERS;
    const preparedUnits = units.map((unit) => ({
      ...unit,
      spec: unit.spec || {},
    }));
    const cabinetBounds = preparedUnits.map((unit) => {
      const width = Number(unit.width) || Number(unit.spec.width) || 600;
      const depth = Number(unit.depth) || Number(unit.spec.depth) || 570;
      const height = Number(unit.height) || Number(unit.spec.height) || 720;
      const bottom = unit.spec.type === "wall" ? Math.max(0.1, roomHeight - height * MM_TO_METERS - 0.6) : 0;
      const left = Math.max(0, Number(unit.x) || 0) / PLAN_PIXELS_PER_MM * MM_TO_METERS;
      const near = Math.max(0, Number(unit.y) || 0) / PLAN_PIXELS_PER_MM * MM_TO_METERS;
      const widthMeters = width * MM_TO_METERS;
      const depthMeters = depth * MM_TO_METERS;
      const heightMeters = height * MM_TO_METERS;
      return {
        left,
        right: left + widthMeters,
        near,
        far: near + depthMeters,
        bottom,
        top: bottom + heightMeters,
      };
    });
    const roomWidth = Math.max(
      2400,
      Number(roomWidthMm) || 3600,
      ...cabinetBounds.map((bounds) => bounds.right / MM_TO_METERS + 200),
    ) * MM_TO_METERS;
    const roomDepth = Math.max(
      2000,
      Number(roomDepthMm) || 3000,
      ...cabinetBounds.map((bounds) => bounds.far / MM_TO_METERS + 200),
    ) * MM_TO_METERS;
    const longestSide = Math.max(roomWidth, roomDepth, roomHeight);

    const floorMaterial = new THREE.MeshStandardMaterial({ color: "#c5c1b8", roughness: 0.82 });
    const wallMaterial = new THREE.MeshStandardMaterial({ color: "#f4f2ed", roughness: 0.9 });
    const sideWallMaterial = new THREE.MeshStandardMaterial({ color: "#e5e3de", roughness: 0.9 });
    addBox(scene, [roomWidth, 0.025, roomDepth], [roomWidth / 2, -0.015, roomDepth / 2], floorMaterial, false);
    addBox(scene, [roomWidth, roomHeight, 0.035], [roomWidth / 2, roomHeight / 2, -0.018], wallMaterial, false);
    addBox(scene, [0.035, roomHeight, roomDepth], [-0.018, roomHeight / 2, roomDepth / 2], sideWallMaterial, false);

    const gridSize = Math.max(roomWidth, roomDepth);
    const grid = new THREE.GridHelper(gridSize, Math.max(12, Math.round(gridSize * 4)), "#a7a69f", "#d4d1c9");
    grid.position.set(roomWidth / 2, 0.002, roomDepth / 2);
    scene.add(grid);

    const keyLight = new THREE.DirectionalLight("#fff5df", 2.2);
    keyLight.position.set(roomWidth * 0.7, roomHeight * 1.25, roomDepth * 0.8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(1024, 1024);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight("#dce8ff", 1.1);
    fillLight.position.set(-roomWidth, roomHeight * 0.8, roomDepth);
    scene.add(fillLight);

    const aspect = Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight);
    const camera = new THREE.PerspectiveCamera(42, aspect, 0.01, longestSide * 30);
    const hasCabinets = cabinetBounds.length > 0;
    const contentBounds = hasCabinets
      ? {
          left: Math.min(...cabinetBounds.map((bounds) => bounds.left)),
          right: Math.max(...cabinetBounds.map((bounds) => bounds.right)),
          near: Math.min(...cabinetBounds.map((bounds) => bounds.near)),
          far: Math.max(...cabinetBounds.map((bounds) => bounds.far)),
          bottom: Math.min(...cabinetBounds.map((bounds) => bounds.bottom)),
          top: Math.max(...cabinetBounds.map((bounds) => bounds.top)),
        }
      : { left: 0, right: roomWidth, near: 0, far: roomDepth, bottom: 0, top: roomHeight };
    const contentWidth = contentBounds.right - contentBounds.left;
    const contentDepth = contentBounds.far - contentBounds.near;
    const contentHeight = contentBounds.top - contentBounds.bottom;
    const viewExtent = Math.max(contentWidth, contentDepth, contentHeight, 1.2);
    const target = new THREE.Vector3(
      (contentBounds.left + contentBounds.right) / 2,
      contentBounds.bottom + contentHeight * 0.55,
      (contentBounds.near + contentBounds.far) / 2,
    );
    camera.position.set(
      target.x + viewExtent * 1.75,
      target.y + viewExtent * 1.15,
      target.z + viewExtent * 2.1,
    );

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(Math.max(1, mount.clientWidth), Math.max(1, mount.clientHeight));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = "cabinet-scene-canvas";
    renderer.domElement.setAttribute("aria-label", "Interactive 3D room and cabinet preview");
    mount.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.maxPolarAngle = Math.PI / 2 - 0.03;
    controls.minDistance = Math.max(0.4, viewExtent * 0.5);
    controls.maxDistance = longestSide * 5;
    controls.target.copy(target);
    if (viewStateRef.current) {
      camera.position.copy(viewStateRef.current.position);
      camera.zoom = viewStateRef.current.zoom;
      camera.updateProjectionMatrix();
      controls.target.copy(viewStateRef.current.target);
      viewStateRef.current = null;
    }
    controls.saveState();
    controlsRef.current = controls;

    const groups = new Map();
    for (const unit of preparedUnits) {
      const cabinet = createCabinet(unit, roomHeight, worktop);
      groups.set(unit.id, cabinet);
      scene.add(cabinet);
    }
    cabinetGroupsRef.current = groups;

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerOrigin = null;
    const onPointerDown = (event) => {
      pointerOrigin = { x: event.clientX, y: event.clientY };
    };
    const onPointerUp = (event) => {
      if (!pointerOrigin) return;
      const moved = Math.hypot(event.clientX - pointerOrigin.x, event.clientY - pointerOrigin.y);
      pointerOrigin = null;
      if (moved > 5) return;

      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.set(
        ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
        -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
      );
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(Array.from(groups.values()), true);
      let selectedObject = hits[0]?.object || null;
      while (selectedObject && !selectedObject.userData.unitId) {
        selectedObject = selectedObject.parent;
      }
      if (selectedObject?.userData.unitId) onSelect(selectedObject.userData.unitId);
    };

    renderer.domElement.addEventListener("pointerdown", onPointerDown);
    renderer.domElement.addEventListener("pointerup", onPointerUp);

    const resizeObserver = new ResizeObserver(() => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(mount);

    let animationFrame = 0;
    const renderFrame = () => {
      controls.update();
      renderer.render(scene, camera);
      animationFrame = window.requestAnimationFrame(renderFrame);
    };
    renderFrame();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.clearTimeout(errorUpdateTimer);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", onPointerDown);
      renderer.domElement.removeEventListener("pointerup", onPointerUp);
      viewStateRef.current = {
        position: camera.position.clone(),
        target: controls.target.clone(),
        zoom: camera.zoom,
      };
      controls.dispose();
      controlsRef.current = null;
      cabinetGroupsRef.current = new Map();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          materials.forEach((material) => material.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [onSelect, roomDepthMm, roomHeightMm, roomWidthMm, units, worktop]);

  useEffect(() => {
    for (const [unitId, group] of cabinetGroupsRef.current.entries()) {
      const isSelected = unitId === selectedId;
      group.traverse((object) => {
        if (!object.isMesh || !object.material?.emissive) return;
        object.material.emissive.set(isSelected ? "#0e8b89" : "#000000");
        object.material.emissiveIntensity = isSelected ? 0.12 : 0;
      });
    }
  }, [selectedId]);

  return (
    <div className="cabinet-scene-shell">
      <div className="cabinet-scene-mount" ref={mountRef} />
      {rendererError && <p className="cabinet-scene-error" role="alert">{rendererError}</p>}
      {!rendererError && units.length === 0 && (
        <p className="cabinet-scene-empty">Add cabinets to see the room in 3D.</p>
      )}
      {!rendererError && (
        <>
          <div className="cabinet-scene-toolbar">
            <button type="button" className="ghost" onClick={() => controlsRef.current?.reset()}>
              Reset view
            </button>
            <span>{units.length} cabinet{units.length === 1 ? "" : "s"}</span>
          </div>
          <div className="cabinet-scene-hint">Drag to orbit · scroll to zoom · click a cabinet to select</div>
        </>
      )}
    </div>
  );
}
