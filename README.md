# node-xml-stream

---

### Summary
* A tiny simple and fast XML/HTML stream parser with an easy-to-use interface (using NodeJS streams)
* A very effective (fast) way to detal with RSS/ATOM/RDF feeds

---
### Motivation
There are alot of good other xml/html parsers out there, this is just meant to be a tiny and easy to use stream-parser that is fast. It is a perfect match for use in feed parsers (e.g. ATOM/RSS/RDF)

If you need a parser that is more heavy-weight with more functionality I recommend `node-sax` https://github.com/isaacs/sax-js

### What does it do?
Reads XML/HTML streams fast and emitts events for:
* Tag Openings (opentag) <tag attr="1.0"\>
* Closing tags (closetag) </tag\>
* CDATA (cdata) <[[CDATA[data]]>
* Instructions (instruction) <?xml version="1.0?\>

All comments are  ignored (not emitted). `<!DOCTYPES`, `<!ENTITY` are also ignored, I haven't found any real need for them yet parsing RSS/ATOM/RDF.


### Installation
Install via NPM using command:

``` npm install --save node-xml-stream ```

### Usage

```
let Parser = require('node-xml-stream');
let fs = require('fs');

let parser = new Parser();

// <tag attr="hello">
parser.on('opentag', (name, attrs) => {
	// name = 'tag'
	// attrs = { attr: 'hello' }
});

// </tag>
parser.on('closetag', name => {
	// name = 'tag'
}

// <tag>TEXT</tag>
parser.on('text', text => {
	// text = 'TEXT'
});

// <[[CDATA['data']]>
parser.on('cdata', cdata => {
	// cdata = 'data'
});

// <?xml version="1.0"?>
parser.on('instruction', (name, attrs) => {
	// name = 'xml'
    // attrs = { version: '1.0' }
});

// Only stream-errors are emitted.
parser.on('error', err => {
	// Handle a parsing error
});

parser.on('finish', () => {
	// Stream is completed
});

// Write data to the stream.
parser.write('<root>TEXT</root>');

// Pipe a stream to the parser
let stream = fs.createReadStream('./feed.atom');
stream.pipe(parser);

```

---
### Methods

`#write(data)` - write data to the stream.

`#end()`- end the stream

`#on(event, handler)` - Attach an eventhandler

---

### Events

All the default stream events for NodeJS streams and the below extra events that are emitted:

`opentag` - when a tag is opened { name, attributes }

`closetag`- When a tag is closed { name }

`text` - when text is retrieved { text }

`cdata` - when CDATA is read. { text }

`instruction` - When instruction is available { name, attributes }


### Contributing
Pull requests and stars always welcome. For bugs and feature requests, please [create an issue.](https://github.com/Steeljuice/node-xml-stream/issues)

### License
MIT © Tommy Dronkers
