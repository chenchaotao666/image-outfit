# 帮搭后端

本目录对应小程序的 [帮搭分包](../../miniprogram/packages/bangda/)，用于后续实现帮搭需求、搭配方案及用户互动接口。

商品与广场示例来自分包内置数据。个人资料、收藏、需求和搭配通过已登录的 `GET /api/data/bangda` 与 `PUT /api/data/bangda` 读取或保存。SQLite 按用户隔离记录，每次写入校验版本。
