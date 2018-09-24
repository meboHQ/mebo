const assert = require('assert');
const TypeCheck = require('js-typecheck');
const ValidationFail = require('./Errors/ValidationFail');
const Utils = require('./Utils');

// symbols used for private members to avoid any potential clashing
// caused by re-implementations
const _name = Symbol('name');
const _readOnly = Symbol('readOnly');
const _properties = Symbol('properties');
const _lockedProperties = Symbol('lockedProperties');
const _cache = Symbol('cache');
const _propertiesCache = Symbol('propertiesCache');
const _registeredInputs = Symbol('registeredInputs');
const _registeredProperties = Symbol('registeredProperties');

/**
 * An input holds a value that is used for the execution of the {@link Action}.
 *
 * The value carried by the input gets checked through a wide range of validations
 * that make sure the value meets the necessary requirements for  the execution
 * of the {@link Action}.
 *
 * The validations are performed asynchronously which enables an implementation
 * that can go far beyond checking the data type or matching the value through
 * a regex. In most cases these validations are driven by `properties`. Properties are
 * usually defined at construction time. Also, non-generic validations can be
 * implemented through `extendedValidation`, making possible to define validations
 * that are tied with an action itself.
 *
 * Inputs are created through {@link Input.create} using a
 * [syntactic sugar](https://en.wikipedia.org/wiki/Syntactic_sugar) that describes
 * their name and type (aka [TypeScript](https://www.typescriptlang.org/)), for instance:
 *
 * ```javascript
 * Input.create('myInput: bool')
 * ```
 *
 * Any input can be defined as a vector by using the short array syntax `[]`:
 *
 * ```javascript
 * Input.create('myInput: bool[]')
 * ```
 *
 * Additionally, you can specify if an input is optional (not required) by adding
 * `?` beside of the input name:
 *
 * ```javascript
 * Input.create('myInput?: bool[]')
 * ```
 *
 * You can also create inputs through a verbose (boilerplate) interface where each
 * of the options described above can be defined at construction time via properties:
 * ```javascript
 * Input.create('myInput', {type: 'bool', vector: true, required: false})
 * ```
 *
 * Since inputs are used by actions they can be created directly inside of an {@link Action} via
 * {@link Action.createInput} that internally triggers {@link Input.create} factory method:
 *
 * ```
 * class HelloWorld extends Mebo.Action{
 *   constructor(){
 *     super();
 *     // ♥ compact version
 *     this.createInput('myInputA?: bool[]');
 *
 *     // same as effect as above, but not so friendly to read
 *     this.addInput(Input.create('myInputB?: bool[]'));
 *   }
 * }
 * ```
 *
 * To register a new input type, take a look at {@link Input.register}
 *
 * <h2>Property Summary</h2>
 *
 * Property Name | Description | Defined&nbsp;by Default | Default Value
 * --- | --- | :---: | :---:
 * required | boolean telling if the value is required (defined at the construction time) \
 * | ::on:: | ::true::
 * immutable | boolean telling if the data of the value cannot be altered \
 * overtime, however the value of the input can still be replaced by \
 * the input value setter, in order to prevent it you can set an input as \
 * {@link readOnly} | ::on:: | ::true::
 * defaultValue | default value of the input | ::on:: | ::null::
 * elementType | tells how the input should be presented via {@link Cli}: \
 * `'option'` or `'argument'` ({@link http://docopt.org}) | ::on:: | `'option'`
 * vector | boolean telling if the input holds a vector value (defined \
 * at the construction time) | ::on:: | ::auto::
 * hidden | boolean telling if the input is hidden from the {@link Reader}, \
 * therefore it should only be used internally | ::off:: | ::none::
 * autofill | key name about a value that may be under the {@link Session.autofill}. This \
 * value is used to initialize the input. It occurs when a session is assigned \
 * to an action ({@link Action.setSession}) | ::off:: | ::none::
 * description | description about the input. This information is displayed \
 * when showing the help about the action | ::off:: | ::none::
 * shortOption | short version of the input name used to speficy when running \
 * through the {@link Cli} | ::off:: | ::none::
 *
 * <br/>The assignment of a property value can be done at construction time or through
 * the setter {@link Input.assignProperty}. A property value can be queried by the
 * getter {@link Input.property}. To add new properties to an input type, please take
 * a look at {@link Input.registerProperty}.
 */
class Input{

