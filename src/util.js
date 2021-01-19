class Utils {
  /**
   * 地图数据解码
   */
  decode(json) {
    if (!json.UTF8Encoding) {
      return json;
    }
    let encodeScale = json.UTF8Scale;
    if (!encodeScale) {
      encodeScale = 1024;
    }
    let features = json.features;

    features.forEach(feature => {
      let geometry = feature.geometry;
      let coordinates = geometry.coordinates;
      let encodeOffsets = geometry.encodeOffsets;
      coordinates.forEach((coordinate, c) => {
        if (geometry.type === 'Polygon') {
          coordinates[c] = this.decodePolygon(coordinate, encodeOffsets[c], encodeScale);
        } else if (geometry.type === 'MultiPolygon') {
          coordinate.forEach((polygon, c2) => {
            coordinate[c2] = this.decodePolygon(polygon, encodeOffsets[c][c2], encodeScale);
          });
        }
      });
    });
    // Has been decoded
    json.UTF8Encoding = false;
    return json;
  }

  /**
   * @desc 解码
   */
  decodePolygon(coordinate, encodeOffsets, encodeScale) {
    const result = [];
    let prevX = encodeOffsets[0];
    let prevY = encodeOffsets[1];

    for (let i = 0; i < coordinate.length; i += 2) {
      let x = coordinate.charCodeAt(i) - 64;
      let y = coordinate.charCodeAt(i + 1) - 64;
      // ZigZag decoding
      x = (x >> 1) ^ -(x & 1);
      y = (y >> 1) ^ -(y & 1);
      // Delta deocding
      x += prevX;
      y += prevY;

      prevX = x;
      prevY = y;
      // Dequantize
      result.push([x / encodeScale, y / encodeScale]);
    }
    return result;
  }
  
  // 飞线等线条渐变色转换方法
  getRgb(rgbs, n) {
    let rgb1 = this.rgba2arr(rgbs[0])
    let rgb2 = this.rgba2arr(rgbs[1])
    let rgb3 = this.rgba2arr(rgbs[2])
    let colors = []
    for (let i = 0; i < n; i++) {
      let r,g,b;
      if(i < n / 2) {
         r = rgb1[0] + ((rgb2[0] - rgb1[0]) / n) * i
         g = rgb1[1] + ((rgb2[1] - rgb1[1]) / n) * i
         b = rgb1[2] + ((rgb2[2] - rgb1[2]) / n) * i
      } else {
         r = rgb2[0] + ((rgb3[0] - rgb2[0]) / n) * i
         g = rgb2[1] + ((rgb3[1] - rgb2[1]) / n) * i
         b = rgb2[2] + ((rgb3[2] - rgb2[2]) / n) * i
      }
      colors.push(r / 255, g / 255, b / 255)
    }

    return colors
  }

  rgba2arr(color, normalized = false) {
    let ret = []
    let colorStr = color.split('(')[1].split(')')[0]
    if (colorStr) {
      ret = colorStr.split(',')
      ret = ret.map(item => {
        return Number.parseFloat(item, 2)
      })
    }

    if (normalized) {
      ret = ret.map(item => {
        return (item = +item / 255)
      })
    }
    return ret
  }
}

export const util = new Utils();
