"use strict"

const bmp = require('bmp-js');
const decodeDXT = require('decode-dxt');

/**
 * Decodes a texture based on its format
 * @param {import('../../types').Texture} texture - The texture object to decode
 * @returns {import('../../types').DecodedTexture} The decoded texture data
 */
function decodeTexture(texture) {
	switch (texture.textureFormat) {
		// jpeg (saved as .jpg)
		case 1:
			return { extension: 'jpg', buffer: new Buffer(texture.bytes),
			         blackFraction: 0 };
		// dxt1 (saved as .bmp)
		case 6:
			const bytes = texture.bytes
			const buf = new Buffer(bytes);
			const abuf = new Uint8Array(buf).buffer;
			const imageDataView = new DataView(abuf, 0, bytes.length);
			const rgbaData = decodeDXT(imageDataView, texture.width, texture.height, 'dxt1');
			const bmpData = [];

			// ABGR
			for (let i = 0; i < rgbaData.length; i += 4) {
				bmpData.push(255);
				bmpData.push(rgbaData[i + 2]);
				bmpData.push(rgbaData[i + 1]);
				bmpData.push(rgbaData[i + 0]);
			}

			const rawData = bmp.encode({
				data: bmpData, width: texture.width, height: texture.height,
			});

			// Google serves a deliberately black texture for some level-20
			// tiles - blocks encoding little but (0,0,0). The geometry is real,
			// but painting it black makes it look like a hole in the model, so
			// the caller is told and can fall back to the parent tile, whose
			// imagery is coarser but actually there.
			let dark = 0;
			const pixels = rgbaData.length / 4;
			for (let i = 0; i < rgbaData.length; i += 4) {
				if (rgbaData[i] < 8 && rgbaData[i + 1] < 8 && rgbaData[i + 2] < 8) {
					dark++;
				}
			}

			return {
				extension: 'bmp',
				buffer: Buffer.from(rawData.data),
				blackFraction: pixels ? dark / pixels : 0,
			}
		default:
			throw `unknown textureFormat ${texture.textureFormat}`
	}
}

module.exports = {
	decodeTexture
}