  /**
   * Creates an input
   *
   * @param {string} name - name of the input
   * @param {Object} [properties={}] - plain object containing the properties which
   * will be assigned to the {@link Input}
   * @param {function} [extendedValidation] - callback that can be defined to supply
   * custom validations to the {@link Input}
   */
  constructor(name, properties={}, extendedValidation=null){
    assert(TypeCheck.isString(name) && name.length, 'name cannot be empty!');
    assert(TypeCheck.isPlainObject(properties), "properties need to be defined as dict {'key': value}");
    assert(extendedValidation === null || TypeCheck.isCallback(extendedValidation),
      'extendedValidation needs to be defined as function(contextValue) or null');

    // validating reserved names
    assert(!(['help'].includes(name)), `Input name '${name}' is reserved, it cannot be used!`);

    // validating input name
    assert(name.length, 'input name cannot be empty!');
    assert((/^([\w_.-])+$/gi).test(name), `Illegal input name: ${name}`);

    this[_name] = name;
    this[_readOnly] = false;
    this[_properties] = new Map();
    this[_lockedProperties] = new Set();
    this[_cache] = new Utils.ImmutableMap();

    // defining custom properties that may override the default ones
    for (const propertyKey in properties){
      this.assignProperty(propertyKey, properties[propertyKey]);
    }

    // locking properties
    this.lockProperty('type');
    this.lockProperty('vector');
    this.lockProperty('defaultValue');

    this.setValue(this.property('defaultValue'));
    this._extendedValidation = extendedValidation;
  }

  /**
   * Creates an input instance.
   *
   * @param {string} inputInterface - string followed by either the pattern `name: type`
   * or `name?: type` in case of optional {@link Input}. The type is case-insensitive
   * @param {Object} [properties={}] - plain object containing the properties which
   * will be assigned to the {@link Input}
   * @param {function} [extendedValidation] - callback that can be defined to supply
   * custom validations to the {@link Input}
   * @return {Input}
   *
   *
   * @example
   * // minimal
   * Input.create('inputName: numeric');
   *
   * @example
   * // full
   * Input.create('inputName: numeric', {min: 1, max: 5}, function(at){
   *  return new Promise((resolve, reject) => {
   *    if (this.valueAt(at) === 3)
   *      reject(new ValidationFail('Failed for some reason'));
   *    else
   *      resolve(this.value());
   *  });
   * })
   */
  static create(inputInterface, properties={}, extendedValidation=null){
    const inputInterfaceParts = inputInterface.split(':');
    const propertiesFinal = Object.assign({}, properties);

    if (inputInterfaceParts.length === 2){
      for (let i=0, len=inputInterfaceParts.length; i < len; ++i){
        inputInterfaceParts[i] = inputInterfaceParts[i].trim();
      }

      // not required syntax
      if (inputInterfaceParts[0].endsWith('?')){
        inputInterfaceParts[0] = inputInterfaceParts[0].slice(0, -1);
        propertiesFinal.required = false;
      }

      // vector syntax
      if (inputInterfaceParts[1].endsWith('[]')){
        inputInterfaceParts[1] = inputInterfaceParts[1].slice(0, -2);
        propertiesFinal.vector = true;
      }

      propertiesFinal.type = inputInterfaceParts[1];
    }
    else if (inputInterfaceParts.length > 2){
      throw new Error("Invalid input interface, it should follow the pattern: 'name: type'");
    }

    const InputTypeClass = this.registeredInput(propertiesFinal.type);

    // storing the input type in lower-case to keep the same convention
    // found in the registration
    propertiesFinal.type = propertiesFinal.type.toLowerCase();

    return new InputTypeClass(inputInterfaceParts[0], propertiesFinal, extendedValidation);
  }

  /**
   * Returns if the value of the input is empty. This is used mainly by
   * the property `required=false` to know if the input does not have a value
   * assigned to it.
   *
   * @return {boolean} If the input is empty
   */
  isEmpty(){
    return TypeCheck.isNone(this.value()) || (this.property('vector')
      && TypeCheck.isList(this.value()) && this.value().length === 0);
  }

  /**
   * Returns if the value of the input is a vector. This information is defined
   * by the property `vector=true`
   *
   * @return {boolean} if the input is a vector
   */
  isVector(){
    return this.property('vector') === true;
  }

  /**
   * Returns if the value of the input is required. This information is defined
   * by the property `required=true`
   *
   * @return {boolean} if the input is required
   */
  isRequired(){
    return this.property('required') === true;
  }

