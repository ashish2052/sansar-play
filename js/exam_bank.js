// Year exams. One bank per subject, at least 40 questions. The right option is k:'best'.
import { HAND } from './mcq_hand_data.js?v=exam1';

function pack(prefix, text) {
  return text.trim().split('\n').filter(Boolean).map((line, i) => {
    const [q, right, a, b, c] = line.split('|');
    return {
      id: prefix + '-' + String(i + 1).padStart(2, '0'),
      q,
      opts: [{ t: right, k: 'best' }, { t: a, k: 'weak' }, { t: b, k: 'weak' }, { t: c, k: 'weak' }]
    };
  });
}

const FINANCE = pack('fin', `
A sale is booked today and the cash arrives next month. Which figure changes today?|Profit, if the goods were delivered.|The cash in the bank.|The tax already paid last year.|The owner's drawings.
What is a debit balance on a customer account?|They still owe you.|You owe them.|The cash drawer is short.|The year is closed.
Stock is counted and the count is lower than the books. What do you post?|A reduction in stock and a cost.|A higher sales figure.|Nothing until next year.|A cash receipt.
Which cost belongs in the month the work was done, not when the bill is paid?|An accrual.|A drawing.|A share issue.|A fixed-asset purchase for cash.
Gross margin is which of these?|Sales minus the direct cost of the goods sold.|Cash minus the loan.|Tax minus the fee.|Headcount minus leavers.
A provision is recognised when which set is true?|A present obligation, a probable outflow, and a reliable estimate.|A worry about next decade.|A round number the manager prefers.|A profit that looks too high.
Petty cash is short. What is the first check?|The vouchers against the coins that are left.|A new float with no note.|The sales target.|Last year's audit fee.
Which document starts a sales invoice?|A delivery or a contract that says the work is done.|A rumour from the shop floor.|A competitor's price list.|The director's birthday.
Straight-line depreciation does what?|Spreads the cost of an asset over its useful life.|Writes the asset up when the market is hot.|Moves cash into the asset account.|Ignores the residual value on purpose.
A bank reconciliation explains what?|The gap between the cash book and the bank statement.|The gap between two staff salaries.|Why the tax rate changed.|Who owns the company.
Revenue is recognised when?|The goods or the service have been delivered, and the amount is known.|The customer says they might buy.|The brochure is printed.|The cash is hoped for.
A prepayment is?|A cost paid now that belongs to a later period.|A loan from the bank.|A dividend.|Stock you have sold.
Which ratio uses current assets and current liabilities?|The current ratio.|Earnings per share.|The dividend yield.|Staff turnover.
Bad debts are written off when?|You no longer expect the customer to pay.|The customer asks for a catalogue.|The invoice is one day old.|The cash book is busy.
What does a trial balance prove?|The debits equal the credits in the ledger.|Every figure is true.|The tax return is filed.|The stock count is finished.
FIFO means?|The oldest stock is treated as sold first.|The newest stock is hidden.|Cash is paid first to the owner.|Loans are ignored.
A credit note does what?|Reduces an invoice already sent.|Opens a new bank account.|Hires a member of staff.|Closes the year.
Which item is equity, not a liability?|Share capital.|A trade payable.|A bank overdraft.|Tax due next month.
Net profit is?|Gross profit minus the overheads, interest and tax you deduct.|Cash in the till.|Sales plus the loan.|The owner's car.
An aged debtor report is used to?|See which customers are late, and by how long.|Price a new product.|Set the holiday rota.|Count the stock.
What is the double-entry for cash wages?|Debit wages, credit cash.|Debit cash, credit sales.|Debit stock, credit equity.|Debit tax, credit stock.
Goodwill on a takeover is?|The extra paid above the fair value of the net assets.|The cash in the safe.|A tax refund.|This year's sales.
Which statement shows cash from operations, investing and financing?|The cash flow statement.|The organisational chart.|The staff handbook.|The marketing plan.
A contingent liability is disclosed when?|An outflow is possible, but not yet probable enough to provide.|The cash has already left.|The invoice is paid.|The asset is brand new.
Matching means?|Costs sit in the same period as the revenue they helped earn.|Every account has the same number.|Staff are paid the same.|Tax is optional.
Which balance is a liability?|Unearned revenue, cash received before the work.|Prepaid rent.|Stock.|A customer deposit you have already earned.
Materiality means?|You care about a mistake large enough to change a reader's decision.|Every cent is always adjusted.|Small firms skip the books.|Only cash counts.
An impairment is?|An asset's recoverable amount has fallen below its book value.|A rise in the share price.|A new customer.|A holiday accrual.
What is the point of a purchase order?|It authorises the buy before the supplier invoices.|It replaces the bank statement.|It pays the staff.|It closes the ledger.
Segment profit is useful because?|It shows which part of the business earns the money.|It hides a weak shop.|It replaces the tax return.|It counts the emails.
A rights issue does what?|Existing shareholders may buy new shares.|The bank takes the building.|Customers get a discount.|Stock is written off.
Which tax is collected on a sale and handed to the state?|Sales tax or VAT.|Income tax on a rival.|A parking fine.|A dividend from last year.
The going-concern note matters when?|There is a real doubt the firm can pay its bills for the next year.|Sales grew a little.|A new logo was chosen.|The office was painted.
Inventory at the lower of cost and net realisable value means?|You do not carry stock above what it will sell for.|You always use the selling price.|You ignore damage.|You add a hope premium.
An audit trail lets a stranger do what?|Walk from the figure in the accounts back to the source document.|Change the profit quietly.|Delete the invoices.|Skip the count.
Related-party sales should be?|Named, with the amount, when the price is not arm's length.|Hidden if the owner knows.|Merged into 'other'.|Booked as cash even if unpaid.
What is retained earnings?|Profits kept in the business, not paid out as dividends.|This week's petty cash.|The wage bill.|A customer's deposit.
A variance is adverse when?|The actual cost is higher than the standard, or the profit is lower.|The logo printed well.|The meeting ended early.|The bank was open.
Contribution is?|Selling price minus the variable cost of that unit.|The full company profit.|The tax paid.|The rent for the year.
Capital expenditure is?|Spend that creates an asset used over several years.|The weekly tea bill.|A customer refund.|This month's wages.
`);

