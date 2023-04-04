/** Gets the hex components from a string and writes it to an array of bytes */
export function convertHexStringToBuffer(string: string, buffer: ArrayLike<number> & { [n: number]: number }) {
	for (let i = 0, j = 0, length = buffer.length; i < length; i++, j += 2) {
		buffer[i] = parseInt(string.substring(j, j + 2), 16);
	}
}

/** Takes an array of bytes and converts it into a string */
export function convertBufferToHexString(buffer: ArrayLike<number>): string {
	let string = "";
	for (let i = 0, length = buffer.length; i < length; i++) {
		string += buffer[i].toString(16).padStart(2, "0");
	}
	return string;
}