  /**
   * Sets the input value by avoiding the overhead that may occur when the
   * same value is used across actions that have the input type, therefore
   * this method avoids the re-computation by copying the caches and value
   * associated with the source input to the current input. The cache will be
   * only copied if both source and target inputs have the `immutable` property
   * enabled (default true).
   *
   * @param {Input} sourceInput - input used as source to setup the current input
   * @param {null|number} [at] - index used when the target input is defined as vector to
   * tells which value should be used
   * @param {boolean} [cache=true] - tells if the cache will be copied as well
   */
  setupFrom(sourceInput, at=null, cache=true){
    assert(TypeCheck.isSameType(sourceInput, this), 'Inputs are not the same type!');

    if (at !== null && !sourceInput.isVector()){
      throw new Error(`Can't use at, since the source input is not a vector`);
    }
    else if (at !== null && this.isVector()){
      throw new Error(`Can't use at, from a source vector input to a target vector input`);
    }
    else if (at === null && sourceInput.isVector() && !this.isVector()){
      throw new Error(`Target input is not a vector, can't setup from a vector target input without supplying 'at'`);
    }

    // transferring value:
    // when the source is not a vector, but the target is
    if (this.isVector() && !sourceInput.isVector()){
      this.setValue([sourceInput.value()]);
    }
    // when source and target are the same either scalar or vector
    else if (at === null){
      this.setValue(sourceInput.value());
    }
    // when an index is specific from a source vector to a scalar input
    else{
      this.setValue(sourceInput.value()[at]);
    }

    // transferring cache to the current input:
    if (cache && sourceInput.property('immutable') && this.property('immutable')){
      assert(sourceInput.cache() instanceof Utils.ImmutableMap);

      const sourceCache = sourceInput.cache();

      // when the source is not a vector, but the target is
      if (this.isVector() && !sourceInput.isVector()){
        for (const key of sourceCache.keys()){
          this._setToCache(key.slice(0, -2), sourceCache.get(key), 0);
        }
      }

      // when source and target are the same either scalar or vector
      else if (at === null){
        for (const key of sourceCache.keys()){
          this.cache().set(key, sourceCache.get(key));
        }
      }

      // when an index is specific from a source vector to a scalar input
      else{
        const indexToken = `(${at})`;
        for (const key of sourceCache.keys()){
          if (key.endsWith(indexToken)){
            this._setToCache(key.slice(0, -indexToken.length), sourceCache.get(key));
          }
        }
      }
    }
  }

  /**
  * Returns the cache used by the input
  *
  * This method is called by ({@link setupFrom}) to setup the input based on an
  * already existing input
  *
  * @return {ImmutableMap}
  */
  cache(){
    return this[_cache];
  }

  /**
   * Forces to flush the internal input cache
   */
  clearCache(){
    this.cache().clear();
  }

  /**
   * Executes the input validations ({@link _validation}), in case of a failed
   * validation then an exception of type {@link ValidationFail} is raised
   *
   * @return {Promise<*>} Returns the value of the input
   */
  async validate(){

    try{
      // required check
      if (this.isEmpty()){
        if (this.isRequired() !== false){
          throw new ValidationFail(
            'Input is required, it cannot be empty!',
            '28a03a60-a405-4737-b94d-2b695b6ce156',
          );
        }
      }

      // vector check
      else if (this.isVector() && !TypeCheck.isList(this.value())){
        throw new ValidationFail(
          'Input needs to be a vector!',
          'e03709a0-6c31-4a33-9f63-fa751948a6cb',
        );
      }

      // otherwise perform the asynchronous validations
      else{
        const validationPromises = [];
        const length = this.isVector() ? this.value().length : 1;
        for (let i=0; i < length; ++i){
          // setting the context index
          const at = this.isVector() ? i : null;

          // cannot have null/undefined as part of the array
          if (this.isVector() && TypeCheck.isNone(this.valueAt(at))){
            throw new ValidationFail(
              'Vector cannot contain null/undefined data!',
              '3ced667c-3a3c-4034-91ca-3bde10695f87',
            );
          }

          validationPromises.push(this._validation(at));

          // running extended validations
          if (TypeCheck.isCallback(this._extendedValidation)){
            validationPromises.push(this._extendedValidation.call(this, at));
          }
        }

        // running generic validations
        await Promise.all(validationPromises);
      }
    }
    catch(err){
      // including the input name to the validation fail
      if (err instanceof ValidationFail){
        err.inputName = this.name();

        // disabling the output when input is marked as hidden
        if (this.property('hidden')){
          err.output = false;
        }
      }

      throw err;
    }

    return true;
  }

