import * as a1lib from "alt1/base";
import * as OCR from "alt1/ocr";
import { webpackImages, simpleCompare, findSubbuffer, ImgRef, ImgRefBind, mixColor } from "alt1/base";

var chatfont = require("alt1/fonts/aa_8px.fontmeta.json");

var imgs = webpackImages({
	skills: require("./imgs/skills.data.png")
});

var skilliconsize = { w: 27, h: 27 };
var pinimgArea = { x: -3, y: 10, w: 8, h: 8 };
var skillnames = ["tot", "att", "str", "ran", "mag", "def", "hpx", "pra", "sum", "dun", "agi", "thi", "sla", "hun", "smi", "cra", "fle", "her", "run", "coo", "con", "fir", "woo", "far", "fis", "min", "div", "inv", "com", "arc", "nec"];

var skillimgs: ImageData[] = [];

imgs.promise.then(() => {
	for (var x = 0; x < imgs.skills.width; x += skilliconsize.w) {
		var i = imgs.skills.clone(new a1lib.Rect(x, 0, 27, 27));
		//clear the pinned skill icon area
		for (var xx = 0; xx < pinimgArea.x + pinimgArea.w; xx++) {
			for (var yy = pinimgArea.y; yy < pinimgArea.y + pinimgArea.h; yy++) {
				i.setPixel(xx, yy, 0, 0, 0, 0);
			}
		}
		skillimgs.push(i);
	}
});

//old color compare helper
function coldiff(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) {
	var r3 = Math.abs(r1 - r2);
	var g3 = Math.abs(g1 - g2);
	var b3 = Math.abs(b1 - b2);
	return r3 + g3 + b3;
}

export type XpcounterPos = { x: number, y: number, w: number, h: number, rows: number };

export default class XpcounterReader {
	pos: XpcounterPos | null = null;
	searching = false;
	skills: (typeof skillnames[number])[] = [];
	values: number[] = [];
	rounded = false;

	callbacks: ((pos: XpcounterPos | null) => any)[] = [];

	//Starts finding the xpcounter interface from runemetics
	//the cb function is called when completed
	//this will search for 2 or more vertically aligned skill icons that don't have orange text next to them
	findAsync(cb?: (pos: XpcounterPos | null) => void, img?: ImgRef) {
		var findstep = function (index: number) {

			var poslist = findSubbuffer(buffer, imgs[index]);

			for (var b = 0; b < poslist.length; b++) {
				var pos = poslist[b];
				var statlist = false;
				var xpcircle = false;
				for (var xx = 0; xx < 10; xx++) {
					var p = buffer.getPixel(pos.x + 30 + xx, pos.y + 8);
					if (p[0] == 255 && p[1] == 140 && p[2] == 0) { statlist = true; break; }
					if (p[0] == 255 && p[1] == 203 && p[2] == 5) { statlist = true; break; }
				}
				if (b == 0) {
					var p1 = buffer.getPixel(pos.x + 14, pos.y + 31);
					var p2 = buffer.getPixel(pos.x + 15, pos.y + 31);
					if (coldiff(p1[0], p1[1], p1[2], 249, 220, 0) + coldiff(p2[0], p2[1], p2[2], 186, 190, 202) < 30) { xpcircle = true; }
				}

				if (!statlist && !xpcircle) {
					matches.push({ skill: index, x: poslist[b].x, y: poslist[b].y });
				}
			}
		}

		var tick = function () {
			findstep(currentindex);
			currentindex++;
			if (currentindex < imgs.length) { setTimeout(tick, 20); }
			else { completed(); }
		}

		var getpos = function () {
			var groups: { x: number, subs: { x: number, y: number, skill: number }[] }[] = [];
			for (var a in matches) {
				var found = false;
				for (var b in groups) {
					if (groups[b].x == matches[a].x) {
						found = true;
						groups[b].subs.push(matches[a]);
					}
				}
				if (!found) { groups.push({ x: matches[a].x, subs: [matches[a]] }); }
			}

			var bestsubs = 0;
			var best: typeof groups[number] | null = null;
			for (var a in groups) { if (groups[a].subs.length > bestsubs) { best = groups[a]; bestsubs = groups[a].subs.length; } }
			if (!best || best.subs.length == 0) { return null; }

			var pos: XpcounterPos = { x: best.x, y: 0, w: 140, h: 0, rows: best.subs.length };
			pos.y = best.subs.reduce(function (prev, current) { return Math.min(prev, current.y) }, Infinity);
			pos.h = -pos.y + best.subs.reduce(function (prev, current) { return Math.max(prev, current.y + 27); }, 0);
			return pos;
		}

		var completed = () => {
			this.pos = getpos();
			for (var a in this.callbacks) { this.callbacks[a](this.pos); }
			this.callbacks = [];
			this.searching = false;
		}

		if (cb) { this.callbacks.push(cb); }
		if (this.searching) { return; }
		this.searching = true;
		if ((!window.alt1 || !alt1.rsLinked) && !img) {
			completed();
			return;
		}
		var buffer: ImageData
		if (!img) {
			buffer = a1lib.capture(0, 0, alt1.rsWidth, alt1.rsHeight);
		} else {
			buffer = img.toData();
		}
		var matches: { skill: number, x: number, y: number }[] = [];
		var currentindex = 0;
		var imgs = skillimgs;

		setTimeout(tick, 20);
	}

