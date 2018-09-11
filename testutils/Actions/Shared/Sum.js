const Mebo = require('../../../src');

class Sum extends Mebo.Action{
  constructor(){
    super();
    this.setMeta('description', 'Sum action description');
    this.createInput('a: numeric');
    this.input('a').assignProperty('webTypeHint', 'custom type hint used by the web handler', true);

    this.createInput('b: numeric');
  }

  _perform(data){
    return Promise.resolve(data.a + data.b);
  }
}

module.exports = Sum;
