const csv = require('csv-parser');
const fs = require('fs');

let i = 0;

type AlipayRecord = {
    '交易创建时间': string, // '2019-12-19 20:24:08',
    '付款时间': string, // '2019-12-19 20:24:08',
    '最近修改时间': string, // '2019-12-19 20:24:08',
    '交易来源地': string, // '其他（包括阿里巴巴和外部商家）',
    '交易对方': string, // '滴滴出行',
    '商品名称': string, // '滴滴快车-任师傅',
    '金额（元）': string, // '14.54',
    '收/支': string, // '支出',
    '交易状态': string, // '交易成功',
    '备注': string, // '',
    '资金状态': string, // '已支出',
}

import {ExportToCsv} from 'export-to-csv';

function export_csv(obj) {
    let key = Object.keys(obj)[0];
    // console.log(key);
    let data = obj[key];
    // console.log(obj[key].length == 0);
    if (obj[key].length == 0) {
        return;
    }
    const options = {
        filename: key,
        useTextFile: false,
        useBom: true,
        useKeysAsHeaders: true,
        // headers: ['Column 1', 'Column 2', etc...] <-- Won't work with useKeysAsHeaders present!
    };

    const csvExporter = new ExportToCsv(options);
    const csvData = csvExporter.generateCsv(data, true);
    console.log(`writing data/${key}.csv`);
    fs.writeFileSync(`data/${key}.csv`, csvData);
}

function export_csv_by_filename(filename, data) {
    const options = {
        filename: filename,
        useTextFile: false,
        useBom: true,
        useKeysAsHeaders: true,
    };

    const csvExporter = new ExportToCsv(options);
    const csvData = csvExporter.generateCsv(data, true);
    // console.log(`writing data/${filename}.csv`);
    fs.writeFileSync(`data/${filename}.csv`, csvData);
}

const 余额宝 = [];
const 滴滴出行 = [];
const 饿了么和美团外卖 = [];
const 淘宝 = [];
const 其他 = [];
const 退款 = [];
const 吃的 = [];
const 游戏 = [];

const 吃的店 = ['肯德基', '一鸣', '便利', '汉堡', '餐', '食', '超市', '亿嘻休闲吧', '灵峰教育后勤',
    '达克布蕾', '饭', '面', '达吾代', '十足', '生煎', '忆香忆客', '可口可乐'];
const 吃的商品 = ['餐', '二维火'];

const 游戏店 = ['北京中电博亚科技有限公司', 'Microsoft Payments Pte. Ltd.',
    'WorldPay AP Limited', 'AllPay International Limited', 'Stripe Inc', 'Smart2Pay',
    'Unity Technologies'];
const 游戏商品 = ['steam', 'switch', 'switch', 'nintendo', 'uplay', 'xgp', 'xbox', 'playstation', 'humblebundle', 'tom clancy', 'epic',
    'rtx', 'gtx', 'amd', 'thinkpad', 'ddr', 'dell', 'cpu'];

const matchers: (string | string[])[][] = [
    ["收入", "资金状态", ["已收入"]],
    ["花呗", "交易对方", ["花呗", "备用金"]],

    ["余额宝收益", "交易对方", ['天弘基金管理有限公司'], "AND", "商品名称", ['收益发放']],

    ["交通", "交易对方", ['滴滴出行', '小桔科技', '携程', 'Trip com', '航空', '旅行']],

    ["食物", "交易对方", ['美团', '饿了么']],
    ["食物", "交易对方", ['肯德基', '一鸣', '便利', '汉堡', '餐', '食', '超市', '亿嘻休闲吧', '灵峰教育后勤',
        '达克布蕾', '饭', '面', '达吾代', '十足', '生煎', '忆香忆客', '可口可乐', 'luckincoffee',
        '炒粉干', '汤包', "火锅", '麻辣烫', '米线']],
    ["食物", "商品名称", ['餐', '二维火', '肯德基']],

    ["游戏", "交易对方", ['北京中电博亚科技有限公司', 'Microsoft Payments',
        'WorldPay AP Limited', 'AllPay International Limited', 'Stripe Inc', 'Smart2Pay',
        'Unity Technologies']],
    ["游戏", "商品名称", ['steam', 'switch', 'switch', 'nintendo', 'uplay', 'xgp', 'xbox', 'playstation', 'humblebundle', 'tom clancy', 'epic',
        'rtx', 'gtx', 'amd', 'thinkpad', 'ddr', 'dell', 'cpu', '年卡', '月卡']],

    ["淘宝", "交易来源地", ["淘宝"]],

    ["转账收款", "商品名称", ["转账", "收款", "转入", "转出", "红包奖励发放", "提现"], "OR", "资金状态", ["资金转移"]],
];

