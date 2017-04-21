const assert = require('assert');
const stream = require('stream');
const Handler = require('../../Handler');
const Writer = require('../../Writer');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _stdout = Symbol('stdout');
const _stderr = Symbol('stderr');


/**
 * Command-line output writer.
 *
 * This writer is used by the output of the command-line handler
 * ({@link CommandLine}).
 *
 * In case the value is an exception then it's treated as
 * {@link CommandLineOutput._errorOutput} otherwise the value is treated as
 * {@link CommandLineOutput._successOutput}.
 *
 * <h2>Options Summary</h2>
 *
 * Option Name | Description | Default Value
 * --- | --- | :---:
 * result | Overrides the value returned by {@link Writer.value} to an arbitrary \
 * value (only affects the success output) | ::none::
 * parsingErrorStatusCode | Custom error status code used to identify when the \
 * command-line args could not be parsed | `700`
 */
class CommandLineOutput extends Writer{
  constructor(value){
    super(value);

    this[_stdout] = null;
    this[_stderr] = null;

    // default options
    this.setOption('parsingErrorStatusCode', 700);
  }

  /**
   * Sets the stdout stream
   *
   * @param {stream} value - stream used as stdout
   */
  setStdout(value){
    assert(value instanceof stream, 'Invalid stream type');

    this[_stdout] = value;
  }

  /**
   * Returns the stream used as stdout
   *
   * @return {stream}
   */
  stdout(){
    return this[_stdout];
  }

  /**
   * Sets the stderr stream
   *
   * @param {stream} value - stream used as stderr
   */
  setStderr(value){
    assert(value instanceof stream, 'Invalid stream type');

    this[_stderr] = value;
  }

  /**
   * Returns the stream used as stderr
   *
   * @return {stream}
   */
  stderr(){
    return this[_stderr];
  }

  /**
   * Implements the response for an error value.
   *
   * The error output writes the error message under the stderr.
   *
   * @protected
   */
  _errorOutput(){

    process.exitCode = 1;
    const message = super._errorOutput();

    if (this.value().status === this.option('parsingErrorStatusCode')){
      this.stderr().write(`${message}\n`);
    }
    else{
      this.stderr().write(message);
    }
  }

  /**
   * Implements the response for a success value.
   *
   * Readable streams are piped to {@link CommandLine.stdout}, otherwise
   * the value is serialized using json.
   *
   * @protected
   */
  _successOutput(){

    let result = super._successOutput();

    /* istanbul ignore next */
    if (result === undefined){
      return;
    }

    // readable stream
    if (result instanceof stream.Readable){
      result.pipe(this.stdout());
      return;
    }

    // json result
    result = JSON.stringify(result, null, ' ');
    result += '\n';

    this.stdout().write(result);
  }
}

// registering writer
Handler.registerWriter(CommandLineOutput, 'commandLine');

module.exports = CommandLineOutput;