const BUSINESS = pack('bus', `
A shop's rent rose and sales did not. What do you check first?|Which cost rose, and whether price or volume can cover it.|Close the shop the same day.|Change the logo.|Ignore the numbers and talk about the brand.
A recommendation in a case needs?|One action, the number that supports it, and the risk of doing nothing.|Three ideas and no choice.|A history of the founder.|The sentence 'it depends' and nothing else.
Two figures in a case do not add up. What do you do?|Show the gap and use the figures that do reconcile.|Pick the larger one.|Average them.|Drop the question.
Market share is?|Your sales divided by the sales of the whole market.|Your costs divided by staff.|The tax rate.|The number of meetings.
A fixed cost does what as volume rises?|Stays the same in total, so the cost per unit falls.|Rises in step with every unit.|Disappears.|Becomes a tax.
Break-even units are?|Fixed costs divided by the contribution per unit.|Sales divided by rent.|Staff divided by rooms.|Tax divided by price.
A SWOT weakness is?|An internal limit, such as a skill you do not have.|A new law outside the firm.|A rival's price cut.|A boom in the economy.
Which is a variable cost?|The cloth used in each shirt you sell.|The annual rent.|The insurance for the year.|The salary of the managing director.
A customer lifetime value is?|The profit you expect from that customer over the years they stay.|The cost of one advert.|Today's till total.|The founder's salary.
Price skimming means?|Start high with the buyers who will pay, then lower the price later.|Start at zero.|Copy the cheapest rival on day one.|Give the product away.
A channel conflict is?|Two routes to the customer undercut each other.|The TV is loud.|Staff disagree about lunch.|The books do not balance.
Working capital is?|Current assets minus current liabilities.|The building.|Share capital only.|Last year's tax.
A Gantt chart shows?|Tasks against time, and which ones depend on others.|The share price.|Staff birthdays.|The tax bands.
Delegation means?|You give the decision and the means, and you still own the outcome.|You dump the work and walk away.|You do every task yourself.|You hide the deadline.
A KPI is useful when?|It is a number you can move, tied to the goal.|It is a slogan.|It changes every hour with no definition.|It only flatters the team.
Economies of scale mean?|The cost per unit falls as you produce more.|The price must rise with volume.|Tax disappears.|Quality must fall.
A stakeholder with high power and high interest should be?|Managed closely.|Ignored.|Sent only the annual postcard.|Told nothing until the end.
The marketing mix is often?|Product, price, place and promotion.|Cash, tax, rent and wages.|Hire, fire, hope and luck.|North, south, east and west.
A loss leader is?|A cheap item meant to bring the customer in for the rest.|The firm's worst manager.|A closed shop.|A tax penalty.
Capacity is tight. Which order do you take first?|The one with the best contribution per the scarce hour.|The loudest customer.|The smallest order.|Any order, at a loss.
A mission statement is doing its job when?|A stranger can tell what the firm is for, and what it will not do.|It uses the word 'synergy' three times.|It is two pages of values.|It names every product ever sold.
Change fails most often because?|People were not told what changes for them, or trained to do it.|The slide deck was short.|The office has plants.|The logo stayed the same.
A joint venture is?|Two firms share a project, and each keeps its own company.|A merger into one firm.|A bank loan.|A staff bonus.
Net promoter logic asks?|Whether customers would recommend you, and why.|How many cars the director owns.|The age of the building.|The colour of the website.
A bottleneck is?|The step that limits how much the whole process can finish.|The fastest machine.|The cheapest supplier.|The newest hire.
Diversification helps when?|The new line does not die from the same shock as the old one.|You buy a rival at any price.|You add products you cannot deliver.|You hide the core business.
A budget variance should lead to?|A reason, and a decision to correct or to change the budget.|A blame email only.|Silence.|A new logo.
Opportunity cost is?|The next best use of the money or the hour you gave up.|The invoice total.|The tax already paid.|The rent.
A flat organisation means?|Fewer layers between the front line and the top.|No managers and no decisions.|Everyone is a director in title only.|The building has one floor and that is the strategy.
Ethical pricing refuses to?|Hide a fee the customer must pay.|Show the full price.|Match a fair rival.|Offer a student rate.
A pilot before a full launch is for?|Learning what breaks, on a small scale, before you spend the rest.|Delaying forever.|Replacing the accounts.|Avoiding customers.
Cash runs out before profit does when?|Customers pay late and you have already paid the suppliers.|The logo is old.|Sales are zero and so are costs.|You hold no stock and take cash on the day.
A board's job includes?|Setting direction and checking the numbers, not running every shift.|Counting the petty cash each hour.|Writing every advert.|Choosing the canteen menu only.
Competitive advantage lasts longer when?|It is hard for a rival to copy the reason customers stay.|You cut the price for one week.|You change the font.|You buy more business cards.
A service recovery should?|Fix the failure, say what went wrong, and make the next step clear.|Argue that the customer is mistaken.|Offer nothing and hope.|Hide the complaint.
Segmentation is?|Grouping customers who want the same thing, so the offer can fit.|Splitting the ledger at random.|Hiring by height.|Closing on Mondays.
A make-or-buy choice compares?|The cost and the risk of doing it yourself against paying someone else.|Only the founder's preference.|The colour of the van.|Last year's party budget.
Innovation is incremental when?|You improve the current product a step at a time.|You bet the firm on an untested market tomorrow.|You stop all research.|You copy a slogan.
A crisis statement should?|Say what you know, what you do not, and what you are doing now.|Blame the junior staff in public.|Promise a cause you have not found.|Stay silent for a month.
The test of a strategy is?|It chooses, it uses the case numbers, and it names what could go wrong.|It quotes three frameworks and picks none.|It is the longest answer.|It says the firm should be world class.
`);

