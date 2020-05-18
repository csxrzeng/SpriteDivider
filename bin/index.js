"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cli = require("cli");
const fs = require("fs");
const path = require("path");
const glob = require("glob");
const SpriteDivider_1 = require("./SpriteDivider");
cli.setUsage("SpriteDivider.js [OPTIONS] <inputfile>");
cli.parse({
    format: ['f', 'spritesheet format, support: TexturePacker, egret, bin.', 'string', 'TexturePacker']
});
let format = cli.options.format;
let input = cli.args[0];
if (!input || (format != "bin" && path.extname(input) != ".json")) {
    cli.error("spritesheet json must be specified!");
    cli.exit(-1);
}
function excute() {
    if (format == 'bin') {
        if (fs.statSync(input).isDirectory()) {
            // glob("**/*.bin", {
            glob("*.bin", {
                cwd: input
            }, (err, matches) => {
                if (err) {
                    console.log(err);
                    return;
                }
                let index = 0;
                function donext() {
                    if (matches.length) {
                        SpriteDivider_1.spriteDivider(path.resolve(input, matches.pop()), format, index++).then(donext);
                    }
                }
                donext();
            });
            return;
        }
    }
    SpriteDivider_1.spriteDivider(input, format);
}
excute();
//# sourceMappingURL=index.js.map