"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bree_1 = __importDefault(require("bree"));
const path_1 = __importDefault(require("path"));
const scheduler_services_1 = require("../lib/airtable/scheduler-services");
async function main() {
    // Recovery: reset messages stuck in 'בשליחה' from a previous crashed process
    await (0, scheduler_services_1.resetStuckSendingMessages)();
    console.log('Boot recovery: stuck sending messages reset');
    const bree = new bree_1.default({
        root: path_1.default.join(__dirname, 'jobs'),
        jobs: [
            { name: 'send-messages', interval: '1m' },
        ],
    });
    await bree.start();
    console.log('Bree scheduler started — send-messages job active (every 1 minute)');
}
main().catch(console.error);
