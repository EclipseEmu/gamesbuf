import { assert, expect, test } from "vitest";
import { convertBufferToHexString, convertHexStringToBuffer } from "../src/hex";

const BUFFER = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
const STRING = "0102030405060708090a";

test("convert buffer to hex string", () => {
	const result = convertBufferToHexString(BUFFER);
	expect(result).toEqual(STRING);
});

test("convert hex string to buffer", () => {
	const output = new Uint8Array(STRING.length / 2);
	const result = convertHexStringToBuffer(STRING, output);
	assert.deepEqual(output, BUFFER, "matches original");
});
