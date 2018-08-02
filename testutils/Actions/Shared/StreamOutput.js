const stream = require('stream');
const promisify = require('es6-promisify');
const fs = require('fs');
const Mebo = require('../../../src');

const readFile = promisify(fs.readFile);

class StreamOutput extends Mebo.Action{
  constructor(){
    super();
    this.createInput('type: text');
    this.createInput('file?: filePath', {restrictWebAccess: false});
  }

  async _perform(data){

    // text input
    if (data.type === 'text'){
      const bufferStream = new stream.PassThrough();

      bufferStream.end(new Buffer('test'));

      // setting a custom content type
      this.setMeta('handler.web.writeOptions', {
        headers: {
          contentType: 'text/plain',
        },
      });

      return bufferStream;
    }

    // binary
    return readFile(data.file);
  }
}

module.exports = StreamOutput;
