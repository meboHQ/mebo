const path = require('path');
const neodoc = require('neodoc');
const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Errors = require('../Errors');
const Inputs = require('../Inputs');
const Settings = require('../Settings');
const Handler = require('../Handler');
const Reader = require('../Reader');


// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _args = Symbol('args');

/**
 * command-line arguments reader.
 *
 * This reader is used by the {@link Cli} handler. It supports most of
 * the docopt specification. Also, if the reader finds an error it's capable of
 * reporting it in user-friendly way. This is used to report `-h/--help` and
 * missing arguments.
 *
 * All serializable inputs are supported by this handler, they can be displayed
 * either as `argument` or `option` element. This is done by setting the input
 * property `elementType` (option is the default one).
 *
 * You can define the description displayed in the help of each input by
 * setting the input's property `description`. Also, the description for the action
 * itself can be defined by setting the action's metadata `description`.
 *
 * The `option` elements support `short option` by setting the input property
 * `shortOption`.
 *
 * In order to accommodate how vector values are represented in a command-line
 * interface, this reader expects vector elements to be separated by
 * the space character.
 *
 * Any {@link Bool} input specified as an `option` element behaves in a
 * special mode, since it's treated as a toogle option in command-line.
 * Therefore if the Bool input is assigned with a `true` then the option
 * gets the prefix `no-`.
 *
 * When a value is found for the input, it gets loaded via {@link Input.parseValue}
 * where each input implementation has its own way of parsing the serialized data,
 * to find out about how a value is serialized for an specific input type you could simply
 * set an arbitrary value to the input you are interested then query it back through
 * {@link Input.serializeValue}. Also, Mebo provides a reference datasheet
 * about the serialization forms for the inputs bundled with it, found at {@link Reader}.
 *
 * @see http://docopt.org
 */
class CliArgs extends Reader{

  /**
   * Creates an args reader
   *
   * @param {Action} action - action that should be used by the reader
   * @param {Array<string>} argv - list of arguments that should be used by
   * the reader
   */
  constructor(action, argv){
    super(action);

    this._setArgs(argv);
  }

  /**
   * Returns a list of args used by the reader, by default it uses
   * `process.argv`.
   *
   * @return {Array<string>}
   */
  args(){
    return this[_args];
  }

  /**
   * Returns the executable name based on the args
   * @param {string} placeHolder - when placeHolder is enabled it returns an uuid string
   * that can be used later to replace for the real executable name returned by default
   *
   * @return {string}
   */
  executableName(placeHolder=false){

    if (placeHolder){
      return this.constructor._executableNamePlaceHolder;
    }

    let executableScript = this.args()[1];
    if (executableScript === process.cwd()){
      executableScript = '.';
    }

    const executableName = path.basename(this.args()[0]);
    const cliNames = Handler.get('cli').actionCliNames(this.action().meta('action.name'));
    let cliSuffix = '';
    if (cliNames.length){
      cliSuffix = ` --cli ${cliNames[0]}`;
    }

    return `${executableName} ${executableScript}${cliSuffix}`;
  }

  /**
   * Implements the reader
   *
   * @param {Array<Input>} inputList - Valid list of inputs that should be used for
   * the parsing
   * @return {Promise<Object>}
   * @protected
   */
  async _perform(inputList){
    const helpElements = await this.constructor._helpElements(inputList);
    const helpString = await this._renderHelp(helpElements);

    let parsedArgs = Object.create(null);
    // it thrown an exception if something went wrong (like missing a required parameter)
    try{
      parsedArgs = neodoc.run(helpString, {
        argv: (this.args().includes('--help') || this.args().includes('-h')) ? ['-h'] : this.args().slice(2),
        dontExit: true,
        smartOptions: true,
        repeatableOptions: true,
        version: Settings.get('apiVersion'),
      });
    }
    catch(err){
      const error = new Errors.Help(err.message);
      error.message = error.message.replace(new RegExp(this.executableName(true), 'g'), this.executableName());
      throw error;
    }

    // however when the user asks for the help it should raise an exception
    // without the stack
    if ('.help' in parsedArgs){
      const error = new Errors.Help(parsedArgs['.help']);
      error.message = error.message.replace(new RegExp(this.executableName(true), 'g'), this.executableName());
      throw error;
    }

    for (const input of inputList){
      if (input instanceof Inputs.Bool && !input.isVector()){
        input.setValue(Boolean(input.value()));
      }
    }

    const alreadyParsed = [];
    const result = Object.create(null);

    // collecting the input values
    for (const elementName in parsedArgs){
      let foundInputName;

      // finding the input name
      for (const elementType in helpElements){
        for (const inputName in helpElements[elementType]){
          const inputData = helpElements[elementType][inputName];
          if (inputData.usageDisplay.split('=')[0] === elementName || inputData.shortOption === elementName){
            foundInputName = inputName;
            break;
          }
        }

        if (foundInputName){
          break;
        }
      }

      // querying the input value
      const inputNames = inputList.map(x => x.name());
      if (foundInputName && !alreadyParsed.includes(foundInputName)){
        alreadyParsed.push(foundInputName);

        const input = inputList[inputNames.indexOf(foundInputName)];

        let value;
        if (TypeCheck.isBool(parsedArgs[elementName]) && !input.isVector()){
          value = String(!input.value());
        }
        else{
          if (input.isVector() && !TypeCheck.isList(parsedArgs[elementName])){
            value = [parsedArgs[elementName]];
          }
          else{
            value = parsedArgs[elementName];
          }
        }
        result[foundInputName] = value;
      }
    }

    return result;
  }

