import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { ConfirmDialog, Dialog } from '@/components/ui/Dialog';
import { Badge, Disclosure, InlineNotice } from '@/components/ui/Feedback';
import {
  Field,
  FormActions,
  MoneyInput,
  SegmentedControl,
  Select,
  TextInput,
} from '@/components/ui/Form';
import { PageHeader } from '@/components/ui/PageHeader';
import { CategoryDot } from '@/components/finance/rows';
import { CategoryFormDialog } from '@/components/finance/CategoryFormDialog';
import { useAppData } from '@/state/AppDataProvider';
import { useToast } from '@/components/ui/ToastProvider';
import type { Category, DateFormat, PlanMode, Theme } from '@/domain/types';
import {
  currencyFractionDigits,
  currencySymbol,
  minorToInput,
  parseMoneyToMinor,
} from '@/lib/money';
import { formatBytes, downloadFile, makeFilename } from '@/lib/storage';
import { billsToCsv, transactionsToCsv } from '@/lib/csv';
import { describeError } from '@/db/errors';
import { MAX_BACKUP_BYTES, type BackupSummary } from '@/domain/backup';
import type { BackupFile } from '@/domain/schemas';
import { APP_VERSION, BACKUP_MIME } from '@/lib/app';

const CURRENCIES = [
  'USD',
  'EUR',
  'GBP',
  'CAD',
  'AUD',
  'NZD',
  'JPY',
  'INR',
  'ZAR',
  'BRL',
  'MXN',
  'SEK',
  'NOK',
  'DKK',
  'CHF',
  'SGD',
  'HKD',
  'PLN',
  'CZK',
  'TRY',
];

const LOCALES = [
  { value: 'en-US', label: 'English (United States)' },
  { value: 'en-GB', label: 'English (United Kingdom)' },
  { value: 'en-CA', label: 'English (Canada)' },
  { value: 'en-AU', label: 'English (Australia)' },
  { value: 'en-IN', label: 'English (India)' },
  { value: 'de-DE', label: 'Deutsch (Deutschland)' },
  { value: 'fr-FR', label: 'Français (France)' },
  { value: 'es-ES', label: 'Español (España)' },
  { value: 'it-IT', label: 'Italiano (Italia)' },
  { value: 'nl-NL', label: 'Nederlands (Nederland)' },
  { value: 'pt-BR', label: 'Português (Brasil)' },
  { value: 'ja-JP', label: '日本語 (日本)' },
  { value: 'zh-CN', label: '中文 (中国)' },
];

const DATE_FORMAT_OPTIONS: Array<{ value: DateFormat; label: string }> = [
  { value: 'short', label: 'Numeric · 3/14/2026' },
  { value: 'medium', label: 'Medium · Mar 14, 2026' },
  { value: 'long', label: 'Long · Saturday, March 14, 2026' },
];

const THEME_OPTIONS: Array<{ value: Theme; label: string }> = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const PLAN_OPTIONS: Array<{ value: PlanMode; label: string }> = [
  { value: 'paycheck', label: 'Until next payday' },
  { value: 'month', label: 'This month' },
];

function formatTimestamp(value: string, locale: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(date);
  } catch {
    return value;
  }
}

function countLabel(summary: BackupSummary): Array<{ label: string; value: number }> {
  return [
    { label: 'Income sources', value: summary.counts.incomeSources ?? 0 },
    { label: 'Bills', value: summary.counts.bills ?? 0 },
    { label: 'Bill due dates', value: summary.counts.billOccurrences ?? 0 },
    { label: 'Transactions', value: summary.counts.transactions ?? 0 },
    { label: 'Debts', value: summary.counts.debts ?? 0 },
    { label: 'Savings goals', value: summary.counts.savingsGoals ?? 0 },
    { label: 'Savings entries', value: summary.counts.savingsEntries ?? 0 },
    { label: 'Categories', value: summary.counts.categories ?? 0 },
  ];
}

