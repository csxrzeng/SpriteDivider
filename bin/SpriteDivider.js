#!/usr/bin/env node
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.spriteDivider = void 0;
const sharp = require("sharp");
const cli = require("cli");
const fs = require("fs");
const path = require("path");
const plist = require("plist");
const BinFormat_1 = require("./BinFormat");
let basedir;
let jsonFile;
function spriteDivider(input, format, index = 0) {
    console.log(`${index} >> ${input}`);
    return new Promise((resolve, reject) => {
        jsonFile = input;
        basedir = path.dirname(jsonFile);
        fs.readFile(jsonFile, (err, data) => {
            if (err) {
                reject(err);
                return;
            }
            switch (format) {
                case 'TexturePacker':
                    readTexturePackerFormat(JSON.parse(data.toString()));
                    break;
                case 'egret':
                    readEgretFormat(JSON.parse(data.toString()));
                    break;
                case 'bin':
                    readBinFormat(data);
                    break;
                default:
                    reject("unsupported spritesheet format!");
                    return;
            }
            resolve();
        });
    });
}
exports.spriteDivider = spriteDivider;
function readTexturePackerFormat(frameData) {
    let outPath = path.resolve(basedir, frameData.meta.prefix);
    let images = frameData.meta.image.split(",");
    let tmp = [];
    for (let i = 0; i < images.length; i++) {
        tmp.push(sharp(path.resolve(basedir, images[i])));
    }
    images = tmp;
    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath);
    }
    let frames = frameData.frames;
    for (const key in frames) {
        const rect = frames[key].frame;
        let texture = images[rect.idx];
        if (!texture)
            continue;
        texture.clone().extract({
            left: rect.x, top: rect.y, width: rect.w, height: rect.h
        }).toFile(outPath + key).catch(err => {
            console.log(err.message);
        });
    }
}
function readEgretFormat(frameData) {
    let image = sharp(path.resolve(basedir, frameData.file));
    if (!image) {
        cli.error(`image ${frameData.file} not found!`);
        cli.exit(-1);
    }
    let outPath = path.resolve(basedir, path.basename(jsonFile, '.json'));
    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath);
    }
    let frames = frameData.frames;
    for (const key in frames) {
        const frame = frames[key];
        const fileName = key.replace(/_png$/, '.png').replace(/_jpg$/, '.jpg');
        image.clone().extract({
            left: frame.x, top: frame.y, width: frame.w, height: frame.h
        }).toFile(path.resolve(outPath, fileName)).catch(err => {
            console.log(err.message);
        });
    }
}
function countFF00(buffer) {
    let u8a = new Uint8Array(buffer);
    let from = 0;
    let count = 0;
    while (from < u8a.length) {
        let idx = u8a.indexOf(0xFF, from);
        if (idx == -1)
            break;
        if (u8a[idx + 1] == 0) {
            count++;
        }
        from = idx + 1;
    }
    return count;
}
function readBinFormat(buffer) {
    let outPath = path.resolve(basedir, 'output');
    if (!fs.existsSync(outPath)) {
        fs.mkdirSync(outPath);
    }
    let filename = path.basename(jsonFile, '.bin');
    let outPng = path.resolve(outPath, filename + '.png');
    let outPlist = path.resolve(outPath, filename + '.plist');
    let header = new BinFormat_1.BinFormat(buffer, filename);
    fs.writeFile(outPng, buffer.slice(header.pngOffset), () => { }); // 图片数据
    if (header.dirCount != 1 && header.dirCount != 8) {
        console.warn('not supported dirCount', header.dirCount);
        return;
    }
    let animations = header.dirAni;
    let descArr = header.descArr;
    let maxSize = header.maxSize;
    let halfSize = header.maxSize / 2;
    let frames = {};
    for (let i = 0; i < descArr.length; i++) {
        let desc = descArr[i];
        if (desc.width % 2 != 0 || desc.height % 2 != 0) {
            // console.warn('width为奇数，导致offset为小数');
        }
        let st = { x: halfSize - desc.centerX, y: halfSize - desc.centerY };
        let offset = { x: st.x + desc.width / 2 - halfSize, y: halfSize - (st.y + desc.height / 2) };
        frames[desc.key] = {
            frame: `{{${desc.x},${desc.y}},{${desc.width},${desc.height}}}`,
            offset: `{${offset.x},${offset.y}}`,
            rotated: false,
            sourceColorRect: `{{${st.x},${st.y}},{${desc.width},${desc.height}}}`,
            sourceSize: `{${maxSize},${maxSize}}`
        };
    }
    let metadata = {
        format: 2,
        textureFileName: filename + '.png',
        size: `{${0},${0}}`,
    };
    let plistXML = { animations: animations, frames: frames, metadata };
    let plistStr = plist.build(plistXML, { pretty: true });
    fs.writeFile(outPlist, plistStr, { flag: 'w', encoding: 'utf8' }, () => { });
}
//# sourceMappingURL=SpriteDivider.js.map