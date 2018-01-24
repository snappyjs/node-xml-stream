'use strict';

import { expect } from 'chai';
import Parser from './index';

import fs from 'fs';

describe('node-xml-stream', function () {

	describe('Emit instruction', function () {

		it('#on(instruction)', function (done) {
			let p = new Parser();

			p.on('instruction', function (name, attrs) {
				expect(name).to.eql('xml');
				expect(attrs).to.be.a('object').with.property('version', '2.0');
				expect(attrs).to.have.property('encoding', 'utf-8');
				done();
			});

			p.write('<root><?xml version="2.0" encoding="utf-8"?></root>');
		});

	});

	describe('Emit opentag', function () {
		it('#on(opentag)', function (done) {
			let p = new Parser();

			p.on('opentag', function (name, attrs) {
				expect(name).to.eql('root');
				expect(attrs).to.be.a('object').with.property('name', 'steeljuice');
				done();
			});

			p.write('<root name="steeljuice"><sub>TEXT</sub></root>');
		});
	});

	describe('Handle SOAP', function () {
		it('#on(opentag)', function (done) {
			let p = new Parser();

			p.on('opentag', function (name, attrs) {
				expect(name).to.eql('SOAP-ENV:Envelope');
				expect(attrs).to.be.a('object').with.property('xmlns:SOAP-ENV', 'http://schemas.xmlsoap.org/soap/envelope/');
				done();
			});

			p.write('<SOAP-ENV:Envelope xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><SOAP-ENV:Body><SOAP-ENV:Fault xmlns:SOAP-ENV="http://schemas.xmlsoap.org/soap/envelope/"><faultcode>SOAP-ENV:Client.authenticationError</faultcode></SOAP-ENV:Fault></SOAP-ENV:Body></SOAP-ENV:Envelope>');
		});
	});

	describe('Emit closetag', function () {
		it('#on(closetag)', function (done) {
			let p = new Parser();

			p.on('closetag', function (name) {
				expect(name).to.eql('root');
				done();
			});

			p.write('<root name="steeljuice">TEXT</root>');

		});

		it('#on(closetag) self closing.', function (done) {
			let p = new Parser();
			p.on('closetag', function (name, attrs) {
				expect(name).to.eql('self');
				expect(attrs).to.be.a('object').with.property('name', 'steeljuice');
				done();
			});

			p.write('</self name="steeljuice">');
		});
	});

	describe('Emit text', function () {

		it('#on(text)', function (done) {
			let p = new Parser();
			p.on('text', function (text) {
				expect(text).to.eql('SteelJuice');
				done();
			});
			p.write('<root>SteelJuice</root>');
		});
	});

	describe('Emit CDATA', function () {

		it('#on(cdata)', function (done) {
			let p = new Parser();

			p.on('cdata', function (cdata) {
				expect(cdata).to.eql('<p>cdata-text</br></p>');
				done();
			});

			p.write('<root><![CDATA[<p>cdata-text</br></p>]]</root>');
		});

	});

	describe('Ignore comments', function () {

		it('#on(text) with comments', function (done) {
			let p = new Parser();
			p.on('text', function (text) {
				expect(text).to.eql('TEXT');
				done();
			});

			p.write('<root><!--Comment is written here! -->TEXT<!-- another comment! --></root>');
		});

	});

	describe('Stream', function () {
		it('#pipe() a stream.', function (done) {
			let p = new Parser();
			let stream = fs.createReadStream('./test/intertwingly.atom');
			stream.pipe(p);

			// Count the number of entry tags found (start/closing) and compare them (they should be the same) when the stream is completed.
			let entryclose = 0;
			let entrystart = 0;
			p.on('closetag', name => {
				if (name === 'entry')
					entryclose++;
			});
			p.on('opentag', name => {
				if (name === 'entry')
					entrystart++;
			});
			p.on('finish', () => {
				expect(entryclose).to.eql(entrystart);
				done();
			});
		});
	});

});
