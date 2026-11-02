import { ButtonLink } from '@/components/ui/Button';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Disclosure, InlineNotice } from '@/components/ui/Feedback';
import { PageHeader } from '@/components/ui/PageHeader';
import { APP_VERSION } from '@/lib/app';

export function HelpPage() {
  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="How Tide works"
        title="The short, honest guide"
        description="No finance jargon and no hidden rules. Here is exactly what Tide does with your numbers, and what it deliberately leaves alone."
        actions={
          <>
            <ButtonLink to="/settings" icon="download">
              Back up my data
            </ButtonLink>
            <ButtonLink to="/" variant="secondary">
              Back to Today
            </ButtonLink>
          </>
        }
      />

      <Card tone="sage">
        <CardHeader
          eyebrow="Start here"
          title="One number, with the working shown"
          description="Tide is designed so you can ignore most of this page until you need it."
        />
        <CardBody>
          <div className="help-quick-grid">
            <ButtonLink to="/income" variant="secondary" icon="calendar">
              Set up paydays
            </ButtonLink>
            <ButtonLink to="/bills" variant="secondary" icon="receipt">
              Add bills
            </ButtonLink>
            <ButtonLink to="/spending" variant="secondary" icon="wallet">
              Record spending
            </ButtonLink>
            <ButtonLink to="/settings" variant="secondary" icon="database">
              Export a backup
            </ButtonLink>
          </div>
          <p className="help-lede">
            Safe to spend is the amount Tide believes you can use before your planning window ends
            while still covering the bills it knows about and leaving your cushion untouched.
          </p>
          <pre className="formula-block">
            <code>{`cash on hand = starting balance
             + received income
             − cleared spending
             − savings contributions
             + savings withdrawals

safe to spend = cash on hand
             − unpaid bills through the window end
             − cushion`}</code>
          </pre>
          <p className="muted-copy">
            Expected paydays are not part of this number. A future payday is a plan, not cash. Tide
            shows it separately so it can never make today look safer than it is.
          </p>
        </CardBody>
      </Card>

      <div className="help-grid">
        <Card>
          <CardHeader title="What counts as money in and out" />
          <CardBody>
            <div className="table-wrap">
              <table className="data-table">
                <caption className="sr-only">How Tide treats each kind of record</caption>
                <thead>
                  <tr>
                    <th scope="col">Record</th>
                    <th scope="col">Counts in cash?</th>
                    <th scope="col">Counts as spending?</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <th scope="row">Received income (cleared)</th>
                    <td>Yes, adds</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <th scope="row">Expected payday</th>
                    <td>No</td>
                    <td>No</td>
                  </tr>
                  <tr>
                    <th scope="row">Expense (cleared)</th>
                    <td>Yes, subtracts</td>
                    <td>Yes</td>
                  </tr>
                  <tr>
                    <th scope="row">Expense (pending)</th>
                    <td>No</td>
                    <td>Shown separately</td>
                  </tr>
                  <tr>
                    <th scope="row">Unpaid bill occurrence</th>
                    <td>No, reserved</td>
                    <td>No, until paid</td>
                  </tr>
                  <tr>
                    <th scope="row">Bill payment</th>
                    <td>Yes, subtracts</td>
                    <td>Yes, once</td>
                  </tr>
                  <tr>
                    <th scope="row">Debt payment</th>
                    <td>Yes, subtracts</td>
                    <td>Yes, once</td>
                  </tr>
                  <tr>
                    <th scope="row">Savings contribution</th>
                    <td>Yes, subtracts</td>
                    <td>No, it is a transfer</td>
                  </tr>
                  <tr>
                    <th scope="row">Savings withdrawal</th>
                    <td>Yes, adds back</td>
                    <td>No</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="The planning window" />
          <CardBody>
            <dl className="help-definitions">
              <div>
                <dt>Until next payday</dt>
                <dd>
                  The default. Starts today and ends the day before your next active projected
                  payday. Unpaid bills due through that day are reserved.
                </dd>
              </div>
              <div>
                <dt>This month</dt>
                <dd>
                  Starts today and ends on the last day of the calendar month. It usually reserves
                  more bills, so safe to spend can look smaller. That is the point.
                </dd>
              </div>
              <div>
                <dt>No active income schedule</dt>
                <dd>
                  The window falls back to the end of the current month. Add an income source when
                  you can; it makes the number more useful.
                </dd>
              </div>
            </dl>
            <p className="muted-copy">
              Tide uses your device's local date for “today”. Stored dates are date-only values, so
              a bill due on the 1st does not drift across time zones.
            </p>
          </CardBody>
        </Card>
      </div>

      <Disclosure summary="Paydays: expected vs received" defaultOpen>
        <div className="help-prose">
          <p>
            An income source is a schedule. Tide projects future paydays from it, but projections
            never count as cash. When money actually arrives, choose <strong>Received</strong> next
            to the projected payday or use <strong>Quick add → Income</strong>. That creates one
            cleared income transaction, which is what safe to spend uses.
          </p>
          <p>
            Weekly, every-two-weeks, twice-monthly (fixed to the 1st and 15th), monthly, one-time,
            and irregular schedules are supported. Irregular income has no projection; record it
            manually when it lands. Pausing a source stops future projections but keeps history.
          </p>
        </div>
      </Disclosure>

      <Disclosure summary="Bills: why marking paid creates a transaction">
        <div className="help-prose">
          <p>
            An unpaid bill due inside the window is <em>reserved</em>, not spent. When you mark it
            paid, Tide creates exactly one expense transaction for that occurrence and links the two
            records. The reservation disappears and the expense appears in spending and reports, so
            the same money is never counted twice.
          </p>
          <p>
            Mark unpaid removes that linked transaction after confirmation. That is why deleting a
            bill payment from the spending list is blocked: change it at the bill instead so both
            records stay honest.
          </p>
          <p>
            Editing a recurring bill keeps paid and skipped history unchanged, and rebuilds future
            unpaid due dates from today. Archiving a bill stops future unpaid due dates from
            reserving money, while keeping history.
          </p>
        </div>
      </Disclosure>

      <Disclosure summary="Debt: balances and the payoff estimate">
        <div className="help-prose">
          <p>
            Enter the balance as it is today. Current balance = that balance minus cleared payments
            you recorded through Tide. A payment is also an expense transaction, so cash on hand and
            your reports stay consistent. Overpayments show as a credit balance; Tide does not hide
            them or force zero.
          </p>
          <p>
            Interest is not posted automatically. If a statement adds interest, edit the debt
            balance to match. The optional payoff estimate assumes a constant monthly payment and
            monthly compounding. It is a rough guide, not a promise or financial advice.
          </p>
        </div>
      </Disclosure>

      <Disclosure summary="Savings: transfers, not spending">
        <div className="help-prose">
          <p>
            A savings goal holds money you have set aside. Adding money is a positive entry and
            reduces spendable cash. Withdrawing is a negative entry and brings cash back. Neither is
            counted as spending in reports.
          </p>
          <p>
            Goals do not reserve money automatically. The cushion in Settings is the separate amount
            Tide keeps out of safe to spend. Progress is capped visually at 100%, but the underlying
            amount can go past the target.
          </p>
        </div>
      </Disclosure>

      <Disclosure summary="Backups, restore, and CSV">
        <div className="help-prose">
          <p>
            Your data lives in this browser's IndexedDB. It does not sync to another device. Export
            a JSON backup from Settings whenever you would be upset to lose the data. A backup is
            the only copy that survives clearing site data or switching browsers.
          </p>
          <p>
            Restore validates the file and its relationships first. Tide then downloads a safety
            copy of your current data and asks for one final confirmation. The replace runs in a
            single database transaction; if it fails, your existing records are left unchanged.
          </p>
          <p>
            CSV exports are for spreadsheets. They are plain text, may contain sensitive
            descriptions, and are protected against spreadsheet formula injection but not encrypted.
            Keep them private.
          </p>
        </div>
      </Disclosure>

      <Disclosure summary="Offline use and installing Tide">
        <div className="help-prose">
          <p>
            After the first successful load, the app shell is cached for offline use. Core features
            continue to work without a connection because everything is local. When a new version is
            ready, Tide asks before reloading so an open form is not discarded.
          </p>
          <p>
            On a phone or desktop browser, use the browser's <strong>Install</strong> or{' '}
            <strong>Add to Home Screen</strong> action to keep Tide close. Tide does not use remote
            fonts, analytics, or a runtime CDN.
          </p>
        </div>
      </Disclosure>

      <Disclosure summary="Privacy, storage, and honest limits">
        <div className="help-prose">
          <p>
            Tide sends no data to a server. There is no account, no cloud sync, and no telemetry.
            Data is stored locally but is <strong>not encrypted by Tide</strong>. Anyone with access
            to your unlocked browser profile may be able to read it.
          </p>
          <p>
            Browsers may clear site data under storage pressure. You can ask the browser for
            persistent storage in Settings, but that is a request, not a guarantee. Keep backups.
          </p>
        </div>
      </Disclosure>

      <Disclosure summary="Accessibility choices">
        <div className="help-prose">
          <ul className="plain-list">
            <li>Native dialogs with labelled titles, Escape to close, and focus handling.</li>
            <li>Visible keyboard focus and a skip link to the main content.</li>
            <li>Status is shown with an icon and text, never colour alone.</li>
            <li>Forms label every field and connect errors with descriptive text.</li>
            <li>Charts include a text table alternative.</li>
            <li>Reduced-motion preferences remove non-essential animation.</li>
            <li>Layout works down to a 320 px viewport, with large touch targets.</li>
          </ul>
        </div>
      </Disclosure>

      <Card>
        <CardHeader title="If something looks wrong" />
        <CardBody>
          <dl className="help-definitions">
            <div>
              <dt>Safe to spend is negative</dt>
              <dd>
                That is not an error. It means the bills and cushion you have reserved are larger
                than available cash. Review upcoming due dates or the cushion. Tide will not shame
                you or turn the screen red.
              </dd>
            </div>
            <div>
              <dt>A payment will not delete</dt>
              <dd>
                It is linked to a bill. Open Bills and mark that occurrence unpaid first. The linked
                expense will be removed after confirmation.
              </dd>
            </div>
            <div>
              <dt>Some data disappeared</dt>
              <dd>
                Check whether you cleared site data or used a different browser profile. Restore the
                most recent JSON backup in Settings. Tide cannot recover data that the browser
                removed.
              </dd>
            </div>
            <div>
              <dt>A backup was refused</dt>
              <dd>
                The preview lists why. Common reasons are a missing linked record, duplicate IDs, or
                a file that was edited by hand. Nothing is changed until a valid file is confirmed.
              </dd>
            </div>
            <div>
              <dt>Tide will not open</dt>
              <dd>
                Close other Tide tabs and reload. If the database reports a version problem, do not
                clear site data before exporting a backup from another tab. If no tab works, contact
                support with the exact message, without sharing financial details.
              </dd>
            </div>
          </dl>
        </CardBody>
      </Card>

      <InlineNotice tone="info" title="What Tide does not do">
        No bank connections, automatic imports, cloud sync, subscriptions, investment or credit
        advice, automatic interest posting, or automatic backups. It is a local planning surface,
        not a bank or a financial adviser.
      </InlineNotice>

      <Card tone="stone">
        <CardBody>
          <p className="help-version">
            Tide v{APP_VERSION}. Designed to be calm on low-energy days. If a screen ever feels like
            too much, close it and do one small thing instead.
          </p>
        </CardBody>
      </Card>
    </div>
  );
}
