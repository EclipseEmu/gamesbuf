import { GamesbufReader } from "../src/mod";
import { EXAMPLE_BYTES } from "./_common";
import { expect, test } from "vitest";

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

test("can read an entry", async () => {
	const md5 = "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa";
	let stream = basicStream(EXAMPLE_BYTES);
	let reader = new GamesbufReader(stream, [{ md5 }]);
	const entries = await reader.process();
	expect(entries.length).toEqual(1);

	const entry = entries[0];
	expect(entry.name).toEqual("test");
	expect(entry.system).toEqual(1);
	expect(entry.region).toEqual(2);
	expect(entry.md5).toEqual(md5);
	expect(entry.art).toBeUndefined();
});
