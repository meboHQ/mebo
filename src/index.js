const modules = {};

// main modules
modules.MeboError = require('./MeboError');
modules.MeboErrors = require('./MeboErrors');
modules.Utils = require('./Utils');
modules.Tasks = require('./Tasks');
modules.Input = require('./Input');
modules.Metadata = require('./Metadata');
modules.Settings = require('./Settings');
modules.Action = require('./Action');
modules.Session = require('./Session');
modules.Handler = require('./Handler');
modules.Reader = require('./Reader');
modules.Writer = require('./Writer');

// decorators for the main modules
Object.assign(
  modules, require('./decorators'),
);

// implementations bundled with mebo
modules.Inputs = require('./Inputs');
modules.Handlers = require('./Handlers');
modules.Readers = require('./Readers');
modules.Writers = require('./Writers');

module.exports = modules;
