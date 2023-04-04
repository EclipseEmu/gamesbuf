import {
	ART_LEN_OFFSET,
	ENTRY_MAX_SIZE,
	HASH_LEN,
	HASH_OFFSET,
	NAME_LEN_OFFSET,
	NAME_OFFSET,
	REGION_OFFSET,
	SYSTEM_OFFSET,
	type GamesbufEntry,
	type GamesbufReaderQuery,
	Uint8,
} from "./format";
import { convertBufferToHexString, convertHexStringToBuffer } from "./hex";

type ByteHashReaderQuery<System extends Uint8 = Uint8, Region extends Uint8 = Uint8> = Omit<
	GamesbufReaderQuery<System, Region>,
	"md5"
> & { md5: string; md5Buffer: Uint8Array };

export class GamesbufReader<System extends Uint8, Region extends Uint8> {
	static encoder = new TextEncoder();
	static decoder = new TextDecoder();

	private readonly reader: ReadableStreamDefaultReader<Uint8Array>;
	private readonly queries: ByteHashReaderQuery<System, Region>[];
	private readonly entry: Uint8Array;
	private bytesRead: number;
	private entryOffset: number;
	private entryLength: number;
	private entrySkip: boolean;

	constructor(stream: ReadableStream<Uint8Array>, queries: GamesbufReaderQuery<System, Region>[]) {
		this.reader = stream.getReader();
		this.entry = new Uint8Array(ENTRY_MAX_SIZE);
		this.entryOffset = 0;
		this.entryLength = 0;
		this.entrySkip = false;
		this.bytesRead = 0;

		/** Make sure each query's hash is an array buffer */
		for (let i = 0, length = queries.length; i < length; i++) {
			const query = queries[i];
			if (typeof query.md5 === "string") {
				let hashBytes = new Uint8Array(HASH_LEN);
				convertHexStringToBuffer(query.md5, hashBytes);
				(query as ByteHashReaderQuery).md5Buffer = hashBytes;
			} else if (query.md5 instanceof Uint8Array) {
				(query as ByteHashReaderQuery).md5Buffer = query.md5;
				(query as ByteHashReaderQuery).md5 = convertBufferToHexString(query.md5);
			}
			if (query.md5.length !== HASH_LEN * 2) {
				throw new Error(`Invalid MD5 hash length. Expected ${HASH_LEN} got ${query.md5.length}.`);
			}
		}

		this.queries = queries as ByteHashReaderQuery<System, Region>[];
	}

	private resetEntryState() {
		this.entryOffset = 0;
		this.entryLength = 0;
		this.entrySkip = false;
	}

	async process(): Promise<GamesbufEntry<System, Region>[]> {
		let matches: GamesbufEntry<System, Region>[] = [];
		let queries = this.queries;
		let remainingQueries = queries.slice();

		// if there's nothing to look for, just skip running entirely
		if (!queries.length) {
			return matches;
		}

		let startIndex = 0;

		while (true) {
			// get bytes from the stream
			const result = await this.reader.read();
			if (result.done) {
				break;
			}
			let buffer = result.value;
			if (!buffer) {
				continue;
			}

			// copy the startIndex, and set it to 0
			let start = startIndex;
			startIndex = 0;

			// loop over the bytes and parse entries
			for (let i = start, length = buffer.length; i < length; i++) {
				let byte = buffer[i];

				// Read the header, currently just skip because there is only one version
				if (this.bytesRead++ === 0) {
					continue;
				}

				let pos = this.entryOffset++;

				// if we're skipping the entry, jump to the next one
				if (this.entrySkip) {
					i += this.entryLength - this.entryOffset;
					if (i >= length) {
						startIndex = i - length + 1;
					}
					this.resetEntryState();
					continue;
				}

				// handle the byte
				this.entry[pos] = byte;
				if (pos === NAME_LEN_OFFSET) {
					this.entryLength = byte + NAME_OFFSET;
				} else if (pos === ART_LEN_OFFSET) {
					this.entryLength += byte;
				} else if (pos === SYSTEM_OFFSET) {
					// check if any of the queries match this system, otherwise skip it
					// if there's no system specified in the query, don't skip
					let skip = true;
					for (let i = 0, length = remainingQueries.length; i < length; i++) {
						let query = remainingQueries[i];
						if (!query.system || query.system === byte) {
							skip = false;
							break;
						}
					}
					this.entrySkip = skip;
				} else if (pos >= HASH_OFFSET && pos < REGION_OFFSET) {
					// check if any of the queries match this hash at this index, otherwise skip it
					let hashIndex = pos - HASH_OFFSET;
					let skip = true;
					for (let i = 0, length = remainingQueries.length; i < length; i++) {
						if (remainingQueries[i].md5Buffer[hashIndex] === byte) {
							skip = false;
							break;
						}
					}
					this.entrySkip = skip;
				}

				// check if we've reached the end of the entry
				if (this.entryOffset && this.entryOffset === this.entryLength) {
					let entry = this.entryFromBuffer(this.entry.subarray(0, this.entryLength));
					matches.push(entry);

					// determine which queries were satisfied by this entry and remove them
					let shouldRemove: number[] = [];
					for (let i = 0, length = remainingQueries.length; i < length; i++) {
						let query = remainingQueries[i];
						let system = query.system;
						let region = query.region;
						if (query.md5 === entry.md5 || (system && system !== entry.system) || (region && region !== entry.region)) {
							continue;
						}
						shouldRemove.push(i);
					}

					for (let i = 0, length = shouldRemove.length; i < length; i++) {
						remainingQueries.splice(shouldRemove[i], 1);
					}

					// if all the queries are fulfilled, we're done
					if (!remainingQueries.length) {
						await this.reader.cancel();
					}
					this.resetEntryState();
				}
			}
		}
		return matches;
	}

	entryFromBuffer(buffer: Uint8Array): GamesbufEntry<System, Region> {
		const decoder = GamesbufReader.decoder;
		// get size fields
		const nameLength = buffer[NAME_LEN_OFFSET];
		const artLength = buffer[ART_LEN_OFFSET];

		// get system and region
		const system = buffer[SYSTEM_OFFSET] as System;
		const hashBuffer = buffer.subarray(HASH_OFFSET, HASH_OFFSET + HASH_LEN);
		const md5 = convertBufferToHexString(hashBuffer);
		const region = buffer[REGION_OFFSET] as Region;

		// get strings
		let i = NAME_OFFSET;
		const name = decoder.decode(buffer.subarray(i, i + nameLength));
		i += nameLength;
		let art: string | undefined;
		if (artLength) {
			art = decoder.decode(buffer.subarray(i, i + artLength));
		}

		// return entry
		return { md5, name, art, region, system };
	}
}