const LAW = pack('law', `
A contract needs which set?|An offer, an acceptance, and something of value on both sides.|A handshake and a hope.|A posted letter with no reply.|A promise of a gift with nothing in return.
Consideration is?|The price each side gives for the other's promise.|The judge's salary.|The court fee only.|A moral duty with no bargain.
An offer ends when?|It is rejected, it lapses, or it is revoked before acceptance.|The offeree thinks about it overnight and you are bound forever.|A stranger overhears it.|It is written in pencil.
Acceptance must be?|A clear yes to the terms, communicated to the offeror.|Silence, unless the offer said silence would do.|A maybe.|A counter-offer, which is still an acceptance.
A counter-offer does what?|It kills the original offer and puts a new one in its place.|It accepts the old price.|It ends the court's power.|It creates a crime.
Terms on a ticket are more likely to bind if?|They were shown before the contract was made, not after.|They were on the back and nobody could see them.|They contradict a signed promise with no notice.|They were added a month later.
Misrepresentation is?|A false statement of fact that induces the contract.|A sales puff such as 'the best in town'.|A future forecast stated as a hope.|Silence about something you were not asked and had no duty to say.
Duress makes a contract vulnerable when?|Illegitimate pressure left no practical choice.|The price was merely high.|The negotiation was long.|One side had a lawyer.
A breach is repudiatory when?|It goes to the root, so the other side may end the contract.|It is a late invoice by one day on a minor term.|The parties disagree about taste.|A third party is rude.
Damages in contract aim to?|Put the innocent side in the position they would have been in had the contract been performed.|Punish the defendant as a crime would.|Give them a windfall.|Pay the judge.
Mitigation means?|The claimant must take reasonable steps to limit the loss.|They may sit on the loss to make it larger.|They must sue twice.|They waive the whole claim.
Specific performance is more likely for?|A unique asset, such as a particular piece of land.|Ordinary goods you can buy elsewhere.|A contract of personal service.|A promise to marry.
Negligence needs?|A duty of care, a breach, and damage the breach caused.|A contract between the two sides always.|A criminal intent.|A written warning.
The neighbour principle asks?|Whether a reasonable person would have had the claimant in mind.|Whether the defendant is wealthy.|Whether the injury was on a Tuesday.|Whether there was a receipt.
Causation fails when?|The harm would have happened even if the duty had been met.|The defendant was careless and the harm followed.|A warning was ignored and that was the cause.|The loss is the one the duty exists to prevent.
A crime differs from a civil wrong because?|The state prosecutes, and the outcome can be punishment.|Only money is ever involved.|There is no victim.|The standard is always a coin toss.
Beyond reasonable doubt is?|The criminal standard.|The civil standard.|A contract term.|A tax rule.
On the balance of probabilities means?|More likely than not, the civil standard.|Certain beyond any doubt.|A hunch.|The defendant's word always wins.
Hearsay is risky because?|The person who saw it is not there to be questioned.|It is always forbidden in every paper.|It is the best evidence.|It is a signed contract.
A precedent binds a lower court when?|The earlier decision is from a higher court on the same point.|It is a textbook.|It is a foreign blog.|It is what the client hopes.
Ratio decidendi is?|The reason necessary for the decision, which binds.|A judge's aside.|The headnote written by a publisher only.|The dissent, which binds.
Obiter dicta are?|Remarks not necessary for the decision, persuasive at most.|The binding rule.|A statute.|The charge sheet.
Statute beats case law when?|Parliament has spoken on that point.|A blog disagrees.|The older case is more famous.|The parties agree to ignore the Act.
Intention to create legal relations is presumed in?|A commercial deal.|A family dinner promise with no sign they meant to sue.|A social toast.|A joke in a pub.
A condition in a contract is?|A major term. Breach lets the other side end the deal.|A trivial term.|A warranty by another name always.|The signature block only.
A warranty breach usually leads to?|Damages, and the contract continues.|Prison.|Automatic jail for the buyer.|The end of every related contract in the trade.
An exclusion clause is less likely to work if?|It tries to shut out liability for death or personal injury caused by negligence.|It limits a late-delivery refund in a fair way.|It was signed and readable.|It repeats the statute.
Frustration ends a contract when?|An outside event makes performance impossible, or a radically different thing.|The price feels high.|One side changes their mind.|A worker is merely inconvenienced.
An agent binds the principal when?|They act within the authority they were actually or apparently given.|They buy a yacht for themselves.|They are a stranger.|They were told not to, and the other side knew.
A partnership shares?|Profits, and usually the debts of the firm, unless a limited form says otherwise.|Only the letterhead.|Nothing, ever.|Only the tax refunds.
A company is a separate person, which means?|The shareholders are not automatically liable for its debts.|The director's house is always the company's asset.|There is no board.|Tax never applies.
Limited liability limits?|How much a shareholder can be made to pay in, usually what they agreed to put in.|A director's duty to act in good faith.|Criminal liability for fraud.|The court's power.
A director's duty includes?|Acting in the company's interests, with care, and declaring conflicts.|Preferring their own side business in secret.|Hiding a conflict.|Signing whatever the largest shareholder whispers.
Wrongful dismissal is about?|Ending the job in breach of the contract.|A fair redundancy with the right pay.|A resignation the worker chose.|A promotion.
Unfair dismissal looks at?|Whether the reason was fair and the procedure was followed.|Only the employer's mood.|The worker's star sign.|Whether the firm is profitable.
A restraint of trade clause is enforced only if?|It protects a real interest and goes no further than reasonable.|It bans the worker from any job, anywhere, for life.|It was shouted across a room.|It was added after they left.
Possession of stolen goods becomes a crime when?|The person knows, or believes, the goods are stolen.|They bought them in a shop in good faith.|They found their own lost coat.|They inherited a family watch.
Self-defence is lawful only while?|The force is necessary and proportionate.|Any force is fine once you are angry.|You may punish after the danger has passed.|A weapon is always allowed.
Burden of proof in a criminal case sits on?|The prosecution.|The accused, to prove innocence.|The victim's employer.|The newspaper.
A will is valid in the usual case when?|The person has capacity, and the signing formalities are met.|It is a text message with no witnesses where witnesses are required.|It is unsigned.|It was made by a child with no exception.
`);

