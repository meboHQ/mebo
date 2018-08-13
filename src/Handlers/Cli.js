const stream = require('stream');
const assert = require('assert');
const TypeCheck = require('js-typecheck');
const Input = require('../Input');
const Metadata = require('../Metadata');
const Handler = require('../Handler');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _args = Symbol('args');
const _stdout = Symbol('stdout');
const _stderr = Symbol('stderr');

// handler name (used for registration)
const _handlerName = 'cli';


/**
* Handles the command line integration based on docopt specification.
*
* It enables the execution of actions triggered as command line applications
* by reading ({@link CliArgs}) the arguments which are passed to the action
* during the execution ({@link Cli.run}).
* The result of this handler ({@link Cli.output}) is done through
* the {@link CliOutput} writer.
*
* Using cli handler:
*
* **Creating an action that is going be executed through the cli handler**
* ```
* @Mebo.grant('cli')
* @Mebo.register('myAction')
* class MyAction extends Mebo.Action{
*   constructor(){
*     super();
*     this.createInput('myArgument: text', {elementType: 'argument', description: 'my argument'});
*     this.createInput('myOption: bool', {description: 'my option'});
*   }
*
*   _perform(data){
*     const result = {
*       myArgument: data.myArgument,
*       myOption: data.myOption,
*     };
*     return Promise.resolve(result);
*   }
* }
*
* ```
*
* **Executing the action through the handler**
* ```
* // making sure the script is called directly
* if (require.main === module) {
*
*   // creating an cli handler which is used to load the arguments
*   // arguments to the action and to output the result back to the stream
*   const cli = Mebo.Handler.create('cli');
*
*   // loading the parsed information to the action
*   cli.runAction('myAction', {description: 'Welcome'}).then((result) => {
*
*   // success output
*   cli.output(result);
*
*   // error output
*   }).catch((err) => {
*     cli.output(err);
*   });
* }
* ```
* You can list the cli help by invoking `-h` or `--help` where a help interface
* is generated automatically for the action, for instance:
*
* `node mycli.js --help`
* ```
* Welcome.
*
* Usage: mycli.js [options] <my-argument>
*
* Arguments:
*   my-argument  my argument (text type).
*
* Options:
*   --my-option    my option (bool type).
* ```
*
* In case you want to provide multiple actions through cli, take
* a look at the example: https://github.com/meboHQ/example-cli
*
* @see http://docopt.org
*/
class Cli extends Handler{

  /**
   * Creates an cli handler
   *
   * @param {Array<string>} argv - argument list
   * @param {stream} stdout - stream used as stdout
   * @param {stream} stderr - stream used as stderr
   */
  constructor(argv=process.argv, stdout=process.stdout, stderr=process.stderr){
    super();

    this.setArgs(argv);
    this.setStdout(stdout);
    this.setStderr(stderr);
  }

  /**
   * Sets a list of argument values used by the reader. It must follow
   * the same pattern found at `process.argv`
   *
   * @param {Array<string>} value - argument list
   */
  setArgs(value){
    assert(TypeCheck.isList(value), 'value needs to be a list');
    assert(value.length >= 2, 'missing first argument process.execPath and second argument javaScript file being executed');

    this[_args] = value.slice(0);
  }

