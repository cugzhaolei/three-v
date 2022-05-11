<template>
  <div class="boxs">
    <div class="maskLoading" v-if="isLoading">
      <div class="loading">
        <div :style="{ width: loadingWidth + '%' }"></div>
      </div>
      <div style="padding-left: 10px">{{ parseInt(loadingWidth) }}%</div>
    </div>
    <div class="mask">
      <p>x : {{ x }} y:{{ y }} z :{{ z }}</p>
      <button @click="autoRotate">转动</button>
      <button @click="stopRotate">停止</button>

      <button v-if="robot.robot" @click="robotAnimate">机器人运动</button>
      <button v-if="robot.robot" @click="stopRobotAnimate">机器人停止</button>

      <div class="flex">
        <div
          @click="setColor(index)"
          v-for="(item, index) in colorArray"
          :style="{ backgroundColor: item }"
          :key="index"
        ></div>
      </div>
    </div>
  </div>
</template>
<script lang="ts" setup>
import { onMounted, reactive, ref, toRefs } from "vue";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";
import {
  Scene,
  WebGLRenderer,
  PerspectiveCamera,
  ImageUtils,
  TextureLoader,
  HemisphereLight,
  HemisphereLightHelper,
  DirectionalLight,
  DirectionalLightHelper,
  Color,
  Mesh,
  Group,
  MeshLambertMaterial,
  PlaneGeometry,
  DoubleSide,
  Box3,
  AnimationMixer,
  AmbientLight,
} from "three";

import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader";
import Stats from "three/examples/jsm/libs/stats.module";
// import * as TWEEN from "../../public/tween/dist/tween.esm"
import { TWEEN } from "three/examples/jsm/libs/tween.module.min.js";
let stats = Stats();

let colorArray = [
  "rgb(216, 27, 67)",
  "rgb(142, 36, 170)",
  "rgb(81, 45, 168)",
  "rgb(48, 63, 159)",
  "rgb(30, 136, 229)",
  "rgb(0, 137, 123)",
  "rgb(67, 160, 71)",
  "rgb(251, 192, 45)",
  "rgb(245, 124, 0)",
  "rgb(230, 74, 25)",
  "rgb(233, 30, 78)",
  "rgb(156, 39, 176)",
  "rgb(0, 0, 0)",
]; // 车身颜色数组

let scene: Scene,
  renderer: WebGLRenderer,
  camera: PerspectiveCamera,
  directionalLight: DirectionalLight,
  hemisphereLight: HemisphereLight,
  ambientLight: AmbientLight,
  dhelper: DirectionalLightHelper,
  hHelper: HemisphereLightHelper,
  controls: OrbitControls;
let isLoading = ref(true); // 是否显示loading，监听loading模型的进度
let loadingWidth = ref(0); // 加载进度显示
let loader: GLTFLoader; // gltf文件加载器
let car: any = {
  wheel: null,
  main: null,
  door: null,
}; // 加载的汽车模型
let robot: any = {
  robot: null,
  bottom: null,
  armHeader: null,
  sole: null,
  arm001: null,
  fork001: null,
  pully001: null,
  tong001: null,
  mixer2: null,
};
let textureLoader = new TextureLoader(); // 材质加载器
let marker;
let orbitControls: OrbitControls;
let animateTime;

//相机的默认坐标
const defaultMap = {
  x: 50,
  y: 10,
  z: 0,
};

let map = reactive(defaultMap); // 把相机坐标设置为可观察对象
let { x, y, z } = toRefs(map); // 输出坐标

/** 创建场景 */
const setScene = () => {
  scene = new Scene();
  renderer = new WebGLRenderer();
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.setSize(innerWidth, innerHeight);
  renderer.setClearColor(0xc9c9c9, 1);
  document.querySelector(".boxs").appendChild(renderer.domElement);
};

/** 创建相机 */
const setCamera = () => {
  const { x, y, z } = defaultMap;
  camera = new PerspectiveCamera(60, innerWidth / innerHeight, 1, 1000);
  camera.position.set(x, y, z);
};

/** 设置场景灯光 */
const setLight = () => {
  directionalLight = new DirectionalLight(0xffffff, 5);
  directionalLight.position.set(-4, 8, 4);
  dhelper = new DirectionalLightHelper(directionalLight, 5, 0xff0000);
  hemisphereLight = new HemisphereLight(0xffffff, 0xffffff, 5);
  hemisphereLight.position.set(0, 8, 0);
  hHelper = new HemisphereLightHelper(hemisphereLight, 5);
  scene.add(directionalLight, hemisphereLight);
  ambientLight = new AmbientLight(0xffffff, 5);
  ambientLight.position.set(0, 10, 0);
  scene.add(ambientLight);
};

/** 设置轨道控制器 */
const setControls = () => {
  controls = new OrbitControls(camera, renderer.domElement);
  /**  */
  controls.maxPolarAngle = (0.9 * Math.PI) / 2;
  /** 是否开启缩放 */
  controls.enableZoom = true;
  /** 是否开启右键拖拽 */
  controls.enablePan = true;
  controls.addEventListener("change", render);
};

