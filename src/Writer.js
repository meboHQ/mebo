const stream = require('stream');
const assert = require('assert');
const TypeCheck = require('js-typecheck');
const debug = require('debug')('Mebo');
const Util = require('./Util');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _options = Symbol('options');
const _value = Symbol('value');


/**
 * A writer is used to output a value through the {@link Handler}.
 *
 * The output is determined by the kind of value that's passed to the writer where
 * exceptions are interpreted as error output, otherwise the value is interpreted
 * as success value. Therefore, new implements are expected to implement both a success
 * ({@link Writer._successOutput}) and error ({@link Writer._errorOutput}) outputs.
 *
 * Custom options can be assigned to writers ({@link Writer.setOption}). They are
 * passed from the handler to the writer during the output process
 * ({@link Handler.output}).
 *
 * ```
 * const myHandler = Mebo.createHandler('someHandler');
 *
 * // setting output options during the output
 * myHandler.output(value, {
 *  someOption: 10,
 * });
 * ```
 *
 * When executing the handler output you can use the action's result
 * {@link Metadata} to drive the writer options. Detailed information about the
 * metadata support can be found at {@link Metadata}:
 *
 * ```
 * class MyAction extends Mebo.Action{
 *    _perform(data){
 *
 *      // defining a custom output option
 *      this.setMetadata('$myOption', {
 *        someOption: 10,
 *      });
 *
 *      // ...
 *    }
 * }
 * Mebo.registerAction(MyAction);
 *
 * // ...
 * myHandler.execute('myAction').then((result) => {
 *    myHandler.output(result);
 * }).catch((err) => {
 *    myHandler.output(err);
 * });
 * ```
 *
 * <h2>Options Summary</h2>
 *
 * Option Name | Description | Default Value
 * --- | --- | :---:
 * convertBufferToReadableStream | Tells if a buffer value should be converted to a \
 * readable stream | ::true::
 * result | Overrides the value returned by {@link Writer.value} to an arbitrary \
 * value (only affects the success output) | ::none::
 */
class Writer{

  /**
   * Creates a writer
   *
   * @param {*} value - arbitrary value passed to the writer
   */
  constructor(value){

    // note: currently reader & writer are completely separated entities that don't
    // have a common parent class (aka HandlerOperation). The reason for
    // that is currently they are so distinctive from each other that the only member in
    // common is the option. In case they start to share more characteristics in common
    // then a base class should be created.

    this[_value] = value;
    this[_options] = new Util.HierarchicalCollection();

    // default options
    this.setOption('convertBufferToReadableStream', true);
  }

  /**
   * Returns an option
   *
   * @param {string} path - path about where the option is localized (the levels
   * must be separated by '.'). In case of an empty string it returns the
   * entire options
   * @param {*} [defaultValue] - default value returned in case a value was
   * not found for the path
   * @return {*}
   */
  option(path, defaultValue=undefined){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');
    return this[_options].query(path, defaultValue);
  }

  /**
   * Sets a value under the options
   *
   * @param {string} path - path about where the option should be stored under
   * the options (the levels must be separated by '.')
   * @param {*} value - value that is going to be stored under the collection
   * @param {boolean} [merge=true] - this option is used to decide in case of the
   * last level is already existing under the collection, if the value should be
   * either merged (default) or overridden.
   */
  setOption(path, value, merge=true){
    assert(TypeCheck.isString(path), 'path needs to be defined as string');

    this[_options].insert(path, value, merge);
  }

  /**
   * Returns the value that should be serialized ({@link Writer.serialize}) by the writer.
   *
   * @return {*}
   */
  value(){
    return this[_value];
  }

  /**
   * Serializes a writer value ({@link Writer.value}) in case the value is an
   * exception it's serialize as {@link Writer._errorOutput} otherwise it's serialized
   * as {@link Writer._successOutput}.
   */
  serialize(){

    if (this.value() instanceof Error){
      this._errorOutput();
    }
    else{
      this._successOutput();
    }
  }

  /**
   * Translates an {@link Error} to a data structure that is later serialized by a writer
   * implementation as output. This method gets triggered when an exception is passed
   * as value by the {@link Handler.output}.
   *
   * By default the contents of the error output are driven by the `err.message`,
   * however if an error contains `err.toJSON` property ({@link ValidationFail.toJSON})
   * then that's used instead of the message.
   *
   * Also, you can avoid specific errors to be handled via output process by defining the member
   * `output` assigned with `false` to the error (for instance ```err.output = false;```). If
   * that is in place the error gets thrown which triggers the event {@link Handler.onErrorDuringOutput}.
   *
   * **Tip:** You can set the env variable `NODE_ENV=development` to get the traceback information
   * included in the error output
   *
   * @return {Object}
   * @protected
   */
  _errorOutput(){

    const err = this.value();

    // checking if the error can be handled by the writer
    if (err.output === false){
      throw err;
    }

    // objects with the property 'toJSON' can define a custom representation
    // when they are serialized using json using (otherwise use the error message), reference:
    // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
    const result = (TypeCheck.isCallable(err.toJSON)) ? err.toJSON() : err.message;

    // printing the stack-trace information when running in development mode
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'development'){
      process.stderr.write(`${err.stack}\n`);
      debug(err.stack);
    }

    return result;
  }

  /**
   * Translates the success value to a data structure that is later serialized
   * by a handler implementation as output.
   *
   * /todo:
   * This value is either driven by the option 'result' (when defined) or by the
   * value defined at constructor time.
   *
   * All writers shipped with Mebo have support for streams where in case of
   * any readable stream or buffer value are piped to the output,
   * otherwise the result is encoded using JSON (defined per writer bases).
   *
   * Note: any Buffer value passed to this method gets automatically converted to
   * a readable stream (this behavior is driven by the option
   * 'convertBufferToReadableStream').
   *
   * This method is called by {@link Handler.output}.
   *
   * @return {Object|Stream}
   * @protected
   */
  _successOutput(){

    const optionOutput = this.option('result');
    const result = (optionOutput === undefined) ? this.value() : optionOutput;

    // stream output
    if (this.option('convertBufferToReadableStream') && result instanceof Buffer){
      const bufferStream = new stream.PassThrough();
      bufferStream.end(result);

      return bufferStream;
    }

    return result;
  }
}

module.exports = Writer;
