const assert = require('assert');
const stream = require('stream');
const Handler = require('../Handler');
const Writer = require('../Writer');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _stdout = Symbol('stdout');
const _stderr = Symbol('stderr');


/**
 * Command output writer.
 *
 * This writer is used by the output of the cli handler
 * ({@link Cli}).
 *
 * In case the value is an exception then it's treated as
 * {@link CliOutput._errorOutput} otherwise the value is treated as
 * {@link CliOutput._successOutput}.
 *
 * When an action is executed through a handler it can define options for
 * readers and writers via {@link Metadata} support. For instance,
 * you can use it to provide a custom result for a specific handler:
 *
 * ```
 * class MyAction extends Mebo.Action{
 *
 *    // ...
 *
 *    _finalize(err, value){
 *      // defining a custom result that only affects the web handler
 *      // this call could be done inside of the _perform method. However, we
 *      // are defining it inside of the _finalize to keep _perform as
 *      // abstract as possible. Since, _finalize is always called (even during
 *      // an error) after the execution of the action, it provides a way to
 *      // hook and define custom metadata related with the result.
 *      if (!err){
 *          // defining a custom output option
 *          this.setMeta('$cliResult', {
 *              message: 'My custom cli result!',
 *          });
 *      }
 *
 *      return super._finalize(err, value);
 *    }
 *
 *    // ...
 * }
 * ```
 *
 * <h2>Options Summary</h2>
 *
 * Option Name | Description | Default Value
 * --- | --- | :---:
 * result | Overrides the value returned by {@link Writer.value} to an arbitrary \
 * value (only affects the success output) | ::none::
 * parsingErrorStatusCode | Custom error status code used to identify when the \
 * cli args could not be parsed | `700`
 */
class CliOutput extends Writer{

  /**
   * Creates the cli output writer
   *
   * @param {*} value - arbitrary value passed to the writer
   * @param {stream} stdout - stream used as stdout
   * @param {stream} stderr - stream used as stderr
   */
  constructor(value, stdout, stderr){
    super(value);

    this._setStdout(stdout);
    this._setStderr(stderr);

    // default options
    this.setOption('parsingErrorStatusCode', 700);
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
   * Readable streams are piped to {@link Cli.stdout}, otherwise
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

  /**
   * Sets the stdout stream
   *
   * @param {stream} value - stream used as stdout
   * @private
   */
  _setStdout(value){
    assert(value instanceof stream, 'Invalid stream type');

    this[_stdout] = value;
  }

  /**
   * Sets the stderr stream
   *
   * @param {stream} value - stream used as stderr
   * @private
   */
  _setStderr(value){
    assert(value instanceof stream, 'Invalid stream type');

    this[_stderr] = value;
  }
}

// registering writer
Handler.registerWriter(CliOutput, 'cli');

module.exports = CliOutput;
