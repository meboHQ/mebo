const assert = require('assert');
const Mebo = require('../../../../src');
const stream = require('stream');


describe('CommandLine Write Options:', () => {

  class CustomOutput extends Mebo.Action{
    _perform(data){

      this.setMetadata('$commandLineResult', {
        test: 3,
        test2: 4,
      });

      return Promise.resolve(true);
    }
  }

  class WriteStream extends stream.Writable{
    constructor(){
      super();
      this.data = [];
    }

    _write(chunk, enc, next){
      this.data.push(chunk);
      next();
    }
  }

  before(() => {
    Mebo.registerAction(CustomOutput);
  });

  it('Should test output option by defining a custom result', () => {

    const commandLine = Mebo.createHandler('commandLine');

    commandLine.setStdout(new WriteStream());
    commandLine.setStderr(new WriteStream());
    commandLine.setArgs([
      'node',
      'file',
    ]);

    return (async () => {
      const result = await commandLine.execute('customOutput');
      commandLine.output(result);

      const stdout = Buffer.concat(commandLine.stdout().data).toString('ascii');
      const parsedValue = JSON.parse(stdout);

      assert.equal(parsedValue.test, 3);
      assert.equal(parsedValue.test2, 4);
    })();
  });
});
