const assert = require('assert');
const fs = require('fs');
const path = require('path');
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
  Mebo.Handler.grantAction('cli', 'multiply', {command: 'multi'});

  const originalCliArgs = process.argv.slice();
  after(() => {
    process.argv = originalCliArgs;
  });

  it('Should return false when argv does not meet the requirements of isSupported: invalid source file', () => {
    const argv = ['executable', 'lib/node_modules/bin/file', '--help'];
    assert.equal(Cli.isSupported(argv), false);
  });

  it('Should check if the action is available as custom command name', () => {
    assert.equal(Cli.actionCommands('multiply').length, 1);
    assert.equal(Cli.actionCommands('multiply')[0], 'multi');
  });

  it('Should return false when argv does not meet the requirements of isSupported: no enough arguments', () => {
    const argv = ['executable', 'file'];
    assert.equal(Cli.isSupported(argv), false);
  });

  it('Should return true when argv meets the requirements of isSupported', () => {
    const argv = ['executable', 'file', '--help'];
    assert(Cli.isSupported(argv));
  });

  it('Should initialize the app by showing the help about all available commands: --help', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '--help'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.finalizeCallback = ((result) => {
      let error = new Error('Invalid result');
      if (result instanceof Mebo.Errors.Help){
        error = null;
      }

      done(error);
    });

    Cli.init(options);
  });

  it('Should initialize the app by showing the help about all available commands: -h', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '-h'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.finalizeCallback = ((result) => {
      let error = new Error('Invalid result');
      if (result instanceof Mebo.Errors.Help){
        error = null;
      }

      done(error);
    });

    Cli.init(options);
  });

  it('Should list the help about the available commands', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '--help'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.finalizeCallback = ((result) => {
      let error = new Error('Invalid result');

      if (result instanceof Mebo.Errors.Help){
        try{
          assert.equal(`${result.message}\n`, fs.readFileSync(path.join(__dirname, 'commandsHelp.txt'), 'utf8'));
          error = null;
        }
        catch(err){
          error = err;
        }
      }

      done(error);
    });

    Cli.init(options);
  });

  it('Should list the help about the available commands with description', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '--help'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.description = 'My custom command!';
    options.finalizeCallback = ((result) => {
      let error = new Error('Invalid result');

      if (result instanceof Mebo.Errors.Help){
        try{
          assert.equal(`${result.message}\n`, fs.readFileSync(path.join(__dirname, 'commandsHelpWithDescription.txt'), 'utf8'));
          error = null;
        }
        catch(err){
          error = err;
        }
      }

      done(error);
    });

    Cli.init(options);
  });


  it('Should list the help about the available commands without the banner', (done) => {

    const options = {};
    options.argv = ['executable', 'file', '--help'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.showBanner = false;
    options.finalizeCallback = ((result) => {
      let error = new Error('Invalid result');

      if (result instanceof Mebo.Errors.Help){
        try{
          assert.equal(`${result.message}\n`, fs.readFileSync(path.join(__dirname, 'commandsHelpWithoutBanner.txt'), 'utf8'));
          error = null;
        }
        catch(err){
          error = err;
        }
      }

      done(error);
    });

    Cli.init(options);
  });

  it('Should fail when trying to execute an invalid command', (done) => {

    const options = {};
    options.argv = ['executable', 'file', 'invalidCommand'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.finalizeCallback = ((result) => {
      let error = new Error('Invalid result');
      if (result instanceof Mebo.Errors.Help && result.message === "Could not initialize 'invalidCommand', command not found!"){
        error = null;
      }

      done(error);
    });

    Cli.init(options);
  });

  it('Should initialize by executing a command', (done) => {

    const options = {};
    options.argv = ['executable', 'file', 'multi', '--a', '1', '--b', '2'];
    options.stdout = new WriteStream();
    options.stderr = new WriteStream();
    options.finalizeCallback = ((result) => {
      let error = new Error('Invalid result');
      if (result === 2){
        error = null;
      }

      done(error);
    });

    Mebo.Handler.get('cli').init(options);
  });


  it('Should fail to initialize when argv does not match isSupported (called internally by init)', () => {

    const options = {};
    options.argv = ['executable', 'lib/node_modules/bin/file', 'multi', '--a', '1', '--b', '2'];

    let message = '';
    try{
      Mebo.Handler.get('cli').init(options);
    }
    catch(err){
      message = err.message;
    }

    assert.equal(message, 'cli support cannot be initialized with the current with input argv');
  });
});
