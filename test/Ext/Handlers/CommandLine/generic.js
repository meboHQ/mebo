const assert = require('assert');
const fs = require('fs');
const path = require('path');
const stream = require('stream');
const Mebo = require('../../../../src');

const Action = Mebo.Action;


describe('CommandLine Generic:', () => {

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

  // action shared by the tests
  class FullSpec extends Action{
    constructor(){
      super();
      this.createInput('argumentA: text', {cliElementType: 'argument', description: 'argumentA help'});
      this.createInput('argumentB: text', {cliElementType: 'argument', description: 'argumentB help'});
      this.createInput('argumentOptionalA: text[]', {cliElementType: 'argument', description: 'argumentOptionalA help', defaultValue: ['a', 'b']});
      this.createInput('optionA: filePath[]', {cliElementType: 'option'});
      this.createInput('optionB: numeric', {cliShortOption: 'b', defaultValue: 90});
      this.createInput('optionC: numeric', {cliShortOption: 'c'});
      this.createInput('optionD: bool', {defaultValue: true, cliShortOption: 'd'});
      this.createInput('optionE: bool[]', {defaultValue: [false, true], cliShortOption: 'e'});
      this.createInput('optionF: bool');
      this.createInput('optionG: text[]', {defaultValue: ['text1', 'text2', 'text3']});
    }

    _perform(data){
      return Promise.resolve(data);
    }
  }

  class MultipleArgs extends Action{
    constructor(){
      super();
      this.createInput('a: text[]', {cliElementType: 'argument'});
    }

    _perform(data){
      return Promise.resolve(data.a);
    }
  }

  before(() => {
    Mebo.registerAction(FullSpec);
    Mebo.registerAction(MultipleArgs);
  });

  it('Should list the help about the command', () => {
    return (async () => {

      const commandLine = Mebo.createHandler('commandLine');
      commandLine.setStdout(new WriteStream());
      commandLine.setStderr(new WriteStream());
      commandLine.setArgs(['node', 'file', '-h']);

      try{
        await commandLine.execute('fullSpec', {description: 'A command'});
        throw new Error('Should have failed');
      }
      catch(err){
        assert.equal(`${err.message}\n`, fs.readFileSync(path.join(__dirname, 'usageHelp.txt'), 'utf8'));
      }
    })();
  });

  it('Should fail when the arguments do not conform to the requirements', () => {

    return (async () => {

      const commandLine = Mebo.createHandler('commandLine');
      commandLine.setStdout(new WriteStream());
      commandLine.setStderr(new WriteStream());
      commandLine.setArgs([
        'node',
        'file',
        '--option-a',
        'test.txt',
        '--no-option-d',
        '-b',
        '10',
        '--option-c',
        '20',
      ]);

      try{
        await commandLine.execute('fullSpec');
        throw new Error('Should have failed');
      }
      catch(err){
        assert.equal(`${err.message}\n`, fs.readFileSync(path.join(__dirname, 'missingArg.txt'), 'utf8'));
      }
    })();
  });

  it('Should execute the command specified by the default usage method', () => {

    return (async () => {

      const commandLine = Mebo.createHandler('commandLine');
      commandLine.setStdout(new WriteStream());
      commandLine.setStderr(new WriteStream());
      commandLine.setArgs([
        'node',
        'file',
        '--option-a',
        'test.txt',
        '--no-option-d',
        '--option-b',
        '10',
        '--option-c',
        '20',
        'argumentValueA',
        'argumentValueB',
        'argumentOptionalA1',
        'argumentOptionalA2',
      ]);

      const result = await commandLine.execute('fullSpec');

      assert.equal(result.argumentA, 'argumentValueA');
      assert.equal(result.argumentB, 'argumentValueB');
      assert.equal(result.argumentOptionalA[0], 'argumentOptionalA1');
      assert.equal(result.argumentOptionalA[1], 'argumentOptionalA2');
      assert.equal(result.optionA[0], 'test.txt');
      assert.equal(result.optionB, 10);
      assert.equal(result.optionC, 20);
      assert.equal(result.optionD, false);
      assert.equal(result.optionE[0], false);
      assert.equal(result.optionE[1], true);
      assert.equal(result.optionF, false);
      assert.equal(result.optionG[0], 'text1');
      assert.equal(result.optionG[1], 'text2');
      assert.equal(result.optionG[2], 'text3');

    })();
  });

  it('Should execute the command specified by multiple values in --option-a', () => {

    return (async () => {

      const commandLine = Mebo.createHandler('commandLine');
      commandLine.setStdout(new WriteStream());
      commandLine.setStderr(new WriteStream());
      commandLine.setArgs([
        'node',
        'file',
        'argumentValueA',
        'argumentValueB',
        '--option-b',
        '10',
        '--option-c',
        '20',
        '-e',
        '1',
        '--option-a',
        'test1.txt',
        'test2.txt',
      ]);

      const result = await commandLine.execute('fullSpec');

      assert.equal(result.argumentA, 'argumentValueA');
      assert.equal(result.argumentB, 'argumentValueB');
      assert.equal(result.argumentOptionalA[0], 'a');
      assert.equal(result.argumentOptionalA[1], 'b');
      assert.equal(result.optionB, 10);
      assert.equal(result.optionC, 20);
      assert.equal(result.optionD, true);
      assert.equal(result.optionE[0], true);
      assert.equal(result.optionF, false);
      assert.equal(result.optionG[0], 'text1');
      assert.equal(result.optionG[1], 'text2');
      assert.equal(result.optionG[2], 'text3');
      assert.equal(result.optionA[0], 'test1.txt');
      assert.equal(result.optionA[1], 'test2.txt');

    })();
  });

  it('Should execute the command specified by multiple values in --option-e', () => {

    return (async () => {

      const commandLine = Mebo.createHandler('commandLine');
      commandLine.setStdout(new WriteStream());
      commandLine.setStderr(new WriteStream());
      commandLine.setArgs([
        'node',
        'file',
        'argumentValueA',
        'argumentValueB',
        '--option-b',
        '10',
        '--option-c',
        '20',
        '--option-a',
        'test.txt',
        '--option-g',
        'test2.txt',
        '--option-e',
        '1',
        '0',
        '1',
      ]);

      const result = await commandLine.execute('fullSpec');

      assert.equal(result.argumentA, 'argumentValueA');
      assert.equal(result.argumentB, 'argumentValueB');
      assert.equal(result.argumentOptionalA[0], 'a');
      assert.equal(result.argumentOptionalA[1], 'b');
      assert.equal(result.optionB, 10);
      assert.equal(result.optionC, 20);
      assert.equal(result.optionD, true);
      assert.equal(result.optionF, false);
      assert.equal(result.optionA[0], 'test.txt');
      assert.equal(result.optionG[0], 'test2.txt');
      assert.equal(result.optionE[0], '1');
      assert.equal(result.optionE[1], '0');
      assert.equal(result.optionE[2], '1');
    })();
  });

  it('Should execute the command specified by multiple values in --option-g', () => {

    return (async () => {

      const commandLine = Mebo.createHandler('commandLine');
      commandLine.setStdout(new WriteStream());
      commandLine.setStderr(new WriteStream());
      commandLine.setArgs([
        'node',
        'file',
        'argumentValueA',
        'argumentValueB',
        '--option-b',
        '10',
        '--option-c',
        '20',
        '--option-a',
        'test.txt',
        '--option-g',
        'g1',
        'g2',
        'g3',
      ]);

      const result = await commandLine.execute('fullSpec');

      assert.equal(result.argumentA, 'argumentValueA');
      assert.equal(result.argumentB, 'argumentValueB');
      assert.equal(result.argumentOptionalA[0], 'a');
      assert.equal(result.argumentOptionalA[1], 'b');
      assert.equal(result.optionB, 10);
      assert.equal(result.optionC, 20);
      assert.equal(result.optionD, true);
      assert.equal(result.optionE[0], false);
      assert.equal(result.optionE[1], true);
      assert.equal(result.optionF, false);
      assert.equal(result.optionA[0], 'test.txt');
      assert.equal(result.optionG[0], 'g1');
      assert.equal(result.optionG[1], 'g2');
      assert.equal(result.optionG[2], 'g3');

    })();
  });

  it('Should test the command-line success render output', () => {

    const commandLine = Mebo.createHandler('commandLine');
    commandLine.setStdout(new WriteStream());
    commandLine.setStderr(new WriteStream());
    commandLine.setArgs([
      'node',
      'file',
      'argumentValueA',
      'argumentValueB',
      '--option-b',
      '10',
      '--option-c',
      '20',
      '--option-a',
      'test.txt',
      '--option-g',
      'g1',
      'g2',
      'g3',
    ]);

    return (async () => {
      const result = await commandLine.execute('fullSpec');
      commandLine.output(result);

      const stderr = Buffer.concat(commandLine.stderr().data).toString('ascii');
      const stdout = Buffer.concat(commandLine.stdout().data).toString('ascii');

      assert.equal(stderr, '');
      const parsedResult = JSON.parse(stdout);

      assert.equal(result.argumentA, parsedResult.argumentA);
      assert.equal(result.argumentB, parsedResult.argumentB);
      assert.equal(result.argumentOptionalA[0], parsedResult.argumentOptionalA[0]);
      assert.equal(result.argumentOptionalA[1], parsedResult.argumentOptionalA[1]);
      assert.equal(result.optionA[0], parsedResult.optionA[0]);
      assert.equal(result.optionB, parsedResult.optionB);
      assert.equal(result.optionC, parsedResult.optionC);
      assert.equal(result.optionD, parsedResult.optionD);
      assert.equal(result.optionE[0], parsedResult.optionE[0]);
      assert.equal(result.optionE[1], parsedResult.optionE[1]);
      assert.equal(result.optionF, parsedResult.optionF);
      assert.equal(result.optionG[0], parsedResult.optionG[0]);
      assert.equal(result.optionG[1], parsedResult.optionG[1]);
      assert.equal(result.optionG[2], parsedResult.optionG[2]);

    })();
  });

  it('Should test the command-line fail render output (usage)', () => {

    const commandLine = Mebo.createHandler('commandLine');
    commandLine.setStdout(new WriteStream());
    commandLine.setStderr(new WriteStream());
    commandLine.setArgs([
      'node',
      'file',
    ]);

    return (async () => {
      let error;

      try{
        await commandLine.execute('fullSpec');
      }
      catch(err){
        commandLine.output(err);
        error = err;
      }

      const stderr = Buffer.concat(commandLine.stderr().data).toString('ascii');
      const stdout = Buffer.concat(commandLine.stdout().data).toString('ascii');

      assert(error);
      assert.equal(stdout, '');
      assert.equal(stderr, `${error.message}\n`);

    })();
  });

  it('Should test the command-line fail render output (validation fail)', () => {

    const commandLine = Mebo.createHandler('commandLine');
    commandLine.setStdout(new WriteStream());
    commandLine.setStderr(new WriteStream());
    commandLine.setArgs([
      'node',
      'file',
      'argumentValueA',
      'argumentValueB',
      '--option-b',
      'INVALID',
      '--option-c',
      '20',
      '--option-a',
      'test.txt',
      '--option-g',
      'g1',
      'g2',
      'g3',
    ]);

    return (async () => {
      let error;

      try{
        await commandLine.execute('fullSpec');
      }
      catch(err){
        commandLine.output(err);
        error = err;
      }

      const stderr = Buffer.concat(commandLine.stderr().data).toString('ascii');
      const stdout = Buffer.concat(commandLine.stdout().data).toString('ascii');

      assert(error);
      assert.equal(stdout, '');
      assert.equal(stderr, error.toJSON());

    })();
  });

  it('Should test passing an argument that receives multiple values', () => {

    const commandLine = Mebo.createHandler('commandLine');
    commandLine.setStdout(new WriteStream());
    commandLine.setStderr(new WriteStream());
    commandLine.setArgs([
      'node',
      'file',
      'a',
      'b',
      'c',
    ]);

    return (async () => {
      const result = await commandLine.execute('multipleArgs');

      assert.equal(result[0], 'a');
      assert.equal(result[1], 'b');
      assert.equal(result[2], 'c');
    })();
  });
});