const IT = pack('it', `
A program prints the wrong total. What do you check first?|The input, then the line that adds, with one example you can do by hand.|Run it again and hope.|Rewrite it from an empty file.|Change the expected answer to match the bug.
You must change one function and leave the others working. How?|Change only that function, then run a check that still calls the others.|Edit every function so they match.|Comment out the tests.|Ship and see who complains.
A backup is real when?|You have restored it, not only watched the copy job say success.|The disk is large.|Someone set it up last year.|The job emailed 'ok' and nobody opened the file.
A key was committed in code that was shared. What do you do?|Revoke it, issue a new one, and take it out of the code.|Hope nobody saw it.|Rename the file.|Add a comment that says secret.
A service is down. What do you separate first?|Whether it is the app, the network, or the account that cannot sign in.|Restart every machine at once.|Turn off the logs so the alerts stop.|Tell users to wait a week.
SQL injection is stopped by?|Passing values as parameters, not gluing them into the query text.|Hiding the database password in the page.|Using a longer password only.|Turning the database off.
An index helps a query when?|The query filters or sorts on that column, and the index matches.|You index every column including the ones never used, for free.|You never write the column.|The table is empty forever.
HTTPS gives you?|Encryption in transit, and a check of who holds the certificate.|A faster CPU.|A backup.|Immunity from bugs in the app.
A hash of a password should be?|Slow and salted, so a stolen file is not a list of passwords.|The password itself, reversible.|The username.|Stored in the page source.
Version control lets you?|See who changed what, and return to a known good revision.|Email the only copy of the file.|Edit on the live server with no record.|Keep the code on one laptop only.
A race condition is?|Two operations overlap and the result depends on which finishes first.|A slow computer.|A syntax error.|A missing semicolon only.
Idempotent means?|Doing the same call twice does not apply the effect twice.|The call is faster the second time always.|The call deletes the database.|The call has no name.
Least privilege means?|An account gets only the rights it needs for its job.|Everyone is an administrator.|The intern has the root key.|Passwords are shared in a chat.
A null check belongs?|Before you use a value that might be missing.|After you have already crashed.|In a comment.|Only in production, not in the test.
Caching is safe when?|You know how stale the copy may be, and how it is invalidated.|You cache a bank balance forever.|You cache a one-time password.|You cache personal data on a shared computer with no expiry.
An API contract is?|The inputs, the outputs, and the errors a caller can rely on.|The colour of the logo.|The office address only.|A verbal promise with no examples.
Load is rising. You look first at?|The slowest query or the hottest endpoint, with a measurement.|A full rewrite.|More banners on the homepage.|Turning off the error page.
A foreign key does what?|Stops a child row pointing at a parent that is not there.|Makes the query slower on purpose.|Stores the password.|Replaces the backup.
Encryption at rest protects?|The files if the disk is stolen.|The user from a phishing page by itself.|A bug in the business logic.|A power cut.
Two-factor authentication adds?|A second proof, such as a device, on top of the password.|A longer hint written on the login page.|The same password typed twice.|A picture of the building.
A memory leak is?|The program keeps memory it will never use again.|The disk is new.|The font is large.|The user typed slowly.
Refactoring means?|Change the shape of the code without changing what it does, then prove it.|Add features while you rename things, untested.|Delete the tests to make it compile.|Rewrite it the night before a demo with no copy of the old one.
A feature flag lets you?|Turn a change on for a few users before everyone.|Hide a security hole.|Skip the backup.|Store passwords in the flag.
Latency is?|How long one operation takes.|How many servers you own.|The size of the logo.|The number of staff.
Throughput is?|How much work is finished per unit of time.|How pretty the UI is.|The uptime slogan.|The office rent.
A deadlock is?|Two tasks each hold what the other needs, and neither can move.|A slow disk.|A full inbox.|A syntax warning.
Input validation belongs?|On the server, even if the form also checks.|Only in the browser, where the user can skip it.|In a comment.|After the data is written.
Logging should avoid?|Passwords, card numbers, and tokens.|The error code.|The time.|The endpoint name.
A rollback plan is?|How you return to the last good version if the release misbehaves.|A hope that it will be fine.|Deleting the database.|Turning the phones off.
Unicode matters when?|Names and text from other languages must round-trip without corruption.|You only store integers.|The font is bold.|The server is new.
A CDN helps?|By serving static files from a place nearer the user.|By replacing your tests.|By hiding outages in the database.|By storing secrets in the page.
Rate limiting protects?|A login or an API from being hammered.|The colour scheme.|The newsletter font.|The office wifi name.
Principle of least surprise in a UI means?|The control does what a careful user would expect.|Every button is a surprise.|Errors are a blank page.|Save deletes.
A code review looks for?|Correctness, security, and whether the test matches the change.|Only the spelling of comments.|Whether the author is popular.|The length, the longer the better.
Container images should be?|Built from a known base, with the version pinned.|Latest, pulled fresh on every production boot with no pin.|Edited on the live host.|Stored in a chat.
A secret in an environment variable is still?|A secret. Do not print it, and do not commit the file that sets it.|Public, because it is not in the code.|Safe to email.|Fine in a screenshot.
Pagination is needed when?|The full list is too large to send in one response.|There are three rows.|The user asked for one record.|The table is a config of five keys.
Observability means you can?|Tell what the system did, from logs, metrics and traces, after the fact.|Only restart it.|Only read the source.|Guess from memory.
A breaking API change should?|Be versioned, so old callers keep working until they move.|Ship on a Friday with no note.|Reuse the same field for a new meaning.|Return HTML to a JSON client.
The definition of done for a small program is?|It does the task, including the example and the bad input, and the test says so.|It runs once on a happy path.|It is over fifty lines.|A classmate said it looked fine.
`);

