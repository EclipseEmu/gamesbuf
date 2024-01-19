/** An unsigned 8-bit integer. Possible values: 0-255. */
export type Uint8 = number;

/** An entry representing the basic info of a game. */
export type GamesbufEntry<System extends Uint8 = Uint8, Region extends Uint8 = Uint8> = {
	name: string;
	md5: Uint8Array;
	art: string | null;
	region: Region;
	system: System;
};

/** A query for `GamesbufReader`. */
export type GamesbufReaderQuery<System extends Uint8 = Uint8, Region extends Uint8 = Uint8> = {
	/** The MD5 hash of the game to look for. Matches exactly. */
	readonly md5: Uint8Array;
	/** The region of the game to look for. When present, the reader will prefer this value. */
	readonly region: Region | null;
	/** The system of the game to look for. Matches exactly. */
	readonly system: System | null;
};

export const HEADER_SIZE = 0x01;

/** The current version of the Gamesbuf format, which is the first byte of the data file. */
export const GAMESBUF_VERSION = 1;

export const HASH_LEN = 0x10;

export const NAME_LEN_OFFSET = 0x00;
export const ART_LEN_OFFSET = 0x01;
export const SYSTEM_OFFSET = 0x02;
export const HASH_OFFSET = 0x03;
export const REGION_OFFSET = HASH_OFFSET + HASH_LEN;
export const NAME_OFFSET = REGION_OFFSET + 0x01;

export const ENTRY_MIN_SIZE = HASH_LEN + 0x04;
export const ENTRY_MAX_SIZE = ENTRY_MIN_SIZE + 0xff + 0xff;
