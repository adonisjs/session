<div align="center">
  <img src="https://res.cloudinary.com/adonisjs/image/upload/q_100/v1558612869/adonis-readme_zscycu.jpg" width="600px">
</div>

# Adonis session
> AdonisJs package to add support for sessions

[![circleci-image]][circleci-url] [![npm-image]][npm-url] ![][typescript-image] [![license-image]][license-url]

This module adds support for Sessions to AdonisJs projects. Under the hood you can choose a session persistance driver from the list of available drivers. 

### [Read official docs to learn more ➞](https://adonisjs.com/guides/sessions)

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
## Table of contents

- [Setup](#setup)
- [Maintainers](#maintainers)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Setup
Install the package from npm registry as follows:

```sh
npm i @adonisjs/session

# yarn
yarn add @adonisjs/session
```

and register the provider inside the list of providers

```ts
const providers = [
  '@adonisjs/session'
]
```

## Maintainers
[Harminder virk](https://github.com/thetutlage)


[circleci-image]: https://img.shields.io/circleci/project/github/adonisjs/adonis-session/master.svg?style=for-the-badge&logo=circleci
[circleci-url]: https://circleci.com/gh/adonisjs/adonis-session "circleci"

[typescript-image]: https://img.shields.io/badge/Typescript-294E80.svg?style=for-the-badge&logo=typescript
[typescript-url]:  "typescript"

[npm-image]: https://img.shields.io/npm/v/@adonisjs/session.svg?style=for-the-badge&logo=npm
[npm-url]: https://npmjs.org/package/@adonisjs/session "npm"

[license-image]: https://img.shields.io/npm/l/@adonisjs/session?color=blueviolet&style=for-the-badge
[license-url]: LICENSE.md "license"
