function testEntry(hashByte: number): Uint8Array {
	const bytes = new Uint8Array(24);
	bytes[0] = 4; // name length
	bytes[1] = 0; // art length
	bytes[2] = 1; // system
	bytes.fill(hashByte, 3, 19); // write hash
	bytes[19] = 2; // region
	// name: "test"
	bytes[20] = 116;
	bytes[21] = 101;
	bytes[22] = 115;
	bytes[23] = 116;
	return bytes;
}

export const EXAMPLE_BYTES = new Uint8Array([
	1, // header
	...testEntry(0xaa),
	...testEntry(0xaa),
	...testEntry(0xbb),
	...testEntry(0xbb),
	...testEntry(0xaa),
]);
