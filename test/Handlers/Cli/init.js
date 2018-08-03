const stream = require('stream');
const Mebo = require('../../../src');
const testutils = require('../../../testutils');

const Cli = Mebo.Handlers.Cli;


describe('Cli Init:', () => {

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

  Mebo.Action.register(testutils.Actions.Shared.Multiply, 'multiply');
  Mebo.Handler.grantAction('cli', 'multiply', {initName: 'multi'});

  @Mebo.grant('cli', {initName: 'customCli'})
  @Mebo.register('myCli')
  class MyCli extends Mebo.Action{

    constructor(){
      super();
      this.createInput('name: text');
      this.createInput('myOtherInput?: numeric');
    }

    _perform(data){
      return data;
    }
  }

  Mebo.Action.register(MyCli, 'customCli2');

  const originalCliArgs = process.argv.slice();
  after(() => {
    process.argv = originalCliArgs;
  });

  it('Should initialize the app', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '--cli', '--help'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.initializedCallback = ((result) => {
      done();
    });

    Cli.init('multiply', options);
  });

  it('Should initialize the app2', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '--cli', 'multi', '--a', '1', '--b', '2'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.initializedCallback = ((result) => {
      done();
    });

    Mebo.Handler.get('cli').init('myCli', options);
  });
});
