# [0.5.0](https://github.com/zcong1993/auto-sequelize-typescript/compare/v0.4.1...v0.5.0) (2021-08-11)

### Bug Fixes

- mysql 8 ignore int length ([8db3933](https://github.com/zcong1993/auto-sequelize-typescript/commit/8db3933b07a81a93bf61de459726be748869468c))
- sequelize required field issue, fix [#28](https://github.com/zcong1993/auto-sequelize-typescript/issues/28) ([b0b4146](https://github.com/zcong1993/auto-sequelize-typescript/commit/b0b4146186f325a2be6cf67b624b4e9e57349ebc))
- typeorm required field issue, fix [#26](https://github.com/zcong1993/auto-sequelize-typescript/issues/26) ([1784c20](https://github.com/zcong1993/auto-sequelize-typescript/commit/1784c20623606120108afdd4e5762a25f87f9309))

### Features

- generate strict model type, fix model create pk required issue, close [#27](https://github.com/zcong1993/auto-sequelize-typescript/issues/27) ([a17a9b1](https://github.com/zcong1993/auto-sequelize-typescript/commit/a17a9b10f487b869d05b4e541e4affdde0adf6dc))
- support --export-default control model export style, close [#30](https://github.com/zcong1993/auto-sequelize-typescript/issues/30) ([33dc741](https://github.com/zcong1993/auto-sequelize-typescript/commit/33dc741411e9fa7cf13a5021eb3e67905f8afdc9))
- use uri flags, close [#29](https://github.com/zcong1993/auto-sequelize-typescript/issues/29) ([3587dad](https://github.com/zcong1993/auto-sequelize-typescript/commit/3587dad67e3a9254c0b7353724411aec0115e2dc))

### BREAKING CHANGES

- sequelize default style in previous version is same as using --export-default in new version
- perhaps relying on higher versions of sequelize-typescript and sequelize

## [0.4.1](https://github.com/zcong1993/auto-sequelize-typescript/compare/v0.4.0...v0.4.1) (2021-08-10)

### Bug Fixes

- **deps:** update dependency lodash to v4.17.19 [security] ([5d067f8](https://github.com/zcong1993/auto-sequelize-typescript/commit/5d067f8242ce194bd349f85cbd60dc91ad807489))
