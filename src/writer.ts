import {
	ART_LEN_OFFSET,
	ENTRY_MAX_SIZE,
	HASH_LEN,
	HASH_OFFSET,
	HEADER_SIZE,
	GAMESBUF_VERSION,
	NAME_LEN_OFFSET,
	NAME_OFFSET,
	REGION_OFFSET,
	SYSTEM_OFFSET,
	type GamesbufEntry,
} from "./format";
import { convertHexStringToBuffer } from "./hex";

export class GamesbufWriter<System extends number, Region extends number> {
	static encoder: TextEncoder = new TextEncoder();

	/**
	 * A temporary buffer for writing entries into.
	 * This can save us a ton of allocations, so we should try and use encodeInto whenever possible
	 */
	private entryBuffer: Uint8Array = new Uint8Array(ENTRY_MAX_SIZE);

	/** A handle on the writable stream */
	private writer: WritableStreamDefaultWriter<Uint8Array>;

	constructor(stream: WritableStream<Uint8Array>) {
		this.writer = stream.getWriter();
	}

	writeHeader() {
		const buffer = new Uint8Array(HEADER_SIZE);
		buffer[0] = GAMESBUF_VERSION;
		return this.writer.write(buffer);
	}

	private writeString(string: string, buffer: Uint8Array): number {
		if ("encodeInto" in TextEncoder.prototype) {
			return GamesbufWriter.encoder.encodeInto(string, buffer).written ?? 0;
		} else {
			const encodedString = GamesbufWriter.encoder.encode(string);
			buffer.set(encodedString);
			return encodedString.length;
		}
	}

	writeEntry(entry: GamesbufEntry<System, Region>): Promise<void> {
		// write system, region, and hash
		this.entryBuffer[SYSTEM_OFFSET] = entry.system;
		this.entryBuffer[REGION_OFFSET] = entry.region;
		convertHexStringToBuffer(entry.md5, this.entryBuffer.subarray(HASH_OFFSET, HASH_OFFSET + HASH_LEN));

		let pointer = NAME_OFFSET;

		// write name
		const nameLength = this.writeString(entry.name, this.entryBuffer.subarray(pointer, pointer + 0xff));
		this.entryBuffer[NAME_LEN_OFFSET] = nameLength;
		pointer += nameLength;

		// write art
		let artLength: number = 0;
		if (entry.art) {
			artLength = this.writeString(entry.art, this.entryBuffer.subarray(pointer, 0xff));
		}
		this.entryBuffer[ART_LEN_OFFSET] = artLength;
		pointer += artLength;

		// send the bytes to the writer
		return this.writer.write(this.entryBuffer.slice(0, pointer));
	}

	finish(): Promise<void> {
		return this.writer.close();
	}
}