  /**
   * Returns the property value for the input property name
   *
   * @param {string} name - name of the property
   * @return {Promise<*>} The value of the property otherwise raises an exception
   * in case the property is not assigned
   */
  property(name){
    assert(TypeCheck.isString(name), 'property name needs to be defined as string');

    if (this[_properties].has(name)){
      return this[_properties].get(name);
    }

    // checking if the property is valid
    const allRegisteredProperties = Input._allRegisteredProperties(this.constructor);
    if (allRegisteredProperties.has(name)){
      return allRegisteredProperties.get(name);
    }

    throw new Error(`Property ${name} is not registered!`);
  }

  /**
   * Sets a property to the input. In case the property already exists then the value
   * is going to be overridden. By default the only properties that can be modified are
   * the ones found under {@link Input.registeredInputNames}. However you can
   * assign a non-registered property by enabling `loose` parameter.
   *
   * Property values can be locked, therefore preventing modifications
   * ({@link Input.lockProperty}).
   *
   * @param {string} name - name of the property
   * @param {*} value - value for the property
   * @param {boolean} [loose=false] - when true lets to assign a property that is not
   * registered to the input ({@link Input.registeredInputNames})
   */
  assignProperty(name, value, loose=false){
    assert(TypeCheck.isString(name), 'property name needs to be defined as string');

    // checking if input is read-only
    if (this.readOnly()){
      throw new Error(`Input ${this.name()} is read only, cannot be modified!`);
    }

    // checking if property is valid
    if (!loose && !Input._allRegisteredProperties(this.constructor).has(name)){
      throw new Error(`Property ${name} is not registered!`);
    }

    // checking if property has been locked
    if (this[_lockedProperties].has(name)){
      throw new Error(`Property ${name} is locked!`);
    }

    this[_properties].set(name, value);

    this.clearCache();
  }

  /**
   * Prevents a property value to be modified by {@link Input.assignProperty}
   *
   * @param {string} name - name of the property
   * @param {boolean} [lock=true] - if true it locks the property otherwise
   * it removes the lock from the property
   */
  lockProperty(name, lock=true){

    // checking if input is read-only
    if (this.readOnly()){
      throw new Error(`Input ${this.name()} is read only, cannot be modified!`);
    }

    if (lock){
      this[_lockedProperties].add(name);
    }
    else{
      this[_lockedProperties].delete(name);
    }
  }

  /**
   * Returns a boolean telling if the property is locked ({@link Input.lockProperty})
   *
   * @param {string} name - name of the property
   * @return {boolean}
   */
  isPropertyLocked(name){
    return this[_lockedProperties].has(name);
  }

  /**
   * Returns a boolean telling if the input property name is assigned to the input
   *
   * @param {string} name - name of the property
   * @return {boolean}
   */
  hasProperty(name){
    assert(TypeCheck.isString(name), 'property name needs to be defined as string');

    return Input._allRegisteredProperties(this.constructor).has(name) || this[_properties].has(name);
  }

  /**
   * Returns a list containing the property names assigned to the input
   *
   * @return {Array<string>}
   */
  propertyNames(){
    return [...new Set([...this[_properties].keys(),
      ...Input._allRegisteredProperties(this.constructor).keys(),
    ])];
  }

  /**
   * Sets the value of the input
   *
   * @param {*} value - value that should be set to the input
   */
  setValue(value){

    // checking if input is read-only
    if (this.readOnly()){
      throw new Error(`Input ${this.name()} is read only, cannot be modified!`);
    }

    // Due the overhead that may occur on going through recursively and freezing
    // the whole hierarchy of the value, it freezes only value itself. In case
    // this is not enough consider in changing it to perform a deep-freeze instead
    this._value = (!this.property('immutable') || TypeCheck.isNone(value))
      || value instanceof Buffer ? value : Object.freeze(value);

    // flushing the cache when a new value is set
    this.clearCache();
  }

  /**
   * Returns the value of the input
   *
   * @return {*}
   */
  value(){
    return this._value;
  }

  /**
   * Returns the name of the input which is defined at construction time (inputs cannot
   * be renamed)
   *
   * @return {string}
   */
  name(){
    return this[_name];
  }

