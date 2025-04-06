import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 1000 );


const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const texture = new THREE.TextureLoader().load('textures/crate.gif');
const material = new THREE.MeshBasicMaterial({ map: texture });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);


let controls: OrbitControls | null = null;
camera.position.z = 5;

let renderer: THREE.WebGLRenderer | null = null;

function animate() {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;

  if (renderer) {
    renderer.render( scene, camera );
  }

  if (controls) {
    controls.update();
  }
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  if (renderer) {
    renderer.setSize( window.innerWidth, window.innerHeight );
  }
}

export function setupRenderer(container: HTMLElement) {
  if (renderer) {
    container.removeChild(renderer.domElement);
    renderer.dispose();
  }

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setAnimationLoop(animate);
  container.appendChild(renderer.domElement)

  controls = new OrbitControls(camera, renderer.domElement);

  window.addEventListener( 'resize', onWindowResize );
}

