# Gamesbuf

Gamesbuf (short for Games Buffer) is a highly-concise data format for basic game information: title, box art, system, region, and MD5 hash. The format is streamable, meaning it gets queried as it is loaded. If all queries are fulfilled early, then the stream is closed.

[Docs](https://paka.dev/npm/gamesbuf)

## The Format

It begins with a one-byte header for the version of the Gamesbuf format it's using.

All the proceeding bytes are entries, which have the following general structure:
```c
struct GamesbufEntry {
	u8 name_length;
	u8 art_length;
	u8 system;
	char md5[0x10];
	u8 region;
	char name[name_length];
	char art[art_length];
}
```

This ordering helps us quickly determine the size of the entry. Besides name and box art, the rest get queried:
1. The system is checked to be an exact match, skipping the entry if it isn't.
2. The MD5 checksum is checked to be an exact match, skipping the entry if it isn't.
3. An exact match will fulfill the query when the region is present. Without it, all games with a matching hash will be returned.

When all queries are fulfilled, the stream is closed and the data is returned.
