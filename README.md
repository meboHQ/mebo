<p align="center">
  <img src="https://mebohq.github.io/docs/data/logo.png?v=1"/>
</p>

![status](https://mebohq.github.io/docs/data/status.svg)
[![Gitter chat](https://badges.gitter.im/meboHQ/gitter.png)](https://gitter.im/meboHQ)
[![Build Status](https://travis-ci.org/meboHQ/mebo.svg?branch=master)](https://travis-ci.org/meboHQ/mebo)
[![Known Vulnerabilities](https://snyk.io/test/github/meboHQ/mebo/badge.svg)](https://snyk.io/test/github/meboHQ/mebo)
[![codecov.io](https://codecov.io/github/meboHQ/mebo/coverage.svg?branch=master)](https://codecov.io/github/meboHQ/mebo?branch=master)
[![Esdocs](https://mebohq.github.io/badge.svg?v=1)](https://mebohq.github.io/)
</p>

## What is Mebo ?

[![experimental](https://badges.github.io/stability-badges/dist/experimental.svg)](https://github.com/meboHQ/mebo/issues)

Mebo is an experimental framework focused in providing a unified interface across multiple domains.

The idea behing mebo is to provide a platform where [evaluations](https://mebohq.github.io/docs/class/src/Action.js~Action.html) and 
their requirements are defined in a simple matter. The way it is done 
lets you to build strict specifications with validations in a fairly 
expressive way.

Evaluations in Mebo are exposed by promoting implementations that don't need to be too coupled to a specific 
domain instead, most of the boilerplate code needed when [bridging](https://mebohq.github.io/docs/class/src/Handler.js~Handler.html) a domain 
(for instance on the web: request & response) to an evaluation is 
avoided and automatically handled by mebo ([DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)).

By using mebo you can easily expose your evaluations through the [web](https://mebohq.github.io/docs/class/src/Handlers/Web.js~Web.html) via 
REST/middlewares and also without much effort expose them through [command-line](https://mebohq.github.io/docs/class/src/Handlers/Cli.js~Cli.html) (CLI coming handy during development/debugging to interact 
with your evaluations quickly).

So, you can use Mebo for desktop apps, web apps or all together.

<p align="center">
  <img src="https://mebohq.github.io/docs/data/hi.png?v=2"/>
</p>

## Key features
- **Flexible architeture**. Mebo can be integrated to existing applications. Also, it's designed from ground up to be customizable and extendable

- **Reliable executions**. Mebo enforces validating the data used prior the execution of evaluations by performing a wide range of verifications

- **Agnostic execution platform**. Implementations using Mebo can be executed easily across different domains

- **Integrated caching system**. Mebo provides out-the-box integrated caching system

- **Express integration**. The web support in Mebo is done through express, embracing the most popular web framework for Node.js

- **RESTful support**. Evaluations can be executed through REST automatically

- **CLI support**. By using Mebo your evaluations can be executed through command-line interfaces following docopt specifications.

[<img src="https://mebohq.github.io/docs/data/intro.png?v=1"/>](data/manual/INTRODUCTION.md)

## Documentation
#### [API Documentation](https://mebohq.github.io)
#### Full Examples
 - [Hello World](https://github.com/meboHQ/example-hello-world)
 - [RESTful using Express and Mongodb](https://github.com/meboHQ/example-restful-using-express-mongodb)
 - [Middleware integration](https://github.com/meboHQ/example-middleware)
 - [Authentication](https://github.com/meboHQ/example-auth)
 - [Uploads](https://github.com/meboHQ/example-uploads)
 - [Command-line integration](https://github.com/meboHQ/example-cli)
 - [JSON serialized actions](https://github.com/meboHQ/example-json-actions)

## Requirement
[<img src="https://mebohq.github.io/docs/data/nodejs.png?v=1"/>](https://www.nodejs.org)

Mebo is built using modern specs ES6/ES7, it requires [Node.js](https://www.nodejs.org) version **8** or **greater**

## Install
```
npm install mebo --save
```

## Getting help
Use the GitHub issues for tracking bugs and feature requests. Also, feel free to talk about Mebo at:
- Gitter [meboHQ](https://gitter.im/meboHQ)

## Issues
Mebo development discussions and bug reports are collected on [Issues](https://github.com/meboHQ/mebo/issues)

## Contributing
Contributions are welcome to Mebo. It can be made through many different forms depending on your level of interest:
- Participating in gitter discussions
- Proposing features
- Reporting issues
- Making improvements (adding new features, improving the existing features, adding tests,
adding testutils, clarifying wording and fixing errors)

## Acknowledgements
Mebo was inspired by:
- [Cortex](https://github.com/ImageEngine/cortex)
- [Passport](https://github.com/jaredhanson/passport)
- [Express](https://expressjs.com)
- [Docopt](http://docopt.org)

## Licensing
Mebo is free software; you can redistribute it and/or modify it under the terms of the MIT License