  /**
   * Returns if the input is serializable
   *
   * This method should be re-implemented by derived classes to tell if the input can be
   * serialized (default true).
   *
   * In case of a serializable input, the methods {@link Input._encodeScalar} and {@link Input._decode}
   * are expected to be implemented.
   *
   * @return {boolean}
   */
  isSerializable(){
    return true;
  }

  /**
   * Changes the read-only state of the input. A read-only input cannot have its
   * value and properties modified. It's mainly used during the execution of the {@link Action}
   * where all inputs are assigned as read-only, therefore when the execution is completed
   * the inputs are restored with the original read-only value assigned before
   * the execution of the action
   *
   * @param {boolean} enable - tells if a input is read-only
   */
  setReadOnly(enable){
    this[_readOnly] = enable;
  }

  /**
   * Returns a boolean telling if the input is in read-only mode. A read-only input
   * cannot have its value and properties modified
   *
   * @return {boolean}
   */
  readOnly(){
    return this[_readOnly];
  }

  /**
   * Decodes a value represented as string to the type that is compatible with the input.
   * This method is called by the {@link Handler} or when an action is loaded/created using
   * {@link Action.fromJSON}/{@link Action.createFromJSON}. In case the input
   * is defined as vector then the value can be defined using an array encoded in JSON.
   * The parsed value gets returned and assigned to the input as well (you can control this
   * by the `assignValue` argument).
   *
   * The implementation of the decoding is done by the methods {@link Input._decode}
   * & {@link Input._decodeVector}. To know if an input supports decoding
   * checkout the {@link Input.isSerializable}.
   *
   * To know how the serialization is done for the inputs bundled with
   * Mebo take a look at {@link Reader} documentation.
   *
   * @param {string} value - string containing the serialized data
   * @param {boolean} [assignValue=true] - tells if the parsed value should be assigned
   * to the input
   * @return {*}
   */
  parseValue(value, assignValue=true){
    assert(this.isSerializable(), 'parsing not supported!');
    assert(TypeCheck.isString(value), 'value needs to be defined as string or string array');

    let result;

    // empty string is treated as null
    if (value.length === 0){
      result = null;
    }
    else if (this.isVector()){
      result = this.constructor._decodeVector(value);

      assert(TypeCheck.isList(result));
    }
    else{
      result = this.constructor._decodeScalar(value);
    }

    if (assignValue){
      this.setValue(result);
    }

    return result;
  }

  /**
   * This method should return a string representation about the current value in a way that
   * can be recovered later through {@link parseValue}.
   *
   * The encode implementation is done by the methods {@link Input._encodeScalar} &
   * {@link Input._encodeVector}. To know if an input supports serialization
   * checkout the {@link Input.isSerializable}.
   *
   * Also, in case you want to know the serialization form for the inputs bundled with
   * Mebo checkout {@link Reader}.
   *
   * @return {Promise<string>}
   */
  async serializeValue(){
    assert(this.isSerializable(), 'serialization not supported!');

    // making sure the value can be serialized without any issues
    await this.validate();

    // serializing the value
    let result;

    if (this.isEmpty()){
      result = '';
    }
    else if (this.isVector()){
      result = this.constructor._encodeVector(this.value());
    }
    else{
      result = this.constructor._encodeScalar(this.value());
    }

    assert(TypeCheck.isString(result));

    return result;
  }

  /**
   * Decodes the input value from the string representation ({@link Input._encodeScalar}) to the
   * data type of the input. This method is called internally during {@link Input.parseValue}
   *
   * @param {string} value - encoded value
   * @return {*}
   * @protected
   */
  static _decodeScalar(value){
    assert(TypeCheck.isString(value), 'value needs to be defined as string');

    return value;
  }

  /**
   * Decodes a vector value from the string representation ({{@link Input._encodeScalar} &
   * {@link Input._encodeVector}) to the
   * data type of the input. This method is called internally during {@link Input.parseValue}
   *
   * @param {string} value - encoded value
   * @return {*}
   * @protected
   */
  static _decodeVector(value){
    assert(TypeCheck.isString(value), 'value needs to be defined as string');

    const decodedValue = [];
    const parsedValue = JSON.parse(value);

    assert(TypeCheck.isList(parsedValue), 'Could not parse, unexpected data type');
    for (const parsedItem of parsedValue){
      let finalParsedItem = parsedItem;

      // empty string is treated as null
      if (finalParsedItem === ''){
        finalParsedItem = null;
      }

      // decoding the value
      decodedValue.push(finalParsedItem ? this._decodeScalar(finalParsedItem) : null);
    }

    return decodedValue;
  }

