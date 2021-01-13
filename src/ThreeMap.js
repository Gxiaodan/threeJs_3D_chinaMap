import * as d3 from 'd3-geo';

// const THREE = window.THREE;

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';

import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';

// import { GeometryUtils } from 'three/examples/jsm/utils/GeometryUtils';
// 初始化一个场景
export default class ThreeMap {
  constructor(set) {
    this.mapData = set.mapData;
    this.color = 'rgba(23,35,93,0.5)';
    this.init();
  }

  /**
   * @desc 初始化场景
   */
  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 1, 1000);

    this.setCamera({ x: 250, y: 0, z: 250 });
    this.setLight();
    this.setRender();

    this.setHelper();

    this.drawMap();

    this.setControl();
    this.animate();

    document.body.addEventListener('click', this.mouseEvent.bind(this));
  }

  /**
   * @desc 鼠标事件处理
   */
  mouseEvent(event) {
    if (!this.raycaster) {
      this.raycaster = new THREE.Raycaster();
    }
    if (!this.mouse) {
      this.mouse = new THREE.Vector2();
    }
    if (!this.meshes) {
      this.meshes = [];
      this.group.children.forEach(g => {
        g.children.forEach(mesh => {
          this.meshes.push(mesh);
        });
      });
    }

    // 将鼠标位置归一化为设备坐标。x 和 y 方向的取值范围是 (-1 to +1)
    this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // 通过摄像机和鼠标位置更新射线
    this.raycaster.setFromCamera(this.mouse, this.camera);

    // 计算物体和射线的焦点
    const intersects = this.raycaster.intersectObjects(this.meshes);
    if (intersects.length > 0) {
      this.clickFunction(event, intersects[0].object.parent);
    }
  }

  /**
   * @desc 设置区域颜色
   */
  setAreaColor(g, color = '#f00') {
    // 恢复颜色
    g.parent.children.forEach(gs => {
      gs.children.forEach(mesh => {
        mesh.material[0].color.set(this.color);
      });
    });

    // 设置颜色
    g.children.forEach(mesh => {
      mesh.material[0].color.set(color);
    });
  }

  /**
   * @desc 绑定事件
   */
  on(eventName, func) {
    if (eventName === 'click') {
      this.clickFunction = func;
    }
  }

  /**
   * @desc 绘制地图
   */
  drawMap() {
    console.log(this.mapData);
    if (!this.mapData) {
      console.error('this.mapData 数据不能是null');
      return;
    }
    // 把经纬度转换成x,y,z 坐标
    this.mapData.features.forEach(d => {
      d.vector3 = [];
      d.geometry.coordinates.forEach((coordinates, i) => {
        d.vector3[i] = [];
        coordinates.forEach((c, j) => {
          if (c[0] instanceof Array) {
            d.vector3[i][j] = [];
            c.forEach(cinner => {
              let cp = this.lnglatToMector(cinner);
              d.vector3[i][j].push(cp);
            });
          } else {
            let cp = this.lnglatToMector(c);
            d.vector3[i].push(cp);
          }
        });
      });
    });

    console.log(this.mapData);

    // 绘制地图模型
    const group = new THREE.Group();
    this.mapData.features.forEach(d => {
      const g = new THREE.Group(); // 用于存放每个地图模块。||省份
      g.data = d;
      d.vector3.forEach(points => {
        // 多个面
        if (points[0][0] instanceof Array) {
          points.forEach(p => {
            const mesh = this.drawModel(p, ['rgba(23,35,93,0.5)', 'rgba(166,222,222,0.6)']);
            g.add(mesh);
          });
        } else {
          // 单个面
          const mesh = this.drawModel(points, ['rgba(23,35,93,0.5)', 'rgba(166,222,222,0.6)']);
          g.add(mesh);
        }
      });
      group.add(g);
    });

    this.group = group; // 丢到全局去
    const lineGroup = this.drawLineGroup(this.mapData.features, 'rgba(50,255,255,0.6)', 2);
    this.scene.add(lineGroup);
    const lineGroupBottom = this.drawLineGroup(this.mapData.features, 'rgba(0,255,255,0.2)', 1);
    // const lineGroupBottom = lineGroup.clone();
    lineGroupBottom.position.z = -2;
    // this.scene.add(lineGroupBottom);
    this.scene.add(group);
  }

  /*
  绘制linegroup
  */
  drawLineGroup(features, color, width){
    const lineGroup = new THREE.Group();
    features.forEach(d => {
      d.vector3.forEach(points => {
        // 多个面
        if (points[0][0] instanceof Array) {
          points.forEach(p => {
            const lineMesh = this.drawLine(p, color, width);
            lineGroup.add(lineMesh);
          });
        } else {
          // 单个面
          const lineMesh = this.drawLine(points, color, width);
          lineGroup.add(lineMesh);
        }
      });
    });
    return lineGroup;
  }


  /**
   * @desc 绘制线条
   * @param {} points
   */
  drawLine(points, color, width) {
    const material = new LineMaterial({
      dashed: false,
      color: color,
      transparent: true,
      linewidth: width,
      linecap: 'square', // 线两端的样式
      linejoin: 'round', // 线连接节点的样式
      // opacity: 1,
      lights: false //材质是否受到光照的影响
    });
    material.resolution.set(window.innerWidth, window.innerHeight)
    const geometry = new LineGeometry();
    const positions = [];
    // const colors = []
    points.forEach(d => {
      const [x, y, z] = d;
      let point = new THREE.Vector3(x, y, z);
      positions.push(point.x, point.y, point.z);
      // colors.push(1.0, 0.0, 0.0)
      // geometry.vertices.push(new THREE.Vector3(x, y, z + 0.1));
    });
    geometry.setPositions(positions);
    // geometry.setColors(this.getRgb([color, color], points.length))
    // const line = new THREE.Line(geometry, material);
    const line = new Line2(geometry, material);
    return line;
  }

  /**
   * @desc 绘制地图模型 points 是一个二维数组 [[x,y], [x,y], [x,y]]
   */
  drawModel(points, colors) {
    const shape = new THREE.Shape();
    points.forEach((d, i) => {
      const [x, y] = d;
      if (i === 0) {
        shape.moveTo(x, y);
      } else if (i === points.length - 1) {
        shape.quadraticCurveTo(x, y, x, y);
      } else {
        shape.lineTo(x, y, x, y);
      }
    });

    const geometry = new THREE.ExtrudeGeometry(shape, {
      amount: -1.5, // 拉伸长度，默认100
      bevelEnabled: false, // 对挤出的形状应用是否斜角
      bevelSegments: 3
    });
    const material = new THREE.MeshBasicMaterial({
      color: colors[0],
      transparent: true,
      opacity: 1,
      lights: true,
      side: THREE.DoubleSide // 定义将要渲染哪一面 - 正面FrontSide，背面BackSide或两者DoubleSide
    });
    const material1 = new THREE.MeshPhongMaterial({
      color: colors[1],
      emissive: colors[1],
      emissiveIntensity: 1,
      transparent: true,
      lights: true,
      side: THREE.BackSide // 定义将要渲染哪一面 - 正面FrontSide，背面BackSide或两者DoubleSide
    });
    // const mesh = new THREE.Mesh(geometry, [material,material1]);
    const mesh = new THREE.Mesh(geometry, [material,material1]);
    return mesh;
  }

  /**
   * @desc 经纬度转换成墨卡托投影
   * @param {array} 传入经纬度
   * @return array [x,y,z]
   */
  lnglatToMector(lnglat) {
    if (!this.projection) {
      this.projection = d3
        .geoMercator()
        .center([108.904496, 32.668849])
        .scale(80)
        .rotate(Math.PI / 4)
        .translate([0, 0]);
    }
    const [y, x] = this.projection([...lnglat]);
    let z = 0;
    return [x, y, z];
  }

  /**
   * @desc 动画
   */
  animate() {
    requestAnimationFrame(this.animate.bind(this));

    // required if controls.enableDamping or controls.autoRotate are set to true
    this.controls.update();

    this.renderer.render(this.scene, this.camera);

    this.doAnimate && this.doAnimate.bind(this)();
  }

  /**
   * @desc 设置控制器
   */
  setControl() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.update();
  }

  /**
   * @desc 相机
   */
  setCamera(set) {
    const { x, y, z } = set;
    this.camera.up.x = 0;
    this.camera.up.y = 0;
    this.camera.up.z = 1;
    this.camera.position.set(x, y, z);
    this.camera.lookAt(0, 0, 0);
  }

  /**
   * @desc 设置光线
   */
  setLight() {
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    this.scene.add(directionalLight);
  }

  /**
   * @desc 设置渲染器
   */
  setRender() {
    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(this.renderer.domElement);
  }

  /**
   * @desc 设置参考线
   */
  setHelper() {
    const axesHelper = new THREE.AxisHelper(20);
    this.scene.add(axesHelper);
  }
}
