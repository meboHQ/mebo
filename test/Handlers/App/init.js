const stream = require('stream');
const Mebo = require('../../../src');
const testutils = require('../../../testutils');

const App = Mebo.Handlers.App;


describe('App Init:', () => {

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
  Mebo.Handler.grantAction('app', 'multiply', {initName: 'multi'});

  @Mebo.grant('app', {initName: 'customApp'})
  @Mebo.register('myApp')
  class MyApp extends Mebo.Action{

    constructor(){
      super();
      this.createInput('name: text');
      this.createInput('myOtherInput?: numeric');
    }

    _perform(data){
      return data;
    }
  }

  Mebo.Action.register(MyApp, 'customApp2');

  const originalAppArgs = process.argv.slice();
  after(() => {
    process.argv = originalAppArgs;
  });

  it('Should initialize the app', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '--app', '--help'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.initializedCallback = ((result) => {
      done();
    });

    App.init('multiply', options);
  });

  it('Should initialize the app2', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '--app', 'multi', '--a', '1', '--b', '2'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.initializedCallback = ((result) => {
      done();
    });

    Mebo.Handler.get('app').init('myApp', options);
  });
});
