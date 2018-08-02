const Mebo = require('../../../src');
const testutils = require('../../../testutils');
const stream = require('stream');


describe('Graph Init:', () => {

  Mebo.Action.register(testutils.Actions.Shared.Multiply, 'multiply');
  Mebo.Handler.grantAction('app', 'multiply', {initName: 'multi'});

  /*
  @Mebo.grant('graph')
  @Mebo.register('myGraph')
  class MyGraph extends Mebo.Action{

    constructor(){
      super();
      this.createInput('name: text');
      this.createInput('myOtherInput?: numeric');
    }

    _perform(data){
      console.log(data);
    }
  }
  Mebo.Action.register(MyGraph, 'customApp2');
  */

  const originalAppArgs = process.argv.slice();
  after(() => {
    process.argv = originalAppArgs;
  });

  it('Should initialize the graph', (done) => {
    // Mebo.Handler.get('graph').init('myGraph');
    done();
  });
});
