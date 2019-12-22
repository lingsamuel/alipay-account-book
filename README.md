# Simple Alipay Account Book Statistics

简单的支付宝账单统计脚本。

原本用于避免账单包含各种转账记录，导致算出来的花费总量奇大无比；以及计算某一类花销。

# 使用说明

## 获取支付宝账单

点击这个链接：[支付宝-我的账单](https://consumeprod.alipay.com/record/standard.htm) (https://consumeprod.alipay.com/record/standard.htm)，
页面会要求你扫码，然后跳转到主页，再点一次这个链接就能进去了。正常入口有点难找，懒得讲了。

页面底部会有一个下载，下载下来后会有一个 `.csv` 格式的文件，
注意，请 **把它的开头部分不符合 CSV 格式的部分删除**。一般来讲，就是前四行。

## 配置 config.json

`config.json` 形如如下代码段：

```json
{
  "dataPath": "C:\\Users\\Whoever\\Wherever\\data.csv",
  "matchers": [
    ["余额宝收益", "交易对方", ["天弘基金管理有限公司"], "AND", "商品名称", ["收益发放"]],

    ["收入", "资金状态", ["已收入"]],
    ["花呗", "交易对方", ["花呗", "备用金"]],

    ["交通", "交易对方", ["滴滴出行", "小桔科技", "携程", "Trip com", "航空", "旅行"]],

    ["淘宝", "交易来源地", ["淘宝"]],

    ["转账", "商品名称", ["转账", "收款", "转入", "转出", "红包奖励发放", "提现"], "OR", "资金状态", ["资金转移"]]
  ]
}
```

`dataPath` 处改成你下载到的 `.csv` 文件的实际路径，这个文件夹也将作为统计后的数据保存的地方。

## 匹配器 matchers 含义

```json
["余额宝收益", "交易对方", ["天弘基金管理有限公司"], "AND", "商品名称", ["收益发放"]]
```

符合条件的条目会被放入 `余额宝收益.csv` 文件里。

条件是：
- 这个条目的 `交易对方` 字段，包含数组 `["天弘基金管理有限公司"]` 的某一个元素，
- 并且（`AND`）
- 它的 `商品名称` 字段，要包含数组 `["收益发放"]` 的某一个元素。

不区分大小写。

因此这个匹配器将正确地匹配余额宝的收益，而不会统计转入、转出。

### OR 匹配器

```json
["转账", "商品名称", ["转账", "收款", "转入", "转出", "红包奖励发放", "提现"], "OR", "资金状态", ["资金转移"]]
```

等效于

```json
["转账", "商品名称", ["转账", "收款", "转入", "转出", "红包奖励发放", "提现"]],
["转账", "资金状态", ["资金转移"]]
```

## 我的配置

```json
{
  "dataPath": "C:\\Users\\LingSamuel\\WebstormProjects\\alipay-account-book\\data\\alipay_record_20191222.csv",
  "matchers": [
    ["余额宝收益", "交易对方", ["天弘基金管理有限公司"], "AND", "商品名称", ["收益发放"]],

    ["收入", "资金状态", ["已收入"]],
    ["花呗", "交易对方", ["花呗", "备用金"]],

    ["交通", "交易对方", ["滴滴出行", "小桔科技", "携程", "Trip com", "航空", "旅行"]],

    ["食物", "交易对方", ["美团", "饿了么"]],
    ["食物", "交易对方", ["肯德基", "一鸣", "便利", "汉堡", "餐", "食", "超市", "亿嘻休闲吧", "灵峰教育后勤",
      "达克布蕾", "饭", "面", "达吾代", "十足", "生煎", "忆香忆客", "可口可乐", "luckincoffee",
      "炒粉干", "汤包", "火锅", "麻辣烫", "米线"]],
    ["食物", "商品名称", ["餐", "二维火", "肯德基"]],

    ["游戏", "交易对方", ["北京中电博亚科技有限公司", "Microsoft Payments",
      "WorldPay AP Limited", "AllPay International Limited", "Stripe Inc", "Smart2Pay",
      "Unity Technologies"]],
    ["游戏", "商品名称", ["Steam", "Switch", "Nintendo", "UPlay", "XGP", "XBox", "PLAYSTATION", "humblebundle", "tom clancy", "Epic",
      "年卡", "月卡"]],
    ["硬件", "商品名称", ["rtx", "gtx", "amd", "thinkpad", "ddr", "dell", "cpu"]],

    ["淘宝", "交易来源地", ["淘宝"]],

    ["转账", "商品名称", ["转账", "收款", "转入", "转出", "红包奖励发放", "提现"], "OR", "资金状态", ["资金转移"]],

    ["其他", "商品名称", [""]]
  ]
}
```

## 啰嗦版 matchers 规则

`matchers` 是统计规则，它是一个数组。数组是一段用方括号 `[]` 包裹起来的代码段，其中的元素之间用逗号 `,` 分割。
不允许有多出来的逗号。

例如：
```json
[1, 2, 3]
```
是一个数字组成的数组。

但是：
```json
[1, 2, 3,]
```
这不是一个符合规则的数组，因为结尾多了一个逗号。

---

`matchers` 数组中的每一个元素也都是数组，把这个数组中的数组称为匹配器 `matcher`。

一个匹配器数组的元素可以是由双引号 `""` 包裹起来的字符串，或者是另一个数组。但是，这些元素的排列要符合一定的规则。

数组的第一个元素是这个匹配器匹配的条目最终生成的统计文件名。

第二个元素是支付宝的账单的字段名，字段名就是下载到的 `.csv` 删除无用部分的第一行的值，例如，`商品名称` 和 `交易对方` 就是一个字段名。

第三个元素是一个数组。这个数组是一个任意字符串组成的数组。当某一行的指定字段对应的值包括这个数组中的某个元素时，表示匹配成功。

一旦一行与一个匹配器匹配成功，那么他就不会再匹配下面的匹配器。

第四个元素可以没有，但如果有，那么取值需要是 `"AND"` 或者 `"OR"`。这表示后面两个元素的匹配结果与前面的匹配结果的逻辑关系。

一旦第四个元素存在，那第五个元素必须是一个字段名，第六个元素必须是一个数组，其规则同上。

注意，同一个匹配器里的逻辑组是按顺序执行的，也就是说 `A AND B OR C` 这样一个逻辑语句，
在 A 和 B 都是 `False` 的时候，不会匹配 C。

---

注意，标准 `JSON` 格式只允许使用英文双引号。

# For Developer

打包 exe:

```shell
npm run build
```

## 特殊规则

花呗的还款实际上是重复的，因此它没有 `收/支` 这个字段的值。
