import * as a1lib from "alt1/base";
import { webpackImages, ImgRefData } from "alt1/base";
import * as OCR from "alt1/ocr";
import DropsMenuReader from "alt1/dropsmenu";

globalThis.OCR = OCR;
globalThis.ImageDetect = a1lib.ImageDetect;
globalThis.a1lib = a1lib;

let tests = webpackImages({
	test1: import("./imgs/test1.data.png"),
	test2: import("./imgs/test2.data.png"),
	test3: import("./imgs/test3.data.png"),
});


export default async function run() {
	await tests.promise;
	for (let testid in tests.raw) {
		console.log(`==== ${testid} ====`)
		let img = new ImgRefData(tests[testid]);
		let imgdata = img.toData();
		imgdata.show();
		let t = performance.now();
		let reader = new DropsMenuReader();
		let pos = reader.find(img);

		console.log(performance.now() - t, pos);

		if (!pos) {
			console.log("couldn't find pos " + testid);
			continue;
		}

		t = performance.now();
		let res = [] as any[];
		for (let a = 0; a < 1; a++) {
			reader.read(img)
			res.push(reader.items);
		}
		console.log(performance.now() - t, res);

		globalThis.reader = reader;
	}
}