  /**
   * Encodes the input value to a string representation that can be later decoded
   * through {@link Input._decode}. This method is called internally during the
   * {@link serializeValue}
   *
   * @param {*} value - value that should be encoded to a string
   * @return {string}
   * @protected
   */
  static _encodeScalar(value){
    return String(value);
  }


  /**
   * Encodes a vector value to a string representation that can be later decoded
   * through {@link Input._decodeVector}. This method is called internally during the
   * {@link serializeValue}
   *
   * @param {Array<string>} values - value that should be encoded to a string
   * @return {string}
   * @protected
   */
  static _encodeVector(values){
    assert(TypeCheck.isList(values), 'values needs to be defined as array');

    const encodedValues = [];

    for (const item of values){
      encodedValues.push(this._encodeScalar(item));
    }

    return JSON.stringify(encodedValues);
  }

  /**
   * Registers a new input type to the available inputs
   *
   * @param {Input} inputClass - input implementation that will be registered
   * @param {string} [name] - string containing the registration name for the
   * input. In case of an empty string, the registration is done by using the name
   * of the type (this information is stored in lowercase)
   */
  static register(inputClass, name=''){
    assert(TypeCheck.isSubClassOf(inputClass, Input), 'Invalid input type!');
    assert(TypeCheck.isString(name), 'Invalid optional registration name!');

    const nameFinal = ((name === '') ? inputClass.name : name).toLowerCase();

    // validating name
    assert((/^([\w_\.\-])+$/gi).test(nameFinal), `Illegal input name: ${nameFinal}`); // eslint-disable-line no-useless-escape

    this[_registeredInputs].set(nameFinal, inputClass);
  }

  /**
   * Returns the input type based on the registration name
   *
   * @param {string} name - name of the registered input type
   * @return {Input}
   */
  static registeredInput(name){
    assert(TypeCheck.isString(name), 'Invalid name!');

    const normalizedName = name.toLowerCase();

    if (this[_registeredInputs].has(normalizedName)){
      return this[_registeredInputs].get(normalizedName);
    }

    throw new Error(`Input ${name} is not registered!`);
  }

  /**
   * Returns a list containing the names of the registered input types
   *
   * @return {Array<string>}
   */
  static registeredInputNames(){
    return [...this[_registeredInputs].keys()];
  }

  /**
   * This method enforces the context of the value being queried.
   * Since the input can behave as vector it makes sure that when that's
   * the case the index must be supplied otherwise it raises an exception.
   * Use this method when you need to query the value through validations where
   * the index (at) is always passed to them, whether if the input is vector
   * or scalar
   *
   * @param {number} [index] - used when the input is set to a vector to tell the
   * index of the value
   * @return {*}
   */
  valueAt(index=null){
    if (this.isVector()){
      assert(index !== null, 'Could not determine the index of the vector');
      return this.value()[index];
    }

    return this.value();
  }

  /**
   * Registers a property for the input type (also available as `Mebo.Input.registerProperty`)
   *
   * ```
   * // example of registering a new property
   * Mebo.Input.registerProperty('text', 'myCustomProperty', 'A initial value if necessary')
   * ```
   *
   * @param {string|Input} inputClassOrRegisteredName - registered input name or input class
   * in which the property should be registered
   * @param {string} name - name of the property (in case the property name already
   * exists than it going to be overridden for the input type)
   * @param {*} [initialValue] - optional initial value for the property (undefined by default)
   */
  static registerProperty(inputClassOrRegisteredName, name, initialValue){
    assert(TypeCheck.isString(name), 'property name needs to be defined as string');
    assert(name.length, 'property name cannot be empty');

    const inputType = this._resolveInputType(inputClassOrRegisteredName);

    // appending to the existing registered properties
    if (!this[_registeredProperties].has(inputType)){
      this[_registeredProperties].set(inputType, new Map());
    }

    this[_registeredProperties].get(inputType).set(name, initialValue);

    // resetting the properties caches
    this[_propertiesCache].clear();
  }

