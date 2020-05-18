import cli = require("cli");
import fs = require("fs");
import path = require("path");
import glob = require("glob");
import { spriteDivider } from "./SpriteDivider";

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
            glob("**/*.bin", {
                cwd: input
            }, (err, matches) => {
                if (err) {
                    console.log(err);
                    return;
                }
                let index = 0;
                function donext() {
                    if (matches.length) {
                        spriteDivider(path.resolve(input, matches.pop()), format, index++).then(donext);
                    }
                }
                donext();
            });
            return;
        }
    }
    spriteDivider(input, format);
}
excute();