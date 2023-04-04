export const EXAMPLE_BYTES = new Uint8Array([
	// Header
	1,
	// entry A
	4, // name length
	0, // art length
	1, // system
	0xaa, // hash start
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa,
	0xaa, // hash end
	2, // region
	// name ("test")
	116,
	101,
	115,
	116,
]);
