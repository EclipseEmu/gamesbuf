import { assert, test } from "vitest";
import { GamesbufWriter } from "../src/mod.ts";
import { EXAMPLE_BYTES } from "./common.ts";

export class WrappedWritableStream {
	private chunks: Uint8Array[] = [];
	private length = 0;
	private done = false;
	stream: WritableStream<Uint8Array>;

	constructor() {
		this.stream = new WritableStream({
			write: (chunk) => {
				this.chunks.push(chunk);
				this.length += chunk.length;
			},
			close: () => {
				this.done = true;
			},
		});
	}

	getBytes(): Uint8Array {
		if (!this.done) {
			throw new Error("stream not done");
		}

		const buffer = new Uint8Array(this.length);
		let pointer = 0;
		for (const chunk of this.chunks) {
			buffer.set(chunk, pointer);
			pointer += chunk.length;
		}
		return buffer;
	}
}

test("generates a proper response", async () => {
	const outputStream = new WrappedWritableStream();
	const writer = new GamesbufWriter(outputStream.stream);
	await writer.writeHeader();
	const hashBytes = [0xaa, 0xaa, 0xbb, 0xbb, 0xaa];
	for (let i = 0, length = hashBytes.length; i < length; ++i) {
		await writer.writeEntry({
			name: "test",
			system: 1,
			region: 2,
			md5: new Uint8Array(16).fill(hashBytes[i]),
		});
	}
	await writer.finish();
	const data = outputStream.getBytes();
	assert.deepEqual(EXAMPLE_BYTES, data, "data mismatch");
});
