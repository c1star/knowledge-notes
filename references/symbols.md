# 公式与符号规范

## 三条硬规则

1. **先定义后使用**：凡出现公式，必须有 `**符号**` 行逐条说明。
2. **一符一义**：同一篇笔记里，一个字母只表示一个量；多义符号（$E$、$p$、$T$、$c$）必须写明在本条里指什么。
3. **只用通行符号**：教材、国家标准、学科通用写法；不自创记号，不用生僻箭头和装饰符号。

## 通用符号表

| 符号 | 常见含义 | 备注 |
| --- | --- | --- |
| $x,y,z$ | 坐标、实数变量、未知量 | 复数用 $z$ 时要说明 |
| $t$ | 时间 | 单位 s |
| $n$ | 个数、整数、规模 | |
| $i,j,k$ | 序号；$i$ 也作虚数单位 | 作虚数单位时说明 |
| $m$ | 质量 | kg |
| $v$ | 速度 | m/s；向量 $\boldsymbol{v}$ |
| $a$ | 加速度 | m/s² |
| $F$ | 力 | N |
| $E$ | 能量、电场强度、弹性模量 | **多义，必须说明** |
| $p$ | 动量、压强 | **多义，必须说明** |
| $T$ | 温度、周期、扭矩 | **多义，必须说明** |
| $\rho$ | 密度、电阻率 | 多义 |
| $c$ | 光速、比热容、浓度 | 多义 |
| $k$ | 常数、刚度、波数 | 多义 |
| $\omega$ | 角频率 | rad/s |
| $\alpha,\beta,\gamma,\theta,\varphi$ | 角、系数 | 角度单位写清 |
| $\Delta$ | 增量、变化量 | $\Delta x$ 是增量不是微分 |
| $\partial$ | 偏导 | $\partial f/\partial x$ |
| $\nabla$ | 梯度、散度、旋度算子 | |
| $\sum,\prod,\int,\oint$ | 求和、连乘、积分、环路积分 | |
| $\mathbb{R},\mathbb{N},\mathbb{Z},\mathbb{C}$ | 实数、自然数、整数、复数集 | |
| $\approx,\propto,\sim$ | 约等于、正比、同阶 | |
| $\Rightarrow,\Leftrightarrow$ | 推出、等价 | 不用 $\rightsquigarrow$ |
| $O(\cdot)$ | 渐进上界 | 复杂度用 |

## 分学科常用写法

**物理**：$\boldsymbol{F}=m\boldsymbol{a}$；电场 $\boldsymbol{E}$、磁感应强度 $\boldsymbol{B}$、电势 $\varphi$；动量 $\boldsymbol{p}$；角动量 $\boldsymbol{L}$；普朗克常数 $h$、约化普朗克常数 $\hbar$；波函数 $\psi$。

**化学**：化学式用正体，$\mathrm{H_2O}$、$\mathrm{CO_2}$；反应式 $\mathrm{2H_2+O_2\rightarrow 2H_2O}$（不用 `\ce`，KaTeX 默认不加载 mhchem）；物质的量 $n$（mol）、浓度 $c$（mol/L）、阿伏伽德罗常数 $N_A$；$\mathrm{pH}$ 用正体。

**工程 / 计算机**：复杂度 $O(n\log n)$；应力 $\sigma$（Pa）、应变 $\varepsilon$、弹性模量 $E$、泊松比 $\nu$；扭矩 $M_t$（或 $T$，须说明）、功率 $P$（W）、效率 $\eta$；齿轮模数 $m$（mm）、公差 $T$（µm）；控制里 $K_p,K_i,K_d$、传递函数 $G(s)$、拉普拉斯变量 $s$、频率 $f$（Hz）、采样率 $f_s$。

**生物**：基因名用*斜体*（如 *TP53*），蛋白名用正体（TP53）；半衰期 $t_{1/2}$；浓度单位写 $\mathrm{mmol/L}$。

## 数值与单位

- 数值与单位之间用窄空格：`$9.8\,\mathrm{m/s^2}$`、`$25\ \mathrm{^\circ C}$`
- 单位一律正体 `\mathrm{}`，不要斜体
- 科学计数法：`$1.2\times10^{3}$`
- 百分号在公式里写 `\%`：`$5\%$`
- 区间用文字「0–4 ℃」，别写成减号

## KaTeX 兼容性

- 可用：`\frac` `\dfrac` `\sqrt` `\sum` `\prod` `\int` `\oint` `\lim` `\log` `\ln` `\exp` `\sin` `\cos` `\tan` `\begin{aligned}` `\begin{cases}` `\begin{pmatrix}` `\text` `\mathrm` `\mathbf` `\boldsymbol` `\hat` `\bar` `\vec` `\dot` `\partial` `\nabla` `\infty` `\pi` `\cdot` `\times` `\le` `\ge` `\ne` `\approx` `\propto` `\rightarrow` `\Rightarrow` `\leftrightarrow` `\left(` `\right)` `\bigl` `\bigr`
- 避免：`\ce`（mhchem）、`\bm`、`\label` `\ref`、`\newcommand`、`\begin{align}`（用 `aligned`）
- 多行公式写在 `$$` 里，用 `\begin{aligned} … \end{aligned}` 对齐
- 公式里的中文用 `\text{…}`，非必要不放中文

## 反例清单

| 错误写法 | 问题 | 改法 |
| --- | --- | --- |
| `U=IR` | 没进 LaTeX | `$U=IR$` |
| `$E=mc2$` | 缺上标 | `$E=mc^2$` |
| `$x=a*b$` | 星号不是乘号 | `$x=a\cdot b$` |
| `$F_总$` | 中文当变量 | `$F_{\text{总}}$` 或直接写「合力」 |
| 同一个 $E$ 先当能量又当电场 | 一符多义 | 电场改用 $\boldsymbol{E}$ 并说明 |
| 「电压 220」 | 无单位 | 「$220\ \mathrm{V}$」 |
| 「一般是 5 左右」 | 无取值范围 | 「典型值 $5\pm0.5$，范围 $4\text{–}6$」 |
| 用 $\rightsquigarrow$ 表示推出 | 生僻记号 | 写「所以」或 $\Rightarrow$ |
| 公式里出现未说明的 $\lambda$ | 符号无定义 | 补进 `**符号**` 行 |
