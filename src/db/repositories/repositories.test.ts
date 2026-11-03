import Dexie from 'dexie';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HarborDatabase } from '@/db/database';
import { createRepositories, initializeData, type Repositories } from '@/db/repositories';
import { occurrenceId } from '@/db/repositories/bills';
import { addDays, todayISO } from '@/lib/dates';

const TODAY = todayISO();
let counter = 0;
let database: HarborDatabase;
let repos: Repositories;

function uniqueName(): string {
  counter += 1;
  return `harbor-test-${Date.now()}-${counter}-${Math.random().toString(36).slice(2, 7)}`;
}

beforeEach(async () => {
  database = new HarborDatabase(uniqueName());
  repos = createRepositories(database);
  await initializeData(repos, TODAY);
});

afterEach(async () => {
  await database.delete();
});

describe('settings and initial data', () => {
  it('creates defaults exactly once and keeps onboarding incomplete', async () => {
    const settings = await repos.settings.get();
    expect(settings.onboardingComplete).toBe(false);
    expect(settings.schemaVersion).toBe(3);

    const first = await repos.categories.list();
    await repos.settings.ensure();
    await repos.categories.ensureDefaults();
    const second = await repos.categories.list();

    expect(first.length).toBeGreaterThan(0);
    expect(second).toHaveLength(first.length);
  });

  it('validates settings updates and rejects invalid values', async () => {
    const updated = await repos.settings.update({
      displayName: 'Ari',
      currency: 'EUR',
      startingBalanceMinor: 50_000,
    });

    expect(updated.displayName).toBe('Ari');
    expect(updated.currency).toBe('EUR');

    await expect(repos.settings.update({ currency: 'not-a-currency' })).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });
});

describe('accounts', () => {
  it('seeds a main account and keeps its balance in settings', async () => {
    const accounts = await repos.accounts.list();
    expect(accounts[0]).toMatchObject({ id: 'acct-main', name: 'Main account' });

    const updated = await repos.accounts.update('acct-main', {
      name: 'Everyday checking',
      kind: 'checking',
      openingBalanceMinor: 42_000,
    });

    expect(updated.openingBalanceMinor).toBe(42_000);
    expect((await repos.settings.get()).startingBalanceMinor).toBe(42_000);
    await expect(repos.accounts.archive('acct-main')).rejects.toMatchObject({ code: 'CONFLICT' });
  });

  it('creates, archives, and restores a secondary account', async () => {
    const wallet = await repos.accounts.create({
      name: 'Wallet',
      kind: 'cash',
      openingBalanceMinor: 5_000,
    });

    await repos.accounts.archive(wallet.id);
    expect((await repos.accounts.list()).find((row) => row.id === wallet.id)?.archived).toBe(true);

    await repos.accounts.restore(wallet.id);
    expect((await repos.accounts.list()).find((row) => row.id === wallet.id)?.archived).toBe(false);
    expect((await repos.settings.get()).startingBalanceMinor).toBe(0);
  });
});

describe('semimonthly bills with accounts', () => {
  it('generates the 1st and a custom second day and pays from its account', async () => {
    const wallet = await repos.accounts.create({
      name: 'Wallet',
      kind: 'cash',
      openingBalanceMinor: 0,
    });
    const bill = await repos.bills.create({
      name: 'Phone',
      amountMinor: 4_000,
      frequency: 'semimonthly',
      anchorDate: TODAY,
      endDate: null,
      secondDay: 20,
      categoryId: 'cat-bills',
      accountId: wallet.id,
      autoPay: false,
      notes: '',
    });
    expect(bill).toMatchObject({ secondDay: 20, accountId: wallet.id });

    await repos.bills.ensureOccurrences(TODAY, addDays(TODAY, 60));
    const occurrences = await repos.bills.listOccurrences(TODAY, addDays(TODAY, 60));
    expect(occurrences.length).toBeGreaterThanOrEqual(3);
    expect(
      occurrences.every((occurrence) => {
        const day = Number(occurrence.dueDate.slice(8, 10));
        return day === 1 || day === 20;
      }),
    ).toBe(true);

    const paid = await repos.bills.markPaid(occurrences[0]!.id, TODAY);
    expect(paid.transaction.accountId).toBe(wallet.id);
  });
});

