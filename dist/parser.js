'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.EVENTS = undefined;

var _slicedToArray = function () { function sliceIterator(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"]) _i["return"](); } finally { if (_d) throw _e; } } return _arr; } return function (arr, i) { if (Array.isArray(arr)) { return arr; } else if (Symbol.iterator in Object(arr)) { return sliceIterator(arr, i); } else { throw new TypeError("Invalid attempt to destructure non-iterable instance"); } }; }();

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _stream = require('stream');

function _toArray(arr) { return Array.isArray(arr) ? arr : Array.from(arr); }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

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
var Parser = function (_Writable) {
	_inherits(Parser, _Writable);

	function Parser() {
		_classCallCheck(this, Parser);

		var _this = _possibleConstructorReturn(this, (Parser.__proto__ || Object.getPrototypeOf(Parser)).call(this));

		_this.state = STATE.TEXT;
		_this.buffer = '';
		_this.pos = 0;

		_this.isCloseTag = false;
		return _this;
	}

	_createClass(Parser, [{
		key: '_write',
		value: function _write(chunk, encoding, done) {
			chunk = typeof chunk !== 'string' ? chunk.toString() : chunk;
			for (var i = 0; i < chunk.length; i++) {
				var c = chunk[i];
				var prev = this.buffer[this.pos - 1];
				this.buffer += c;
				this.pos++;

				switch (this.state) {

					case STATE.TEXT:
						if (c === '<') this._onStartNewTag();
						break;

					case STATE.TAG_NAME:
						if (prev === '<' && c === '?') this._onStartInstruction();
						if (prev === '<' && c === '/') this._onCloseTagStart();
						if (this.buffer[this.pos - 3] === '<' && prev === '!' && c === '[') this._onCDATAStart();
						if (this.buffer[this.pos - 3] === '<' && prev === '!' && c === '-') this._onCommentStart();
						if (c === '>') this._onTagCompleted();
						break;

					case STATE.INSTRUCTION:
						if (prev === '?' && c === '>') this._onEndInstruction();
						break;

					case STATE.CDATA:
						if (prev === ']' && c === ']') this._onCDATAEnd();
						break;

					case STATE.IGNORE_COMMENT:
						if (this.buffer[this.pos - 3] === '-' && prev === '-' && c === '>') this._onCommentEnd();
						break;
				}
			}
			done();
		}
	}, {
		key: '_endRecording',
		value: function _endRecording() {
			var rec = this.buffer.slice(1, this.pos - 1);
			this.buffer = this.buffer.slice(-1); // Keep last item in buffer for prev comparison in main loop.
			this.pos = 1; // Reset the position (since the buffer was reset)
			return rec;
		}
	}, {
		key: '_onStartNewTag',
		value: function _onStartNewTag() {
			var text = this._endRecording().trim();
			if (text) {
				this.emit(EVENTS.TEXT, text);
			}
			this.state = STATE.TAG_NAME;
		}
	}, {
		key: '_onTagCompleted',
		value: function _onTagCompleted() {
			var tag = this._endRecording();

			var _parseTagString2 = this._parseTagString(tag),
			    name = _parseTagString2.name,
			    attributes = _parseTagString2.attributes;

			if (!this.isCloseTag) {
				this.emit(EVENTS.OPEN_TAG, name, attributes);
			} else {
				this.emit(EVENTS.CLOSE_TAG, name, attributes);
			}

			this.isCloseTag = false;
			this.state = STATE.TEXT;
		}
	}, {
		key: '_onCloseTagStart',
		value: function _onCloseTagStart() {
			this._endRecording();
			this.isCloseTag = true;
		}
	}, {
		key: '_onStartInstruction',
		value: function _onStartInstruction() {
			this._endRecording();
			this.state = STATE.INSTRUCTION;
		}
	}, {
		key: '_onEndInstruction',
		value: function _onEndInstruction() {
			this.pos -= 2; // Move position back 2 steps since instruction ends with '?>'
			var inst = this._endRecording();

			var _parseTagString3 = this._parseTagString(inst),
			    name = _parseTagString3.name,
			    attributes = _parseTagString3.attributes;

			this.emit(EVENTS.INSTRUCTION, name, attributes);
			this.state = STATE.TEXT;
		}
	}, {
		key: '_onCDATAStart',
		value: function _onCDATAStart() {
			this._endRecording();
			this.state = STATE.CDATA;
		}
	}, {
		key: '_onCDATAEnd',
		value: function _onCDATAEnd() {
			var text = this._endRecording(); // Will return CDATA[XXX] we regexp out the actual text in the CDATA.
			text = text.slice(text.indexOf('[') + 1, text.lastIndexOf(']'));
			this.state = STATE.TEXT;

			this.emit(EVENTS.CDATA, text);
		}
	}, {
		key: '_onCommentStart',
		value: function _onCommentStart() {
			this.state = STATE.IGNORE_COMMENT;
		}
	}, {
		key: '_onCommentEnd',
		value: function _onCommentEnd() {
			this._endRecording();
			this.state = STATE.TEXT;
		}

		/**
   * Helper to parse a tag string 'xml version="2.0" encoding="utf-8"' with regexp.
   * @param  {string} str the tag string.
   * @return {object}     {name, attributes}
   */

	}, {
		key: '_parseTagString',
		value: function _parseTagString(str) {
			var _str$split = str.split(/\s+(?=[\w:]+=)/g),
			    _str$split2 = _toArray(_str$split),
			    name = _str$split2[0],
			    attrs = _str$split2.slice(1);

			var attributes = {};
			attrs.forEach(function (attribute) {
				var _attribute$split = attribute.split('='),
				    _attribute$split2 = _slicedToArray(_attribute$split, 2),
				    name = _attribute$split2[0],
				    value = _attribute$split2[1];

				attributes[name] = value.trim().replace(/"|'/g, '');
			});
			return { name: name, attributes: attributes };
		}
	}]);

	return Parser;
}(_stream.Writable);

exports.default = Parser;


var STATE = {
	TEXT: 0,
	TAG_NAME: 1,
	INSTRUCTION: 2,
	IGNORE_COMMENT: 4,
	CDATA: 8
};

var EVENTS = exports.EVENTS = {
	TEXT: 'text',
	INSTRUCTION: 'instruction',
	OPEN_TAG: 'opentag',
	CLOSE_TAG: 'closetag',
	CDATA: 'cdata'
};