  /**
   * Returns a list of argument values used by the reader, by default it uses
   * `process.argv`.
   *
   * @return {Array<string>}
   */
  args(){
    return this[_args];
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
   * Initializes a registered action as cli.
   *
   * *`CliActions/Default.js`: defining an action as cli:*
   * ```
   * const Mebo = require('mebo');
   *
   * class Default extends Mebo.Action{
   *
   *  constructor(){
   *   super();
   *     this.createInput('name: text');
   *     this.createInput('myOtherInput?: numeric');
   *  }
   *  _perform(data){
   *    // ...
   *  }
   * }
   *
   * Mebo.Action.register(Default, 'cli.default');
   * Mebo.Handler.grantAction('cli', 'cli.default', {initName: 'default'});
   * ```
   *
   * *`index.js`:*
   * ```
   * const Mebo = require('mebo');
   * require('Clis/Default.js');
   *
   * // ...
   *
   * Mebo.Handler.get('cli').init('default');
   * ```
   *
   * *Listing available actions:*
   * ```
   * node myFile.js --cli
   * // or
   * node myFile.js --cli --help
   * ```
   *
   * *Showing help from the app:*
   * ```
   * node myFile.js --cli myCli --help
   * ```
   *
   * *Executing an cli by specifying custom args:*
   * ```
   * node myFile.js --cli myCli --arg-a=1 --arg-b=2
   * ```
   *
   * @param {string} defaultCliName - default name used when none
   * cli is specified through `--cli <name>`
   * @param {Object} options - plain object containing custom options
   * @param {Array<string>} [options.argv] - custom list of arguments, if not specified
   * it uses the `process.argv` (this information is passed to the creation of cli handler)
   * @param {stream} [options.stdout] - custom writable stream, if not specified it uses
   * `process.stdout` (this information is passed to the creation of cli handler)
   * @param {stream} [options.stderr] - custom writable stream, if not specified it uses
   * `process.stderr` (this information is passed to the creation of cli handler)
   * @param {function} [options.initializedCallback] - callback executed when the
   * initialization is done, it passes the value used by the output
   */
  static init(
    defaultCliName,
    {
      argv=process.argv,
      stdout=process.stdout,
      stderr=process.stderr,
      initializedCallback=null,
    }={},
  ){

    assert(TypeCheck.isString(defaultCliName), 'defaultCliName needs to be defined as string');

    const cliIndex = argv.indexOf('--cli');
    const parsedArgs = [...argv.slice(0, 2), ...((cliIndex !== -1) ? argv.slice(cliIndex + 2) : [])];
    const handler = Handler.create(_handlerName, '*', parsedArgs, stdout, stderr);

    const _handlerOutput = (value) => {
      try{
        handler.output(value);
      }
      finally{
        if (initializedCallback){
          initializedCallback(value);
        }
      }
    };

    let useCliName = (cliIndex !== -1) ? argv[cliIndex + 1] : defaultCliName;
    if (useCliName){
      useCliName = useCliName.toLowerCase();
    }

    // list the available action names grated for cli
    const availableClis = this._initNames[_handlerName] || {};
    if (['-h', '--help', undefined].includes(useCliName)){
      const result = [];
      result.push('Available actions granted for command-line:');
      const initNames = Object.keys(availableClis);

      for (const initName of initNames.sort()){
        const defaultCli = (initName === defaultCliName) ? '(Default)' : '';

        const item = (defaultCli.length) ? '◉' : '◯';
        result.push(`  ${item} ${initName} ${defaultCli}`);
      }

      const error = new Error(result.join('\n'));
      error.status = 700;
      _handlerOutput(error);
    }
    // cli not found
    else if (!(useCliName in availableClis)){

      const error = new Error(`Could not initialize '${useCliName}', cli not found!`);
      error.status = 700;
      _handlerOutput(error);
    }
    // found cli, initializing from it
    else{
      handler.runAction(availableClis[useCliName]).then((result) => {
        _handlerOutput(result);
      }).catch(/* istanbul ignore next */ (err) => {
        _handlerOutput(err);
      });
    }
  }

  /**
   * This method can be re-implemented by derived classes to hook when an {@link Action}
   * is granted for a handler ({@link Handler.grantAction})
   *
   * @param {string} handlerName - registered handler name
   * @param {string} actionName - registered action name
   * @param {object} options - custom options passed during {@link Handler.grantAction}
   * @param {string} [options.initName] - custom name used to initialize the cli, otherwise
   * if not defined the actionName is used instead
   * @protected
   */
  static _grantingAction(handlerName, actionName, {initName=null}={}){

    const useInitName = (initName || actionName);
    assert(TypeCheck.isString(useInitName), 'initName needs to be defined as string');

    if (!(handlerName in this._initNames)){
      this._initNames[handlerName] = {};
    }

    this._initNames[handlerName][useInitName] = actionName;
  }

  /**
   * Creates an instance of a reader for the current handler.
   * This passes the {@link Cli.args} to the reader.
   *
   * @param {Action} action - action instance used by the reader to parse the values
   * @param {Object} options - plain object containing the options passed to the reader
   * @return {Reader}
   * @protected
   */
  _createReader(action, options){

    return super._createReader(
      action,
      options,
      this.args(),
    );
  }

  /**
   * Creates an instance of a writer for the current handler
   *
   * This passes the {@link Cli.stdout} and {@link Cli.stderr}
   * to the writer.
   *
   * @param {*} value - arbitrary value passed to the writer
   * @param {Object} options - plain object containing the options passed to the writer
   * @return {Writer}
   * @protected
   */
  _createWriter(value, options){

    return super._createWriter(
      value,
      options,
      this.stdout(),
      this.stderr(),
    );
  }

  static _initNames = {};
}

// registering properties
Input.registerProperty(Input, 'elementType', 'option');
Input.registerProperty(Input, 'shortOption');

// registering option vars
Metadata.registerOptionVar('$cli', `handler.${_handlerName}`);
Metadata.registerOptionVar('$cliDescription', '$cli.readOptions.description');
Metadata.registerOptionVar('$cliResult', '$cli.writeOptions.result');

// registering handler
Handler.register(Cli, _handlerName);

module.exports = Cli;
