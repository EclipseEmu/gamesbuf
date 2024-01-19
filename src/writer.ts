import {
	ART_LEN_OFFSET,
	ENTRY_MAX_SIZE,
	GAMESBUF_VERSION,
	type GamesbufEntry,
	HASH_LEN,
	HASH_OFFSET,
	HEADER_SIZE,
	NAME_LEN_OFFSET,
	NAME_OFFSET,
	REGION_OFFSET,
	SYSTEM_OFFSET,
} from "./format.ts";

/** A class for writing a gamesbuf file to a web stream.
 *
 * @example
 * ```ts
 * import { GamesbufWriter } from "gamesbuf";
 *
 * // These would both be enums or an enum-like
 * import { System, Region } from "./some/file/you/have.ts"
 *
 * const outputStream: WritableStream<Uint8Array> = ...; // Obtain a writable stream at some point
 *
 * // Create an instance of the writer
 * const writer = new GamesbufWriter(outputStream);
 * await writer.writeHeader();
 *
 * // You can write an entry like so, after writing the header:
 * await writer.writeEntry({
 *		name: "Some game",
 *		md5: new TextEncoder().encode("d41d8cd98f00b204e9800998ecf8427e"),
 *		art: "https://example.com/image.png",
 *		system: System.gb,
 *		region: Region.usa,
 * });
 *
 * // Once you're done writing, call finish
 * await writer.finish();
 * ```
 */
export class GamesbufWriter<System extends number, Region extends number> {
	/**
	 * A temporary buffer for writing entries into.
	 * This can save us a ton of allocations, so we should try and use encodeInto whenever possible
	 */
	private entryBuffer: Uint8Array = new Uint8Array(ENTRY_MAX_SIZE);
	private writer: WritableStreamDefaultWriter<Uint8Array>;
	private encoder: TextEncoder;

	constructor(stream: WritableStream<Uint8Array>, encoder: TextEncoder = new TextEncoder()) {
		this.writer = stream.getWriter();
		this.encoder = encoder;
	}

	/** Writes the header to the stream. Must be called before any other write. */
	writeHeader() {
		const buffer = new Uint8Array(HEADER_SIZE);
		buffer[0] = GAMESBUF_VERSION;
		return this.writer.write(buffer);
	}

	private writeString(string: string, buffer: Uint8Array): number {
		if ("encodeInto" in TextEncoder.prototype) {
			return this.encoder.encodeInto(string, buffer).written ?? 0;
		}
		const encodedString = this.encoder.encode(string);
		buffer.set(encodedString);
		return encodedString.length;
	}

	/** Write the given entry to the stream.
	 * @throws {Error} if the MD5 hash's length for {@link GamesbufEntry.md5} is not the hash length (16)
	 */
	writeEntry(entry: GamesbufEntry<System, Region>): Promise<void> {
		if (entry.md5.length !== HASH_LEN) {
			throw new Error(`Invalid MD5 hash length. Expected ${HASH_LEN} got ${entry.md5.length}.`);
		}

		// write system, region, and hash
		this.entryBuffer[SYSTEM_OFFSET] = entry.system;
		this.entryBuffer[REGION_OFFSET] = entry.region;

		this.entryBuffer.subarray(HASH_OFFSET, HASH_OFFSET + HASH_LEN).set(entry.md5);

		let pointer = NAME_OFFSET;

		// write name
		const nameLength = this.writeString(entry.name, this.entryBuffer.subarray(pointer, pointer + 0xff));
		this.entryBuffer[NAME_LEN_OFFSET] = nameLength;
		pointer += nameLength;

		// write art
		const artLength = entry.art ? this.writeString(entry.art, this.entryBuffer.subarray(pointer, 0xff)) : 0;
		this.entryBuffer[ART_LEN_OFFSET] = artLength;
		pointer += artLength;

		// send the bytes to the writer
		return this.writer.write(this.entryBuffer.slice(0, pointer));
	}

	/** Closes the stream and finishes writing */
	finish(): Promise<void> {
		return this.writer.close();
	}
}
