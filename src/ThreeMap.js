import * as d3 from 'd3-geo';

// const THREE = window.THREE;

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { Line2 } from 'three/examples/jsm/lines/Line2';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';

import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry';
import { Reflector } from 'three/examples/jsm/objects/Reflector.js';
import lineImg from './assets/images/line.png';
import meshImg1 from './assets/images/01.jpg';
import meshImg2 from './assets/images/02.jpg';
// import { GeometryUtils } from 'three/examples/jsm/utils/GeometryUtils';
// 初始化一个场景
export default class ThreeMap {
  constructor(set) {
    this.mapData = set.mapData;
    this.mapColors = ['#006de0', '#006de0'] ;
    this.init();
  }

  /**
   * @desc 初始化场景
   */
  init() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color( 0x33338b );
    this.camera = new THREE.PerspectiveCamera(10, window.innerWidth / window.innerHeight, 1, 1000);
    this.mousePos = null;
    
    this.setCamera({ x: 250, y: 0, z: 250 });
    this.cubeCamera1 = new THREE.CubeCamera(0.1, 1000, 2048);
    this.scene.add(this.cubeCamera1);

    let boxGeometry = new THREE.BoxGeometry(100, 100, 1);
    let boxMaterial = new THREE.MeshPhongMaterial({envMap: this.cubeCamera1.renderTarget.texture});
    let box = new THREE.Mesh(boxGeometry, boxMaterial);
    this.scene.add(this.cubeCamera1);

    // this.setLight();
    this.setRender();

    this.setHelper();

    this.drawMap();

    this.setControl();

    // 创建div
    // const earthDiv = document.createElement( 'div' );
    // earthDiv.className = 'label';
    // earthDiv.textContent = 'Earth';
    // earthDiv.style.left = '100px';
    // earthDiv.style.top = '100px';
    // 获取页面上div
    this.earthDiv = document.getElementById('testDiv');
    this.earthLabel = new CSS2DObject( this.earthDiv );
    this.earthLabel.visible = false;
    this.group.add( this.earthLabel );

    this.hoverDiv = document.getElementById('hoverDiv');
    this.Hoverabel = new CSS2DObject( this.hoverDiv );
    this.Hoverabel.visible = false;
    this.group.add( this.Hoverabel );

    this.labelRenderer = new CSS2DRenderer();
    this.labelRenderer.setSize( window.innerWidth, window.innerHeight );
    this.labelRenderer.domElement.style.position = 'absolute';
    this.labelRenderer.domElement.style.top = '0px';
    document.body.appendChild( this.labelRenderer.domElement );
    // this.labelControls = new OrbitControls(this.camera, this.labelRenderer.domElement)
    // this.labelControls.update();
    // this.labelControls.minDistance = 5;
    // this.labelControls.maxDistance = 100;

