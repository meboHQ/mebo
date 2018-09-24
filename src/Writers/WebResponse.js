const assert = require('assert');
const stream = require('stream');
const TypeCheck = require('js-typecheck');
const Settings = require('../Settings');
const Handler = require('../Handler');
const Writer = require('../Writer');
const Errors = require('../Errors');

// symbols used for private members to avoid any potential clashing
// caused by re-implementations
const _response = Symbol('response');


/**
 * Web output writer.
 *
 * This writer is used by the output of the web handler ({@link Web}).
 *
 * In case the value is an exception then it's treated as
 * {@link WebResponse._errorOutput} otherwise the value is treated as
 * {@link WebResponse._successOutput}.
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
 *    async _perform(data){
 *      // ...
 *    }
 *
 *    async _after(err, value){
 *      // defining a custom result that only affects the web handler
 *      // this call could be done inside of the _perform method. However, we
 *      // are defining it inside of the _after to keep _perform as
 *      // abstract as possible. Since, _after is always called (even during
 *      // an error) after the execution of the action, it provides a way to
 *      // hook and define custom metadata related with the result.
 *      if (!err){
 *          // defining a custom output option
 *          this.setMeta('$webResult', {
 *              message: 'My custom web result!',
 *          });
 *      }
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
 * headers | plain object containing the header names (in camel case convention) \
 * that should be used in the response | `{}`
 * headersOnly | if enabled ends the response without any data | ::false::
 * status | success status code (the error status code is driven by the status \
 * defined as a member of the exception) | `200`
 * root | plain object that gets deep merged at the root of the json output\
 * of a success result, for instance:<br>`{data: {...}, <rootContentsA>: ..., \
 * <rootContentsB> : ...}` | `{}`
 * result | Overrides the value returned by {@link Writer.value} to an \
 * arbitrary value (only affects the success output) | ::none::
 * resultLabel | custom label used by the success output when the value is \
 * serialized using json. This label is used to hold the result \
 * under data, for instance:<br>`{data: {<resultLabel>: value}}`<br><br>In case of \
 * undefined (default) then a fallback label is used based on the value type: \
 * <br>- primitive values are held under 'value' \
 * <br>- array value is held under 'items' \
 * <br>- object is assigned with '' (empty string) \
 * <br>* when an empty string is used, the value gets merged to the \
 * result.data | ::none::
 *
 * <br>When defining options through the metadata support, it can done using
 * `option vars`. Mebo comes bundled with pre-defined option vars
 * for most of the options available for the readers & writers. The complete list
 * of the option vars can be found at {@link Metadata} documentation.
 *
 * Example of defining the `headers` option from inside of an action through
 * the metadata support:
 *
 * ```
 * // defining 'Content-Type' header
 * class MyAction extends Mebo.Action{
 *    async _perform(data){
 *
 *      // 'Content-Type' header
 *      this.setMeta('$webHeaders', {
 *        contentType: 'application/octet-stream',
 *      });
 *
 *      // ...
 *    }
 * }
 * ```
 *
 * Also, headers can be defined through 'before action middlewares'
 * ({@link Web.addBeforeAction} and {@link Web.addBeforeAuthAction})
 */
class WebResponse extends Writer{

  /**
   * Creates a web response writer
   *
   * @param {*} value - arbitrary value passed to the writer
   * @param {Object} res - express res object
   */
  constructor(value, res){
    super(value);
    this._setResponse(res);

    // default options
    this.setOption('headersOnly', false);
    this.setOption('headers', {});
    this.setOption('root', {
      apiVersion: Settings.get('apiVersion'),
    });
    this.setOption('status', 200);
  }

  /**
   * Returns the response object created by express
   *
   * @return {Object}
   * @see http://expressjs.com/en/api.html#res
   */
  response(){
    return this[_response];
  }

  /**
   * Implements the response for an error value.
   *
   * Any error can carry a HTTP status code. It is done by defining `status` to any error
   * (for instance ```err.status = 501;```).
   * This practice can be found in all errors shipped with mebo ({@link Conflict}, {@link NoContent},
   * {@link NotFound} and {@link ValidationFail}). In case none status is found in the error then `500`
   * is used automatically.
   *
   * The error response gets automatically encoded using json, following the basics
   * of google's json style guide. In case of an error status `500` the standard
   * result is ignored and a message `Internal Server Error` is used instead.
   *
   * Further information can be found at base class documentation
   * {@link Writer._errorOutput}.
   *
   * @protected
   */
  _errorOutput(){

    const status = this.value().status || 500;

    // setting the status code for the response
    this.response().status(status);

    // when help is requested
    if (this.value() instanceof Errors.Help){
      this.response().send(this.value().message);
      return;
    }

    const result = {
      error: {
        code: status,
        message: super._errorOutput(),
      },
    };

    // adding the stack-trace information when running in development mode
    /* istanbul ignore next */
    if (process.env.NODE_ENV === 'development'){
      result.error.stacktrace = this.value().stack.split('\n');
    }

    // should not leak any error message for the status code 500
    if (status === 500){
      result.error.message = 'Internal Server Error';
    }

    this._genericOutput(result);
  }

