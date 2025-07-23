import { ARButton } from 'https://cdn.jsdelivr.net/npm/three@0.160.0/examples/jsm/webxr/ARButton.js';

let scene, camera, renderer, model, hitTestSource = null, hitTestSourceRequested = false;
let net, personDetected = false;

async function initCameraDetection(video) {
  const stream = await navigator.mediaDevices.getUserMedia({ video: true });
  video.srcObject = stream;
  return new Promise(res => video.onloadedmetadata = res);
}

async function loadBodyPix(video) {
  net = await bodyPix.load();
  setInterval(async () => {
    const segmentation = await net.segmentPerson(video);
    personDetected = segmentation.allPoses.length > 0;
  }, 500);
}

function initThree() {
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.01, 20);

  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.xr.enabled = true;
  document.body.appendChild(renderer.domElement);

  document.body.appendChild(ARButton.createButton(renderer, { requiredFeatures: ['hit-test'] }));

  const light = new THREE.HemisphereLight(0xffffff, 0xbbbbff, 1);
  scene.add(light);

  const loader = new THREE.GLTFLoader();
  loader.load('model.glb', (gltf) => {
    model = gltf.scene;
    model.scale.set(0.3, 0.3, 0.3);
    model.visible = false;
    scene.add(model);
  });
}

function animate() {
  renderer.setAnimationLoop(render);
}

function render(timestamp, frame) {
  if (frame && hitTestSourceRequested === false) {
    const session = renderer.xr.getSession();
    session.requestReferenceSpace('viewer').then(refSpace => {
      session.requestHitTestSource({ space: refSpace }).then(source => hitTestSource = source);
    });
    session.addEventListener('end', () => { hitTestSourceRequested = false; hitTestSource = null; });
    hitTestSourceRequested = true;
  }

  if (hitTestSource && frame) {
    const referenceSpace = renderer.xr.getReferenceSpace();
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0 && model) {
      const hitPose = hitTestResults[0].getPose(referenceSpace);
      model.position.set(hitPose.transform.position.x, hitPose.transform.position.y, hitPose.transform.position.z);
      model.visible = personDetected;
    }
  }

  if (model) model.rotation.y += 0.01;
  renderer.render(scene, camera);
}

(async function() {
  const video = document.getElementById('video');
  await initCameraDetection(video);
  await loadBodyPix(video);
  initThree();
  animate();
})();
