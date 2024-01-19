import {
	ART_LEN_OFFSET,
	ENTRY_MAX_SIZE,
	type GamesbufEntry,
	type GamesbufReaderQuery,
	HASH_LEN,
	HASH_OFFSET,
	NAME_LEN_OFFSET,
	NAME_OFFSET,
	REGION_OFFSET,
	SYSTEM_OFFSET,
	type Uint8,
} from "./format.ts";

/** Reads a single entry from the given Uint8Array. The buffer must start with a valid encoded GamesbufEntry, otherwise it is likely you'll either have malformed data or you'll get an error for bad index access. */
export function gamesbufEntryFromBuffer<System extends Uint8, Region extends Uint8>(
	buffer: Uint8Array,
	decoder: TextDecoder,
): GamesbufEntry<System, Region> {
	const entry: Partial<GamesbufEntry<System, Region>> = {};

	entry.system = buffer[SYSTEM_OFFSET] as System;
	entry.md5 = buffer.slice(HASH_OFFSET, HASH_OFFSET + HASH_LEN);
	entry.region = buffer[REGION_OFFSET] as Region;

	let pointer = NAME_OFFSET;

	const nameLength = buffer[NAME_LEN_OFFSET];
	entry.name = decoder.decode(buffer.subarray(pointer, pointer + nameLength));
	pointer += nameLength;

	const artLength = buffer[ART_LEN_OFFSET];
	entry.art = artLength ? decoder.decode(buffer.subarray(pointer, pointer + artLength)) : null;

	return entry as GamesbufEntry<System, Region>;
}

// NOTE: The following function is a mess, but it is performant.
// 		 Parts of it could be extracted into other functions, but since inlining does not exist in TypeScript, it doesn't make much sense to.

/**
 * Takes ownership of a stream and consumes it until all of the given queries are fulfilled.
 *
 * @param queries The entries to look for. This function takes full ownership of the array, undefined behavior will occur if you mutate it.
 * @throws {Error} If a query's MD5 Hash is not 16 bytes long.
 *
 * @example
 * ```ts
 * import { GamesbufReader } from "gamesbuf";
 *
 * // These would both be enums or an enum-like
 * import { System, Region } from "./some/file/you/have.ts"
 *
 * // ...
 * const dataStream = await fetch("./some/file.gamesbuf").then((response) => response.body);
 * if (!dataStream) {
 * 	throw new Error("no body on response");
 * }
 * const results = await gamesbufReadStream<System, Region>(dataStream, [
 * 	{
 * 		system: System.gb,
 * 		region: Region.usa,
 * 		md5: new TextEncoder().encode("d41d8cd98f00b204e9800998ecf8427e"),
 * 	},
 * ]);
 * // ...
 * ```
 */
export async function gamesbufReadStream<System extends Uint8, Region extends Uint8>(
	stream: ReadableStream<Uint8Array>,
	queries: Readonly<GamesbufReaderQuery<System, Region>>[],
	decoder: TextDecoder = new TextDecoder(),
): Promise<GamesbufEntry<System, Region>[]> {
	// If there's nothing to query, just return back the queries array to save an allocation.
	if (!queries.length) {
		return queries as GamesbufEntry<System, Region>[];
	}

	// Ensure that the hash lengths are valid.
	for (let i = 0, length = queries.length; i < length; ++i) {
		if (queries[i].md5.length !== HASH_LEN) {
			throw new Error(`Invalid MD5 hash. Expected length of ${HASH_LEN}, got ${queries[i].md5.length}`);
		}
	}

	const reader = stream.getReader();
	const matches: GamesbufEntry<System, Region>[] = [];

	let hasReadHeader = false;
	let entryOffset = 0;

	const entryBuffer = new Uint8Array(ENTRY_MAX_SIZE);
	let usedEntryLength = 0;
	let shouldSkipEntry = false;

	let startIndex = 0;
	while (true) {
		// get bytes from the stream
		const { done, value: buffer } = await reader.read();
		if (done) {
			break;
		}
		if (!buffer) {
			continue;
		}

		// copy the startIndex, and set it to 0
		const start = startIndex;
		startIndex = 0;

		// loop over the bytes and parse entries
		for (let i = start, length = buffer.length; i < length; ++i) {
			const byte = buffer[i];

			// Read the header, currently just skip because there is only one version
			if (!hasReadHeader) {
				hasReadHeader = true;
				continue;
			}

			const pointer = entryOffset++;

			// if we're skipping the entry, jump to the next one
			if (shouldSkipEntry) {
				i += usedEntryLength - entryOffset;
				if (i >= length) {
					startIndex = i - length + 1;
				}

				entryOffset = 0;
				usedEntryLength = 0;
				shouldSkipEntry = false;
				continue;
			}

			// handle the byte
			entryBuffer[pointer] = byte;
			if (pointer === NAME_LEN_OFFSET) {
				usedEntryLength = byte + NAME_OFFSET;
			} else if (pointer === ART_LEN_OFFSET) {
				usedEntryLength += byte;
			} else if (pointer === SYSTEM_OFFSET) {
				// check if any of the queries match this system, otherwise skip it
				// if there's no system specified in the query, don't skip
				shouldSkipEntry = true;
				for (let i = 0, length = queries.length; i < length; ++i) {
					const system = queries[i].system;
					if (system === null || system === byte) {
						shouldSkipEntry = false;
						break;
					}
				}
			} else if (pointer >= HASH_OFFSET && pointer < REGION_OFFSET) {
				// check if any of the queries match this hash at this index, otherwise skip it
				const hashIndex = pointer - HASH_OFFSET;
				shouldSkipEntry = true;
				for (let i = 0, length = queries.length; i < length; ++i) {
					if (queries[i].md5[hashIndex] === byte) {
						shouldSkipEntry = false;
						break;
					}
				}
			}

			// check if we've reached the end of the entry
			if (entryOffset && entryOffset === usedEntryLength) {
				const entry = gamesbufEntryFromBuffer<System, Region>(
					entryBuffer.subarray(0, usedEntryLength),
					decoder,
				);
				matches.push(entry);

				// determine which queries were satisfied by this entry and remove them
				for (let i = 0; i < queries.length; ++i) {
					const query = queries[i];

					let isHashEqual = true;
					for (let i = 0; i < HASH_LEN; ++i) {
						if (query.md5[i] !== entry.md5[i]) {
							isHashEqual = false;
							break;
						}
					}

					if (
						isHashEqual ||
						(query.system !== null && query.system !== entry.system) ||
						(query.region !== null && query.region !== entry.region)
					) {
						continue;
					}

					queries.splice(i--, 1);
				}

				// if all the queries are fulfilled, we're done
				if (!queries.length) {
					await reader.cancel();
				}

				entryOffset = 0;
				usedEntryLength = 0;
				shouldSkipEntry = false;
			}
		}
	}
	return matches;
}
