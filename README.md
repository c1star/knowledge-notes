# knowledge-notes

把 AI 对话里的零散知识点，整理成结构化、可检索、带公式说明的 Markdown 笔记。

一个 agent skill + 一个零依赖 Node 脚本：你说「把这个整理成笔记」，它先查重、再定分类，按固定格式写进笔记库，最后重建索引并跑一遍体检。

```
你：把刚才这段残余应力的内容整理成笔记
agent：已整理 1 条 → notes/工程理论.md › 机械 › 弹塑性力学与残余应力
       - 反向屈服与残余应力峰值上限（新增，1 个公式）
       索引已更新，check 通过。
```

## 解决什么问题

对话里学到的东西，三天后就找不到了。直接让模型「记一下」通常有三个毛病：

1. **分类乱**：这次放这儿、下次放那儿，最后自己都不知道在哪个文件；
2. **写得太简**：只留一句结论，公式没单位、符号没解释，回头看不懂；
3. **越记越乱**：重复条目、跳级标题、公式 `$` 没闭合，没人检查。

这个 skill 把这三件事固定成流程和规则：**先查再建、固定四层标题、公式必带符号说明、每次写完自动校验。**

## 特性

- **分级标题归档**：一级分类一个文件，文件内 `#` → `##` → `###` → `####`，叶子标题就是一条知识点
- **七条命令**：`paths` `init` `tree` `find` `check` `index` `set-root`
- **查重优先**：`find` 先搜标题和正文，有合适的就合并，不重复建条目
- **符号规范**：公式必须配「符号」行，多义符号（$E$、$p$、$T$、$c$）注明含义，不用冷门记号
- **自动体检**：层级跳跃、同级重名、含公式缺符号、`$` 未闭合、索引漂移都能查出来
- **目录可迁移**：`set-root` 换库位置，`--move` 连笔记一起搬，`--keep-old` 只切换
- **纯 Markdown**：无 frontmatter 依赖，Obsidian / Typora / VS Code 直接读
- **零依赖**：一个 `notes.mjs`，Node ≥ 18，Windows / macOS / Linux 通用

## 安装

把整个目录放进 agent 的技能目录即可。

**DeepSeek Harness / 兼容 `~/.agents/skills` 的 agent**

```bash
git clone https://github.com/c1star/knowledge-notes.git ~/.agents/skills/knowledge-notes
```

**Claude Code**

```bash
git clone https://github.com/c1star/knowledge-notes.git ~/.claude/skills/knowledge-notes
```

**手动**：下载仓库，把目录放到 `<你的技能目录>/knowledge-notes/`，确保 `SKILL.md` 在根目录。

> 安装后确认 agent 能列出这个 skill（重启会话或在技能列表里刷新）。

## 快速开始

先设置技能目录变量：

```bash
# macOS / Linux
export KN=~/.agents/skills/knowledge-notes
```

```powershell
# Windows PowerShell
$KN = "$env:USERPROFILE\.agents\skills\knowledge-notes"
```

然后：

```bash
# 1. 看当前配置和笔记库位置（默认是当前目录下的 notes/）
node "$KN/scripts/notes.mjs" paths

# 2. 初始化笔记库（只补缺，不覆盖已有文件）
node "$KN/scripts/notes.mjs" init

# 3. 看一眼分类树
node "$KN/scripts/notes.mjs" tree
```

在对话里说「把这段整理成笔记」「记到笔记里」即可。也可以直接给一段内容，让它拆条后归档。

## 命令

| 命令 | 作用 |
| --- | --- |
| `paths` | 显示技能目录、配置、笔记库位置与条目统计 |
| `init` | 初始化空库（只补缺，不覆盖） |
| `tree` | 打印分类树、每类条数和条目行号 |
| `find <关键词...>` | 按标题/正文检索，用于查重（多词为 AND） |
| `check` | 体检：层级、重名、公式符号、`$` 闭合、索引 |
| `index` | 重建 `00-索引.md` |
| `set-root <目录> [--move\|--keep-old]` | 更换笔记库位置 |

`check` 输出分三级：`[错误]` 必须修，`[警告]` 逐条判断，`[提示]` 是空分类占位、正常。

