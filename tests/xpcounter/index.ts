import * as a1lib from "alt1/base";
import XpcounterReader, { XpcounterPos } from "alt1/xpcounter"
import { webpackImages, ImgRef, ImgRefData } from "alt1/base";
import * as OCR from "alt1/ocr";

globalThis.OCR = OCR;
globalThis.ImageDetect = a1lib.ImageDetect;
globalThis.a1lib = a1lib;

// OCR.debug.trackread = true;
// globalThis.debug = OCR.debugout;
// globalThis.match = false;

let tests = webpackImages({
	test1: require("./imgs/test1.data.png"),
	test2: require("./imgs/test2.data.png"),
	test3: require("./imgs/test3.data.png"),
});

export default async function run() {
	await tests.promise;
	for (let testid in tests.raw) {
		let img = new ImgRefData(tests[testid]);
		let reader = new XpcounterReader();
		await dotest(testid, reader, img);
	}
}

async function dotest(testid: string, reader: XpcounterReader, img: ImgRef) {
	console.log(`==== ${testid} ====`);
	img.toData().show();
	let t = performance.now();
	let pos = await new Promise<XpcounterPos | null>(d => reader.findAsync(d, img));
	console.log(performance.now() - t, pos);

	if (!pos) {
		console.log("couldn't find pos " + testid);
		return;
	}

	t = performance.now();
	let res = [] as any[];
	for (let a = 0; a < 1; a++) {
		res.push(reader.read(img));
	}
	console.log(performance.now() - t);
	console.log(res[0]);

	globalThis.reader = reader;
}
