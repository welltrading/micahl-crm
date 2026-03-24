"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.airtableBase = void 0;
require("server-only"); // Next.js package — throws if imported in a client component
const airtable_1 = __importDefault(require("airtable"));
if (!process.env.AIRTABLE_API_TOKEN) {
    throw new Error('AIRTABLE_API_TOKEN is not set — Airtable client must be used server-side only');
}
if (!process.env.AIRTABLE_BASE_ID) {
    throw new Error('AIRTABLE_BASE_ID is not set');
}
exports.airtableBase = new airtable_1.default({
    apiKey: process.env.AIRTABLE_API_TOKEN,
}).base(process.env.AIRTABLE_BASE_ID);
