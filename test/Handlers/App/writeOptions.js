const stream = require('stream');
const assert = require('assert');
const Mebo = require('../../../src');


describe('App Write Options:', () => {

  class CustomOutput extends Mebo.Action{
    _perform(data){

      this.setMeta('$appResult', {
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
    Mebo.Action.register(CustomOutput, 'customOutput');
    Mebo.Handler.grantAction('app', 'customOutput');
  });

  it('Should test output option by defining a custom result', () => {

    const app = Mebo.Handler.create('app');

    app.setStdout(new WriteStream());
    app.setStderr(new WriteStream());
    app.setArgs([
      'node',
      'file',
    ]);

    return (async () => {
      const result = await app.runAction('customOutput');
      app.output(result);

      const stdout = Buffer.concat(app.stdout().data).toString('ascii');
      const parsedValue = JSON.parse(stdout);

      assert.equal(parsedValue.test, 3);
      assert.equal(parsedValue.test2, 4);
    })();
  });
});
