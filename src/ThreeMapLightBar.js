import ThreeMap from './ThreeMap';
import img1 from './assets/images/lightray.jpg';
import img2 from './assets/images/lightray_yellow.jpg';
import throttle from 'lodash.throttle';

import * as THREE from 'three';
// const THREE = window.THREE;
export default class ThreeMapLightBar extends ThreeMap {
  constructor(set) {
    super(set);
    this.dataKeys = {};
    this.setDataKeys();
    this.colors = ['#fff', '#ff0', '#0f0'];
    this.colorIndex = 0;
    this.textures = [new THREE.TextureLoader().load(img1), new THREE.TextureLoader().load(img2)];
    this.pointsLength = 10; // 控制流光速度;控制飞线分段数量；流光长度等属性
  }

  // 设置键值
  setDataKeys() {
    this.mapData.features.forEach(d => {
      const { name, cp } = d.properties;
      this.dataKeys[name] = [...cp];
    });

    console.log(this.dataKeys);
  }

  /**
   * @desc 节流，防抖
   */
  doAnimate = throttle(() => {
    let ratio = this.colorIndex / this.pointsLength;

    this.flyGroup &&
      this.flyGroup.children.forEach(d => {
        d.geometry.colors = new Array(this.pointsLength).fill(1).map((d, i) => {
          if (i == this.colorIndex) {
            return new THREE.Color('#ff0');
          }else if(i == this.colorIndex + 1) {
            return new THREE.Color('#0f0');
          } else {
            return new THREE.Color('#f00');
          } 
        });
        d.geometry.colorsNeedUpdate = true;
      });

    this.sixLineGroup &&
      this.sixLineGroup.children.forEach(d => {
        d.scale.set(1 + ratio, 1 + ratio, d.scale.z);
        d.material.opacity = 1 - ratio;
      });

    this.colorIndex++;
    if (this.colorIndex > this.pointsLength - 1) {
      this.colorIndex = 0;
    }
  }, 30);

  /**
   * @desc 绘制6边形
   */
  drawSixMesh(x, y, z, i, size = 3) {
    const geometry = new THREE.CircleGeometry(0.5, size);
    const material = new THREE.MeshBasicMaterial({ color: this.colors[i % 2] });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z + 0.1);
    return mesh;
  }

  /**
   * @desc 绘制6边线
   */
  drawSixLineLoop(x, y, z, i) {
    // 绘制六边型
    const geometry = new THREE.CircleGeometry(0.7, 6);
    const material = new THREE.MeshBasicMaterial({ color: this.colors[i % 2], transparent: true });
    geometry.vertices.shift();
    const line = new THREE.LineLoop(geometry, material);
    line.position.set(x, y, z + 0.1);
    return line;
  }

  /**
   * @desc 柱子
   */
  drawPlane(x, y, z, value, i) {
    const hei = value / 10;
    const geometry = new THREE.PlaneGeometry(1, hei);
    const material = new THREE.MeshBasicMaterial({
      map: this.textures[i % 2], // 颜色贴图
      depthTest: false, // 是否在渲染此材质时启用深度测试
      transparent: true,
      color: this.colors[i % 2],
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending // 在使用此材质显示对象时要使用何种混合
    });
    const plane = new THREE.Mesh(geometry, material);
    plane.position.set(x, y, z + hei / 2);
    plane.rotation.x = Math.PI / 2;
    plane.rotation.z = Math.PI;
    const plane2 = plane.clone();
    plane2.rotation.y = Math.PI / 2;
    return [plane, plane2];
  }

  /**
   * @desc 绘制光柱
   */
  drawLightBar(data) {
    const group = new THREE.Group();
    const sixLineGroup = new THREE.Group();
    data.forEach((d, i) => {
      const lnglat = this.dataKeys[d.name];
      const [x, y, z] = this.lnglatToMector(lnglat);

      // 绘制六边体
      group.add(this.drawSixMesh(x, y, z, i));
      // 绘制6边线
      sixLineGroup.add(this.drawSixLineLoop(x, y, z, i));

      // 绘制柱子
      const [plane1, plane2] = this.drawPlane(x, y, z, d.value, i);
      group.add(plane2);
      group.add(plane1);
    });

    this.sixLineGroup = sixLineGroup;
    this.scene.add(group);
    this.scene.add(sixLineGroup);
  }

  /**
   * @desc 绘制飞线
   */
  drawFlyLine(data) {
    const group = new THREE.Group();
    data.forEach(d => {
      const slnglat = this.dataKeys[d.source.name];
      const tlnglat = this.dataKeys[d.target.name];
      const z = 20;
      const [x1, y1, z1] = this.lnglatToMector(slnglat);
      const [x2, y2, z2] = this.lnglatToMector(tlnglat);
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(x1, y1, z1),
        new THREE.Vector3((x1 + x2) / 2, (y1 + y2) / 2, z),
        new THREE.Vector3(x2, y2, z2)
      );
      const points = curve.getPoints(this.pointsLength);
      const geometry = new THREE.Geometry(); // Geometry 利用 Vector3 或 Color 存储了几何体的相关 attributes
      geometry.vertices = points;
      geometry.colors = new Array(points.length).fill(new THREE.Color('#f00'));
      const material = new THREE.LineBasicMaterial({
        vertexColors: THREE.FaceColors, // 是否使用顶点着色 THREE.NoColors THREE.VertexColors THREE.FaceColors
        transparent: true,
        side: THREE.DoubleSide,
        linejoin: 'round'
      });
      const mesh = new THREE.Line(geometry, material);
      group.add(mesh);
    });
    this.flyGroup = group;
    this.scene.add(group);
  }
}