const result: {
    [filename: string]: AlipayRecord[]
} = {};
result["其他"] = [];
let originGet = 0;
let originPaid = 0;
let paidCount = 0;
let getCount = 0;
let sortedTotal = 0;
const total = [];
fs.createReadStream('data/alipay_record_20191222.csv')
    .pipe(csv())
    .on('data', (row) => {
        const resolved: AlipayRecord = {} as AlipayRecord;
        Object.keys(row).forEach(originKey => {
            resolved[originKey.trim()] = row[originKey].trim();
        });

        if (resolved["交易创建时间"] == "") {
            return;
        }

        const delta = totalAmount(resolved);
        if (delta > 0) {
            originPaid += delta;
            // console.log(`支出 ${delta} 到 ${originPaid.toFixed(2)}`);
            paidCount ++;
        } else if (delta < 0) {
            originGet -= delta;
            getCount++;
            // console.log(`收入 ${-delta} 到 ${originGet.toFixed(2)}`);
        } else {
        }

        // console.log("resolved");
        let isOther = true;
        for (const matcher of matchers) {
            const filename = matcher[0] as string;
            let matched = true;
            for (let i = 0; i < matcher.length; i += 3) {
                const func = i == 0 ? "AND" : matcher[i] as string;
                const keyname = matcher[i + 1] as string;
                const conditions = matcher[i + 2] as string[];
                // console.log(`matcher: ${func} ${keyname} ${conditions.join(",")}`);
                if (func == undefined) {
                    continue;
                }
                const content = resolved[keyname].toLowerCase();
                const matchResult = conditions.some(condition => content.includes(condition.toLowerCase()));
                if (func == "AND") {
                    matched = matched && matchResult;
                } else {
                    matched = matched || matchResult;
                }
                if (!matched) {
                    break;
                }
            }
            if (matched) {
                if (!(filename in result)) {
                    result[filename] = [];
                }
                result[filename].push(resolved);
                isOther = false;
                break;
            }
        }
        if (isOther) {
            result["其他"].push(resolved);
        }
        i++;
        // console.log("match finished");
        return;

        if (resolved['交易状态'] != "交易成功") {
            退款.push(resolved);
            return;
        }

        const item = resolved['商品名称'].toLowerCase();
        if (游戏商品.some(x => item.includes(x))) {
            游戏.push(resolved);
            return;
        } else if (吃的商品.some(x => item.includes(x))) {
            吃的.push(resolved);
            return;
        }

        const target = resolved['交易对方'].toLowerCase();
        if (target.includes('天弘基金管理有限公司')) {
            余额宝.push(resolved);
        } else if (target.includes('滴滴出行')) {
            滴滴出行.push(resolved);
        } else if (target.includes('美团')) {
            饿了么和美团外卖.push(resolved);
        } else if (target.includes('饿了么')) {
            饿了么和美团外卖.push(resolved);
        } else if (resolved['交易来源地'].includes('淘宝')) {
            淘宝.push(resolved);
        } else if (吃的店.some(x => target.includes(x))) {
            吃的.push(resolved);
        } else if (游戏店.some(x => target.includes(x))) {
            游戏.push(resolved);
        } else {
            其他.push(resolved);
        }
    })
    .on('end', () => {
        console.log(`CSV ${i} rows successfully processed`);
        Object.keys(result).forEach(filename => {
            export_csv_by_filename(filename, result[filename]);

            const total = (result[filename].reduce((acc, record) => {
                if (filename == "花呗") {
                    return acc + totalAmount(record, true);
                } else {
                    return acc + totalAmount(record);
                }
            }, 0));
            sortedTotal += total;
            console.log(`${filename} 总共支出 ${total.toFixed(2)} 元。`);
        });
        console.log(`总共收入：${originGet.toFixed(2)} 元 ${getCount} 笔，支出 ${originPaid.toFixed(2)} 元 ${paidCount} 笔。`);
        // console.log(`总共收入：${originGet.toFixed(2)} 元 ${getCount} 笔，支出 ${originPaid.toFixed(2)} 元 ${paidCount} 笔。
        // ${(originPaid - originGet).toFixed(2)} == ${sortedTotal.toFixed(2)} ? `);
        return;
        export_csv({余额宝});
        export_csv({滴滴出行});
        export_csv({饿了么和美团外卖});
        export_csv({淘宝});
        export_csv({其他});
        export_csv({退款});
        export_csv({吃的});
        export_csv({游戏});
    });

function totalAmount(record: AlipayRecord, ignoreEmptyPayType = false) {
    if (ignoreEmptyPayType == false && record["收/支"] == "") {
        return 0;
    }
    let val = parseFloat(record["金额（元）"]);
    if (isNaN(val)) {
        console.log(record);
        console.log("is nan");
        return 0;
    }
    if (record["收/支"] == "收入") {
        val = -val;
    }
    return val;
}