describe('envelopes and notes', () => {
  it('validates envelope categories and archives without deleting history', async () => {
    const envelope = await repos.envelopes.create({
      name: 'Groceries',
      categoryId: 'cat-groceries',
      monthlyAmountMinor: 30_000,
      rollover: true,
    });
    expect(envelope).toMatchObject({ monthlyAmountMinor: 30_000, rollover: true });

    await expect(
      repos.envelopes.create({
        name: 'Duplicate groceries',
        categoryId: 'cat-groceries',
        monthlyAmountMinor: 10_000,
        rollover: false,
      }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });

    await repos.envelopes.archive(envelope.id);
    expect((await repos.envelopes.list()).find((row) => row.id === envelope.id)?.archived).toBe(
      true,
    );
    await repos.envelopes.restore(envelope.id);
    expect((await repos.envelopes.list()).find((row) => row.id === envelope.id)?.archived).toBe(
      false,
    );
  });

  it('creates, pins, archives, and removes notes', async () => {
    const dump = await repos.notes.create({
      kind: 'brain-dump',
      month: null,
      text: 'Call the power company.',
    });
    const monthNote = await repos.notes.create({
      kind: 'month',
      month: '2026-03',
      text: 'March felt steady.',
    });

    await expect(
      repos.notes.create({ kind: 'month', month: null, text: 'No month' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });
    await expect(
      repos.notes.create({ kind: 'brain-dump', month: null, text: '   ' }),
    ).rejects.toMatchObject({ code: 'VALIDATION' });

    await repos.notes.setPinned(dump.id, true);
    const list = await repos.notes.list();
    expect(list[0]).toMatchObject({ id: dump.id, pinned: true });

    await repos.notes.archive(monthNote.id);
    expect((await repos.notes.list()).find((row) => row.id === monthNote.id)?.archived).toBe(true);
    await repos.notes.restore(monthNote.id);
    expect((await repos.notes.list()).find((row) => row.id === monthNote.id)?.archived).toBe(false);

    const removed = await repos.notes.remove(dump.id);
    expect(removed.text).toBe('Call the power company.');
    expect(await database.notes.get(dump.id)).toBeUndefined();
  });
});

describe('bill payment linkage', () => {
  async function createBill() {
    const dueDate = addDays(TODAY, 3);
    const bill = await repos.bills.create({
      name: 'Rent',
      amountMinor: 145_000,
      frequency: 'monthly',
      anchorDate: dueDate,
      endDate: null,
      categoryId: 'cat-home',
      autoPay: false,
      notes: '',
    });
    return { bill, dueDate, id: occurrenceId(bill.id, dueDate) };
  }

  it('creates exactly one linked expense and blocks a duplicate payment', async () => {
    const { bill, id } = await createBill();
    const occurrence = await database.billOccurrences.get(id);
    expect(occurrence).toMatchObject({ status: 'unpaid', amountMinor: 145_000 });

    const result = await repos.bills.markPaid(id, TODAY);

    expect(result.occurrence).toMatchObject({
      status: 'paid',
      paidAt: TODAY,
      paidTransactionId: result.transaction.id,
    });
    expect(result.transaction).toMatchObject({
      type: 'expense',
      amountMinor: 145_000,
      date: TODAY,
      status: 'cleared',
      source: 'bill',
      billId: bill.id,
      billOccurrenceId: id,
      categoryId: 'cat-home',
      description: 'Rent',
    });

    const linked = await database.transactions.where('billOccurrenceId').equals(id).toArray();
    expect(linked).toHaveLength(1);

    await expect(repos.bills.markPaid(id, TODAY)).rejects.toMatchObject({ code: 'CONFLICT' });
    await expect(repos.transactions.delete(result.transaction.id)).rejects.toMatchObject({
      code: 'CONFLICT',
    });

    const history = await repos.bills.paymentHistory(bill.id);
    expect(history.map((transaction) => transaction.id)).toEqual([result.transaction.id]);
  });

  it('marking unpaid removes the payment and restores the occurrence', async () => {
    const { id } = await createBill();
    const { transaction } = await repos.bills.markPaid(id, TODAY);

    const restored = await repos.bills.markUnpaid(id);

    expect(restored).toMatchObject({
      status: 'unpaid',
      paidTransactionId: null,
      paidAt: null,
    });
    expect(await database.transactions.get(transaction.id)).toBeUndefined();
    expect(await repos.bills.markPaid(id, TODAY)).toMatchObject({
      occurrence: { status: 'paid' },
    });
  });

  it('preserves paid history while regenerating future unpaid occurrences', async () => {
    const { bill, id, dueDate } = await createBill();
    await repos.bills.markPaid(id, TODAY);

    const newAnchor = addDays(dueDate, 7);
    await repos.bills.update(
      bill.id,
      {
        name: 'Rent (updated)',
        amountMinor: 150_000,
        frequency: 'monthly',
        anchorDate: newAnchor,
        endDate: null,
        categoryId: 'cat-home',
        autoPay: false,
        notes: '',
      },
      addDays(TODAY, 1),
    );

    const paid = await database.billOccurrences.get(id);
    expect(paid).toMatchObject({ status: 'paid', amountMinor: 145_000 });

    const occurrences = await repos.bills.listOccurrences(TODAY, addDays(TODAY, 120));
    const futureUnpaid = occurrences.filter(
      (occurrence) => occurrence.billId === bill.id && occurrence.status === 'unpaid',
    );
    expect(futureUnpaid.length).toBeGreaterThan(0);
    expect(futureUnpaid.every((occurrence) => occurrence.amountMinor === 150_000)).toBe(true);
    expect(await database.transactions.count()).toBe(1);
  });

  it('archiving removes future reservations but keeps past history', async () => {
    const { bill } = await createBill();
    await repos.bills.archive(bill.id);

    const remaining = await database.billOccurrences.where('billId').equals(bill.id).toArray();
    expect(remaining.filter((occurrence) => occurrence.dueDate >= TODAY)).toHaveLength(0);
    expect(await database.bills.get(bill.id)).toMatchObject({ active: false });
  });
});

describe('sample data isolation', () => {
  it('seeds labelled sample records and removes only those records', async () => {
    const real = await repos.transactions.create({
      type: 'expense',
      amountMinor: 1234,
      date: TODAY,
      description: 'Real coffee',
      categoryId: null,
      status: 'cleared',
    });
    const realCategoryCount = await database.categories.count();

    const seeded = await repos.sample.seed();
    expect(seeded.records).toBeGreaterThan(10);
    expect((await repos.settings.get()).sampleDataLoaded).toBe(true);

    const sampleTransactions = await database.transactions
      .filter((transaction) => transaction.sample)
      .toArray();
    expect(sampleTransactions.length).toBeGreaterThan(0);
    expect(sampleTransactions.every((transaction) => transaction.id.startsWith('sample-'))).toBe(
      true,
    );

    await expect(repos.sample.seed()).rejects.toMatchObject({ code: 'CONFLICT' });

    const removed = await repos.sample.remove();
    expect(removed.removed).toBeGreaterThan(0);
    expect((await repos.settings.get()).sampleDataLoaded).toBe(false);
    expect(await database.transactions.get(real.id)).toMatchObject({ description: 'Real coffee' });
    expect(await database.transactions.count()).toBe(1);
    expect(await database.bills.count()).toBe(0);
    expect(await database.incomeSources.count()).toBe(0);
    expect(await database.debts.count()).toBe(0);
    expect(await database.savingsGoals.count()).toBe(0);
    expect(await database.savingsEntries.count()).toBe(0);
    expect(await database.envelopes.count()).toBe(0);
    expect(await database.notes.count()).toBe(0);
    expect(await database.accounts.count()).toBe(1);
    expect(await database.accounts.get('acct-main')).toMatchObject({ sample: false });
    expect(await database.categories.count()).toBe(realCategoryCount);
  });
});

describe('backup export and restore', () => {
  it('round-trips a validated backup and keeps the restore atomic', async () => {
    await repos.settings.update({ displayName: 'Ari', startingBalanceMinor: 25_000 });
    const transaction = await repos.transactions.create({
      type: 'expense',
      amountMinor: 2550,
      date: TODAY,
      description: 'Coffee',
      categoryId: 'cat-groceries',
      status: 'cleared',
    });
    const envelope = await repos.envelopes.create({
      name: 'Groceries',
      categoryId: 'cat-groceries',
      monthlyAmountMinor: 30_000,
      rollover: true,
    });
    const note = await repos.notes.create({
      kind: 'brain-dump',
      month: null,
      text: 'Keep the coffee budget.',
    });

    const backup = await repos.backup.exportFile();
    const text = JSON.stringify(backup);
    const validation = repos.backup.validateText(text);
    expect(validation.ok).toBe(true);
    if (!validation.ok) return;
    expect(validation.summary.counts.transactions).toBe(1);
    expect(validation.summary.counts.accounts).toBeGreaterThanOrEqual(1);
    expect(validation.summary.counts.envelopes).toBe(1);
    expect(validation.summary.counts.notes).toBe(1);

    // Mutate the database after the backup so restore has something to undo.
    await repos.transactions.create({
      type: 'expense',
      amountMinor: 9000,
      date: TODAY,
      description: 'Created after backup',
      categoryId: null,
      status: 'cleared',
    });
    await repos.settings.update({ displayName: 'Changed' });

    const result = await repos.backup.restore(validation.backup);

    expect(result.counts.transactions).toBe(1);
    expect(await database.transactions.get(transaction.id)).toMatchObject({
      description: 'Coffee',
    });
    expect(await database.transactions.count()).toBe(1);
    expect((await repos.settings.get()).displayName).toBe('Ari');
    expect(await database.envelopes.get(envelope.id)).toMatchObject({ name: 'Groceries' });
    expect(await database.notes.get(note.id)).toMatchObject({
      text: 'Keep the coffee budget.',
    });
  });

  it('rejects invalid and inconsistent backups without changing data', async () => {
    await repos.settings.update({ displayName: 'Ari' });
    await repos.transactions.create({
      type: 'expense',
      amountMinor: 1000,
      date: TODAY,
      description: 'Coffee',
      categoryId: null,
      status: 'cleared',
    });
    const before = await database.transactions.count();
    expect(repos.backup.validateText('{not json')).toMatchObject({ ok: false });

    const backup = await repos.backup.exportFile();
    backup.data.transactions[0]!.debtId = 'debt-that-does-not-exist';
    await expect(repos.backup.restore(backup)).rejects.toMatchObject({ code: 'RESTORE' });
    expect(await database.transactions.count()).toBe(before);
    expect((await repos.settings.get()).displayName).toBe('Ari');
  });

  it('detects dangling relationships during validation', async () => {
    const backup = await repos.backup.exportFile();
    const transaction = await repos.transactions.create({
      type: 'expense',
      amountMinor: 1000,
      date: TODAY,
      description: 'Linked to nothing',
      categoryId: null,
      debtId: null,
      status: 'cleared',
    });
    const current = await repos.backup.exportFile();
    current.data.transactions = current.data.transactions.map((row) =>
      row.id === transaction.id ? { ...row, debtId: 'debt-that-does-not-exist' } : row,
    );

    const validation = repos.backup.validateText(JSON.stringify(current));
    expect(validation.ok).toBe(false);
    if (!validation.ok) {
      expect(validation.errors.join(' ')).toContain('missing debt');
    }

    // Keep the earlier valid export usable; the malformed copy is rejected above.
    expect(repos.backup.validateText(JSON.stringify(backup)).ok).toBe(true);
  });
});

describe('schema migration', () => {
  it('adds timestamps and updates the schema version from v1', async () => {
    const name = uniqueName();
    const legacy = new Dexie(name);
    legacy.version(1).stores({
      settings: 'id',
      categories: 'id, kind',
      incomeSources: 'id, anchorDate',
      bills: 'id, anchorDate',
      billOccurrences: 'id, billId, dueDate, status, [billId+dueDate]',
      transactions:
        'id, date, type, categoryId, status, billOccurrenceId, billId, debtId, incomeSourceId',
      debts: 'id',
      savingsGoals: 'id',
      savingsEntries: 'id, goalId, date',
    });
    await legacy.open();
    await legacy.table('settings').put({
      id: 'app',
      schemaVersion: 1,
      onboardingComplete: true,
    });
    await legacy.table('categories').put({
      id: 'cat-legacy',
      name: 'Legacy',
      kind: 'expense',
    });
    legacy.close();

    const upgraded = new HarborDatabase(name);
    try {
      const settings = await upgraded.settings.get('app');
      const category = await upgraded.categories.get('cat-legacy');
      expect(settings?.schemaVersion).toBe(3);
      expect(typeof settings?.updatedAt).toBe('string');
      expect(typeof category?.createdAt).toBe('string');
      expect(typeof category?.updatedAt).toBe('string');
      expect((await upgraded.accounts.get('acct-main'))?.name).toBe('Main account');
    } finally {
      await upgraded.delete();
    }
  });
});