/** 渲染场景 */
const render = () => {
  map.x = camera.position.x;
  map.y = camera.position.y;
  map.z = camera.position.z;
};

/** 循环渲染 场景 相机 和位置更新 */
const animate = () => {
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
  controls.update();
  stats.update();
  TWEEN.update();
};

/** 设置模型动画 */
const setTweens = (obj, newObj, duration = 1500) => {
  var ro = new TWEEN.Tween(obj);
  ro.to(newObj, duration); // 变化后的位置以及动画时间
  ro.easing(TWEEN.Easing.Sinusoidal.InOut);
  ro.onUpdate(function () {});
  ro.onComplete(function () {});
  ro.start();
};

/** 是否自动转动 */
const autoRotate = () => {
  controls.autoRotate = true;
};

/** 停止自动转动 */
const stopRotate = () => {
  controls.autoRotate = false;
};

/** 设置颜色 */
const setColor = (index) => {
  const currentColor = new Color(colorArray[index]);
  scene.traverse((child) => {
    if (child instanceof Mesh) {
      console.log(child.name);
      if (child.name.includes("")) {
        child.material.color.set(currentColor);
      }
    }
  });
};

const loadWithDraco = (module: GLTFLoader, url): any => {
  return new Promise((resovle, reject) => {
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath("../../public/models/draco/");

    module.setDRACOLoader(dracoLoader);
    dracoLoader.load(
      url,
      (gltf) => {
        resovle(gltf);
      },
      ({ loaded, total }) => {
        let load = Math.abs((loaded / total) * 100);
        loadingWidth.value = load;
        if (load >= 100) {
          setTimeout(() => {
            isLoading.value = false;
          }, 1000);
        }
        console.log((loaded / total) * 100 + "% loaded");
      },
      (err) => {
        reject(err);
      }
    );
  });
};

/** 通过Promise处理一下loadfile函数 */
const loadFile = (url): any => {
  loader = new GLTFLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        resolve(gltf);
      },
      ({ loaded, total }) => {
        let load = Math.abs((loaded / total) * 100);
        loadingWidth.value = load;
        if (load >= 100) {
          setTimeout(() => {
            isLoading.value = false;
          }, 1000);
        }
        console.log(load + "% loaded");
      },
      (err) => {
        reject(err);
      }
    );
  });
};

const loadFBX = (url) => {
  const loader = new FBXLoader();
  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (fbx) => resolve(fbx),
      ({ loaded, total }) => {
        let load = Math.abs((loaded / total) * 100);
        loadingWidth.value = load;
        if (loaded >= 100) {
          setTimeout(() => {
            isLoading.value = false;
          }, 1000);
        }
        console.log(load + "% loaded");
      }
    );
  });
};

const processFBX = (obj) => {
  obj.scale.set(0.004, 0.008, 0.004);
  obj.position.set(0, 0, -4);
  obj.rotation.set(0, -41, 0);
  car.wheel = obj.children[1].children[5].children;
  car.wheel.map((cell) => {
    cell.rotation.set(cell.rotation.x, -0.5 * Math.PI, cell.rotation.z);
  });
  console.log("obj:", obj);
  obj.name = "cart";
  car.door = obj.children[1].children[3].children[0].children;
  const texture = textureLoader.load("../../public/models/marker3.png");
  car.main = [
    obj.children[1].children[0],
    ...obj.children[1].children[1].children,
    ...obj.children[1].children[3].children,
  ];
  car.trim = [
    ...obj.children[1].children[2].children,
    ...obj.children[1].children[4].children,
    ...obj.children[1].children[6].children,
  ];
  const marker = new Mesh( // 创建平面
    new PlaneGeometry(1, 1),
    new MeshLambertMaterial({
      map: texture,
      aoMapIntensity: 0,
      side: DoubleSide,
      opacity: 0.1,
      transparent: true,
      depthTest: false,
    })
  );
  car.marker = marker;
  marker.position.set(2.5, 3, 3);
  marker.rotation.y = 0.5 * Math.PI;
  var group = new Group();
  group.add(obj);
  group.add(marker);
  scene.add(group);
};

const addStats = () => {
  stats = Stats();
  document.querySelector(".boxs").appendChild(stats.domElement);
};

