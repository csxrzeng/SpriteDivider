import { ByteArray } from "./ByteArray";
import { fstat } from "fs";

interface Animation {
    frameCount: number;
    frameOffset: number;
    level?: number; // 可能是层级
}

export class BinFormat {
    plistLen: number;
    version: number;
    someLen: number;
    byte9: number;
    byteA: number;
    byteB: number;
    dirCount: number;
    byteD: number;
    byteE: number;
    isStatic: number;
    byte10: number;

    pngOffset: number;
    isPng: boolean;

    frameCount: number;
    frameOffsets: number[][] = [];

    dirAni: Animation[] = [];
    descArr = [];

    maxSize = 0;

    private pos: number;

    constructor(private buffer: Buffer, public filename: string) {
        this.pos = 0;
        this.plistLen = buffer.readUInt32LE(0);
        this.version = buffer.readUInt8(4);
        this.someLen = buffer.readUInt32LE(5);
        this.byte9 = buffer.readUInt8(9);
        this.byteA = buffer.readUInt8(10);
        this.byteB = buffer.readUInt8(11);
        this.dirCount = buffer.readUInt8(12);
        this.byteD = buffer.readUInt8(13);
        this.byteE = buffer.readUInt8(14);
        this.isStatic = buffer.readUInt8(15);
        if (this.version == 2) {
            this.pngOffset = 4 + this.plistLen;
            this.pos = 16;
        }
        else {
            this.byte10 = buffer.readUInt8(16);
            this.pngOffset = 4 + this.plistLen + 1;
            this.pos = 17;
        }
        this.isPng = buffer.readUInt32BE(this.pngOffset) == 0x89504e47;
        if (!this.isPng) {
            console.error('unsupported version', this.version);
        }

        if (this.version == 2)
            this.readVersion2(buffer);
        else
            this.readVersion4(buffer);

        this.frameCount = buffer.readUInt16LE(this.pos);
        this.pos += 2;

        let frameOffsets = this.frameOffsets = [];
        for (let i = 0; i < this.dirCount; i++) {
            let offsets = frameOffsets[i] = [];
            for (let j = 0; j < this.dirAni[i].frameCount; j++) {
                offsets[j] = buffer.readUInt32LE(this.pos);
                this.pos += 4;
            }
        }

        this.readPlist(buffer);
    }

    private readVersion2(buffer: Buffer) {
        let start = this.pos;
        let dirAni: Animation[] = [];
        for (let i = 0; i < this.dirCount; i++) {
            let ani: Animation = <any>{};
            dirAni[i] = ani;
            ani.frameCount = buffer.readUInt8(start + 1);
            ani.frameOffset = buffer.readUInt8(start + 2);
            ani.level = buffer.readUInt8(start + 3);
            start += 4;
        }
        this.dirAni = dirAni;
        this.pos = start;
    }

    private readVersion4(buffer: Buffer) {
        let start = this.pos;
        let dirAni: Animation[] = [];
        for (let i = 0; i < this.dirCount; i++) {
            let ani: Animation = <any>{};
            dirAni[i] = ani;
            ani.frameCount = buffer.readUInt8(start + 1);
            ani.frameOffset = buffer.readUInt8(start + 3);
            ani.level = buffer.readUInt8(start + 5);
            start += 6;
        }
        this.dirAni = dirAni;
        this.pos = start;
    }

    private readPlist(buffer: Buffer) {
        let maxSize = 0;
        const FrameLen = this.version == 4 ? 62 : 68;
        for (let i = 0; i < this.dirCount; i++) {
            let offsets = this.frameOffsets[i];
            let dir = this.dirCount == 1 ? 4 : i; // 单方向总是朝下
            for (let j = 0; j < offsets.length; j++) {
                let buf = new ByteArray(buffer.slice(offsets[j], offsets[j] + FrameLen));
                let flag = buf.readShort();
                if (flag != 0xFF) {
                    console.log('emmmm... 不是-1开头跳过');
                    continue;
                }
                let desc: any = {};
                let arr = [];
                let len = this.version == 2 ? 25 : 22;
                arr.push(flag);
                for (let k = 1; k < len; k++) {
                    arr.push(buf.readShort());
                }
                arr.push(buf.readByte());
                for (let k = 0; k < 4; k++) {
                    arr.push(buf.readInt());
                }
                arr.push(buf.readByte());
                desc.key = `${dir}_${j < 10 ? '0' + j : j}`;
                desc.offsetX = arr[1];
                desc.offsetY = arr[2];
                desc.centerX = arr[3];
                desc.centerY = arr[4];
                if (this.version == 4) {
                    desc.rotated = arr[20] == 1;
                    desc.width = arr[23];
                    desc.height = arr[24];
                    desc.x = arr[25];
                    desc.y = arr[26];
                }
                else {
                    desc.rotated = false;
                    desc.width = arr[26];
                    desc.height = arr[27];
                    desc.x = arr[28];
                    desc.y = arr[29];
                }
                this.descArr.push(desc);
                maxSize = Math.max(maxSize, Math.max(desc.centerX, desc.width - desc.centerX) * 2, Math.max(desc.centerY, desc.height - desc.centerY));
                if (maxSize > 512) {
                    console.log(arr);
                }
            }
        }
        if (maxSize > 512) {
            console.log(`size too large ${this.filename}`);
        }
        maxSize = ceilPowerOfTwo(maxSize);
        this.maxSize = maxSize;
    }
}

function ceilPowerOfTwo(current) {
    current--;
    current = (current >> 1) | current;
    current = (current >> 2) | current;
    current = (current >> 4) | current;
    current = (current >> 8) | current;
    current = (current >> 16) | current;
    current++;
    return current;
}