## 笔记长什么样

```markdown
### 反向屈服与残余应力峰值上限
卸载时若弹性等效应力的卸载幅度超过屈服面直径，材料反向屈服，残余应力被「削顶」。

$$
\sigma_i^{e}>2\sigma_i^{p}\ \Rightarrow\ \text{反向屈服}
$$

- **符号**：$\sigma_i^{e}$ —— 按全弹性假设计算的等效应力（MPa）；$\sigma_i^{p}$ —— 加载终点考虑硬化后的真实等效应力（MPa）。
- **条件**：各向同性硬化、屈服面对称；随动硬化时判据改为背应力移动量。
- **例**：喷丸、滚压的残余压应力峰值通常被限制在约 1.0–1.5 倍屈服强度量级。
- **易错**：门槛是 $2\sigma_i^{p}$ 而不是 $\sigma_i^{p}$——卸载要从 $+\sigma_i^{p}$ 走到 $-\sigma_i^{p}$ 才反向屈服。
```

完整的模板、三个学科范例和一个反例在 [`references/note-format.md`](references/note-format.md)。

## 笔记库结构

```
<notes_root>/
├── 00-索引.md      自动生成，勿手改
├── 基础科学.md     数学 / 物理 / 化学
├── 工程理论.md     机械 / 计算机 / 生物
├── 人文社科.md     哲学 / 历史 / 经济 / 心理 / 语言文学 / 法律
└── 生活知识.md     厨房烹饪 / 居家维修 / 健康医疗 / 数码电子 / 出行交通 / 理财保险 / 安全应急 / 社交礼仪
```

- 一个一级分类一个文件，文件名 = 一级标题
- 最多四级标题，不许跳级
- 没有下级标题的叶子标题 = 一条知识点；有正文是条目，没正文是分类占位
- 分类以库里实际标题为准，`references/taxonomy.md` 只是初始建议和归属判定规则

## 配置

`config.json`（首次 `init` 或 `set-root` 时自动生成）：

```json
{
  "schema": 1,
  "notes_root": "workspace:notes"
}
```

- `workspace:notes` —— 相对**当前工作目录**的 `notes/`，适合一个项目一个库
- 绝对路径 —— 如 `D:\\notes`、`/Users/me/notes`，适合所有项目共用一个库
- 环境变量 `KNOWLEDGE_NOTES_ROOT` 优先级最高，适合临时切换或 CI

换库位置：

```bash
node "$KN/scripts/notes.mjs" set-root "D:\notes" --move      # 旧笔记一起搬
node "$KN/scripts/notes.mjs" set-root "D:/notes" --keep-old  # 只切换，旧文件留下
```

旧库已有笔记时，不加 `--move` / `--keep-old` 会拒绝执行，避免笔记变成孤儿。

## 设计取舍

- **为什么一个分类一个文件**：几万字的笔记也能一次 grep、一次 git diff 看完；拆成「一条一文件」会产生几百个小文件，检索和迁移都变慢。
- **为什么叶子标题就是条目**：不需要额外的 ID、frontmatter 或目录约定，Markdown 原生结构就是数据模型。
- **为什么限制四级**：再深就说明分类没想清楚；四级足够「学科 → 子类 → 主题 → 知识点」。
- **为什么公式必须配符号**：没有符号说明的公式半年后等于没记。
- **为什么不自动写入**：只有用户明确说「整理成笔记」才写，讨论和查资料不碰笔记库。

## 兼容性

- Node.js ≥ 18（ESM 与 `node:` 前缀导入）
- Windows 10+ / macOS / Linux
- 笔记本身不依赖任何插件；公式用 KaTeX 可渲染子集，Obsidian、Typora、VS Code Markdown Preview 均可显示

## 目录

```
knowledge-notes/
├── SKILL.md                  agent 指令（触发条件、流程、格式规范）
├── config.example.json       配置示例
├── scripts/notes.mjs         维护脚本（零依赖）
└── references/
    ├── taxonomy.md           分类树 + 易混归属判定
    ├── note-format.md        模板 + 3 个范例 + 1 个反例
    └── symbols.md            常用符号表、单位写法、KaTeX 限制
```

## License

[MIT](LICENSE)