const robotAnimate = () => {
  //   robot.robot = gltf;
  //   console.log(gltf);
  //   robot.robot = gltf;
  //   robot.bottom = gltf.scene.children[1];

  //   robot.sole = gltf.scene.children[0];
  //   robot.arm001 = gltf.scene.children[0].children[2];
  //   robot.armHeader = gltf.scene.children[0].children[2].children[0];
  //   robot.fork001 = gltf.scene.children[0].children[2].children[0].children[4];
  //   robot.pulley001 =
  //     gltf.scene.children[0].children[2].children[0].children[4].children[4];
  //   robot.tong001 =
  //     gltf.scene.children[0].children[2].children[0].children[4].children[4].children[3];

  const gltf = robot.robot;

  const object = gltf.scene;
  object.position.set(0, 0, 0);
  object.rotation.set(0,-90,0)
  // 中电
  const bbox = new Box3();
  object.traverse(function (node) {
    if (node.isMesh) node.castShadow = true;
    bbox.expandByObject(object);
  });
  // get the animation
  console.log("gltf.animations[0]:", gltf.animations);
  robot.mixer2 = new AnimationMixer(object);
  // that.mixer2.clipAction(gltf.animations[0]).play();
  object.scale.set(1, 1, 1);

  controls.reset(); // 回到初始化视角

  const setCircle = (num: number, upperLimit?, lowerLimit?) => {
    // console.log("before", num);

    if (!!upperLimit && !!lowerLimit) {
      if (num > upperLimit) {
        num = lowerLimit;
      } else if (num < lowerLimit) {
        num = upperLimit;
      }
      return parseFloat((num % 360).toString()).toPrecision(3);
    }
    // console.log("after", num);
  };

  animateTime = setInterval(() => {
    setTweens(
      robot.sole.rotation,
      {
        x: robot.sole.rotation.x,
        y: robot.sole.rotation.y,
        z: setCircle(robot.sole.rotation.z + 1, 360, 0),
      },
      1000
    );

    console.log(
      "sole",
      robot.sole.rotation.x,
      robot.sole.rotation.y,
      robot.sole.rotation.z
    );

    setTweens(
      robot.arm001.rotation,
      {
        x: robot.arm001.rotation.x,
        y: setCircle(robot.arm001.rotation.y + 0.05, 1, -1),
        z: robot.arm001.rotation.z,
      },
      1000
    );

    console.log(
      "arm001",
      robot.arm001.rotation.x,
      robot.arm001.rotation.y,
      robot.arm001.rotation.z
    );

    setTweens(
      robot.armHeader.rotation,
      {
        x: robot.armHeader.rotation.x,
        y: setCircle(robot.armHeader.rotation.y + 0.02, 0.2, -0.4),
        z: robot.armHeader.rotation.z,
      },
      1000
    );

    console.log(
      "armHeader",
      robot.armHeader.rotation.x,
      robot.armHeader.rotation.y,
      robot.armHeader.rotation.z
    );

    setTweens(
      robot.tong001.rotation,
      {
        x: robot.tong001.rotation.x,
        y: robot.tong001.rotation.y,
        z: setCircle(robot.tong001.rotation.z + 1, 360, -360),
      },
      1000
    );

    console.log(
      "tong001",
      robot.tong001.rotation.x,
      robot.tong001.rotation.y,
      robot.tong001.rotation.z
    );
  }, 1000);
};

const stopRobotAnimate = () => {
  clearInterval(animateTime);

  setTimeout(() => {
    setTweens(camera.position, { x: 50, y: 10, z: 0 }, 1000);
    console.log("this.camera.up:", camera.up);
    camera.lookAt(camera.position);
    renderer.render(scene, camera);
    controls.reset(); // 回到初始化视角
    setTimeout(() => {}, 1000);
  }, 1000);
};

//初始化所有函数
const init = async () => {
  console.log(stats);

  setScene();
  setCamera();
  setLight();
  setControls();
  addStats();

  const loader = new GLTFLoader();
  const robotUrl = `../../public/models/zhongzhuan001.glb`;
  const ferarrisUrl = `../../public/models/ferrari.glb`;

  const gltf = await loadFile(robotUrl);

  if (gltf?.scene?.children[0].name == "sole") {
    robot.robot = gltf;
    console.log(gltf);
    robot.robot = gltf;
    robot.bottom = gltf.scene.children[1];

    robot.sole = gltf.scene.children[0];
    robot.arm001 = gltf.scene.children[0].children[2];
    robot.armHeader = gltf.scene.children[0].children[2].children[0];
    robot.fork001 = gltf.scene.children[0].children[2].children[0].children[4];
    robot.pulley001 =
      gltf.scene.children[0].children[2].children[0].children[4].children[4];
    robot.tong001 =
      gltf.scene.children[0].children[2].children[0].children[4].children[4].children[3];

    console.log(robot);
  }

  //const fbx = await loadFBX("../../public/models/MBSL.fbx");
  //processFBX(fbx);

  console.log(gltf);

  scene.add(gltf.scene);

  animate();
};
//用vue钩子函数调用
onMounted(init);
</script>
<style scoped>
body {
  margin: 0;
}

.maskLoading {
  background: #ccc;
  position: fixed;
  display: flex;
  justify-content: center;
  align-items: center;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  z-index: 1111111;
  color: #fff;
}

.maskLoading .loading {
  width: 400px;
  height: 20px;
  border: 1px solid #fff;
  background: #000;
  overflow: hidden;
  border-radius: 10px;
}

.maskLoading .loading div {
  background: #fff;
  height: 20px;
  width: 0;
  transition-duration: 500ms;
  transition-timing-function: ease-in;
}

canvas {
  width: 100%;
  height: 100%;
  margin: auto;
}

.mask {
  color: #fff;
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
}

.flex {
  display: flex;
  flex-wrap: wrap;
  padding: 20px;
  justify-content: center;
}

.flex div {
  width: 10px;
  height: 10px;
  margin: 5px;
  cursor: pointer;
}
</style>
