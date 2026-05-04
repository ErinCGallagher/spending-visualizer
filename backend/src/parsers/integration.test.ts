import { describe, it, expect } from "vitest";
import Papa from "papaparse";
import fs from "fs";
import path from "path";
import { TDParser } from "./td";
import { ScotiabankParser } from "./scotiabank";
import { AmexParser } from "./amex";
import { WealthsimpleParser } from "./wealthsimple";
import { TravelSpendParser } from "./travelspend";

const UPLOAD_ID = "test-upload";
const USER_ID = "test-user";
const BASE_TEST_DIR = path.join(__dirname, "../../test-csvs");

function parseCsvFile(parser: any, subPath: string) {
  const filePath = path.join(BASE_TEST_DIR, subPath);
  const content = fs.readFileSync(filePath, "utf8");
  
  const csvText = parser.syntheticHeader
    ? parser.syntheticHeader.join(",") + "\n" + content
    : content;

  return Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  }).data;
}

describe("Parser Integration Tests (File-based)", () => {
  
  describe("TD Parser", () => {
    const parser = new TDParser();

    it("parses valid CSV correctly", () => {
      const data = parseCsvFile(parser, "td/valid.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(3);
      expect(result.skippedPayments).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("reports errors for malformed CSV", () => {
      const data = parseCsvFile(parser, "td/errors.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
    });

    it("handles empty or missing fields without crashing", () => {
      const csv = `,,,,,`; // Completely empty columns
      const data = Papa.parse<Record<string, string>>(parser.syntheticHeader!.join(",") + "\n" + csv, {
        header: true,
        skipEmptyLines: true,
      }).data;
      
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.transactions).toHaveLength(0);
    });
  });

  describe("Scotiabank Parser", () => {
    const parser = new ScotiabankParser();

    it("parses valid CSV correctly", () => {
      const data = parseCsvFile(parser, "scotiabank/valid.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(3);
      expect(result.skippedPayments).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("reports errors for malformed CSV", () => {
      const data = parseCsvFile(parser, "scotiabank/errors.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("Amex Parser", () => {
    const parser = new AmexParser();

    it("parses valid CSV correctly", () => {
      const data = parseCsvFile(parser, "amex/valid.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(2);
      expect(result.skippedPayments).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("reports errors for malformed CSV", () => {
      const data = parseCsvFile(parser, "amex/errors.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("Wealthsimple Parser", () => {
    const parser = new WealthsimpleParser();

    it("parses valid CSV correctly", () => {
      const data = parseCsvFile(parser, "wealthsimple/valid.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(2);
      expect(result.skippedPayments).toBe(1);
      expect(result.errors).toHaveLength(0);
    });

    it("reports errors for malformed CSV", () => {
      const data = parseCsvFile(parser, "wealthsimple/errors.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
    });
  });

  describe("TravelSpend Parser", () => {
    const parser = new TravelSpendParser();

    it("parses valid CSV correctly", () => {
      const data = parseCsvFile(parser, "travelspend/valid.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("reports errors for malformed CSV", () => {
      const data = parseCsvFile(parser, "travelspend/errors.csv");
      const result = parser.parse(data, UPLOAD_ID, USER_ID);
      expect(result.transactions).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
    });
  });
});
