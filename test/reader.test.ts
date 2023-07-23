import { expect, test } from "vitest";
import { gamesbufReadStream } from "../src/mod.ts";
import { EXAMPLE_BYTES } from "./common.ts";

function basicStream(data: Uint8Array): ReadableStream<Uint8Array> {
	let i = 0;
	return new ReadableStream({
		pull(controller) {
			if (i === data.length) {
				controller.close();
			} else {
				controller.enqueue(new Uint8Array([data[i++]]));
			}
		},
	});
}

test("reading", async () => {
	const md5 = new Uint8Array(16).fill(0xaa);
	const stream = basicStream(EXAMPLE_BYTES);
	const entries = await gamesbufReadStream(stream, [{ md5 }]);
	expect(entries.length).toEqual(3);

	for (let i = 0, length = entries.length; i < length; ++i) {
		const entry = entries[i];
		expect(entry.name).toEqual("test");
		expect(entry.system).toEqual(1);
		expect(entry.region).toEqual(2);
		expect(entry.md5).toEqual(md5);
		expect(entry.art).toBeUndefined();
	}
});
