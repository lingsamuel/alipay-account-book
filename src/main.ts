import * as path from "path";
import {ExportToCsv} from 'export-to-csv';
import * as fs from "fs";
import * as CsvParser from "csv-parser";

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

function export_csv(dir, filename, data) {
    const options = {
        filename: filename,
        useTextFile: false,
        useBom: true,
        useKeysAsHeaders: true,
    };

    const csvExporter = new ExportToCsv(options);
    const csvData = csvExporter.generateCsv(data, true);
    fs.writeFileSync(`${dir}/${filename}.csv`, csvData);
}

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

async function main() {
    const config = JSON.parse(fs.readFileSync(path.join(process.cwd(), './config.json'), {
        encoding: "utf-8"
    }));

    const matchers = config.matchers;
    const dir = path.dirname(config["dataPath"]);

    const export_csv_by_filename = (f, d) => export_csv(dir, f, d);

    const result: {
        [filename: string]: AlipayRecord[]
    } = {};
    result["其他"] = [];
    let originGet = 0;
    let originPaid = 0;
    let paidCount = 0;
    let getCount = 0;
    let sortedTotal = 0;

    let i = 0;

    await new Promise(function (resolve, reject) {
        fs.createReadStream(`${config.dataPath}`)
            .pipe(CsvParser())
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
                    paidCount++;
                } else if (delta < 0) {
                    originGet -= delta;
                    getCount++;
                } else {
                }

                let isOther = true;
                for (const matcher of matchers) {
                    const filename = matcher[0] as string;
                    let matched = true;
                    for (let i = 0; i < matcher.length; i += 3) {
                        const func = i == 0 ? "AND" : matcher[i] as string;
                        const keyname = matcher[i + 1] as string;
                        const conditions = matcher[i + 2] as string[];
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
                // if (isOther) {
                //     result["其他"].push(resolved);
                // }
                i++;
                return;
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
                resolve();
                return;
            }).on('error', reject);
    });

    require('readline')
        .createInterface(process.stdin, process.stdout)
        .question("按任意键继续...", function () {
            process.exit();
        });
}

main();