const NURSING = pack('nur', `
Two identifiers before a medicine means?|You match the patient and the drug to the chart, out loud if you can.|You ask the patient their first name only and proceed.|You use the bed number alone.|You trust the last shift's verbal note with no chart.
A dose looks unsafe. What do you do?|Stop, check the usual dose, and do not give it until it is confirmed.|Give it because it is written.|Skip every drug.|Double it to be sure.
Hand hygiene is required?|Before and after patient contact, and after a body-fluid exposure.|Only at the start of the shift.|Only if the hands look dirty.|Only when a manager is watching.
A fall risk is higher when?|The patient is confused, weak, or on medicines that drop the blood pressure.|They are young, steady, and watching television.|They refused lunch once.|The room has a window.
The first move for a person who is not breathing is?|Call for help and start the resuscitation steps you are trained for.|Fetch a blanket and wait.|Offer a glass of water.|Write the notes first.
An allergy on the chart means?|You do not give that drug, and you say so if someone asks you to.|You give a smaller dose.|You give it if the patient is asleep.|You hide the sticker.
Pain is assessed by?|Asking the patient, and using the scale your ward uses, then acting on it.|Deciding they look fine.|Waiting until they shout.|Offering no record.
A pressure injury is prevented by?|Moving the patient on the schedule, and keeping the skin clean and dry.|One pillow and no turns.|A wet sheet.|Massaging a red area hard.
Confidentiality means?|The patient's details stay with the people caring for them.|You may tell the story in the canteen if you omit the surname.|You post an interesting case.|You discuss it on the bus.
Informed consent needs?|The person understands what is proposed, the risks, and that they may say no.|A signature from a relative who was not told.|Silence.|A form signed after the procedure with no explanation.
A deteriorating patient is recognised by?|A worsening early-warning score, or a change in breathing, pulse or consciousness.|A neat bed.|A normal conversation yesterday.|An empty water jug alone.
Oxygen is prescribed. You?|Give the amount ordered and watch the saturation, and do not turn it up on a whim.|Set it to the maximum for everyone.|Turn it off to save the cylinder if they look pink.|Leave it for the next shift to start.
A medicine error you made should be?|Reported at once, the patient checked, and the truth written.|Hidden if the patient seems well.|Blamed on the pharmacy with no report.|Corrected in the chart with no one told.
Isolation is for?|Stopping a named infection spreading, with the precautions that infection requires.|Every patient, with no gloves ever.|Punishing a rude patient.|Storage of clean linen.
A diabetic with sweating, shaking and confusion may be?|Hypoglycaemic. Check the glucose and treat the low if that is the protocol.|Ignored until lunch tomorrow.|Given extra insulin at once with no check.|Sent home to walk it off.
Intake and output are recorded to?|See whether the patient is keeping or losing fluid.|Fill the page.|Replace the blood pressure.|Decide the menu for the ward.
A nasogastric feed is only started when?|The tube position has been confirmed the way your protocol requires.|The patient says it feels fine.|You are in a hurry.|The last shift thinks it is in.
Sharps go?|Straight into the sharps bin, and you do not recap a used needle.|Into a soft rubbish bag.|Into your pocket until later.|Onto the bedside table.
A confused patient trying to climb out of bed needs?|A reason looked for, the bed lowered, and a watch, not a restraint as the first act.|Ties, immediately, with no note.|The door locked and no observation.|A telling-off.
Handover is safe when?|The next nurse hears the risks, the plan, and what to watch.|You say 'all fine' and leave.|You write nothing.|You hand over in a corridor with no names.
Dignity during a wash means?|Cover what you are not washing, explain, and let them do what they can.|Leave the door open.|Rush with no words.|Two extra people chatting over them.
A wound dressing is changed?|With a clean technique, and the wound described in the notes.|When you remember, with the same gloves you used elsewhere.|Without looking.|Only if the patient asks twice.
Vital signs are trendable when?|You measure them the same way and write the time.|You guess from across the room.|You write yesterday's numbers again.|You skip the respiratory rate.
A patient refuses a treatment they understand. You?|Respect the refusal, tell the prescriber, and record it.|Hold them down.|Pretend they agreed.|Wait until they sleep and do it.
Infection control for a cough with a known airborne risk includes?|The mask and the room your protocol names for that illness.|A scarf.|No mask, to be friendly.|Sharing the bay with a surgical patient with no plan.
Nutrition risk is higher when?|The patient has eaten poorly, is losing weight, or cannot swallow safely.|They finished a large breakfast.|They ask for tea.|They are visiting.
A child dose is checked against?|The weight or the age band on the chart, not an adult vial given whole.|The adult dose, halved by eye.|What the parent requests.|The largest spoon.
Documentation after an incident should be?|Factual, timed, and free of blame-words you cannot prove.|A guess about motive.|Written a week later from memory with no times.|Altered once the complaint arrives.
Moving a heavy patient is done?|With the right number of people and the aid, not with your back as the plan.|Alone, to be quick.|By dragging the sheet from the head.|By asking the patient to hop.
A seizure on the ward: you?|Protect the head, time it, do not force anything into the mouth, and call for help.|Hold them down by the arms.|Offer water during the fit.|Leave them to fetch a form first.
Blood transfusion rules include?|The right patient, the right unit, and a watch in the first minutes.|Any bag from the fridge.|A student alone with no training.|Skipping the baseline observations.
Palliative comfort includes?|Pain, breathlessness, mouth care and the family's questions, on the plan.|Every active treatment, however futile, with no talk.|Silence about dying when they ask.|No medicines for symptoms.
A pressure-relieving surface does not replace?|Turns and skin checks.|The need for a mattress at all.|Food.|The drug chart.
Escalation means?|You call the person the protocol names when the score or your worry crosses the line.|You wait until the end of the shift whatever the score.|You tell only another student.|You write 'unwell' and go on break.
Capacity is decision-specific. A person may?|Refuse one treatment and agree to another, if they understand each.|Lose all say because they are in hospital.|Be ignored if the family disagrees and they have capacity.|Be treated against a clear refusal you have recorded.
A near miss is reported because?|The next time the same gap may reach the patient.|It is embarrassing.|Nothing happened, so the form is a waste.|It blames a named colleague in the title.
End of shift, a medicine is unsigned. You?|Do not sign for something you did not give or see. Find out what happened.|Sign it to tidy the chart.|Rub it out.|Leave it blank with no handover.
A rash after a new drug may be?|A reaction. Stop, assess, and get help if breathing or swelling is involved.|A reason to double the dose.|Irrelevant.|Always dry skin.
The note 'slept well' is weak because?|It does not say what you observed about pain, breathing or the plan.|Sleep is never relevant.|Notes should be one word.|The time is missing and that is the only flaw that matters, even if the rest is there.
Your own limit is reached when?|The task is outside what you have been trained and signed off to do. You ask.|You improvise a procedure you saw once.|You copy a prescription.|You give a drug you cannot name.
`);

