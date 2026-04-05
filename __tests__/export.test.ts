import { describe, it, expect } from "vitest";
import { toCsv, csvResponseHeaders } from "@/lib/export/csv";
import { toHtmlReport, htmlReportResponseHeaders } from "@/lib/export/html-report";

// ─── CSV utility ──────────────────────────────────────────────────────────────

describe("toCsv", () => {
  it("returns empty string for empty rows array", () => {
    expect(toCsv([])).toBe("");
  });

  it("generates header + body with comma-separated values", () => {
    const rows = [
      { name: "Alice", age: 30, city: "Auckland" },
      { name: "Bob", age: 25, city: "Wellington" },
    ];
    const csv = toCsv(rows);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("name,age,city");
    expect(lines[1]).toBe("Alice,30,Auckland");
    expect(lines[2]).toBe("Bob,25,Wellington");
  });

  it("uses provided column definitions as headers", () => {
    const rows = [{ revenue: 1000, orders: 5 }];
    const csv = toCsv(rows, [
      { key: "revenue", label: "Revenue (minor unit)" },
      { key: "orders", label: "Order Count" },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Revenue (minor unit),Order Count");
    expect(lines[1]).toBe("1000,5");
  });

  it("wraps values containing commas in double quotes", () => {
    const rows = [{ name: "Smith, John", value: 42 }];
    const csv = toCsv(rows);
    expect(csv).toContain('"Smith, John"');
  });

  it("escapes double-quote characters by doubling them", () => {
    const rows = [{ note: 'He said "hello"' }];
    const csv = toCsv(rows);
    expect(csv).toContain('"He said ""hello"""');
  });

  it("handles null and undefined values as empty strings", () => {
    const rows = [{ name: null as unknown as string, value: undefined as unknown as number }];
    const csv = toCsv(rows);
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe(",");
  });

  it("handles values containing newlines by quoting them", () => {
    const rows = [{ text: "line1\nline2" }];
    const csv = toCsv(rows);
    expect(csv).toContain('"line1\nline2"');
  });

  it("respects column ordering from columns parameter", () => {
    const rows = [{ a: 1, b: 2, c: 3 }];
    const csv = toCsv(rows, [
      { key: "c", label: "C" },
      { key: "a", label: "A" },
    ]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("C,A");
    expect(lines[1]).toBe("3,1");
  });

  it("handles numeric zero values correctly", () => {
    const rows = [{ count: 0, name: "zero" }];
    const csv = toCsv(rows);
    expect(csv).toContain("0,zero");
  });
});

describe("csvResponseHeaders", () => {
  it("sets Content-Type to text/csv", () => {
    const headers = csvResponseHeaders("report.csv") as Record<string, string>;
    expect(headers["Content-Type"]).toMatch(/text\/csv/);
  });

  it("sets Content-Disposition with filename", () => {
    const headers = csvResponseHeaders("my-export.csv") as Record<string, string>;
    expect(headers["Content-Disposition"]).toBe('attachment; filename="my-export.csv"');
  });

  it("sets Cache-Control to no-store", () => {
    const headers = csvResponseHeaders("test.csv") as Record<string, string>;
    expect(headers["Cache-Control"]).toBe("no-store");
  });
});

// ─── HTML report utility ──────────────────────────────────────────────────────

describe("toHtmlReport", () => {
  it("includes the title in the document", () => {
    const html = toHtmlReport({
      title: "Owner Report",
      sections: [],
    });
    expect(html).toContain("Owner Report");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("includes subtitle when provided", () => {
    const html = toHtmlReport({
      title: "T",
      subtitle: "2026-01-01 — 2026-01-31",
      sections: [],
    });
    expect(html).toContain("2026-01-01 — 2026-01-31");
  });

  it("renders table headers for each column", () => {
    const html = toHtmlReport({
      title: "T",
      sections: [
        {
          title: "Revenue",
          columns: [
            { key: "date", label: "Date" },
            { key: "amount", label: "Amount" },
          ],
          rows: [],
        },
      ],
    });
    expect(html).toContain("<th");
    expect(html).toContain("Date");
    expect(html).toContain("Amount");
  });

  it("renders table rows with correct cell values", () => {
    const html = toHtmlReport({
      title: "T",
      sections: [
        {
          title: "Revenue",
          columns: [
            { key: "date", label: "Date" },
            { key: "amount", label: "Amount" },
          ],
          rows: [{ date: "2026-01-01", amount: 5000 }],
        },
      ],
    });
    expect(html).toContain("2026-01-01");
    expect(html).toContain("5000");
  });

  it("escapes HTML special characters in cell values", () => {
    const html = toHtmlReport({
      title: "T",
      sections: [
        {
          title: "S",
          columns: [{ key: "name", label: "Name" }],
          rows: [{ name: "<script>alert('xss')</script>" }],
        },
      ],
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("renders null cell values as em-dash", () => {
    const html = toHtmlReport({
      title: "T",
      sections: [
        {
          title: "S",
          columns: [{ key: "val", label: "V" }],
          rows: [{ val: null }],
        },
      ],
    });
    expect(html).toContain("—");
  });

  it("renders multiple sections", () => {
    const html = toHtmlReport({
      title: "T",
      sections: [
        {
          title: "Section One",
          columns: [{ key: "x", label: "X" }],
          rows: [{ x: "a" }],
        },
        {
          title: "Section Two",
          columns: [{ key: "y", label: "Y" }],
          rows: [{ y: "b" }],
        },
      ],
    });
    expect(html).toContain("Section One");
    expect(html).toContain("Section Two");
  });
});

describe("htmlReportResponseHeaders", () => {
  it("sets Content-Type to text/html", () => {
    const headers = htmlReportResponseHeaders("report.html") as Record<string, string>;
    expect(headers["Content-Type"]).toMatch(/text\/html/);
  });

  it("sets Content-Disposition with filename", () => {
    const headers = htmlReportResponseHeaders("my-report.html") as Record<string, string>;
    expect(headers["Content-Disposition"]).toBe('attachment; filename="my-report.html"');
  });

  it("sets Cache-Control to no-store", () => {
    const headers = htmlReportResponseHeaders("test.html") as Record<string, string>;
    expect(headers["Cache-Control"]).toBe("no-store");
  });
});