	readSkills(img?: ImgRef) {
		if (!this.pos) { return null; }
		if (!img) { img = a1lib.captureHold(this.pos.x, this.pos.y, this.pos.w, this.pos.h); }
		var buf = img.toData(this.pos.x, this.pos.y, 27, img.height);

		this.skills = [];
		var misses = 0;
		for (var i = 0; (i + 1) * 27 <= img.height; i++) {
			var found = false;
			for (var a in skillimgs) {
				if (simpleCompare(buf, skillimgs[a], 0, i * 27) < Infinity) {
					this.skills[i] = skillnames[a];
					found = true;
					break;
				}
			}
			if (found) { misses = 0; }
			else { misses++; }
			if (misses > 1) { break; }
		}
		this.pos.rows = this.skills.length;
		this.pos.h = this.pos.rows * 27;

		return this.skills;
	}

	readValues(img?: ImgRef) {
		if (!this.pos) { return null; }
		if (!img) { img = a1lib.captureHold(this.pos.x, this.pos.y, this.pos.w, this.pos.h); }

		let data = img.toData();

		this.values = [];
		var abbr = false;
		for (var i = 0; i < this.pos.rows; i++) {
			var obj = OCR.readLine(data, chatfont, [255, 255, 255], 30, i * 27 + 17, true, false);
			if (!obj) { this.values[i] = -1; continue; }

			var m = 1;
			if (obj.text.match(/M$/)) { m = 1000 * 1000; abbr = true; }
			if (obj.text.match(/[TK]$/)) { m = 1000; abbr = true; }

			var n;//it's just silly to use , as decimal marker in europe you win on this one USA
			if (m == 1) { n = parseInt(obj.text.replace(/[,\. ]/g, "")); }
			else { n = parseFloat(obj.text.replace(/[,]/g, ".")); }
			n *= m;

			if (isNaN(n)) { this.values[i] = -1; }
			this.values[i] = n;
		}
		this.rounded = abbr;
	}

	read(img?: ImgRef) {
		if (!this.pos) { return null; }
		if (!img) { img = a1lib.captureHold(this.pos.x, this.pos.y, this.pos.w, (this.pos.rows + 2) * 27); }
		this.readSkills(img);
		this.readValues(img);
	}

	showPosition() {
		if (!this.pos) { return; }
		alt1.overLayRect(a1lib.mixColor(255, 255, 255), this.pos.x, this.pos.y, this.pos.w, this.pos.h, 2000, 2);
	}
}