  /**
   * Returns a list about all registered property names including the inherited ones for
   * the input type
   *
   * ```
   * // returning all properties for an input type (using 'numeric' as example)
   * Mebo.Input.registeredPropertyNames('numeric');
   * ```
   *
   * @param {string|Input} inputClassOrRegisteredName - registered input name or input class
   * @return {Array<string>}
   */
  static registeredPropertyNames(inputClassOrRegisteredName){
    const inputType = this._resolveInputType(inputClassOrRegisteredName);

    return [...this._allRegisteredProperties(inputType).keys()];
  }

  /**
   * Use this method to implement generic validations
   * for your input implementation. In case any validation fails this method
   * should return a {@link ValidationFail} (This method is called when the
   * validations are perform through {@link Input.validate})
   *
   * @param {null|number} at - index used when input has been created as a vector that
   * tells which value should be used
   * @return {Promise<*>} Returns the value of the input
   * @protected
   */
  async _validation(at){
    return this.valueAt(at);
  }

  /**
   * Auxiliary method used internally by input implementations to check if the key
   * is under the cache
   *
   * @param {string} name - name of the key
   * @param {null|number} [at] - used when the input is set to a vector to tell the
   * index of the value
   * @return {boolean}
   * @protected
   */
  _isCached(name, at=null){
    return this.cache().has(this._cacheEntry(name, at));
  }

  /**
   * Auxiliary method used internally by input implementations to set a value to
   * the cache
   *
   * @param {string} name - name of the key
   * @param {*} value - value that should be set in the cache
   * @param {null|number} [at] - used when the input is set to a vector to tell the
   * index of the value
   * @protected
   */
  _setToCache(name, value, at=null){
    this.cache().set(this._cacheEntry(name, at), value);
  }

  /**
   * Auxiliary method used internally by the input implementations to get a value
   * from the cache
   *
   * @param {string} name - name of the key
   * @param {null|number} [at] - used when the input is set to a vector to tell the
   * index of the value
   * @return {*}
   * @protected
   */
  _getFromCache(name, at=null){
    return this.cache().get(this._cacheEntry(name, at));
  }

  /**
   * Returns the cache entry based on the name and index (at)
   *
   * @param {string} name - name of the key
   * @param {number|null} at - used when the input is set to a vector to tell the
   * @return {string}
   *
   * @private
   */
  _cacheEntry(name, at){
    if (this.isVector()){
      assert(at !== null, 'Could not determine the index of the vector');
    }

    return (this.isVector()) ? `${name}(${at})` : `${name}()`;
  }

  /**
   * Auxiliary method that resolves the registered input type based
   *
   * @param {string|Input} inputClassOrRegisteredName - registered input name or input class
   * @return {Input}
   * @private
   */
  static _resolveInputType(inputClassOrRegisteredName){
    if (TypeCheck.isSubClassOf(inputClassOrRegisteredName, Input) || inputClassOrRegisteredName === Input){
      return inputClassOrRegisteredName;
    }

    return this.registeredInput(inputClassOrRegisteredName);
  }

  /**
   * Auxiliary method that collects all available registered property names for the input type
   * and returns them
   *
   * @param {Input} inputType - input class that should be used to collect the properties
   * @return {Array<string>}
   * @private
   */
  static _allRegisteredProperties(inputType){

    if (!this[_propertiesCache].has(inputType)){
      let currentClass = inputType;
      const inputProperties = new Map();

      while (currentClass.name !== ''){
        if (this[_registeredProperties].has(currentClass)){
          for (const [propertyName, propertyValue] of this[_registeredProperties].get(currentClass)){
            // if a property has been overriding by a sub class then skip it
            if (!inputProperties.has(propertyName)){
              inputProperties.set(propertyName, propertyValue);
            }
          }
        }
        currentClass = Object.getPrototypeOf(currentClass);
      }

      this[_propertiesCache].set(inputType, inputProperties);
    }

    return this[_propertiesCache].get(inputType);
  }
}

Input[_propertiesCache] = new Map();
Input[_registeredInputs] = new Map();
Input[_registeredProperties] = new Map();

// registering properties
Input.registerProperty(Input, 'required', true);
Input.registerProperty(Input, 'type', true);
Input.registerProperty(Input, 'immutable', true);
Input.registerProperty(Input, 'defaultValue', null);
Input.registerProperty(Input, 'vector', false);
Input.registerProperty(Input, 'hidden');
Input.registerProperty(Input, 'autofill');
Input.registerProperty(Input, 'description');

module.exports = Input;
