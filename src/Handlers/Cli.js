const stream = require('stream');
const path = require('path');
const assert = require('assert');
const ejs = require('ejs');
const TypeCheck = require('js-typecheck');
const Settings = require('../Settings');
const Input = require('../Input');
const Metadata = require('../Metadata');
const Handler = require('../Handler');
const MeboErrors = require('../MeboErrors');

// symbols used for private members to avoid any potential clashing
// caused by re-implementations
const _args = Symbol('args');
const _stdout = Symbol('stdout');
const _stderr = Symbol('stderr');
const _commands = Symbol('commands');

// handler name (used for registration)
const _handlerName = 'cli';


/**
* Handles the command-line integration based on docopt specification.
*
* It enables the execution of actions triggered as command-line
* applications. The args are parsed using the reader {@link CliArgs} and
* the output is provided by writer {@link CliOutput}.
*
* Using cli handler:
*
* **Creating an action that can be executed through command-line**
* ```
* @Mebo.grant('cli')
* @Mebo.register('myAction')
* class MyAction extends Mebo.Action{
*   constructor(){
*     super();
*     this.setMeta('description', 'Welcome!');
*     this.createInput('myArgument: text', {elementType: 'argument', description: 'my argument'});
*     this.createInput('myOption: bool', {description: 'my option'});
*   }
*
*   async _perform(data){
*     const result = {
*       myArgument: data.myArgument,
*       myOption: data.myOption,
*     };
*     return result;
*   }
* }
*
* ```
*
* The command-line support can be invoked in two ways:
*
* **1) Multiple commands (recommended):** Used to provide multiple granted actions through command-line
* ```
* if (require.main === module) {
*   const cli = Mebo.Handler.get('cli');
*   if (cli.isSupported()){
*     cli.init();
*   }
* }
* ```
* When this method is used the command-line help (`-h` or `--help`)
* provides a list of commands:
*
* ```
* node mycli.js --help
*  __  __      _
* |  \/  | ___| |__   ___
* | |\/| |/ _ \ '_ \ / _ \_
* | |  | |  __/ |_) | (_) |
* |_|  |_|\___|_.__/ \___/
*
* Available commands:
*     myAction
* ```
*
* In order to access the help for each command you need to provide
* the command name before the help flag (`-h` or `--help`)
* ```
* node . myAction --help
* Welcome.
*
* Usage: node mycli.js myAction [options] <my-argument>
*
* Arguments:
*   my-argument     my argument (text type).
*
* Options:
*   --my-option     my option (bool type).
* ```
*
* A complete example about providing multiple commands through command-line
* can be found at: https://github.com/meboHQ/example-cli
*
* **2) Single command:** Used to provide just a single granted action
* through command-line
*
* ```
* if (require.main === module) {
*   // creating an cli handler which is used to load the arguments
*   // arguments to the action and to output the result back to the stream
*   const cli = Mebo.Handler.create('cli');
*
*   // loading the parsed information to the action
*   cli.runAction('myAction').then((result) => {
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
*
* When using the single command the help flag (`-h` or `--help`)
* provides the help about the command directly:
* ```
* node mycli.js --help
* Welcome.
*
* Usage: node mycli.js [options] <my-argument>
*
* Arguments:
*   my-argument     my argument (text type).
*
* Options:
*   --my-option     my option (bool type).
* ```
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
   * Returns a boolean telling if cli support can be initialized based on the input argv.
   *
   * @param {Array<string>} [argv] - custom list of arguments, if not specified
   * it uses the `process.argv` (this information is passed to the creation of cli handler)
   * @return {boolean}
   */
  static isSupported(argv=process.argv){
    // checks if there is a command being passed and if the file being
    // executed by node is not inside of a dependency (for instance, mocha
    // contains its own set of command-line args)
    // Also, when argv is passed using process.argv (default) we don't need to
    // worry about filtering out specific args related with node itself. Since,
    // those args are handled through process.execArgv
    return (argv.length >= 3 && !path.normalize(argv[1]).split(path.sep).includes('node_modules'));
  }

  /**
   * Initializes a registered action as cli.
   *
   * *`CliActions/Default.js`: defining an action as cli:*
   * ```
   * const Mebo = require('mebo');
   *
   * @Mebo.grant('cli', 'cli.default', {command: 'default'})
   * @Mebo.register('cli.default')
   * class Default extends Mebo.Action{
   *
   *  constructor(){
   *   super();
   *     this.createInput('name: text');
   *     this.createInput('myOtherInput?: numeric');
   *  }
   *  async _perform(data){
   *    // ...
   *  }
   * }
   *
   * ```
   *
   * *`index.js`:*
   * ```
   * const Mebo = require('mebo');
   * require('Clis/Default.js');
   *
   * // ...
   * const cli = Mebo.Handler.get('cli');
   * if (cli.isSupported()){
   *    cli.init();
   * }
   * ```
   *
   * *Listing available actions:*
   * ```
   * node myFile.js --help
   * ```
   *
   * *Showing help from the app:*
   * ```
   * node myFile.js myCli --help
   * ```
   *
   * *Executing an cli by specifying custom args:*
   * ```
   * node myFile.js myCli --arg-a=1 --arg-b=2
   * ```
   * @param {Object} options - plain object containing custom options
   * @param {Array<string>} [options.argv] - custom list of arguments, if not specified
   * it uses the `process.argv` (this information is passed to the creation of cli handler)
   * @param {stream} [options.stdout] - custom writable stream, if not specified it uses
   * `process.stdout` (this information is passed to the creation of cli handler)
   * @param {stream} [options.stderr] - custom writable stream, if not specified it uses
   * `process.stderr` (this information is passed to the creation of cli handler)
   * @param {function} [options.finalizeCallback] - callback executed after the
   * output. (The value the output value is passed as argument)
   */
  static init(
    {
      argv=process.argv,
      stdout=process.stdout,
      stderr=process.stderr,
      showBanner=true,
      description='',
      finalizeCallback=null,
    }={},
  ){
    assert(this.isSupported(argv), 'cli support cannot be initialized with the current with input argv');
    assert(TypeCheck.isString(description), 'description needs to be defined as string');

    const useCommand = argv[2];
    const parsedArgs = argv.slice(0);
    // removing the command name from parsed args
    parsedArgs.splice(2, 1);

    const handler = Handler.create(_handlerName, '*', parsedArgs, stdout, stderr);

    const _handlerOutput = (output) => {
      try{
        handler.output(output);
      }
      finally{
        if (finalizeCallback){
          finalizeCallback(output);
        }
      }
    };

    // list the available action names grated for cli
    const availableCommands = this[_commands][_handlerName];
    if (['-h', '--help'].includes(useCommand)){

      ejs.renderFile(
        Settings.get('handler/cli/commandsHelpTemplate'),
        {
          commands: Object.keys(availableCommands),
          showBanner,
          description,
        },
      ).then((result) => {
        _handlerOutput(new MeboErrors.Help(result));
      }).catch(/* istanbul ignore next */ (error) => {
        _handlerOutput(error);
      });
    }
    // command not found
    else if (!(useCommand in availableCommands)){
      _handlerOutput(new MeboErrors.Help(`Could not initialize '${useCommand}', command not found!`));
    }
    // found cli, initializing from it
    else{
      handler.runAction(availableCommands[useCommand].actionName).then((result) => {
        _handlerOutput(result);
      }).catch(/* istanbul ignore next */ (err) => {
        _handlerOutput(err);
      });
    }
  }

  /**
   * Return a list of commands mapped to the action name.
   *
   * @param {string} actionName - registered action name
   * @return {Array<string>}
   * @protected
   */
  static actionCommands(actionName){
    assert(TypeCheck.isString(actionName), 'actionName needs to be defined as string');

    const result = [];

    if (_handlerName in this[_commands]){
      for (const name in this[_commands][_handlerName]){
        if (this[_commands][_handlerName][name].actionName === actionName){
          result.push(name);
        }
      }
    }

    return result;
  }

  /**
   * This method can be re-implemented by derived classes to hook when an {@link Action}
   * is granted for a handler ({@link Handler.grantAction})
   *
   * @param {string} handlerName - registered handler name
   * @param {string} actionName - registered action name
   * @param {object} options - custom options passed during {@link Handler.grantAction}
   * @param {string} [options.command] - command name used to initialize the cli, otherwise
   * if not defined the actionName is used instead
   * @protected
   */
  static _grantingAction(handlerName, actionName, {command=null}={}){

    const useCommand = (command || actionName);
    assert(TypeCheck.isString(useCommand), 'name needs to be defined as string');

    if (!(handlerName in this[_commands])){
      this[_commands][handlerName] = {};
    }

    const options = {};
    options.actionName = actionName;

    this[_commands][handlerName][useCommand] = options;
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
}

Cli[_commands] = {};

// registering properties
Input.registerProperty(Input, 'elementType', 'option');
Input.registerProperty(Input, 'shortOption');

// registering option vars
Metadata.registerOptionVar('$cli', `handler.${_handlerName}`);
Metadata.registerOptionVar('$cliResult', '$cli.writeOptions.result');

// default settings
Settings.set(
  'handler/cli/commandsHelpTemplate',
  path.join(path.dirname(path.dirname(path.dirname(__filename))), 'data', 'handlers', 'cli', 'commandsHelp.ejs'),
);

// registering handler
Handler.register(Cli, _handlerName);

module.exports = Cli;