  /**
   * Computes the contents displayed as help
   *
   * @param {Object} elements - object generated by the method _helpElements
   * @return {Promise<string>}
   * @protected
   */
  _renderHelp(elements){
    let output = '';
    output += this._buildDescription(elements);
    output += this._buildUsage(elements);
    output += this.constructor._buildColumns(elements);

    return output;
  }

  /**
   * Sets a list of argument values used by the reader. It must follow
   * the same pattern found at `process.argv`
   *
   * @param {Array<string>} value - argument list
   * @private
   */
  _setArgs(value){
    assert(TypeCheck.isList(value), 'value needs to be a list');
    assert(value.length >= 2, 'missing first argument process.execPath and second argument java-script file being executed');

    this[_args] = value.slice(0);
  }

  /**
   * Returns an object containing the elements that can be used by the command
   *
   * @param {Array<Input>} inputList - list of input that should be used to build
   * query the help
   * @return {Object}
   * @private
   */
  static async _helpElements(inputList){

    const elements = {
      argument: {},
      option: {},
    };

    // building inputs
    const addedArgs = [];
    const descriptions = await Promise.all(inputList.map(x => this._computeInfoDisplay(x)));

    let currentIndex = 0;
    for (const input of inputList){

      const inputName = input.name();
      let argName = this._camelCaseToArgument(inputName);

      // in case of a boolean input that is true by default adding
      // the `no` prefix to the input name automatically. For boolean inputs they
      // work as toggles when represented through the command line
      if (input instanceof Inputs.Bool && !input.isVector() && input.value()){
        argName = `no-${argName}`;
      }

      assert(!addedArgs.includes(argName), `Ambiguous argument name (${argName}), used multiple times!`);
      addedArgs.push(argName);

      const elementType = input.property('elementType');

      const inputData = Object.create(null);
      inputData.description = descriptions[currentIndex];
      inputData.elementDisplay = this._elementDisplay(argName, input);
      inputData.usageDisplay = this._usageDisplay(argName, input);
      inputData.required = ((input.isRequired() && input.isEmpty()) && !(input instanceof Inputs.Bool && !input.isVector()));
      inputData.vector = input.isVector();

      if (elementType === 'option'){
        inputData.shortOptionDisplay = this._shortOptionDisplay(input);
        inputData.shortOption = this._shortOption(input);
      }

      elements[elementType][inputName] = inputData;

      currentIndex++;
    }

    return elements;
  }

  /**
   * Returns a string containing the full assembled info for the input
   *
   * @param {Input} input - input that should be used
   * @return {Promise<string>}
   * @private
   */
  static async _computeInfoDisplay(input){

    const inputTypeName = input.property('type');

    // adding the value type to the argument
    const isBoolInput = input instanceof Inputs.Bool;
    let description = input.property('description') || '';

    // querying any type hint defined for the input
    if (input.hasProperty('cliTypeHint')){
      if (description.length){
        description += ' ';
      }

      description += `(* ${input.property('cliTypeHint')})`;
    }

    if ((isBoolInput && input.isVector()) || !isBoolInput){

      // adding the default value as part of the description
      if (!input.isEmpty()){
        let serializedValue = await input.serializeValue();
        serializedValue = (input.isVector()) ? JSON.parse(serializedValue) : [serializedValue];
        const defaultValue = [];

        for (const value of serializedValue){

          if (TypeCheck.isString(value) && Number.isNaN(Number(value))){
            const scapedValue = value.replace(new RegExp('"', 'g'), '\\"');
            defaultValue.push(`"${scapedValue}"`);
          }
          else{
            defaultValue.push(value);
          }
        }

        if (description.length){
          description += ' ';
        }
        description += `[default: ${defaultValue.join(' ')}]`;
      }
    }

    const inputTypeDisplay = input.isVector() ? `${inputTypeName}[]` : inputTypeName;

    if (description.length){
      description += ' ';
    }
    description += `(${inputTypeDisplay} type).`;

    return description;
  }