const CIVIL = pack('civ', `
A public officer's first duty with a file is?|To decide on the rule and the facts, and to record the reason.|To please the person who shouts.|To lose the paper.|To decide before you have read it.
A conflict of interest is handled by?|Declaring it and stepping out of that decision.|Deciding quickly before anyone notices.|Asking a relative to apply.|Keeping it verbal and off the file.
Natural justice means the person affected gets?|Notice of the case against them, and a chance to answer, before you decide.|A decision in a closed notebook.|A newspaper leak.|No reasons.
A tender is fair when?|Every bidder sees the same specification and the same deadline.|One firm helped write the secret scoring and then bid.|The cheapest is thrown out with no note.|Late bids are slipped in.
Public money is spent only when?|There is authority, a need, and a record.|A verbal request from a friend in the office.|The till looks full.|The year is about to end so the budget must be emptied with no check.
A right-to-information request is met by?|Releasing what the law says is open, and saying why if you withhold.|Ignoring it.|Publishing the requester's home address.|Shredding the file.
Impartiality means?|The same rule for people who did not vote for your side.|A faster stamp for a cousin.|A different fee with no published basis.|A decision you cannot explain.
Minutes of a meeting should record?|The decision, who was there, and the reason, not a transcript of every joke.|Only the names of the winners.|Nothing, if the outcome was awkward.|The menu.
A whistle-blower report of corruption is?|Logged and looked at by someone who is not accused.|Filed in the accused's desk.|Posted on a wall with the reporter's name as a joke.|Ignored because it is inconvenient.
Seniority in the service is not a reason to?|Skip a statutory step.|Know the filing system.|Train a junior.|Read the circular.
A circular contradicts the Act. You follow?|The Act, and you flag the circular.|The circular, because it is newer and shorter.|Whichever is kinder to you.|Neither, and you invent a third rule.
A citizen's application is incomplete. You?|Tell them what is missing, in time for them to send it.|Reject it in silence.|Lose it.|Approve it with a blank annex.
Official secrets stay secret when?|The law says so, including after you leave the post.|You are at a party.|A journalist is polite.|You have retired and want a story.
A gift from a person with a file in your office is?|Refused, or declared under the rule, not quietly kept.|A private matter.|Fine if it is small and unrecorded.|Swapped for a faster decision.
Proportionality means?|The burden you impose fits the aim, and is no wider.|The harshest penalty always.|No reasons needed.|A different rule for each district with no publication.
A delegated power may be used?|Only inside the limits of the instrument that gave it.|For a purpose the instrument does not mention.|To help a relative.|To invent a new offence.
Reasons in writing matter because?|A later reader, and a court, can see why you decided.|They slow the office and that is their point.|They are optional decoration.|They can be added years later to match the outcome.
A queue is jumped when?|Never, unless a published rule says who is urgent.|The person knows you.|They offer a favour.|They come at closing time and insist.
Data about a citizen is kept?|For the purpose it was collected, for no longer than the rule allows.|On a personal laptop.|In a group chat.|Forever, in an open spreadsheet.
An appeal exists so that?|A different officer can review the decision against the same law.|The first officer can raise the penalty for daring to appeal.|The file can be lost.|The citizen can be charged for asking.
A budget line is overspent. You?|Stop, report, and seek authority before you commit more.|Move money from a grant with no power to vire.|Hide it until the audit.|Ask a supplier to backdate.
Equality before the office means?|The criteria are published and applied to the file in front of you.|A discretion you cannot describe.|A quota you invent that day.|A preference for the familiar name.
A site inspection note should?|Say what you saw, when, and who was present.|Say what you expected to see.|Be written without a visit.|Recommend a friend's firm in the same sentence as the finding.
Confidential advice to a minister is?|Frank, and not the same as a public statement.|A press release.|A campaign speech.|A promise the law does not allow.
A delay you can explain is better than?|A fast decision you cannot defend.|A lost file.|A forged date.|Silence for a year.
The file moves to the next desk with?|A docket that says what is asked and by when.|A sticky note that falls off.|No papers, just a phone call.|The original and no copy anywhere.
A discretionary power is abused when?|You use it for a purpose other than the one it was given for.|You follow the published policy.|You give reasons.|You treat like cases alike.
A public record is altered by?|A signed correction that leaves the original readable.|A blank page glued over it.|A new date and no initial.|Removing the page.
You are asked to sign a letter you believe is unlawful. You?|Say so, in writing, and refuse the signature.|Sign and hope.|Sign with an unreadable scribble.|Ask a junior to sign.
A complaint about your own decision should be?|Seen by someone else, where the rule provides a review.|Answered by you with 'no' and no route.|Lost.|Published with the complainer's private details.
Value for money asks?|Whether the spend was economical, efficient and effective.|Whether the supplier is a classmate.|Whether the invoice is on nice paper.|Whether the budget was large.
A state vehicle is for?|The official journey the rule allows.|The school run.|A weekend hire to a relative.|A rally.
An oath of office binds you?|For the decisions in the job, including the dull ones.|Only at the ceremony.|Only when the press is there.|Until lunch.
A poorly drafted rule is applied by?|Reading its purpose and its plain words, and asking if you are unsure.|Inventing a shortcut.|Asking the applicant what they would like it to mean.|Ignoring it.
Nepotism is?|Using the post to advantage a relative.|Hiring the person who won a fair competition.|Rotating duties.|Publishing a vacancy.
A cash book in a field office is checked by?|Counting the cash against the book, unannounced sometimes.|Trusting the total on the cover.|Letting the holder prepare the count alone every time.|Skipping a month because you are busy.
An emergency power is?|Narrow, temporary, and written up afterwards.|A standing excuse to skip every rule.|Secret.|Available for convenience.
The citizen is told the outcome?|In time, in a form they can use, with the appeal route if there is one.|By rumour.|Never, if the answer is no.|On a noticeboard in another town only.
A colleague asks you to backdate a permit. You?|Refuse. The date is a fact.|Do it if they are senior.|Do it if the applicant is kind.|Do it and correct the register later in pencil.
The test of your decision is?|A stranger with the file would reach it from the rule and the note you left.|It favoured the person you like.|It was fast.|It cannot be explained and that keeps you safe.
`);

