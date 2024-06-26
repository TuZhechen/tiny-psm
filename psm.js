"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const csv_parser_1 = __importDefault(require("csv-parser"));
const yargs = __importStar(require("yargs"));
// Set up the command line arguments
const argv = yargs
    .option('csvfile', {
    alias: 'c',
    description: 'The CSV file path',
    type: 'string',
    demandOption: true
})
    .help()
    .alias('help', 'h')
    .argv;
// Prepare for price data entries
let priceData = {
    expensive: [],
    cheap: [],
    too_expensive: [],
    too_cheap: [],
};
// Read the csv file
fs.createReadStream(argv.csvfile)
    .pipe((0, csv_parser_1.default)())
    .on('data', (row) => {
    priceData.expensive.push(parseFloat(row['高い']));
    priceData.cheap.push(parseFloat(row['安い']));
    priceData.too_expensive.push(parseFloat(row['高すぎる']));
    priceData.too_cheap.push(parseFloat(row['安すぎる']));
})
    .on('end', () => {
    // Derive the cumulative frequency line
    priceData.expensive.sort((a, b) => a - b);
    priceData.cheap.sort((a, b) => a - b);
    priceData.too_expensive.sort((a, b) => a - b);
    priceData.too_cheap.sort((a, b) => a - b);
    const n = priceData.expensive.length;
    const upperBound = priceData.too_expensive[n - 1];
    // const cumulativeExpensive = cumFreq(priceData.expensive, n, upperBound);
    const cumulativeExpensive = cdf(priceData.expensive, n, upperBound);
    // const cumulativeCheap = revCumFreq(priceData.cheap, n, upperBound);
    const cumulativeCheap = cdf(priceData.cheap, n, upperBound, true);
    // const cumulativeTooExpensive = cumFreq(priceData.too_expensive, n, upperBound);
    const cumulativeTooExpensive = cdf(priceData.too_expensive, n, upperBound);
    // const cumulativeTooCheap = revCumFreq(priceData.too_cheap, n, upperBound);
    const cumulativeTooCheap = cdf(priceData.too_cheap, n, upperBound, true);
    // Calculate the PSM intersections
    const maxPrice = findIntersection(cumulativeTooExpensive, cumulativeCheap);
    const compromisedPrice = findIntersection(cumulativeExpensive, cumulativeCheap);
    const idealPrice = findIntersection(cumulativeTooExpensive, cumulativeTooCheap);
    const minPrice = findIntersection(cumulativeExpensive, cumulativeTooCheap);
    // Output the results
    // console.log(`test: ${cumulativeExpensive[5].price}, ${cumulativeExpensive[5].cdf}` )
    console.log(`最高価格: ${maxPrice.toFixed(0)}円`);
    console.log(`妥協価格: ${compromisedPrice.toFixed(0)}円`);
    console.log(`理想価格: ${idealPrice.toFixed(0)}円`);
    console.log(`最低品質保証価格: ${minPrice.toFixed(0)}円`);
});
// Define the cumulative frequency function
function cumFreq(data, n, upperBound) {
    const interval = 50;
    let count = 0;
    const cumulative = [];
    for (let price = 0; price <= upperBound; price += interval) {
        while (count < n && data[count] <= price) {
            count++;
        }
        cumulative.push({ price, cdf: count / n });
    }
    return cumulative;
}
// Define the reversed cumulative frequency function
function revCumFreq(data, n, upperBound) {
    const interval = 50;
    let count = 0;
    const cumulative = [];
    for (let price = 0; price <= upperBound; price += interval) {
        while (count < n && data[count] < price) {
            count++;
        }
        cumulative.push({ price, cdf: (n - count) / n });
    }
    return cumulative;
}
// Combine the two cumulative frequency functions
function cdf(data, n, upperBound, isReverse = false) {
    const interval = 50;
    let count = 0;
    const cumulative = [];
    const cmp = isReverse
        ? (a, b) => a < b
        : (a, b) => a <= b;
    const calcCdf = isReverse
        ? (count) => (n - count) / n
        : (count) => count / n;
    for (let price = 0; price <= upperBound; price += interval) {
        while (count < n && cmp(data[count], price)) {
            count++;
        }
        cumulative.push({ price, cdf: calcCdf(count) });
    }
    return cumulative;
}
// Define the intersection function
function findIntersection(curve1, curve2) {
    let i = 0;
    while (i < curve1.length && curve1[i].cdf < curve2[i].cdf) {
        i++;
    }
    const x1 = curve1[i - 1].price;
    const y1 = curve1[i - 1].cdf;
    const x2 = curve1[i].price;
    const y2 = curve1[i].cdf;
    const k1 = (y2 - y1) / (x2 - x1);
    const b1 = y1 - k1 * x1;
    const x3 = curve2[i - 1].price;
    const y3 = curve2[i - 1].cdf;
    const x4 = curve2[i].price;
    const y4 = curve2[i].cdf;
    const k2 = (y4 - y3) / (x4 - x3);
    const b2 = y3 - k2 * x3;
    return (b2 - b1) / (k1 - k2);
}