  /**
   * Returns a string containing the full element display for either an option
   * or argument
   *
   * @param {string} name - element given name
   * @param {Input} input - input that should be used
   * @return {string}
   * @private
   */
  static _elementDisplay(name, input){

    let result = '';

    if (input.property('elementType') === 'option'){
      const shortOption = this._shortOptionDisplay(input);

      const isBoolInput = input instanceof Inputs.Bool;
      if ((isBoolInput && input.isVector()) || !isBoolInput){

        // adding short option
        if (shortOption){
          result += shortOption;

          if (input.isVector()){
            result += '...';
          }

          result += ', ';
        }

        result += this._usageDisplay(name, input);

        if (input.isVector()){
          result += '...';
        }
      }
      else{
        if (shortOption){
          result += shortOption;
          result += ', ';
        }

        result += this._usageDisplay(name, input);
      }
    }
    else{
      result = name;
    }

    return result;
  }

  /**
   * Returns a string containing the usage display for either
   * the option or argument
   *
   * @param {string} name - how the element should be called
   * @param {Input} input - input that should be used
   * @return {string}
   * @private
   */
  static _usageDisplay(name, input){
    let result = '';

    if (input.property('elementType') === 'option'){
      // adding long option
      result = `--${name}`;

      const isBoolInput = input instanceof Inputs.Bool;
      if ((isBoolInput && input.isVector()) || !isBoolInput){
        result = `${result}=<value>`;
      }
    }
    else{
      result = `<${name}>`;
    }

    return result;
  }

  /**
   * Returns a string containing the the short option, in case the input
   * does not have a short option property defined then an empty string
   * is returned instead
   *
   * @param {Input} input - input that should be used
   * @return {string}
   * @private
   */
  static _shortOption(input){
    const shortOption = input.property('shortOption');
    if (shortOption){
      return `-${shortOption}`;
    }

    return '';
  }

  /**
   * Returns a string containing the display of the short option,
   * This is used when listing the element options
   *
   * @param {Input} input - input that should be used
   * @return {string}
   * @private
   */
  static _shortOptionDisplay(input){
    let result = this._shortOption(input);
    if (result.length && !(input instanceof Inputs.Bool && !input.isVector())){
      result = `${result}=<value>`;
    }

    return result;
  }

  /**
   * Returns a string containing the description of the command
   *
   * @param {Object} elements - elements holder object
   * @return {string}
   * @private
   */
  _buildDescription(elements){
    let output = '';
    const description = this.action().meta('description', '');
    if (description.length){
      output += description;
      if (!description.endsWith('.')){
        output += '.';
      }
      output += '\n\n';
    }

    return output;
  }

  /**
   * Builds a string containing the usage
   *
   * @param {Object} elements - elements holder object
   * @return {string}
   * @private
   */
  _buildUsage(elements){
    let output = `Usage: ${this.executableName(true)} `;

    const requiredArguments = Object.create(null);
    const optionalArguments = Object.create(null);
    const requiredOptions = Object.keys(elements.option).filter(x => elements.option[x].required);
    let requiredArgumentsOrder = [];
    let optionalArgumentsOrder = [];

    if (requiredOptions.length){
      output += requiredOptions.map(x => elements.option[x].usageDisplay).join(' ');
      output += ' ';
    }
    output += '[options]';

    // building arguments
    if (Object.keys(elements.argument).length){
      for (const inputName in elements.argument){
        if (elements.argument[inputName].required){
          requiredArguments[inputName] = elements.argument[inputName];
        }
        else{
          optionalArguments[inputName] = elements.argument[inputName];
        }
      }

      const requiredArgumentNames = Object.keys(requiredArguments);
      requiredArgumentsOrder = requiredArgumentNames.filter(x => !requiredArguments[x].vector);
      requiredArgumentsOrder = requiredArgumentsOrder.concat(requiredArgumentNames.filter(x => !requiredArgumentsOrder.includes(x)));

      // first adding the required arguments
      let hasVectorRequiredArgument = false;
      for (const inputName of requiredArgumentsOrder){
        output += ' ';
        output += requiredArguments[inputName].usageDisplay;

        if (requiredArguments[inputName].vector && Object.keys(optionalArguments).length === 0){
          if (requiredArgumentsOrder.indexOf(inputName) === requiredArgumentsOrder.length - 1){
            output += '...';
            hasVectorRequiredArgument = true;
          }
        }
      }

      // then adding the optional ones
      const optionalArgumentNames = Object.keys(optionalArguments);
      optionalArgumentsOrder = optionalArgumentNames.filter(x => !optionalArguments[x].vector);
      optionalArgumentsOrder = optionalArgumentsOrder.concat(optionalArgumentNames.filter(x => !optionalArgumentsOrder.includes(x)));

      for (const inputName in optionalArguments){
        output += ' [';
        output += optionalArguments[inputName].usageDisplay;
        output += ']';

        if (optionalArguments[inputName].vector && !hasVectorRequiredArgument){
          if (optionalArgumentsOrder.indexOf(inputName) === optionalArgumentsOrder.length - 1){
            output += '...';
          }
        }
      }
    }

    output += this._buildUsageVectorOptions(elements, requiredArgumentsOrder, requiredOptions);

    return output;
  }

