'use strict';

var _chai = require('chai');

var _index = require('./index');

var _index2 = _interopRequireDefault(_index);

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

describe('node-xml-stream', function () {

	describe('Emit instruction', function () {

		it('#on(instruction)', function (done) {
			var p = new _index2.default();

			p.on('instruction', function (name, attrs) {
				(0, _chai.expect)(name).to.eql('xml');
				(0, _chai.expect)(attrs).to.be.a('object').with.property('version', '2.0');
				(0, _chai.expect)(attrs).to.have.property('encoding', 'utf-8');
				done();
			});

			p.write('<root><?xml version="2.0" encoding="utf-8"?></root>');
		});
	});

	describe('Emit opentag', function () {
		it('#on(opentag)', function (done) {
			var p = new _index2.default();

			p.on('opentag', function (name, attrs) {
				(0, _chai.expect)(name).to.eql('root');
				(0, _chai.expect)(attrs).to.be.a('object').with.property('name', 'steeljuice');
				done();
			});

			p.write('<root name="steeljuice"><sub>TEXT</sub></root>');
		});
	});

	describe('Emit closetag', function () {
		it('#on(closetag)', function (done) {
			var p = new _index2.default();

			p.on('closetag', function (name) {
				(0, _chai.expect)(name).to.eql('root');
				done();
			});

			p.write('<root name="steeljuice">TEXT</root>');
		});

		it('#on(closetag) self closing.', function (done) {
			var p = new _index2.default();
			p.on('closetag', function (name, attrs) {
				(0, _chai.expect)(name).to.eql('self');
				(0, _chai.expect)(attrs).to.be.a('object').with.property('name', 'steeljuice');
				done();
			});

			p.write('</self name="steeljuice">');
		});
	});

	describe('Emit text', function () {

		it('#on(text)', function (done) {
			var p = new _index2.default();
			p.on('text', function (text) {
				(0, _chai.expect)(text).to.eql('SteelJuice');
				done();
			});
			p.write('<root>SteelJuice</root>');
		});
	});

	describe('Emit CDATA', function () {

		it('#on(cdata)', function (done) {
			var p = new _index2.default();

			p.on('cdata', function (cdata) {
				(0, _chai.expect)(cdata).to.eql('<p>cdata-text</br></p>');
				done();
			});

			p.write('<root><![CDATA[<p>cdata-text</br></p>]]</root>');
		});
	});

	describe('Ignore comments', function () {

		it('#on(text) with comments', function (done) {
			var p = new _index2.default();
			p.on('text', function (text) {
				(0, _chai.expect)(text).to.eql('TEXT');
				done();
			});

			p.write('<root><!--Comment is written here! -->TEXT<!-- another comment! --></root>');
		});
	});

	describe('Stream', function () {
		it('#pipe() a stream.', function (done) {
			var p = new _index2.default();
			var stream = _fs2.default.createReadStream('./test/intertwingly.atom');
			stream.pipe(p);

			// Count the number of entry tags found (start/closing) and compare them (they should be the same) when the stream is completed.
			var entryclose = 0;
			var entrystart = 0;
			p.on('closetag', function (name) {
				if (name === 'entry') entryclose++;
			});
			p.on('opentag', function (name) {
				if (name === 'entry') entrystart++;
			});
			p.on('finish', function () {
				(0, _chai.expect)(entryclose).to.eql(entrystart);
				done();
			});
		});
	});
});