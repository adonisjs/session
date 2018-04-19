<a name="1.0.23"></a>
## [1.0.23](https://github.com/adonisjs/adonis-session/compare/v1.0.22...v1.0.23) (2018-03-18)



<a name="1.0.22"></a>
## [1.0.22](https://github.com/adonisjs/adonis-session/compare/v1.0.21...v1.0.22) (2018-03-18)


### Bug Fixes

* **session:** allow readonly access to store when freezed ([49282d7](https://github.com/adonisjs/adonis-session/commit/49282d7))



<a name="1.0.21"></a>
## [1.0.21](https://github.com/adonisjs/adonis-session/compare/v1.0.20...v1.0.21) (2018-03-16)


### Bug Fixes

* **providers:** use correct namespace for WsContext binding ([9fb6bc2](https://github.com/adonisjs/adonis-session/commit/9fb6bc2))
* **store:** only make store dirty when actual values change ([ad8f29d](https://github.com/adonisjs/adonis-session/commit/ad8f29d))


### Features

* **middleware:** add wsHandle to be websocket complaint ([cbef165](https://github.com/adonisjs/adonis-session/commit/cbef165))
* **provider:** bind session on ws context when defined ([150a05b](https://github.com/adonisjs/adonis-session/commit/150a05b))
* **session:** add option to initiate read only session ([d8e5b3a](https://github.com/adonisjs/adonis-session/commit/d8e5b3a))



<a name="1.0.20"></a>
## [1.0.20](https://github.com/adonisjs/adonis-session/compare/v1.0.19...v1.0.20) (2018-02-07)



<a name="1.0.19"></a>
## [1.0.19](https://github.com/adonisjs/adonis-session/compare/v1.0.18...v1.0.19) (2017-10-31)


### Bug Fixes

* **case:** lowercase src folder ([948274c](https://github.com/adonisjs/adonis-session/commit/948274c))



<a name="1.0.18"></a>
## [1.0.18](https://github.com/adonisjs/adonis-session/compare/v1.0.17...v1.0.18) (2017-10-30)


### Bug Fixes

* **session:** initiate session before hand using context.getter ([3e82994](https://github.com/adonisjs/adonis-session/commit/3e82994))



<a name="1.0.17"></a>
## [1.0.17](https://github.com/adonisjs/adonis-session/compare/v1.0.16...v1.0.17) (2017-10-29)



<a name="1.0.16"></a>
## [1.0.16](https://github.com/adonisjs/adonis-session/compare/v1.0.15...v1.0.16) (2017-10-03)


### Features

* **view:globals:** add alias for old as `flashMessage` ([efdba9a](https://github.com/adonisjs/adonis-session/commit/efdba9a))



<a name="1.0.15"></a>
## [1.0.15](https://github.com/adonisjs/adonis-session/compare/v1.0.14...v1.0.15) (2017-09-15)


### Bug Fixes

* **middleware:** commit session only in implicit mode ([f8d813e](https://github.com/adonisjs/adonis-session/commit/f8d813e))



<a name="1.0.14"></a>
## [1.0.14](https://github.com/adonisjs/adonis-session/compare/v1.0.13...v1.0.14) (2017-09-14)



<a name="1.0.13"></a>
## [1.0.13](https://github.com/adonisjs/adonis-session/compare/v1.0.12...v1.0.13) (2017-09-06)


### Bug Fixes

* **config:** set sameSite to false ([44dfeb2](https://github.com/adonisjs/adonis-session/commit/44dfeb2))



<a name="1.0.12"></a>
## [1.0.12](https://github.com/adonisjs/adonis-session/compare/v1.0.11...v1.0.12) (2017-08-30)


### Features

* **vow:** add response bindings for session ([e447408](https://github.com/adonisjs/adonis-session/commit/e447408))
* **vow-bindings:** hook session response in vow suite ([d2a4374](https://github.com/adonisjs/adonis-session/commit/d2a4374))



<a name="1.0.11"></a>
## [1.0.11](https://github.com/adonisjs/adonis-session/compare/v1.0.10...v1.0.11) (2017-08-29)


### Features

* **client:** add session client ([85378d2](https://github.com/adonisjs/adonis-session/commit/85378d2))
* **trait:** add session client trait for vow ([54b6516](https://github.com/adonisjs/adonis-session/commit/54b6516))



<a name="1.0.10"></a>
## [1.0.10](https://github.com/adonisjs/adonis-session/compare/v1.0.9...v1.0.10) (2017-08-18)


### Bug Fixes

* **config:** define session path ([42bce02](https://github.com/adonisjs/adonis-session/commit/42bce02))


### Features

* **client:** add session client for creating sessions ([0cf4867](https://github.com/adonisjs/adonis-session/commit/0cf4867))
* **client:** bind to ioc container ([c321441](https://github.com/adonisjs/adonis-session/commit/c321441))



<a name="1.0.9"></a>
## [1.0.9](https://github.com/adonisjs/adonis-session/compare/v1.0.8...v1.0.9) (2017-08-08)


### Bug Fixes

* **globals:** flash view globals use resolve method ([abc0fdf](https://github.com/adonisjs/adonis-session/commit/abc0fdf))



<a name="1.0.8"></a>
## [1.0.8](https://github.com/adonisjs/adonis-session/compare/v1.0.7...v1.0.8) (2017-08-05)


### Features

* **session:** add flash messages related view globals ([4347a1f](https://github.com/adonisjs/adonis-session/commit/4347a1f))
* **session:** add memory driver ([e90b1a7](https://github.com/adonisjs/adonis-session/commit/e90b1a7))
* **session:** add support for flash messages ([f0a536e](https://github.com/adonisjs/adonis-session/commit/f0a536e))



<a name="1.0.7"></a>
## [1.0.7](https://github.com/adonisjs/adonis-session/compare/v1.0.6...v1.0.7) (2017-08-02)


### Features

* **exceptions:** use generic-exceptions package ([6504434](https://github.com/adonisjs/adonis-session/commit/6504434))



<a name="1.0.6"></a>
## [1.0.6](https://github.com/adonisjs/adonis-session/compare/v1.0.5...v1.0.6) (2017-08-01)


### Features

* **instructions:** add instructions file for ace ([959d3ce](https://github.com/adonisjs/adonis-session/commit/959d3ce))


### Reverts

* **command:** remove config:session command ([3387118](https://github.com/adonisjs/adonis-session/commit/3387118))



<a name="1.0.5"></a>
## [1.0.5](https://github.com/adonisjs/adonis-session/compare/v1.0.4...v1.0.5) (2017-07-31)


### Bug Fixes

* **cookie:** touch values cookie everytime ([06b02cc](https://github.com/adonisjs/adonis-session/commit/06b02cc))


### Features

* **command:** add config:session command ([89e49eb](https://github.com/adonisjs/adonis-session/commit/89e49eb))



<a name="1.0.4"></a>
## [1.0.4](https://github.com/adonisjs/adonis-session/compare/v1.0.3...v1.0.4) (2017-07-22)



<a name="1.0.3"></a>
## [1.0.3](https://github.com/adonisjs/adonis-session/compare/v1.0.2...v1.0.3) (2017-07-22)


### Bug Fixes

* **file:** ensure file exists before touching ([71153c0](https://github.com/adonisjs/adonis-session/commit/71153c0))



<a name="1.0.2"></a>
## [1.0.2](https://github.com/adonisjs/adonis-session/compare/v1.0.1...v1.0.2) (2017-07-18)


### Bug Fixes

* **package:** remove bin section ([db3801f](https://github.com/adonisjs/adonis-session/commit/db3801f))



<a name="1.0.1"></a>
## [1.0.1](https://github.com/adonisjs/adonis-session/compare/v1.0.0...v1.0.1) (2017-07-18)



<a name="1.0.0"></a>
# 1.0.0 (2017-07-18)


### Bug Fixes

* **file:** pass date object to fs.utimes ([d66dff9](https://github.com/adonisjs/adonis-session/commit/d66dff9))


### Features

* implement session and cookie driver ([6603b61](https://github.com/adonisjs/adonis-session/commit/6603b61))
* scaffold new project ([30f7c1b](https://github.com/adonisjs/adonis-session/commit/30f7c1b))
* **drivers:** add file driver ([1b69f32](https://github.com/adonisjs/adonis-session/commit/1b69f32))
* **drivers:** add redis driver ([1327cf7](https://github.com/adonisjs/adonis-session/commit/1327cf7))
* **middleware:** add session middleware ([90b9d5e](https://github.com/adonisjs/adonis-session/commit/90b9d5e))
* **session:** touch driver when store is not dirty ([8934257](https://github.com/adonisjs/adonis-session/commit/8934257))
* **store:** add flag to know if store is dirty ([4b5efae](https://github.com/adonisjs/adonis-session/commit/4b5efae))