export function SettingsPage() {
  const { snapshot, actions, busy, refresh } = useAppData();
  const toast = useToast();
  const fileInput = useRef<HTMLInputElement>(null);
  const settings = snapshot?.settings;

  const [displayName, setDisplayName] = useState(settings?.displayName ?? '');
  const [currency, setCurrency] = useState(settings?.currency ?? 'USD');
  const [locale, setLocale] = useState(settings?.locale ?? 'en-US');
  const [dateFormat, setDateFormat] = useState<DateFormat>(settings?.dateFormat ?? 'medium');
  const [theme, setTheme] = useState<Theme>(settings?.theme ?? 'system');
  const [planMode, setPlanMode] = useState<PlanMode>(settings?.planMode ?? 'paycheck');
  const [startingBalance, setStartingBalance] = useState(
    settings ? minorToInput(settings.startingBalanceMinor, settings.currency) : '0',
  );
  const [cushion, setCushion] = useState(
    settings ? minorToInput(settings.cushionMinor, settings.currency) : '0',
  );
  const [settingsErrors, setSettingsErrors] = useState<Record<string, string>>({});
  const [savingSettings, setSavingSettings] = useState(false);

  const [categoryFormOpen, setCategoryFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [archiveCategoryTarget, setArchiveCategoryTarget] = useState<Category | null>(null);

  const [importIssues, setImportIssues] = useState<string[]>([]);
  const [previewSummary, setPreviewSummary] = useState<BackupSummary | null>(null);
  const [pendingBackup, setPendingBackup] = useState<BackupFile | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [confirmRestoreOpen, setConfirmRestoreOpen] = useState(false);
  const [preparingSafety, setPreparingSafety] = useState(false);
  const [removeSampleOpen, setRemoveSampleOpen] = useState(false);

  const categories = snapshot?.categories ?? [];
  const activeCategories = categories.filter((category) => !category.archived);
  const archivedCategories = categories.filter((category) => category.archived);
  const currencySymbolValue = currencySymbol(currency, locale);
  const currencyOptions = CURRENCIES.includes(currency) ? CURRENCIES : [currency, ...CURRENCIES];
  const localeOptions = LOCALES.some((option) => option.value === locale)
    ? LOCALES
    : [{ value: locale, label: locale }, ...LOCALES];

  const sampleCounts = useMemo(() => {
    const transactions = snapshot?.transactions.filter((row) => row.sample).length ?? 0;
    const bills = snapshot?.bills.filter((row) => row.sample).length ?? 0;
    const goals = snapshot?.savingsGoals.filter((row) => row.sample).length ?? 0;
    const debts = snapshot?.debts.filter((row) => row.sample).length ?? 0;
    const income = snapshot?.incomeSources.filter((row) => row.sample).length ?? 0;
    return {
      transactions,
      bills,
      goals,
      debts,
      income,
      total: transactions + bills + goals + debts + income,
    };
  }, [snapshot]);

  function changeCurrency(nextCurrency: string) {
    const startMinor = parseMoneyToMinor(startingBalance, currency);
    const cushionMinor = parseMoneyToMinor(cushion, currency);
    setCurrency(nextCurrency);
    if (startMinor !== null) setStartingBalance(minorToInput(startMinor, nextCurrency));
    if (cushionMinor !== null) setCushion(minorToInput(cushionMinor, nextCurrency));
  }

  async function saveSettings() {
    const nextErrors: Record<string, string> = {};
    const startingMinor = parseMoneyToMinor(startingBalance, currency);
    if (startingMinor === null) {
      nextErrors.startingBalance = `Enter a valid amount with up to ${currencyFractionDigits(
        currency,
      )} decimal places.`;
    }
    const cushionMinor = parseMoneyToMinor(cushion, currency);
    if (cushionMinor === null) {
      nextErrors.cushion = `Enter a valid amount with up to ${currencyFractionDigits(
        currency,
      )} decimal places.`;
    }
    setSettingsErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0 || startingMinor === null || cushionMinor === null) {
      return;
    }

    setSavingSettings(true);
    try {
      await actions.updateSettings({
        displayName: displayName.trim(),
        currency,
        locale,
        dateFormat,
        theme,
        planMode,
        startingBalanceMinor: startingMinor,
        cushionMinor,
      });
    } catch {
      // The provider surfaces a user-safe error.
    } finally {
      setSavingSettings(false);
    }
  }

  function openNewCategory() {
    setEditingCategory(null);
    setCategoryFormOpen(true);
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category);
    setCategoryFormOpen(true);
  }

  async function exportBackup() {
    try {
      const backup = await actions.exportBackup();
      downloadFile(makeFilename('backup', 'json'), JSON.stringify(backup, null, 2), BACKUP_MIME);
      toast({
        tone: 'success',
        title: 'Backup downloaded',
        message: 'Keep this file somewhere you will find it again.',
      });
    } catch (caught) {
      const described = describeError(caught);
      toast({
        tone: 'error',
        title: described.title,
        message: described.message,
        details: described.details,
      });
    }
  }

  async function readBackupFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImportIssues([]);
    if (file.size > MAX_BACKUP_BYTES) {
      setImportIssues([
        'This backup is larger than 15 MB. Tide does not import files of that size.',
      ]);
      return;
    }
    try {
      const text = await file.text();
      const result = actions.validateBackup(text);
      if (!result.ok) {
        setImportIssues(result.errors);
        return;
      }
      setPendingBackup(result.backup);
      setPreviewSummary(result.summary);
      setPreviewOpen(true);
    } catch {
      setImportIssues(['Tide could not read that file. Choose a JSON backup created by Tide.']);
    }
  }

  async function prepareRestore() {
    setPreparingSafety(true);
    try {
      const current = await actions.exportBackup();
      downloadFile(
        makeFilename('safety-copy', 'json'),
        JSON.stringify(current, null, 2),
        BACKUP_MIME,
      );
      setPreviewOpen(false);
      setConfirmRestoreOpen(true);
      toast({
        tone: 'info',
        title: 'Safety copy downloaded',
        message: 'Keep it somewhere safe before replacing your current data.',
      });
    } catch (caught) {
      const described = describeError(caught);
      toast({
        tone: 'error',
        title: described.title,
        message: described.message,
        details: described.details,
      });
    } finally {
      setPreparingSafety(false);
    }
  }

  async function restoreBackup() {
    if (!pendingBackup) return;
    try {
      await actions.restoreBackup(pendingBackup);
      setConfirmRestoreOpen(false);
      setPendingBackup(null);
      setPreviewSummary(null);
    } catch {
      // The provider explains what happened; nothing was replaced.
    }
  }

  function exportTransactions() {
    if (!snapshot) return;
    const csv = transactionsToCsv(
      snapshot.transactions,
      snapshot.categories,
      settings?.currency ?? currency,
      snapshot.bills,
    );
    downloadFile(makeFilename('transactions', 'csv'), csv, 'text/csv');
    toast({
      tone: 'info',
      title: 'Transactions exported',
      message: 'A CSV is plain text. Keep it private and delete it when you are done.',
    });
  }

  function exportBills() {
    if (!snapshot) return;
    const csv = billsToCsv(snapshot.bills, snapshot.categories, settings?.currency ?? currency);
    downloadFile(makeFilename('bills', 'csv'), csv, 'text/csv');
    toast({
      tone: 'info',
      title: 'Bills exported',
      message: 'A CSV is plain text. Keep it private and delete it when you are done.',
    });
  }

  const storage = snapshot?.storage;
  const storedLabel =
    storage?.persisted === true
      ? 'Persistent storage granted'
      : storage?.persisted === false
        ? 'Not yet protected from browser cleanup'
        : 'Storage protection unknown';

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="Settings"
        title="Make Tide yours"
        description="Preferences, categories, and the tools that keep your data in your hands."
        actions={
          <Button
            icon="download"
            variant="secondary"
            onClick={() => void exportBackup()}
            disabled={!snapshot}
          >
            Download backup
          </Button>
        }
      />

      <Card>
        <CardHeader
          title="Your preferences"
          description="These change labels and planning behaviour. Stored amounts are never converted."
        />
        <CardBody>
          <div className="form-grid form-grid--2">
            <Field
              label="What should Tide call you?"
              htmlFor="settings-name"
              hint="Optional. Only used in the greeting."
            >
              <TextInput
                id="settings-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                maxLength={80}
                placeholder="Your name"
              />
            </Field>
            <Field
              label="Currency"
              htmlFor="settings-currency"
              hint="Changing this relabels amounts. It does not convert their value."
            >
              <Select
                id="settings-currency"
                value={currency}
                onChange={(event) => changeCurrency(event.target.value)}
              >
                {currencyOptions.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="form-grid form-grid--2">
            <Field
              label="Language and number format"
              htmlFor="settings-locale"
              hint="Dates and money use this locale."
            >
              <Select
                id="settings-locale"
                value={locale}
                onChange={(event) => setLocale(event.target.value)}
              >
                {localeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Date format" htmlFor="settings-date-format">
              <Select
                id="settings-date-format"
                value={dateFormat}
                onChange={(event) => setDateFormat(event.target.value as DateFormat)}
              >
                {DATE_FORMAT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <div className="form-grid form-grid--2">
            <div className="field">
              <span className="field__label">Appearance</span>
              <SegmentedControl
                label="Appearance"
                value={theme}
                onChange={setTheme}
                options={THEME_OPTIONS}
              />
              <p className="field__hint">
                System follows your device. The change applies after you save.
              </p>
            </div>
            <div className="field">
              <span className="field__label">Planning window</span>
              <SegmentedControl
                label="Planning window"
                value={planMode}
                onChange={setPlanMode}
                options={PLAN_OPTIONS}
              />
              <p className="field__hint">
                Until next payday reserves bills through the day before your next projected payday.
              </p>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Today's starting point"
          description="The two numbers behind safe to spend."
        />
        <CardBody>
          <div className="form-grid form-grid--2">
            <Field
              label="Money on hand at the start"
              htmlFor="settings-starting"
              error={settingsErrors.startingBalance}
              hint="Your best estimate is enough. Cash on hand adds received income and subtracts spending from here."
            >
              <MoneyInput
                id="settings-starting"
                value={startingBalance}
                onChange={(event) => setStartingBalance(event.target.value)}
                currencySymbol={currencySymbolValue}
                invalid={Boolean(settingsErrors.startingBalance)}
              />
            </Field>
            <Field
              label="Peace-of-mind cushion"
              htmlFor="settings-cushion"
              error={settingsErrors.cushion}
              hint="Money Tide should leave untouched. Safe to spend stops here."
            >
              <MoneyInput
                id="settings-cushion"
                value={cushion}
                onChange={(event) => setCushion(event.target.value)}
                currencySymbol={currencySymbolValue}
                invalid={Boolean(settingsErrors.cushion)}
              />
            </Field>
          </div>
          <FormActions>
            <Button onClick={() => void saveSettings()} loading={savingSettings || busy}>
              Save preferences
            </Button>
          </FormActions>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Categories"
          description="Quiet labels for transactions. Built-in categories can be renamed but not archived."
          action={
            <Button variant="secondary" size="sm" icon="plus" onClick={openNewCategory}>
              Add category
            </Button>
          }
        />
        <CardBody>
          {activeCategories.length === 0 ? (
            <p className="muted-copy">No active categories. Add one to use it in a transaction.</p>
          ) : (
            <ul className="category-list">
              {activeCategories.map((category) => (
                <li className="category-row" key={category.id}>
                  <CategoryDot category={category} />
                  <div className="category-row__main">
                    <div className="category-row__name">
                      <strong>{category.name}</strong>
                      <Badge tone={category.kind === 'income' ? 'positive' : 'neutral'}>
                        {category.kind === 'income' ? 'Income' : 'Expense'}
                      </Badge>
                      {category.system ? <Badge tone="info">Built-in</Badge> : null}
                      {category.sample ? <Badge tone="info">Sample</Badge> : null}
                    </div>
                    <span className="category-row__meta">
                      Used by existing records without being renamed when archived.
                    </span>
                  </div>
                  <div className="inline-actions">
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon="edit"
                      aria-label={`Edit ${category.name}`}
                      onClick={() => openEditCategory(category)}
                    />
                    {!category.system ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        iconOnly
                        icon="trash"
                        aria-label={`Archive ${category.name}`}
                        onClick={() => setArchiveCategoryTarget(category)}
                      />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}

          {archivedCategories.length > 0 ? (
            <Disclosure summary={`Archived categories (${archivedCategories.length})`}>
              <ul className="category-list">
                {archivedCategories.map((category) => (
                  <li className="category-row" key={category.id}>
                    <CategoryDot category={category} />
                    <div className="category-row__main">
                      <div className="category-row__name">
                        <strong>{category.name}</strong>
                        <Badge tone="neutral">Archived</Badge>
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => void actions.restoreCategory(category.id)}
                      disabled={busy}
                    >
                      Restore
                    </Button>
                  </li>
                ))}
              </ul>
            </Disclosure>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Backup and restore"
          description="A backup is the only copy that survives clearing this browser."
        />
        <CardBody>
          <div className="settings-actions">
            <Button variant="secondary" icon="download" onClick={() => void exportBackup()}>
              Export JSON backup
            </Button>
            <Button variant="secondary" icon="upload" onClick={() => fileInput.current?.click()}>
              Choose a backup to restore
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept="application/json,.json"
              className="visually-hidden-input"
              aria-label="Choose a Tide backup file"
              onChange={(event) => void readBackupFile(event)}
            />
          </div>
          <InlineNotice tone="warning" title="Restoring replaces your current data">
            Tide validates the file, downloads a safety copy of what is here now, and asks for one
            final confirmation. If anything fails, your existing records stay unchanged.
          </InlineNotice>
          {importIssues.length > 0 ? (
            <InlineNotice tone="danger" title="This backup was not opened">
              <ul className="notice-list">
                {importIssues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </InlineNotice>
          ) : null}
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Spreadsheet exports"
          description="For your own records or a tax folder. CSV files are not encrypted."
        />
        <CardBody>
          <div className="settings-actions">
            <Button variant="secondary" icon="download" onClick={exportTransactions}>
              Export transactions CSV
            </Button>
            <Button variant="secondary" icon="download" onClick={exportBills}>
              Export bills CSV
            </Button>
          </div>
          <InlineNotice tone="warning" title="Keep CSV files private">
            A CSV is plain text and may contain descriptions, amounts, and notes. Tide protects
            cells from spreadsheet formula injection, but it cannot encrypt the file for you.
          </InlineNotice>
        </CardBody>
      </Card>

      <Card>
        <CardHeader
          title="Sample data"
          description="Clearly labelled examples that never mix into your own records."
        />
        <CardBody>
          <p className="settings-summary">
            {settings?.sampleDataLoaded
              ? 'Sample data is currently loaded.'
              : sampleCounts.total > 0
                ? 'Some sample records are present.'
                : 'Sample data is not loaded.'}{' '}
            {sampleCounts.total > 0
              ? `${sampleCounts.total} sample records: ${sampleCounts.income} income, ${sampleCounts.bills} bills, ${sampleCounts.transactions} transactions, ${sampleCounts.debts} debts, ${sampleCounts.goals} goals.`
              : ''}
          </p>
          <div className="settings-actions">
            {!settings?.sampleDataLoaded ? (
              <Button
                variant="secondary"
                icon="sparkle"
                onClick={() => void actions.seedSample()}
                disabled={busy}
              >
                Load labelled sample data
              </Button>
            ) : null}
            {sampleCounts.total > 0 || settings?.sampleDataLoaded ? (
              <Button
                variant="danger"
                icon="trash"
                onClick={() => setRemoveSampleOpen(true)}
                disabled={busy}
              >
                Remove sample data
              </Button>
            ) : null}
          </div>
          <p className="muted-copy">
            Removing sample data deletes only records marked as samples. Your own transactions,
            bills, goals, and settings are left alone.
          </p>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Storage on this device" description="What the browser reports." />
        <CardBody>
          <div className="storage-grid">
            <div>
              <span>Protection</span>
              <strong>{storedLabel}</strong>
            </div>
            <div>
              <span>Used</span>
              <strong>{formatBytes(storage?.usageBytes ?? null)}</strong>
            </div>
            <div>
              <span>Available quota</span>
              <strong>{formatBytes(storage?.quotaBytes ?? null)}</strong>
            </div>
          </div>
          <div className="settings-actions">
            {storage?.supported && storage.persisted !== true ? (
              <Button
                variant="secondary"
                icon="shield"
                onClick={() => void actions.requestPersistence()}
              >
                Ask the browser to protect storage
              </Button>
            ) : null}
            <Button variant="ghost" icon="refresh" onClick={() => void refresh()}>
              Refresh storage details
            </Button>
          </div>
          <p className="muted-copy">
            Protection is a request, not a guarantee. A browser may still remove site data under
            pressure, so keep a recent JSON backup. Tide never claims its local data is encrypted.
          </p>
        </CardBody>
      </Card>

      <Card tone="stone">
        <CardHeader title="About" />
        <CardBody>
          <div className="about-grid">
            <div>
              <span>Tide</span>
              <strong>Version {APP_VERSION}</strong>
            </div>
            <div>
              <span>Storage</span>
              <strong>This browser only</strong>
            </div>
            <div>
              <span>Network</span>
              <strong>No account, no sync, no analytics</strong>
            </div>
          </div>
          <p className="muted-copy">
            Tide is a planning tool, not a bank or a financial adviser. It does not connect to
            accounts, move money, or guarantee an outcome.
          </p>
        </CardBody>
      </Card>

      <CategoryFormDialog
        open={categoryFormOpen}
        onClose={() => {
          setCategoryFormOpen(false);
          setEditingCategory(null);
        }}
        category={editingCategory}
      />

      <ConfirmDialog
        open={archiveCategoryTarget !== null}
        onClose={() => setArchiveCategoryTarget(null)}
        onConfirm={() => {
          if (archiveCategoryTarget) {
            void actions
              .archiveCategory(archiveCategoryTarget.id)
              .then(() => setArchiveCategoryTarget(null))
              .catch(() => undefined);
          }
        }}
        title={
          archiveCategoryTarget
            ? `Archive ${archiveCategoryTarget.name}?`
            : 'Archive this category?'
        }
        description="It disappears from pickers for new records. Existing transactions keep their category, and you can restore it later."
        confirmLabel="Archive category"
        busy={busy}
      />

      <ConfirmDialog
        open={removeSampleOpen}
        onClose={() => setRemoveSampleOpen(false)}
        onConfirm={() => {
          void actions
            .removeSample()
            .then(() => setRemoveSampleOpen(false))
            .catch(() => undefined);
        }}
        title="Remove all sample data?"
        description="Only records marked as sample are deleted. Your own records stay exactly as they are. This cannot be undone, but you can load sample data again later."
        confirmLabel="Remove sample data"
        busy={busy}
      />

      <Dialog
        open={previewOpen}
        onClose={() => {
          setPreviewOpen(false);
          setPendingBackup(null);
          setPreviewSummary(null);
        }}
        title="This backup looks valid"
        description="Nothing has changed yet. Review what is inside, then choose whether to continue."
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setPreviewOpen(false);
                setPendingBackup(null);
                setPreviewSummary(null);
              }}
              disabled={preparingSafety}
            >
              Cancel
            </Button>
            <Button icon="download" onClick={() => void prepareRestore()} loading={preparingSafety}>
              Download safety copy &amp; continue
            </Button>
          </>
        }
      >
        {previewSummary ? (
          <div className="import-preview">
            <div className="import-preview__meta">
              <div>
                <span>Exported</span>
                <strong>{formatTimestamp(previewSummary.exportedAt, locale)}</strong>
              </div>
              <div>
                <span>App version</span>
                <strong>{previewSummary.appVersion}</strong>
              </div>
              <div>
                <span>Total records</span>
                <strong>{previewSummary.totalRecords}</strong>
              </div>
            </div>
            <div className="table-wrap">
              <table className="data-table">
                <caption className="sr-only">Records inside this backup</caption>
                <thead>
                  <tr>
                    <th scope="col">Record type</th>
                    <th scope="col">Count</th>
                  </tr>
                </thead>
                <tbody>
                  {countLabel(previewSummary).map((row) => (
                    <tr key={row.label}>
                      <th scope="row">{row.label}</th>
                      <td>{row.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <InlineNotice tone="warning">
              Continuing downloads a safety copy of your current data, then asks for one final
              confirmation. Restoring will replace every record in Tide.
            </InlineNotice>
          </div>
        ) : null}
      </Dialog>

      <ConfirmDialog
        open={confirmRestoreOpen}
        onClose={() => setConfirmRestoreOpen(false)}
        onConfirm={() => void restoreBackup()}
        title="Replace all current data?"
        description="The safety copy has downloaded. This final step replaces every record with the backup. If the restore fails, your current data is left unchanged."
        confirmLabel="Replace my data"
        busy={busy}
      />
    </div>
  );
}