    this.animate();
    // this.lineAnimate()
    document.body.addEventListener('mouseup', this.mouseEvent.bind(this), false);
    document.body.addEventListener( 'mousemove', this.mouseEvent.bind(this),false);
    document.body.addEventListener( 'mousewheel', this.mousewheel.bind(this),false);
    
  }

  // 滚轮事件
  mousewheel(event) {
    let type = event.type;
    console.log(type,'====================')
    event.preventDefault();
    this.labelRenderer.domElement.style.display = 'none';
  }

  /**
   * @desc 鼠标事件处理
   */
  mouseEvent(event) {
    let type = event.type
    event.preventDefault();
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
    this.intersects = this.raycaster.intersectObjects(this.meshes);
    if (this.intersects.length > 0) {
      console.log(this.intersects,'======')
      this.labelRenderer.domElement.style.display = 'block';
      this.clickFunction(event, this.intersects[0].object.parent, this.intersects[0].point);
    } else {
      if(type == 'mousemove') {
        this.Hoverabel.visible = false;
      } else if (type == 'mouseup') { // 点击时选中信息清空
        this.labelRenderer.domElement.style.display = 'none';
        this.earthLabel.visible = false;
        this.Hoverabel.visible = false;
        this.clearColor(this.group.children);
      }
    }
  }
  /**
   * @desc 设置区域颜色
   */
  clearColor(group){
    console.log(this.mapColors)
    group.forEach(gs => {
      gs.children.forEach(mesh => {
        if (mesh.material instanceof Array) {
          mesh.material.forEach((mat, index) => {
            mat.color.set(this.mapColors[index >= this.mapColors.length ? 0 : index]);
          })
        } else {
          mesh.material.color.set(this.mapColors[0]);
        }
      });
    });
  }
  setAreaColor(g, colors = ['#f00', '#f00']) {
    // 恢复颜色
    this.clearColor(g.parent.children);

    // 设置颜色
    g.children.forEach(mesh => {
      if (mesh.material instanceof Array) {
        mesh.material.forEach((mat, index) => {
          mat.color.set(colors[index >= colors.length ? 0 : index]);
        })
      } else {
        mesh.material.color.set(colors[0]);
      }
      // mesh.material[0].color.set(color);
    });
  }

  setLabelPos(g, type, p) {
    // 设置提示框位置
    let name = g.data.properties.name;
    // let cpPos = this.lnglatToMector(g.data.properties.cp);
    let cpPos = p;
    // console.log(name,cpPos,'setPos==')
    if(type == 'mouseup') {
      // this.earthLabel.position.set( cpPos[0],cpPos[1],cpPos[2] );
      this.earthLabel.position.set( cpPos.x, cpPos.y, cpPos.z);
      this.earthLabel.visible = true;
      console.log(g.data, 'data========')
      console.log('mouseup========')
    } else {
      // this.Hoverabel.position.set( cpPos[0],cpPos[1],cpPos[2] );
      this.Hoverabel.position.set( cpPos.x, cpPos.y, cpPos.z);
      // this.Hoverabel.position.set( this.mouse.x,this.mouse.y,0 );
      this.Hoverabel.visible = true;
    }
  }

  /**
   * @desc 绑定事件
   */
  on(eventName, func) {
    if (eventName === 'mouseFn') {
      this.clickFunction = func;
    }
  }

  /**
   * @desc 绘制地图
   */
  drawMap() {
    // console.log(this.mapData);
    if (!this.mapData) {
      console.error('this.mapData 数据不能是null');
      return;
    }

    // 设置镜子
    let mirGeometry;
    const WIDTH = window.innerWidth;
		const HEIGHT = window.innerHeight;
    // 圆形镜子
    mirGeometry = new THREE.CircleGeometry( 50, 64 );
    // 镜子参数
    const groundMirror = new Reflector( mirGeometry, {
      clipBias: 1,
      textureWidth: WIDTH * window.devicePixelRatio,
      textureHeight: HEIGHT * window.devicePixelRatio,
      color: 0xcccccc,
      recursion: 100
    } );
    groundMirror.position.z = -4;
    // groundMirror.rotateX( - Math.PI / 2 );
    // 加入场景
    this.scene.add( groundMirror );

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

    // console.log(this.mapData);

    // 绘制地图模型
    const group = new THREE.Group();
    this.mapData.features.forEach(d => {
      const g = new THREE.Group(); // 用于存放每个地图模块。||省份
      g.data = d;
      d.vector3.forEach(points => {
        // 多个面
        if (points[0][0] instanceof Array) {
          points.forEach(p => {
            const mesh = this.drawModel(p, ['#006de0', 'rgba(166,222,222,0.6)']);
            g.add(mesh);
          });
        } else {
          // 单个面
          const mesh = this.drawModel(points, ['#006de0', 'rgba(166,222,222,0.6)']);
          g.add(mesh);
        }
      });
      group.add(g);
    });

    

    this.group = group; // 丢到全局去
    const lineGroup = this.drawLineGroup(this.mapData.features, 'rgb(234,128,58)', 2); // 'rgba(234,128,58,0.3)'
    this.scene.add(lineGroup);
    // const lineGroupBottom = this.drawLineGroup(this.mapData.features, 'rgba(0,255,255,0.2)', 1);
    const lineGroupBottom = lineGroup.clone();
    lineGroupBottom.position.z = -2;
    // this.scene.add(lineGroupBottom);
    this.scene.add(this.group);
  }

  /*
  绘制linegroup
  */
  drawLineGroup(features, color, width){
    const lineGroup = new THREE.Group();
    this.textureGroup = []
    features.forEach((d, index) => {
      
      d.vector3.forEach(points => {
        // 多个面
        if (points[0][0] instanceof Array) {
          let p = points.reduce((pre, current) => {
            return pre.length > current.length ? pre : current
          })
          //let maxLen = Math.max(...points.map(item => item.length))
          // points.forEach(p => {
            if(p) {
              const lineMesh = this.drawLine(p, color, width);
              lineGroup.add(lineMesh);
              const lineAniMesh = this.drawLineAnimate(p, width)
              // lineGroup.add(lineAniMesh);
            }
          // });
        } else {
          // 单个面
          const lineMesh = this.drawLine(points, color, width);
          lineGroup.add(lineMesh);
          const lineAniMesh = this.drawLineAnimate(points, width)
          // lineGroup.add(lineAniMesh);
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
      lights: false, //材质是否受到光照的影响
      opacity: 0.2
    });
    material.resolution.set(window.innerWidth, window.innerHeight)
    const geometry = new LineGeometry();
    const positions = [];
    points.forEach(d => {
      const [x, y, z] = d;
      let point = new THREE.Vector3(x, y, z);
      positions.push(point.x, point.y, point.z);
    });
    geometry.setPositions(positions);

    const line = new Line2(geometry, material);

    return line;
  }
  drawLineAnimate(points, width) {
    let texture = new THREE.TextureLoader().load(lineImg)
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping //每个都重复
    /*
      水平和垂直方向纹理的包裹方式
      THREE.RepeatWrapping
      THREE.ClampToEdgeWrapping
      THREE.MirroredRepeatWrapping
    */
    texture.repeat.set(Math.ceil(points.length / 20), 1)
    texture.needsUpdate = true
    this.textureGroup.push(texture)
    let material = new THREE.MeshBasicMaterial({
      map: texture,
      side: THREE.BackSide,
      transparent: true
    })
     let pointList = [];
     points.forEach(d => {
       const [x, y, z] = d;
       pointList.push(new THREE.Vector3(x, y, z + 0.1))
     });
     let curve = new THREE.CatmullRomCurve3(pointList)
     const geometry = new THREE.TubeGeometry(curve, Math.ceil(points.length * 1.5), 0.1, 10, false) 
     // p1：路径；p2:组成管道的分段数64；p3:管道半径1；p4:管道横截面的分段数8；
     
     let line = new THREE.Mesh(geometry, material)
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
      amount: -2, // 拉伸长度，默认100
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
      side: THREE.DoubleSide // 定义将要渲染哪一面 - 正面FrontSide，背面BackSide或两者DoubleSide
    });
    // const material1 = new THREE.MeshBasicMaterial({
    //   map: new THREE.TextureLoader().load(meshImg1),
    //   // color: "#ffffff",
    //   transparent: true,
    //   opacity: 1
    // })
    // const mesh = new THREE.Mesh(geometry, material1);
    const mesh = new THREE.Mesh(geometry, [material,material1]);
    // mesh.castShadow = true
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
  // lineAnimate(){
  //   // 一定要在此函数中调用
  //     if(this.texture) this.texture.offset.x -= 0.01
  //     requestAnimationFrame(this.lineAnimate)
  // }
  animate() {
    if(this.textureGroup){
      this.textureGroup.forEach(texture => {
        texture.offset.x -= 0.03
      })
    }
    requestAnimationFrame(this.animate.bind(this));
    // required if controls.enableDamping or controls.autoRotate are set to true
    this.controls.update();
    
    this.renderer.render(this.scene, this.camera);
    this.labelRenderer.render(this.scene, this.camera);
    // this.labelControls.update();
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
    // const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // 平行光
    const directionalLight = new THREE.PointLight( 0xffff00, 1, 0 ); // 点光源
    directionalLight.castShadow = true; 
    directionalLight.position.set(0, 0, 5);
    this.scene.add(directionalLight);
    this.scene.add(new THREE.HemisphereLight(0x443333, 0x000000)); // 半球光

    const spotLight = new THREE.SpotLight( 0xff0000 ); // 聚光灯
    spotLight.position.set( 0, 10, 1 );

    // spotLight.castShadow = true;

    // spotLight.shadow.mapSize.width = 1024;
    // spotLight.shadow.mapSize.height = 1024;

    // spotLight.shadow.camera.near = 500;
    // spotLight.shadow.camera.far = 4000;
    // spotLight.shadow.camera.fov = 30;

    // this.scene.add( spotLight );
    
  }

  /**
   * @desc 设置渲染器
   */
  setRender() {
    this.renderer = new THREE.WebGLRenderer({antialias: true, alpha: true});
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor( 0xffffff, 0.0 );
    // this.renderer.physicallyCorrectLights = true;
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
