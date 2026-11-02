import { useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  Checkbox,
  Field,
  MoneyInput,
  SegmentedControl,
  Select,
  TextInput,
} from '@/components/ui/Form';
import { InlineNotice } from '@/components/ui/Feedback';
import { Icon } from '@/components/ui/Icon';
import { useAppData } from '@/state/AppDataProvider';
import type { IncomeFrequency, PlanMode } from '@/domain/types';
import { currencySymbol, formatMoney, parseMoneyToMinor } from '@/lib/money';
import { todayISO } from '@/lib/dates';

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
];

const FREQUENCIES: Array<{ value: IncomeFrequency; label: string }> = [
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'weekly', label: 'Every week' },
  { value: 'semimonthly', label: 'Twice a month (1st & 15th)' },
  { value: 'monthly', label: 'Once a month' },
  { value: 'one-time', label: 'One time' },
  { value: 'irregular', label: 'Irregular' },
];

export function OnboardingPage() {
  const { snapshot, actions } = useAppData();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState('');
  const [startingBalance, setStartingBalance] = useState('');
  const [cushion, setCushion] = useState('');
  const [currency, setCurrency] = useState(snapshot?.settings.currency ?? 'USD');
  const [planMode, setPlanMode] = useState<PlanMode>('paycheck');
  const [incomeName, setIncomeName] = useState('');
  const [incomeAmount, setIncomeAmount] = useState('');
  const [incomeFrequency, setIncomeFrequency] = useState<IncomeFrequency>('biweekly');
  const [incomeDate, setIncomeDate] = useState(todayISO());
  const [sample, setSample] = useState(false);
  const [error, setError] = useState('');
  const [finishing, setFinishing] = useState(false);

  const symbol = currencySymbol(currency, snapshot?.settings.locale ?? 'en-US');

  const startingMinor = startingBalance.trim() ? parseMoneyToMinor(startingBalance, currency) : 0;
  const cushionMinor = cushion.trim() ? parseMoneyToMinor(cushion, currency) : 0;
  const incomeMinor = incomeAmount.trim() ? parseMoneyToMinor(incomeAmount, currency) : null;

  function next() {
    setError('');
    if (step === 1) {
      if (startingMinor === null) {
        setError('Enter a valid starting balance, or leave it blank for zero.');
        return;
      }
      if (cushionMinor === null) {
        setError('Enter a valid cushion, or leave it blank for zero.');
        return;
      }
    }
    setStep((current) => Math.min(2, current + 1));
  }

  async function finish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (startingMinor === null || cushionMinor === null) {
      setStep(1);
      setError('Please check the starting balance and cushion.');
      return;
    }
    const wantsIncome = incomeName.trim() !== '' || incomeAmount.trim() !== '';
    if (wantsIncome) {
      if (!incomeName.trim() || incomeMinor === null) {
        setError('Add both a name and a valid expected amount, or leave both blank to skip.');
        return;
      }
    }
    setFinishing(true);
    try {
      if (wantsIncome && incomeMinor !== null) {
        await actions.createIncome({
          name: incomeName,
          amountMinor: incomeMinor,
          frequency: incomeFrequency,
          anchorDate: incomeDate,
          endDate: null,
          notes: '',
        });
      }
      await actions.completeOnboarding({
        displayName,
        currency,
        startingBalanceMinor: startingMinor,
        cushionMinor,
        planMode,
      });
      if (sample) await actions.seedSample();
    } catch {
      // Provider toast explains the failure and keeps onboarding open.
    } finally {
      setFinishing(false);
    }
  }

  return (
    <div className="onboarding">
      <div className="onboarding__glow" aria-hidden="true" />
      <header className="onboarding__brand">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" role="presentation">
            <path d="M5 18c4-6 8-6 11 0s7 6 11 0" />
            <path d="M5 12c4-6 8-6 11 0s7 6 11 0" opacity="0.55" />
          </svg>
        </span>
        <div>
          <p className="sidebar__wordmark">Tide</p>
          <p className="sidebar__tagline">calm money planning</p>
        </div>
      </header>

      <main className="onboarding__main" id="main-content">
        <div className="onboarding__progress" aria-label={`Step ${step + 1} of 3`}>
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className={['onboarding__dot', index <= step ? 'is-active' : '']
                .filter(Boolean)
                .join(' ')}
              aria-hidden="true"
            />
          ))}
        </div>

        {step === 0 ? (
          <div className="onboarding__panel">
            <p className="eyebrow">A calmer way to plan</p>
            <h1 className="onboarding__title">
              Money, without the
              <br />
              mental tab-hopping.
            </h1>
            <p className="onboarding__lede">
              Tide keeps one clear number in front of you — what is safe to spend — and quietly
              holds the bills and goals behind it. No bank login. No shame. No spreadsheet.
            </p>
            <div className="onboarding__points">
              <div>
                <Icon name="shield" size={18} />
                <span>Your data stays in this browser.</span>
              </div>
              <div>
                <Icon name="sparkle" size={18} />
                <span>Designed for low-energy days.</span>
              </div>
              <div>
                <Icon name="offline" size={18} />
                <span>Works offline after the first load.</span>
              </div>
            </div>
            <Card className="onboarding__card">
              <Field
                label="What should Tide call you?"
                htmlFor="onboarding-name"
                hint="Optional. It only changes the greeting."
              >
                <TextInput
                  id="onboarding-name"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  maxLength={80}
                  autoFocus
                />
              </Field>
            </Card>
            <div className="onboarding__actions">
              <Button size="lg" onClick={next} iconAfter="arrow-right">
                Get started
              </Button>
            </div>
          </div>
        ) : null}

        {step === 1 ? (
          <div className="onboarding__panel">
            <p className="eyebrow">Step 2 of 3</p>
            <h1 className="onboarding__title">A snapshot of today.</h1>
            <p className="onboarding__lede">
              These two numbers make the first safe-to-spend calculation honest. You can change them
              any time.
            </p>
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
            <Card className="onboarding__card">
              <div className="form-grid form-grid--2">
                <Field
                  label="Currency"
                  htmlFor="onboarding-currency"
                  hint="Changing currency later relabels amounts; it does not convert them."
                >
                  <Select
                    id="onboarding-currency"
                    value={currency}
                    onChange={(event) => setCurrency(event.target.value)}
                  >
                    {CURRENCIES.map((code) => (
                      <option key={code} value={code}>
                        {code}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  label="Money on hand today"
                  htmlFor="onboarding-starting"
                  hint="Your best estimate is enough. It is the starting point for tracked cash."
                >
                  <MoneyInput
                    id="onboarding-starting"
                    value={startingBalance}
                    onChange={(event) => setStartingBalance(event.target.value)}
                    currencySymbol={symbol}
                    placeholder="0.00"
                  />
                </Field>
              </div>
              <Field
                label="Peace-of-mind cushion"
                htmlFor="onboarding-cushion"
                hint="Money you want Tide to leave untouched. Safe to spend stops here."
              >
                <MoneyInput
                  id="onboarding-cushion"
                  value={cushion}
                  onChange={(event) => setCushion(event.target.value)}
                  currencySymbol={symbol}
                  placeholder="0.00"
                />
              </Field>
              <div className="field">
                <span className="field__label">How should Tide plan?</span>
                <SegmentedControl
                  label="Planning window"
                  value={planMode}
                  onChange={setPlanMode}
                  options={[
                    { value: 'paycheck', label: 'Until next payday' },
                    { value: 'month', label: 'This month' },
                  ]}
                />
                <p className="field__hint">
                  Until next payday is the default. It only reserves bills due before that date.
                </p>
              </div>
            </Card>
            <div className="onboarding__formula">
              <p className="eyebrow">Safe to spend</p>
              <p>
                {startingMinor !== null ? formatMoney(startingMinor, currency) : '—'} available −
                unpaid bills before the window ends −{' '}
                {cushionMinor !== null ? formatMoney(cushionMinor, currency) : '—'} cushion
              </p>
            </div>
            <div className="onboarding__actions">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button size="lg" onClick={next} iconAfter="arrow-right">
                Continue
              </Button>
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <form className="onboarding__panel" onSubmit={finish}>
            <p className="eyebrow">Step 3 of 3</p>
            <h1 className="onboarding__title">When does money arrive?</h1>
            <p className="onboarding__lede">
              Add one income source so Tide knows where your planning window ends. Skip it for now
              if you prefer; you can add paydays later.
            </p>
            {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
            <Card className="onboarding__card">
              <div className="form-grid form-grid--2">
                <Field label="Income name" htmlFor="onboarding-income-name" hint="Optional">
                  <TextInput
                    id="onboarding-income-name"
                    value={incomeName}
                    onChange={(event) => setIncomeName(event.target.value)}
                    placeholder="Main paycheck"
                    maxLength={60}
                  />
                </Field>
                <Field label="Expected amount" htmlFor="onboarding-income-amount" hint="Optional">
                  <MoneyInput
                    id="onboarding-income-amount"
                    value={incomeAmount}
                    onChange={(event) => setIncomeAmount(event.target.value)}
                    currencySymbol={symbol}
                    placeholder="0.00"
                  />
                </Field>
              </div>
              <div className="form-grid form-grid--2">
                <Field label="How often" htmlFor="onboarding-income-frequency">
                  <Select
                    id="onboarding-income-frequency"
                    value={incomeFrequency}
                    onChange={(event) => setIncomeFrequency(event.target.value as IncomeFrequency)}
                  >
                    {FREQUENCIES.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="First expected payday" htmlFor="onboarding-income-date">
                  <TextInput
                    id="onboarding-income-date"
                    type="date"
                    value={incomeDate}
                    onChange={(event) => setIncomeDate(event.target.value)}
                  />
                </Field>
              </div>
            </Card>
            <Card className="onboarding__card onboarding__card--quiet">
              <Checkbox
                label="Look around with clearly labelled sample data"
                description="Adds a small example budget with a payday, bills, spending, debt and savings. You can remove every sample record in Settings → Data without touching your own."
                checked={sample}
                onChange={(event) => setSample(event.target.checked)}
              />
            </Card>
            <p className="onboarding__micro">
              No account is created. Nothing is sent to a server. Keep backups for anything you
              cannot afford to lose.
            </p>
            <div className="onboarding__actions">
              <Button variant="ghost" type="button" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button size="lg" type="submit" loading={finishing} icon="check">
                Open Tide
              </Button>
            </div>
          </form>
        ) : null}
      </main>
      <footer className="onboarding__footer">
        <span>
          <Icon name="lock" size={13} /> Local-first by design
        </span>
        <span>v1.0</span>
      </footer>
    </div>
  );
}