  /**
   * Builds a string containing the usage for the vector options
   *
   * @param {Object} elements - elements holder object
   * @param {Array<string>} argumentNames - list of argument names
   * @param {Array<string>} requiredOptionNames - list of required option names
   * @return {string}
   * @private
   */
  _buildUsageVectorOptions(elements, argumentNames, requiredOptionNames){
    let output = '';

    // adding the usage for the vector options
    for (const inputName in elements.option){

      if (elements.option[inputName].vector){
        output += `\n       ${this.executableName(true)} `;

        for (const requiredArg of argumentNames){
          output += elements.argument[requiredArg].usageDisplay;
          output += ' ';
        }

        output += '[options] ';
        if (requiredOptionNames.length){
          output += requiredOptionNames.filter(y => y !== inputName).map(x => elements.option[x].usageDisplay).join(' ');
          output += ' ';
        }

        if (!requiredOptionNames.includes(inputName)){
          output += '[';
        }

        output += elements.option[inputName].usageDisplay;
        output += '...';

        if (!requiredOptionNames.includes(inputName)){
          output += ']';
        }
      }
    }

    return output;
  }

  /**
   * Builds a string containing the columns displayed by the arguments and options
   *
   * @param {Object} elements - elements holder object
   * @return {string}
   * @private
   */
  static _buildColumns(elements){
    let columns = '\n';
    const elementTypeDisplayName = Object.create(null);
    elementTypeDisplayName.option = 'Options:';
    elementTypeDisplayName.argument = 'Arguments:';

    // figuring out the element column width
    const elementTypeWidth = this._computeElementsWidth(elements);

    for (const element in elements){

      if (Object.keys(elements[element]).length){
        columns += '\n';
        columns += elementTypeDisplayName[element];
        columns += '\n';

        for (const inputName in elements[element]){

          const elementData = elements[element][inputName];

          // element
          columns += '  ';
          columns += elementData.elementDisplay;
          columns += ' '.repeat(elementTypeWidth[element] - elementData.elementDisplay.length);

          // description
          // the second separator is actually a `hair space` char, this is necessary to separate
          // the element from the description in neodoc
          columns += '  ';
          columns += elementData.description;
          columns += '\n';
        }
      }
    }

    return columns;
  }

  /**
   * Returns a plain object containing the width for each of the element types
   * (argument and option)
   *
   * @param {Object} elements - elements holder object
   * @return {Object}
   * @private
   */
  static _computeElementsWidth(elements){
    const elementTypeWidth = Object.create(null);
    for (const elementType in elements){
      for (const inputName in elements[elementType]){
        elementTypeWidth[elementType] = Math.max(elementTypeWidth[elementType] || 0,
          elements[elementType][inputName].elementDisplay.length);
      }
    }

    return elementTypeWidth;
  }

  /**
   * Converts the input text from camelCase to dash-convention used
   * in CLI applications
   *
   * @param {string} text - text that should be converted
   * @return {string}
   * @private
   */
  static _camelCaseToArgument(text){
    return text.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
  }

  static _executableNamePlaceHolder = 'f4d33b27-d6f3-42b6-ba98-5254bdf3b307';
}

// registering reader
Handler.registerReader(CliArgs, 'cli');

module.exports = CliArgs;
