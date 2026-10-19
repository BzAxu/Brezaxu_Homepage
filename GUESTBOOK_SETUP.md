# 留言板部署说明

留言板使用 Cloudflare Pages Functions + Cloudflare D1，不需要访客登录。首次部署需要创建一次数据库并绑定到 Pages 项目。

## 1. 创建 D1 数据库

1. 打开 Cloudflare Dashboard。
2. 进入 **Storage & databases → D1 SQL Database**（界面名称可能略有不同）。
3. 创建数据库，名称可用 `brezaxu-guestbook`。
4. 打开数据库的 SQL Console，将仓库根目录的 `schema.sql` 全部内容粘贴执行。
5. **继续执行管理员功能迁移**：将 `migrations/20261019_guestbook_admin.sql` 全部内容粘贴到同一数据库的 SQL Console 中执行。当前留言接口会读取回复表，因此新数据库必须执行这一步。

## 2. 绑定到 Pages

1. 进入 **Workers & Pages → brezaxu-homepage**。
2. 打开 **Settings → Functions**，找到 **D1 database bindings**。
3. 添加绑定：
   - **Variable name**：`DB`
   - **D1 database**：选择刚创建的 `brezaxu-guestbook`
4. 在 **Settings → Variables and Secrets**（界面名称可能略有不同）中配置以下生产环境变量：
   - `ADMIN_PASSWORD`：管理员密码，至少 12 个字符，建议使用唯一的高强度随机密码，并设为 Secret。
   - `SESSION_SECRET`：至少 32 个字符的高熵随机密钥，也必须设为 Secret；不要写进仓库或前端代码。
5. 保存设置，然后在 **Deployments** 中重新部署最新的 `main`。

## 3. 验证

部署完成后打开 `https://bzaxu.top/api/guestbook`。正常情况下应返回 JSON，例如：

```json
{"entries":[],"total":0}
```

如果提示数据库尚未初始化，请确认 SQL 已执行且绑定变量名称严格为 `DB`。

## 防刷与数据说明

- 不要求访客注册或登录。
- 名字最多 24 个字符，留言最多 500 个字符。
- 每个来源地址 45 秒内最多提交一条；仅在限流表保存来源地址的 SHA-256 哈希，不保存原始 IP。
- 页面将留言作为纯文本显示，避免把留言当作 HTML 执行。
- 留言公开显示；不要填写密码、电话号码等敏感信息。

## 4. 绑定后仍提示“数据库尚未绑定”

- 确认 D1 绑定添加在 Pages 项目 `brezaxu-homepage` 的生产环境，而不只是 Preview 环境。
- 变量名必须严格为 `DB`，数据库选择 `brezaxu-guestbook`。
- 保存绑定后，在 **Deployments** 中重新部署最新的 `main` 生产部署，让 Pages Functions 使用最新运行时配置。
- 部署成功后再次打开 `https://bzaxu.top/api/guestbook`；若仍返回 503，请重新核对绑定的环境和变量名。
