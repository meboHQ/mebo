const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Action = require('./Action');
const Util = require('./Util');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _action = Symbol('action');
const _options = Symbol('options');
const _result = Symbol('result');


/**
 * A reader is used by the handler during the execution ({@link Handler.execute})
 * to query {@link Input} and {@link Session} information that is going be used
 * during the execution of the action.
 *
 * In case of new implements it's expected to implement the {@link Reader._perform}.
 *
 * When a value is found for an input it's decoded using {@link Input.parseValue}
 * where each input implementation has its own way of parsing the serialized data,
 * to find out about how a value is serialized for an specific input type you could simply
 * set an arbitrary value to an input then query it back through
 * {@link Input.serializeValue}. The reference bellow shows the basic serialization
 * for the inputs blundled with Mebo:
 *
 * Input Type | Scalar Serialization | Vector Serialization (compatible with JSON)
 * --- | --- | ---
 * {@link Text} | `'value'` | `'["valueA","valueB"]'`
 * {@link FilePath} | `'/tmp/a.txt'` | `'["/tmp/a.txt","/tmp/b.txt"]'`
 * {@link Bool} | `'true`' or `'1'` | `'[true,false]'` or `'[1,0]'`
 * {@link Numeric} | `'20'` | `'[20,30]'`
 * {@link Email} | `'test@email.com'` | `'["test@email.com","test2@email.com"]'`
 * {@link Ip} | `'192.168.0.1'` | `'["192.168.0.1","192.168.0.2"]'`
 * {@link Timestamp} | `'2017-02-02T22:26:30.431Z'` | \
 * `'["2017-02-02T22:26:30.431Z","2017-02-02T22:27:19.066Z"]'`
 * {@link Url} | `'#http#://www.google.com'` | \
 * `'["#http#://www.google.com","#http#://www.wikipedia.com"]'`
 * {@link Version} | `'10.1.1'` | `'["10.1.1","10.2"]'`
 * {@link Buf} | `'aGVsbG8='` | `'["aGVsbG8=","d29ybGQ="]'`
 * {@link Hex} | `'ffff00'` | `'["ffff00","ff"]'`
 * {@link Hash} | `'d65709ab'` | `'["d65709ab","b94d6fe4"]'`
 * {@link UUID} | `'075054e0-810a-11e6-8c1d-e5fb28c699ca'` | \
 * `'["075054e0-810a-11e6-8c1d-e5fb28c699ca","98e631d3-6255-402a-88bd-66056e1ca9df"]'`
 *
 * <br/>**Options:**
 * Custom options can be assigned to readers ({@link Reader.setOption}). They are
 * passed from the handler to the reader during the handler's execution
 * ({@link Handler.execute}).
 *
 * ```
 * const myHandler = Mebo.createHandler('someHandler');
 *
 * // setting reading options
 * myHandler.execute('myAction', {
 *  someOption: 10,
 * });
 * ```
 *
 * When an action is executed through a handler it can define options via
 * the {@link Metadata} support. Detailed information about that can be found
 * at {@link Metadata}:
 *
 * ```
 * class MyAction extends Mebo.Action{
 *    constructor(){
 *
 *      // defining a custom reading option
 *      this.setMetadata('$myOption', {
 *        someOption: 10,
 *      });
 *
 *      // ...
 *    }
 * }
 * Mebo.registerAction(MyAction);
 * ```
 *
 * **Hidding inputs from readers:**
 * A reader only sees inputs that are capable of serialization
 * ({@link Input.isSerializable}) or visible inputs. Therefore, any input assigned
 * with the property `hidden` is not visible by readers, for instance:
 *
 * ```
 * class Example extends Mebo.Action{
 *   constructor(){
 *     super();
 *     this.createInput('readerCantSeeMe: numeric', {hidden: true});
 *     this.createInput('readerSeeMe: numeric');
 *   }
 * }
 * ```
 */
class Reader{

  /**
   * Creates a reader.
   *
   * @param {Action} action - action used for the querying of the value
   */
  constructor(action){
    assert(action instanceof Action, 'Invalid action instance');

    // note: currently reader & writer are completely separated entities that don't
    // have a common parent class (aka HandlerOperation). The reason for
    // that is currently they are so distinctive from each other that the only member in
    // common is the option. In case they start to share more characteristics in common
    // then a base class should be created.

    this[_action] = action;
    this[_result] = null;
    this[_options] = new Util.HierarchicalCollection();
  }

  /**
   * Returns the action that is associated with the reader.
   *
   * @return {Action}
   */
  action(){
    return this[_action];
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
   * Returns a list of valid input names that should be used for the parsing.
   * This avoids hidden inputs to get exposed in the parsing.
   *
   * @return {Array<string>}
   */
  validInputNames(){

    const inputs = [];
    for (const inputName of this[_action].inputNames()){
      const input = this[_action].input(inputName);

      if (input.isSerializable() && !input.property('hidden')){
        inputs.push(input);
      }
    }

    return inputs;
  }

  /**
   * Reads the input values and returns it through a plain object.
   *
   * @return {Promise<object>}
   */
  async inputValues(){

    if (!this[_result]){
      await this._parse();
    }

    return this[_result];
  }

  /**
   * Reads the autofill information and returns it through a plain object.
   *
   * If the autofill information is already assigned under autofill ({@link Action.session})
   * then that information is skipped otherwise it adds the parsed information the result.
   *
   * @return {Promise<Object>}
   */
  async autofillValues(){
    if (!this[_result]){
      await this._parse();
    }

    const result = Object.create(null);
    const action = this.action();
    const session = action.session();
    for (const inputName in this[_result]){

      const autofillName = action.input(inputName).property('autofill');

      if (autofillName){

        // if the input name is already under autofill (assigned previously
        // then not overriding them)
        if (session && session.hasAutofill(autofillName)){
          continue;
        }
        result[autofillName] = this[_result][inputName];
      }
    }

    return result;
  }

  /**
   * This method should be re-implemented by derived classes to perform the handler parsing.
   *
   * It should return a plain object containing the input name and the value for that.
   * Where any input value from either String or Array types are considered valid values that
   * are later ({@link Reader.inputValues}, {@link Reader.autofillValues})
   * used to parse the value of the input ({@link Input.parseValue}), otherwise the value
   * is ignored.
   *
   * Only return the ones that were found by the parsing. Also, in case of any error
   * during the parsing then an exception should be raised.
   *
   * @param {Array<Input>} inputList - Valid list of inputs that should be used for
   * the parsing
   * @return {Promise<Object>}
   *
   * @protected
   */
  _perform(inputList){
    return Promise.reject(new Error('Not implemented'));
  }

  /**
   * Auxiliary method that triggers the parsing if needed (in case it has not been
   * triggered yet).
   *
   * @return {Promise}
   * @private
   */
  async _parse(){
    if (!this._parsed){
      this[_result] = await this._perform(this.validInputNames());
      const action = this.action();

      // decoding the values if needed
      for (const inputName in this[_result]){
        const input = action.input(inputName);
        const value = this[_result][inputName];

        if (TypeCheck.isString(value)){
          this[_result][inputName] = input.parseValue(value, false);
        }
        else if (TypeCheck.isList(value)){
          // currently it's converting any array to a JSON string which is supported
          // by the input parsing. Lets keep an eye on this for now, since it may cause
          // an overhead
          this[_result][inputName] = input.parseValue(JSON.stringify(value), false);
        }
      }
    }

    return this[_result];
  }
}

module.exports = Reader;
