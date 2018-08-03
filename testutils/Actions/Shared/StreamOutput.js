const stream = require('stream');
const util = require('util');
const fs = require('fs');
const Mebo = require('../../../src');

const readFile = util.promisify(fs.readFile);

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

      bufferStream.end(Buffer.from('test'));

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
