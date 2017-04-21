const Mebo = require('../../../src');

class Sum extends Mebo.Action{
  constructor(){
    super();

    this.createInput('a: numeric');
    this.createInput('b: numeric');
  }

  _perform(data){
    return Promise.resolve(data.a + data.b);
  }
}

module.exports = Sum;