  /**
   * Implements the response for a success value.
   *
   * A readable stream value is piped using 'application/octet-stream' by default
   * (if it has not been defined by the header option 'contentType'),
   * otherwise for non-readable stream value it's automatically encoded
   * using json, following the basics of google's json style guide.
   *
   * Further information can be found at base class documentation
   * {@link Writer._successOutput}.
   *
   * @see https://google.github.io/styleguide/jsoncstyleguide.xml
   * @protected
   */
  _successOutput(){

    const result = super._successOutput();

    // setting the status code for the response
    this.response().status(this.option('status'));

    // setting header
    this._setResponseHeaders();

    // readable stream
    if (result instanceof stream.Readable){
      this._successStreamOutput(result);
      return;
    }

    this._successJSONOutput(result);
  }

  /**
   * Sets the response object created by express
   *
   * @param {Object} value - res object
   * @see http://expressjs.com/en/api.html#res
   * @private
   */
  _setResponse(value){
    assert(TypeCheck.isObject(value) && TypeCheck.isObject(value.locals), 'Invalid response object');

    this[_response] = value;
  }

  /**
   * Results a stream through the success output
   *
   * @param {stream} value - output value
   * @private
   */
  _successStreamOutput(value){
    // setting a default content-type for readable stream in case
    // it has not been set previously
    const headers = this.option('headers');
    if (!(headers && headers.contentType)){
      this.response().setHeader('Content-Type', 'application/octet-stream');
    }

    value.pipe(this.response());
  }

  /**
   * Results the default success output through google's json style guide
   *
   * @param {*} result - output value
   * @private
   */
  _successJSONOutput(result){

    const output = {};

    // including the root options
    Object.assign(output, this.option('root'));

    // automatic result, it is done by figuring out the response based on
    // the value returned by the action, otherwise if output contains data
    // returns that instead
    output.data = {};

    if (result !== undefined){

      // in case the value has defined 'toJSON' calling that to get result
      // value that should be used for the output, reference:
      // https://developer.mozilla.org/en/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
      let finalResult = result;
      if (TypeCheck.isCallable(result.toJSON)){
        finalResult = JSON.parse(JSON.stringify(result));
      }

      // resolving the result label
      const resultLabel = this._resultLabel(finalResult);

      if (resultLabel){
        output.data[resultLabel] = finalResult;
      }
      else{
        assert(!TypeCheck.isPrimitive(finalResult), "Can't output a primitive value without a 'resultLabel'");
        assert(TypeCheck.isPlainObject(finalResult), "Can't output a non-plain object value");
        output.data = finalResult;
      }
    }

    this._genericOutput(output);
  }

  /**
   * Generic output routine shared by both success and error outputs
   *
   * @param {*} output - arbitrary data used as output
   * @private
   */
  _genericOutput(output){

    // ending response without any data
    if (this.option('headersOnly')){
      this.response().end();
      return;
    }

    // json output
    this.response().json(output);
  }

  /**
   * Returns the label used to hold the result under data. In case of undefined
   * (default) it uses a fallback label based on the value type:
   *
   * - primitive values are held under 'value'
   * - array value is held under 'items'
   * - object is assigned with `null`
   * * when an empty string is used, the value gets merged to the result.data
   *
   * @param {*} value - value that should be used by the result entry
   * @return {string}
   * @private
   */
  _resultLabel(value){
    let resultLabel = this.option('resultLabel');
    if (resultLabel === undefined){
      if (TypeCheck.isPrimitive(value)){
        resultLabel = 'value';
      }
      else if (TypeCheck.isList(value)){
        resultLabel = 'items';
      }
      else{
        resultLabel = '';
      }
    }

    return resultLabel;
  }

  /**
   * Looks for any header member defined as part of the options and sets them
   * to the response header. It expects a camelCase name convention for the header name
   *  where it gets translated to the header name convention, for instance:
   * 'options.headers.contentType' translates to 'Content-Type'.
   *
   * @param {*} options - options passed to the output
   * @private
   */
  _setResponseHeaders(){

    const headers = this.option('headers');
    const response = this.response();
    if (headers){
      for (const headerName in headers){
        const convertedHeaderName = headerName.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();

        // assigning a header value to the response
        response.setHeader(convertedHeaderName, headers[headerName]);
      }
    }
  }
}

// registering writer
Handler.registerWriter(WebResponse, 'web');

module.exports = WebResponse;
