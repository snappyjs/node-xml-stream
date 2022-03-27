'use strict';

import { Writable } from 'stream';

/**
 * A fast XML parser for NodeJS using Writable streams.
 *
 * What this is:
 * Simple and fast XML parser purley written for NodeJS. No extra production dependencies.
 * A handy way parse ATOM/RSS/RDF feeds and such. No validation is made on the document that is parsed.
 *
 * Motivation
 * There is already quite a few parsers out there. I just wanted a parser that was as tiny and fast as possible to handle easy parsing of
 * RSS/ATOM/RDF feeds using streams, no fancy stuff needed. If you want more functionality you should check out other recommended parsers (see below)
 *
 * Usage
 * Just #pipe() a <stream.Readable> and you are ready to listen for events.
 * You can also use the #write() method to write directly to the parser.
 *
 * The source is written using ES2015, babel is used to translate to the dist.
 *
 * Other recommended parsers for node that are great:
 * https://github.com/isaacs/sax-js
 * https://github.com/xmppjs/ltx
 *
 * Events:
 * - text
 * - instruction
 * - opentag
 * - closetag
 * - cdata
 *
 * Comments are ignored, so there is no events for them.
 *
 */
export default class Parser extends Writable {

	constructor() {
		super();
		this.state = STATE.TEXT;
		this.buffer = '';
		this.pos = 0;
		this.tagType = TAG_TYPE.NONE;
	}

	_write(chunk, encoding, done) {
		chunk = typeof chunk !== 'string' ? chunk.toString() : chunk;
		for (let i = 0; i < chunk.length; i++) {
			let c = chunk[i];
			let prev = this.buffer[this.pos - 1];
			this.buffer += c;
			this.pos++;

			switch (this.state) {

				case (STATE.TEXT):
					if (c === '<') this._onStartNewTag();
					break;

				case (STATE.TAG_NAME):
					if (prev === '<' && c === '?') { this._onStartInstruction() };
					if (prev === '<' && c === '/') { this._onCloseTagStart() };
					if (this.buffer[this.pos - 3] === '<' && prev === '!' && c === '[') { this._onCDATAStart() };
					if (this.buffer[this.pos - 3] === '<' && prev === '!' && c === '-') { this._onCommentStart() };
					if (c === '>') {
						if (prev === "/") { this.tagType |= TAG_TYPE.CLOSING; }
						this._onTagCompleted();
					}
					break;

				case (STATE.INSTRUCTION):
					if (prev === '?' && c === '>') this._onEndInstruction();
					break;

				case (STATE.CDATA):
					if (prev === ']' && c === ']') this._onCDATAEnd();
					break;

				case (STATE.IGNORE_COMMENT):
					if (this.buffer[this.pos - 3] === '-' && prev === '-' && c === '>') this._onCommentEnd();
					break;
			}

		}
		done();
	}

	_endRecording() {
		let rec = this.buffer.slice(1, this.pos - 1).trim();
		this.buffer = this.buffer.slice(-1); // Keep last item in buffer for prev comparison in main loop.
		this.pos = 1;
		rec = rec.charAt(rec.length - 1) === '/' ? rec.slice(0, -1) : rec;
		rec = rec.charAt(rec.length - 1) === '>' ? rec.slice(0, -2) : rec;
		return rec;
	}

	_onStartNewTag() {
		let text = this._endRecording().trim();
		if (text) {
			this.emit(EVENTS.TEXT, text);
		}
		this.state = STATE.TAG_NAME;
		this.tagType = TAG_TYPE.OPENING;
	}

	_onTagCompleted() {
		let tag = this._endRecording();
		let { name, attributes } = this._parseTagString(tag);

		if ((this.tagType & TAG_TYPE.OPENING) == TAG_TYPE.OPENING) {
			this.emit(EVENTS.OPEN_TAG, name, attributes);
		}
		if ((this.tagType & TAG_TYPE.CLOSING) == TAG_TYPE.CLOSING) {
			this.emit(EVENTS.CLOSE_TAG, name, attributes);
		}

		this.isCloseTag = false;
		this.state = STATE.TEXT;
		this.tagType = TAG_TYPE.NONE;
	}

	_onCloseTagStart() {
		this._endRecording();
		this.tagType = TAG_TYPE.CLOSING;
	}

	_onStartInstruction() {
		this._endRecording();
		this.state = STATE.INSTRUCTION;
	}

	_onEndInstruction() {
		this.pos -= 1; // Move position back 1 step since instruction ends with '?>'
		let inst = this._endRecording();
		let { name, attributes } = this._parseTagString(inst);
		this.emit(EVENTS.INSTRUCTION, name, attributes);
		this.state = STATE.TEXT;
	}

	_onCDATAStart() {
		this._endRecording();
		this.state = STATE.CDATA;
	}

	_onCDATAEnd() {
		let text = this._endRecording(); // Will return CDATA[XXX] we regexp out the actual text in the CDATA.
		text = text.slice(text.indexOf('[') + 1, text.lastIndexOf(']'));
		this.state = STATE.TEXT;

		this.emit(EVENTS.CDATA, text);
	}

	_onCommentStart() {
		this.state = STATE.IGNORE_COMMENT;
	}

	_onCommentEnd() {
		this._endRecording();
		this.state = STATE.TEXT;
	}

	/**
	 * Helper to parse a tag string 'xml version="2.0" encoding="utf-8"' with regexp.
	 * @param  {string} str the tag string.
	 * @return {object}     {name, attributes}
	 */
	_parseTagString(str) {
		let [name, ...attrs] = str.split(/\s+(?=[\w:-]+=)/g);
		let attributes = {};
		attrs.forEach((attribute) => {
			let [name, value] = attribute.split("=");
			attributes[name] = value.trim().replace(/"|'/g, "");
		});
		return { name, attributes };
	}
}

const STATE = {
	TEXT: 0,
	TAG_NAME: 1,
	INSTRUCTION: 2,
	IGNORE_COMMENT: 4,
	CDATA: 8
};

const TAG_TYPE = {
	NONE: 0,
	OPENING: 1,
	CLOSING: 2,
	SELF_CLOSING: 3
}

export const EVENTS = {
	TEXT: 'text',
	INSTRUCTION: 'instruction',
	OPEN_TAG: 'opentag',
	CLOSE_TAG: 'closetag',
	CDATA: 'cdata'
};