const COLLEGE = pack('col', `
The question asks for a definition and an example. What do you do first?|Define the term, then give one example that matches it.|Give two examples and skip the definition.|Write everything you remember about the chapter.|Leave it blank and start the next one.
You have one hour and two chapters. How do you spend it?|Skim both, then answer the parts the paper actually asks.|Read one chapter slowly and guess the rest.|Copy the summary and hope it fits.|Spend the hour on a title page.
Your answer and the textbook disagree. What do you check?|The question's wording, then the page you took the fact from.|Keep it because it sounds confident.|Copy the person beside you.|Cross the whole answer out.
A compare question wants?|One point they share and one they do not, with a scrap of evidence for each.|A plot summary of the first and a mention of the second.|Which one you liked.|A list of characters.
A paragraph is finished when?|It makes one point, supports it, and stops.|It fills the page.|The handwriting is neat.|It names as many theorists as possible.
You do not know a term. You?|Say what you do know that the question still asks, and do not invent the term.|Invent a confident definition.|Leave the whole paper.|Copy the question back as the answer.
A graph in the stem is there to?|Be read. The answer uses a number or a trend from it.|Be admired.|Be ignored if the words are long.|Be replaced with a graph you prefer.
Units matter because?|A right method with the wrong unit is a wrong answer.|The marker does not look.|Any unit is fine if the digits match.|Units are optional in science.
Show your working so?|A marker can give the method marks if the last line slips.|The page looks full.|You can hide a guess.|The person next to you can copy it.
A source is cited so?|A reader can find the text you used.|The bibliography looks long.|You can paste a paragraph with no quote marks.|You can name a famous person you did not read.
Plagiarism is?|Presenting someone else's words or idea as yours.|Quoting a line and citing it.|Paraphrasing and citing it.|Writing your own example.
A hypothesis is?|A claim you can test, and that the result might knock down.|A hope.|The conclusion copied into the introduction.|A list of apparatus.
An average hides?|The spread. Say the range or the outliers if the question asks what is typical.|Nothing. It is the whole story.|The need to count.|The units.
A map question wants?|The place, and the reason the question names, not a tour of the whole country.|Every river.|The colour of the legend only.|Your home town if it is not on the map.
In an essay, the introduction should?|Say what you will argue, in a sentence the conclusion can cash.|Tell your life story.|Define every word in the language.|Apologise.
A primary source is?|The thing itself: the speech, the data, the letter.|A textbook about it.|A classmate's notes.|A headline.
A secondary source is?|Someone's account or analysis of the primary material.|The raw table you collected.|The statute itself.|Your lab book.
Time left and two questions of equal marks. You?|Split the time, and leave a margin to check the one you found hard.|Perfect the first and leave the second blank.|Rewrite the plan in neat.|Start a third question you will not finish.
A command word 'evaluate' means?|Weigh both sides and say which is stronger, and why.|Describe only.|List only.|Define only.
A command word 'describe' means?|Say what it is or what happens, in order, without a long judgement.|Argue a side.|Invent a new theory.|Give only your opinion.
Checking the last five minutes is for?|Units, signs, and whether you answered the question that was asked.|A new introduction.|Decorating the margin.|Changing a right answer on a whim.
Group work credit is fair when?|The note says who did which part.|One name goes on everyone's writing.|You include a friend who did not come.|The longest essay wins regardless.
A lab error is reported by?|Saying what went wrong and how it could move the result.|Hiding the odd point.|Averaging it with a hoped number.|Copying another bench.
A formula you half remember should be?|Written as you have it, and the substitution shown, so a slip is visible.|Left blank if you are not certain of the last term.|Replaced with a prose poem.|Used with no numbers.
Reading the whole paper first helps you?|Choose the questions you can finish, and not trap yourself in the first hard one.|Waste the hour.|Find the easiest mark and do only that line.|Start writing before you know the marks.
A diagram needs?|Labels, a scale or a key if the question asks for one, and a title that matches.|Colour only.|No labels, so it looks clean.|A photograph pasted over it.
Spelling of a technical word matters when?|The wrong spelling is a different thing, such as a different drug or a different case.|The marker is unkind about commas.|The handwriting is joined.|The page number is missing.
A conclusion does?|Answer the question in a sentence that follows from the points above.|Introduce a new topic.|Apologise.|Repeat the question.
If the data contradict the theory you wanted, you?|Report the data and say what the theory got wrong.|Change the data.|Leave the table out.|Say the experiment was not done.
A word limit is met by?|Cutting repetition, not by deleting the evidence.|Shrinking the font.|Removing the citations.|Adding adjectives.
A seminar question is preparation when?|You can say your point in two sentences and point at the page.|You read the night before and hope.|You memorise the introduction only.|You bring no text.
Note-taking in a lecture is better as?|The claim, the example, and the page to read back.|A transcript you will never open.|Doodles only.|The jokes.
A past paper is useful because?|You see how the marks are split and which command words recur.|You memorise last year's answers to a different question.|You skip the syllabus.|You practise only the cover.
An argument is stronger with?|A reason and a fact, not a louder adjective.|The word 'obviously'.|A list of names.|A rhetorical question and nothing else.
You find a calculation error with one minute left. You?|Fix the last line if you can do it cleanly, and do not restart the paper.|Rewrite the whole answer in the margin.|Hand in and hope they do not notice a sign you can still change.|Cross out the right method.
A bibliography lists?|Works you actually used.|Every book in the library.|Books you meant to read.|Only the textbook's title, with no author.
Peer review of a draft should say?|What is unclear and what claim lacks support.|That it is fine, unread.|Only praise.|A rewrite in your voice with no note.
The abstract of a paper tells you?|The question, the method and the finding, so you know if you should read it.|The author's childhood.|The font.|The price of the journal.
A table is better than prose when?|Several numbers need to be compared at a glance.|You have one number.|You are hiding a gap.|The marker asked for a paragraph and you refuse.
The mark scheme rewards?|The point the question asked, not the volume of ink.|The longest answer.|The neatest border.|A memorised introduction glued onto every question.
`);

