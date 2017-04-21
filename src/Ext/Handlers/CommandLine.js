const assert = require('assert');
const stream = require('stream');
const TypeCheck = require('js-typecheck');
const Input = require('../../Input');
const Metadata = require('../../Metadata');
const Handler = require('../../Handler');

// symbols used for private instance variables to avoid any potential clashing
// caused by re-implementations
const _args = Symbol('args');
const _stdout = Symbol('stdout');
const _stderr = Symbol('stderr');


/**
* Handles the command-line integration based on docopt specification.
*
* It enables the execution of actions triggered by command-line interfaces
* by reading ({@link CommandLineArgs}) the arguments that are
* passed to the action during the execution ({@link CommandLine.execute}).
* The result of this handler ({@link CommandLine.output}) is done through
* the {@link CommandLineOutput} writer.
*
* Using the command-line handler:
*
* **Creating an action that is going be executed through the command-line**
* ```
* class MyAction extends Mebo.Action{
*   constructor(){
*     super();
*     this.createInput('myArgument: text', {cliElementType: 'argument', description: 'my argument'});
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
* // registering the action
* Mebo.registerAction(MyAction);
* ```
*
* **Executing the action through command-line**
* ```
* // making sure the script is called directly
* if (require.main === module) {
*
*   // creating a command-line handler which is used to load the command-line
*   // arguments to the action and to output the result back to the command-line
*   const commandLine = Mebo.createHandler('commandLine');
*
*   // loading the parsed information to the action
*   commandLine.execute('myAction', {description: 'Welcome'}).then((result) => {
*
*     // success output
*     commandLine.output(result);
*
*   // error output
*   }).catch((err) => {
*     commandLine.output(err);
*   });
* }
* ```
* You can list the command help by invoking `-h` or `--help` where a help interface
* is generated automatically for the action, for instance:
*
* `node mycommand.js --help`
* ```
* Welcome.
*
* Usage: mycommand.js [options] <my-argument>
*
* Arguments:
*   my-argument  my argument (text type).
*
* Options:
*   --api=<value>  version used to make sure that the api is still compatible (version type).
*   --my-option    my option (bool type).
* ```
*
* @see http://docopt.org
*/
class CommandLine extends Handler{

  /**
   * Creates a command line handler
   * @param {Session} session - Session object instance
   */
  constructor(session){
    super(session);
    this.setArgs(process.argv);
    this.setStdout(process.stdout);
    this.setStderr(process.stderr);
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
   * Creates an instance of a reader for the current handler.
   * This passes the {@link CommandLine.args} to the reader.
   *
   * @param {Action} action - action instance used by the reader to parse the values
   * @param {Object} options - plain object containing the options passed to the reader
   * @return {Reader}
   * @protected
   */
  _createReader(action, options){
    const reader = super._createReader(action, options);

    // setting args to the reader
    reader.setArgs(this.args());

    return reader;
  }

  /**
   * Creates an instance of a writer for the current handler
   *
   * This passes the {@link CommandLine.stdout} and {@link CommandLine.stderr}
   * to the writer.
   *
   * @param {*} value - arbitrary value passed to the writer
   * @param {Object} options - plain object containing the options passed to the writer
   * @return {Writer}
   * @protected
   */
  _createWriter(value, options){
    const writer = super._createWriter(value, options);

    // setting stdout & stderr to the writer
    writer.setStdout(this.stdout());
    writer.setStderr(this.stderr());

    return writer;
  }
}

// registering properties
Input.registerProperty(Input, 'cliElementType', 'option');
Input.registerProperty(Input, 'cliShortOption');

// registering path vars
Metadata.registerOptionVar('$commandLine', 'handler.commandLine');
Metadata.registerOptionVar('$commandLineDescription', '$commandLine.readOptions.description');
Metadata.registerOptionVar('$commandLineResult', '$commandLine.writeOptions.result');

// registering handler
Handler.registerHandler(CommandLine);

module.exports = CommandLine;
