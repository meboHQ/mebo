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

### What is it ?

Mebo is a framework designed to help building apps across multiple domains. It can be employed in the
development of the most common applications.

### How does it work ?

It works by providing an interface focused to describe evaluations in a way that is fairly extendable and comprehensible through a process that minimize repetitive thedeus routines  ([DRY](https://en.wikipedia.org/wiki/Don%27t_repeat_yourself)) and produces a more versatile code base.

These evaluations can be triggered across multiple domains, you write once and Mebo takes care of getting the evaluations up running across the domains.

<p align="center">
  <img src="https://mebohq.github.io/docs/data/hi.png?v=1"/>
</p>

## Key features
- **Flexible architeture**. Mebo can be integrated to existing applications. Also, it's designed from ground up to be customizable and extendable

- **Reliable executions**. Mebo enforces quality control over the data used in the evaluations by performing a wide range of verifications

- **Agnostic execution platform**. Evaluations in Mebo can be executed across multiple domains

- **Integrated caching system**. Mebo provides out-the-box integrated caching system that can be easily enabled for any evaluation, speeding up your application

- **Express integration**. The web support from Mebo is done using express, embracing the most popular web framework for Node.js

- **RESTful support**. Evaluations can be executed through REST automatically

- **Console support**. By using Mebo your evaluations can be executed through command-line interfaces following docopt specifications.

[<img src="https://mebohq.github.io/docs/data/intro.png?v=1"/>](data/manual/INTRODUCTION.md)

## Documentation
- [API Documentation](https://mebohq.github.io)
- Full Examples
 - [Hello World](https://github.com/meboHQ/example-hello-world)
 - [REST](https://github.com/meboHQ/example-rest)
 - [Middleware integration](https://github.com/meboHQ/example-middleware)
 - [Authentication](https://github.com/meboHQ/example-auth)
 - [Uploads](https://github.com/meboHQ/example-uploads)
 - [JSON serialized actions](https://github.com/meboHQ/example-json-actions)
- Tutorials (coming soon)

## Requirement
[<img src="https://mebohq.github.io/docs/data/nodejs.png?v=1"/>](https://www.nodejs.org)

Mebo is built using modern specs ES6/ES7, it requires [Node.js](https://www.nodejs.org) version **6** or **greater**

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
- [Express](http://expressjs.com)
- [Docopt](http://docopt.org)
- [Nujabes](https://www.youtube.com/watch?v=WrO9PTpuSSs)

## Licensing
Mebo is free software; you can redistribute it and/or modify it under the terms of the MIT License