export const BANKS = {
  finance: FINANCE,
  business: BUSINESS,
  law: LAW,
  it: IT,
  nursing: NURSING,
  civil: CIVIL,
  college: COLLEGE
};

const SUBJECT = {
  ACCA: 'finance', CA: 'finance', CFA: 'finance', BBA: 'finance', BBS: 'finance',
  Business: 'business', MBA: 'business', DBA: 'business', CIPD: 'business',
  LLB: 'law', BAR: 'law',
  IT: 'it', Tech: 'it', CLOUD: 'it', DATA: 'it', MSc: 'it', PhD: 'it', MScEng: 'it',
  Medicine: 'nursing', NMC: 'nursing', PHARM: 'nursing',
  PSC: 'civil',
  Arts: 'college', 'College year': 'college', ELEC: 'college', PLUMB: 'college', DRIVE: 'college', CHEF: 'college'
};

export function subjectOf(id) { return SUBJECT[id] || 'college'; }
export function bankSize(subject) { return (BANKS[subject] || []).length; }

function shuffle(list, rng) {
  const a = list.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

export function drawExam(courseId, seenIds, rng = Math.random, hints = 0) {
  const subject = subjectOf(courseId);
  const bank = (BANKS[subject] || BANKS.college).slice();
  const hand = (HAND.exam && HAND.exam[courseId]) || [];
  hand.forEach((row, i) => {
    if (!row || !row.q || !row.opts) return;
    bank.push({ id: 'hand-' + courseId + '-' + i, q: row.q, opts: row.opts });
  });
  const prev = new Set(seenIds || []);
  let pool = bank.filter((r) => r && r.id && !prev.has(r.id));
  if (pool.length < 10) pool = bank.filter((r) => r && r.id);
  const picked = shuffle(pool, rng).slice(0, 10);
  return picked.map((row, qi) => {
    const opts = shuffle(row.opts.map((o) => ({ t: o.t, ok: o.k === 'best' })), rng);
    let correct = opts.findIndex((o) => o.ok);
    if (correct < 0) { opts[0].ok = true; correct = 0; }
    if (qi < hints) {
      const wrong = opts.find((o) => !o.ok);
      if (wrong) wrong.hint = true;
    }
    return { id: row.id, q: row.q, opts, correct };
  });
}
