import { describe, expect, it } from 'vitest';
import { billsToCsv, isValidCsvDate, sanitizeCsvCell, toCsv, transactionsToCsv } from '@/lib/csv';
import { makeBill, makeTransaction } from '@/test/fixtures';
import type { Category } from '@/domain/types';

const categories: Category[] = [
  {
    id: 'cat-food',
    name: 'Food',
    kind: 'expense',
    color: 'sage',
    icon: 'basket',
    system: true,
    archived: false,
    sample: false,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
  },
];

describe('sanitizeCsvCell', () => {
  it('neutralises spreadsheet formula prefixes', () => {
    expect(sanitizeCsvCell('=HYPERLINK("http://example.test")')).toBe(
      `"'=HYPERLINK(""http://example.test"")"`,
    );
    expect(sanitizeCsvCell('+1')).toBe("'+1");
    expect(sanitizeCsvCell('-1')).toBe("'-1");
    expect(sanitizeCsvCell('@SUM(A1)')).toBe("'@SUM(A1)");
    expect(sanitizeCsvCell('\t=1')).toBe("'\t=1");
    expect(sanitizeCsvCell('\r=1')).toBe(`"'\r=1"`);
  });

  it('quotes commas, quotes, and newlines', () => {
    expect(sanitizeCsvCell('a,b')).toBe('"a,b"');
    expect(sanitizeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(sanitizeCsvCell('line one\nline two')).toBe('"line one\nline two"');
  });

  it('keeps nullish and ordinary values readable', () => {
    expect(sanitizeCsvCell(null)).toBe('');
    expect(sanitizeCsvCell(undefined)).toBe('');
    expect(sanitizeCsvCell(42)).toBe('42');
    expect(sanitizeCsvCell('Coffee')).toBe('Coffee');
  });
});

describe('toCsv', () => {
  it('adds a UTF-8 BOM and CRLF line endings', () => {
    const csv = toCsv(['Name', 'Amount'], [['Coffee', 4.5]]);

    expect(csv).toBe('\uFEFFName,Amount\r\nCoffee,4.5\r\n');
  });
});

describe('transactionsToCsv', () => {
  it('sorts by date and resolves category and bill names', () => {
    const bill = makeBill({ id: 'bill-rent', name: 'Rent' });
    const csv = transactionsToCsv(
      [
        makeTransaction({
          id: 'tx-later',
          date: '2026-03-20',
          amountMinor: 2550,
          description: 'Coffee, with Sam',
          categoryId: 'cat-food',
        }),
        makeTransaction({
          id: 'tx-earlier',
          date: '2026-03-01',
          type: 'income',
          amountMinor: 200_000,
          description: 'Paycheck',
          categoryId: null,
          status: 'cleared',
        }),
        makeTransaction({
          id: 'tx-bill',
          date: '2026-03-10',
          amountMinor: 145_000,
          description: 'Rent',
          billId: bill.id,
          status: 'pending',
        }),
      ],
      categories,
      'USD',
      [bill],
    );

    const lines = csv
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    expect(lines[0]).toBe('Date,Type,Description,Category,Amount,Currency,Status,Bill,Link,Notes');
    expect(lines[1]).toBe('2026-03-01,income,Paycheck,,2000.00,USD,cleared,,,');
    expect(lines[2]).toBe('2026-03-10,expense,Rent,,1450.00,USD,pending,Rent,,');
    expect(lines[3]).toContain('"Coffee, with Sam",Food,25.50,USD,cleared');
  });
});

describe('billsToCsv', () => {
  it('labels archived state and leaves an empty end date blank', () => {
    const csv = billsToCsv(
      [
        makeBill({
          id: 'bill-rent',
          name: 'Rent',
          amountMinor: 145_000,
          active: false,
          categoryId: 'cat-food',
          notes: 'Due "on time"',
        }),
      ],
      categories,
      'USD',
    );

    const lines = csv
      .replace(/^\uFEFF/, '')
      .trim()
      .split('\r\n');
    expect(lines[1]).toBe(
      'Rent,1450.00,USD,monthly,2026-03-11,,Food,no,archived,"Due ""on time"""',
    );
  });
});

describe('isValidCsvDate', () => {
  it('validates date-only values', () => {
    expect(isValidCsvDate('2026-02-28')).toBe(true);
    expect(isValidCsvDate('2026-02-30')).toBe(false);
    expect(isValidCsvDate('02/28/2026')).toBe(false);
  });
});
