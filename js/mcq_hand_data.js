export const HAND = {
  "job": {
    "cashier": [
      {"q": "The till does not match the receipts. What do you check first?", "opts": [
        {"t": "Recount the cash and match each receipt to the till line.", "k": "best"},
        {"t": "Count the notes again and hope the coins explain it.", "k": "ok"},
        {"t": "Close the till and tell the next shift.", "k": "weak"},
        {"t": "Add a few dollars so the numbers match.", "k": "weak"}
      ]},
      {"q": "A customer says they were charged twice. What do you do?", "opts": [
        {"t": "Find the two charges, show them, and refund the extra one.", "k": "best"},
        {"t": "Ask them to come back when the manager is in.", "k": "ok"},
        {"t": "Tell them the machine is never wrong.", "k": "weak"},
        {"t": "Give them a free item and skip the record.", "k": "weak"}
      ]},
      {"q": "How do you close the till at the end of a shift?", "opts": [
        {"t": "Count the drawer, total the receipts, and write the difference.", "k": "best"},
        {"t": "Count the notes and leave the coins for tomorrow.", "k": "ok"},
        {"t": "Lock it and go. The morning shift can count.", "k": "weak"},
        {"t": "Take the extra cash home and explain later.", "k": "weak"}
      ]}
    ],
    "barista": [
      {"q": "The morning rush hits and the machine is slow. What do you do first?", "opts": [
        {"t": "Start the drinks already ordered and tell the line the wait.", "k": "best"},
        {"t": "Make the simple coffees and leave the rest.", "k": "ok"},
        {"t": "Turn the machine off until it feels faster.", "k": "weak"},
        {"t": "Tell people to come back tomorrow.", "k": "weak"}
      ]},
      {"q": "A customer wants a drink you have not made before. How do you handle it?", "opts": [
        {"t": "Read the recipe, make it once, and check it with them.", "k": "best"},
        {"t": "Offer the closest drink you already know.", "k": "ok"},
        {"t": "Say the cafe does not do that.", "k": "weak"},
        {"t": "Guess the recipe and charge extra.", "k": "weak"}
      ]},
      {"q": "What do you clean before you leave the counter?", "opts": [
        {"t": "The steam wand, the group head, and the counter they touch.", "k": "best"},
        {"t": "Wipe the counter and leave the machine.", "k": "ok"},
        {"t": "Only the floor, if it looks dirty.", "k": "weak"},
        {"t": "Nothing. The night cleaner does it all.", "k": "weak"}
      ]}
    ],
    "clerk": [
      {"q": "Two files have the same name. How do you tell them apart?", "opts": [
        {"t": "Open both, check the date and the name inside, and label them.", "k": "best"},
        {"t": "Add a number to one and hope it is the right one.", "k": "ok"},
        {"t": "Throw the older one away.", "k": "weak"},
        {"t": "Leave them. Someone else will notice.", "k": "weak"}
      ]},
      {"q": "The phone rings while you are filing. What do you do?", "opts": [
        {"t": "Answer, take the name and the message, then go back to the file.", "k": "best"},
        {"t": "Let it ring twice and call them back later.", "k": "ok"},
        {"t": "Ignore it until the filing is done.", "k": "weak"},
        {"t": "Pick up and hang up so it stops.", "k": "weak"}
      ]},
      {"q": "How do you know a record is complete?", "opts": [
        {"t": "Every required field is filled and it matches the source paper.", "k": "best"},
        {"t": "The name is there, so the rest can wait.", "k": "ok"},
        {"t": "It is complete when the folder is thick.", "k": "weak"},
        {"t": "If nobody complained, it is complete.", "k": "weak"}
      ]}
    ],
    "sales": [
      {"q": "A customer likes the product and then goes quiet. What do you say?", "opts": [
        {"t": "Ask which part they are unsure about, then answer that.", "k": "best"},
        {"t": "Repeat the price and wait.", "k": "ok"},
        {"t": "Tell them to decide today or lose it.", "k": "weak"},
        {"t": "Walk off and find an easier customer.", "k": "weak"}
      ]},
      {"q": "They say it costs too much. How do you answer?", "opts": [
        {"t": "Say what they get for the price and offer a smaller option if there is one.", "k": "best"},
        {"t": "Knock a little off and hope that ends it.", "k": "ok"},
        {"t": "Tell them they cannot afford it.", "k": "weak"},
        {"t": "Agree it is too much and stop.", "k": "weak"}
      ]},
      {"q": "How do you know a sale is actually closed?", "opts": [
        {"t": "They have paid, or signed, and both of you know what happens next.", "k": "best"},
        {"t": "They smiled and said they might come back.", "k": "ok"},
        {"t": "They took a brochure.", "k": "weak"},
        {"t": "You talked for a long time.", "k": "weak"}
      ]}
    ],
    "designer": [
      {"q": "The brief is one sentence. What do you ask before you start?", "opts": [
        {"t": "Who it is for, what they must do with it, and the deadline.", "k": "best"},
        {"t": "Ask which colour they like.", "k": "ok"},
        {"t": "Start drawing and show them later.", "k": "weak"},
        {"t": "Copy a famous design and change the name.", "k": "weak"}
      ]},
      {"q": "They hate the first layout. What do you change?", "opts": [
        {"t": "Ask what failed, then change that and keep what still works.", "k": "best"},
        {"t": "Change the colours and show it again.", "k": "ok"},
        {"t": "Start a totally new idea with no brief.", "k": "weak"},
        {"t": "Tell them their taste is the problem.", "k": "weak"}
      ]},
      {"q": "How do you know a design is ready to show?", "opts": [
        {"t": "It matches the brief, the text is readable, and the file is the right size.", "k": "best"},
        {"t": "It looks nice on your own screen.", "k": "ok"},
        {"t": "You have spent the whole day on it.", "k": "weak"},
        {"t": "A friend said it was cool.", "k": "weak"}
      ]}
    ],
    "nurse": [
      {"q": "A patient says the pain is worse. What do you check first?", "opts": [
        {"t": "When it started, how bad it is, and the chart, then tell the doctor.", "k": "best"},
        {"t": "Tell them to wait for the next round.", "k": "ok"},
        {"t": "Give an extra dose because they asked.", "k": "weak"},
        {"t": "Say everyone hurts after surgery.", "k": "weak"}
      ]},
      {"q": "The medicine chart does not match the dose. What do you do?", "opts": [
        {"t": "Stop, check the order with the doctor, and do not give the odd dose.", "k": "best"},
        {"t": "Give the smaller amount and mention it later.", "k": "ok"},
        {"t": "Give what the chart says so the round stays on time.", "k": "weak"},
        {"t": "Ask the patient which dose they prefer.", "k": "weak"}
      ]},
      {"q": "What do you write down before the next shift arrives?", "opts": [
        {"t": "What changed, what you gave, and what the next nurse must watch.", "k": "best"},
        {"t": "That the ward was busy.", "k": "ok"},
        {"t": "Nothing, if you tell them in the corridor.", "k": "weak"},
        {"t": "A joke about the patient.", "k": "weak"}
      ]}
    ],
    "analyst": [
      {"q": "The numbers in two sheets do not match. Where do you look?", "opts": [
        {"t": "The source rows, the filters, and the formula that builds the total.", "k": "best"},
        {"t": "Retype the total until the sheets agree.", "k": "ok"},
        {"t": "Send the nicer looking sheet.", "k": "weak"},
        {"t": "Delete the sheet that disagrees.", "k": "weak"}
      ]},
      {"q": "Someone asks what a drop in the figures means. How do you answer?", "opts": [
        {"t": "Say what dropped, since when, and what you still need to check.", "k": "best"},
        {"t": "Say it might be seasonal and stop there.", "k": "ok"},
        {"t": "Say the business is failing.", "k": "weak"},
        {"t": "Say the numbers are probably wrong.", "k": "weak"}
      ]},
      {"q": "How do you check a total before you send it?", "opts": [
        {"t": "Add the source again and compare it to the sheet total.", "k": "best"},
        {"t": "Glance at it and see if it looks big enough.", "k": "ok"},
        {"t": "Send it. They can check.", "k": "weak"},
        {"t": "Round it to a number you like.", "k": "weak"}
      ]}
    ],
    "doctor": [
      {"q": "A patient describes two symptoms. What do you ask next?", "opts": [
        {"t": "When each started, what makes it worse, and what else changed.", "k": "best"},
        {"t": "Ask which one hurts more and stop there.", "k": "ok"},
        {"t": "Name a diagnosis before the exam.", "k": "weak"},
        {"t": "Tell them it is stress and end the visit.", "k": "weak"}
      ]},
      {"q": "The first treatment does nothing. What do you reconsider?", "opts": [
        {"t": "The diagnosis, the dose, and whether they actually took it.", "k": "best"},
        {"t": "Tell them to wait another month.", "k": "ok"},
        {"t": "Double the dose the same day.", "k": "weak"},
        {"t": "Blame the patient and discharge them.", "k": "weak"}
      ]},
      {"q": "What has to be in the note before they leave?", "opts": [
        {"t": "What you found, what you decided, and what they should do next.", "k": "best"},
        {"t": "The diagnosis only.", "k": "ok"},
        {"t": "Their job and their family.", "k": "weak"},
        {"t": "Nothing, if you remember it.", "k": "weak"}
      ]}
    ],
    "jr-accounts": [
      {"q": "An invoice does not match the order. What do you check first?", "opts": [
        {"t": "The order, the invoice lines, and the delivery note, side by side.", "k": "best"},
        {"t": "Ask the supplier to resend it and wait.", "k": "ok"},
        {"t": "Pay it so the file stays clear.", "k": "weak"},
        {"t": "Delete the invoice.", "k": "weak"}
      ]},
      {"q": "A payment has landed. How does it get into the ledger?", "opts": [
        {"t": "Match it to the open invoice, then enter the date and the amount.", "k": "best"},
        {"t": "Enter the amount against the newest invoice.", "k": "ok"},
        {"t": "Leave it in the bank feed.", "k": "weak"},
        {"t": "Put it in as cash sales.", "k": "weak"}
      ]},
      {"q": "The books are short at the end of the day. Where do you look?", "opts": [
        {"t": "The unmatched payments, the missed invoices, and the day's receipts.", "k": "best"},
        {"t": "Recheck only the last number you typed.", "k": "ok"},
        {"t": "Add a balancing figure and go home.", "k": "weak"},
        {"t": "Change yesterday until today looks right.", "k": "weak"}
      ]}
    ],
    "support": [
      {"q": "A screen is blank and the user is waiting. What do you ask first?", "opts": [
        {"t": "Is the power on, and did it work before they changed anything?", "k": "best"},
        {"t": "Ask them to restart and call back.", "k": "ok"},
        {"t": "Tell them to buy a new computer.", "k": "weak"},
        {"t": "Read them the whole manual.", "k": "weak"}
      ]},
      {"q": "It worked yesterday and fails today. Where do you start?", "opts": [
        {"t": "Ask what changed since yesterday, then test that one thing.", "k": "best"},
        {"t": "Reinstall everything.", "k": "ok"},
        {"t": "Say it is a virus and stop.", "k": "weak"},
        {"t": "Blame the user and close the ticket.", "k": "weak"}
      ]},
      {"q": "How do you write the fix so the next person can follow it?", "opts": [
        {"t": "Write what broke, what you changed, and how you checked the fix.", "k": "best"},
        {"t": "Write 'fixed' and the date.", "k": "ok"},
        {"t": "Tell them in chat and write nothing.", "k": "weak"},
        {"t": "Copy an old ticket that sounds similar.", "k": "weak"}
      ]}
    ],
    "engineer": [
      {"q": "A measurement is out by a little. Do you build on, or stop?", "opts": [
        {"t": "Stop, measure it again, and fix it before the next piece.", "k": "best"},
        {"t": "Note it and keep going if it is tiny.", "k": "ok"},
        {"t": "Build on. It will average out.", "k": "weak"},
        {"t": "Change the drawing so the bad measure looks right.", "k": "weak"}
      ]},
      {"q": "The plan and the site do not agree. What do you trust first?", "opts": [
        {"t": "Measure the site, then check which plan revision is current.", "k": "best"},
        {"t": "Trust the plan and force the site to match.", "k": "ok"},
        {"t": "Trust whoever shouts loudest.", "k": "weak"},
        {"t": "Pick the easier one and hide the gap.", "k": "weak"}
      ]},
      {"q": "What do you check before you call a fault fixed?", "opts": [
        {"t": "The same measure that failed, taken again, against the spec.", "k": "best"},
        {"t": "That the crew says it looks fine.", "k": "ok"},
        {"t": "That the shift is over.", "k": "weak"},
        {"t": "That nobody important is visiting.", "k": "weak"}
      ]}
    ],
    "dev": [
      {"q": "A small program gives the wrong number. How do you find it?", "opts": [
        {"t": "Check the input, then the line that calculates, with one known example.", "k": "best"},
        {"t": "Change numbers until the output looks right.", "k": "ok"},
        {"t": "Rewrite the whole program.", "k": "weak"},
        {"t": "Ship it. Users will notice if it matters.", "k": "weak"}
      ]},
      {"q": "You have to change one part without breaking the rest. How do you do that?", "opts": [
        {"t": "Change that part, then run the checks that cover the rest.", "k": "best"},
        {"t": "Change it and click around for a minute.", "k": "ok"},
        {"t": "Change several parts at once.", "k": "weak"},
        {"t": "Copy the program and edit the copy's name only.", "k": "weak"}
      ]},
      {"q": "How do you explain the change to someone who will use it?", "opts": [
        {"t": "Say what changed for them, and what they should do differently.", "k": "best"},
        {"t": "Send the list of files you edited.", "k": "ok"},
        {"t": "Say it is technical and they would not get it.", "k": "weak"},
        {"t": "Tell them nothing until they complain.", "k": "weak"}
      ]}
    ],
    "lead": [
      {"q": "Two people are stuck on the same piece of work. What do you do?", "opts": [
        {"t": "Split the piece, name an owner, and clear what is blocking them.", "k": "best"},
        {"t": "Tell them to sort it out between themselves.", "k": "ok"},
        {"t": "Take it over and do it all yourself.", "k": "weak"},
        {"t": "Move the deadline and leave them stuck.", "k": "weak"}
      ]},
      {"q": "A plan is late. What do you look at first?", "opts": [
        {"t": "Which step slipped, why, and what still has to happen.", "k": "best"},
        {"t": "Ask everyone to work this weekend.", "k": "ok"},
        {"t": "Blame the last person who spoke.", "k": "weak"},
        {"t": "Hide the plan until it catches up.", "k": "weak"}
      ]},
      {"q": "How do you know the team can start without you?", "opts": [
        {"t": "Each person knows their next step and who to ask if it blocks.", "k": "best"},
        {"t": "You wrote it down somewhere.", "k": "ok"},
        {"t": "They have your phone number.", "k": "weak"},
        {"t": "You will be back in an hour, so it can wait.", "k": "weak"}
      ]}
    ]
  },
  "exam": {
    "College year": [
      {"q": "The question asks for a definition and an example. What do you do first?", "opts": [
        {"t": "Define the term, then give one example that matches it.", "k": "best"},
        {"t": "Give two examples and skip the definition.", "k": "ok"},
        {"t": "Write everything you remember about the chapter.", "k": "weak"},
        {"t": "Leave it blank and start the next one.", "k": "weak"}
      ]},
      {"q": "You have one hour and two chapters. How do you spend it?", "opts": [
        {"t": "Skim both, then answer the parts the paper actually asks.", "k": "best"},
        {"t": "Read one chapter slowly and guess the rest.", "k": "ok"},
        {"t": "Copy the summary and hope it fits.", "k": "weak"},
        {"t": "Spend the hour making a perfect title page.", "k": "weak"}
      ]},
      {"q": "Your answer and the textbook disagree. What do you check?", "opts": [
        {"t": "The question's wording, then the page you took the fact from.", "k": "best"},
        {"t": "Keep your answer. It sounds confident.", "k": "ok"},
        {"t": "Change it to whatever the person beside you wrote.", "k": "weak"},
        {"t": "Cross out the whole answer.", "k": "weak"}
      ]}
    ],
    "Arts": [
      {"q": "The essay asks you to compare two texts. What do you do first?", "opts": [
        {"t": "Pick one point they share and one point they do not, with a line from each.", "k": "best"},
        {"t": "Summarise the first text and mention the second at the end.", "k": "ok"},
        {"t": "Retell the plot of both from the start.", "k": "weak"},
        {"t": "Write which one you liked more.", "k": "weak"}
      ]},
      {"q": "A poem's last line changes the meaning. Where do you put that?", "opts": [
        {"t": "After the reading, as the turn that re-reads the earlier lines.", "k": "best"},
        {"t": "In a footnote, if you have room.", "k": "ok"},
        {"t": "Ignore it. The first stanza is enough.", "k": "weak"},
        {"t": "Say poems do not have to mean anything.", "k": "weak"}
      ]},
      {"q": "How do you know an arts answer is finished?", "opts": [
        {"t": "It answers the question, uses the text, and ends on that point.", "k": "best"},
        {"t": "It is two pages long.", "k": "ok"},
        {"t": "The handwriting is neat.", "k": "weak"},
        {"t": "You used a lot of names.", "k": "weak"}
      ]}
    ],
    "Medicine": [
      {"q": "A case gives two symptoms and a vital sign. What do you write first?", "opts": [
        {"t": "The most likely cause, and the one finding that would change it.", "k": "best"},
        {"t": "A long list of every disease that fits one symptom.", "k": "ok"},
        {"t": "The treatment you remember, with no reason.", "k": "weak"},
        {"t": "That the case does not have enough detail, and stop.", "k": "weak"}
      ]},
      {"q": "The dose in the stem looks unsafe. What do you do?", "opts": [
        {"t": "Flag it, state the usual dose, and say you would not give that one.", "k": "best"},
        {"t": "Calculate it again and move on if you are unsure.", "k": "ok"},
        {"t": "Give it because the question printed it.", "k": "weak"},
        {"t": "Skip every drug question.", "k": "weak"}
      ]},
      {"q": "What has to be in a short clinical answer?", "opts": [
        {"t": "What you think it is, why, and the next step for the patient.", "k": "best"},
        {"t": "The diagnosis alone.", "k": "ok"},
        {"t": "The patient's job and family.", "k": "weak"},
        {"t": "A diagram with no labels.", "k": "weak"}
      ]}
    ],
    "IT": [
      {"q": "A program prints the wrong total. What do you check first?", "opts": [
        {"t": "The input, then the line that adds, using one example you can do by hand.", "k": "best"},
        {"t": "Run it again in case it was luck.", "k": "ok"},
        {"t": "Rewrite it from a blank file.", "k": "weak"},
        {"t": "Change the expected answer to match the program.", "k": "weak"}
      ]},
      {"q": "You must change one function and leave the others working. How?", "opts": [
        {"t": "Change only that function, then run a check that still calls the others.", "k": "best"},
        {"t": "Change it and click the main screen once.", "k": "ok"},
        {"t": "Edit every function so they match.", "k": "weak"},
        {"t": "Comment out the tests.", "k": "weak"}
      ]},
      {"q": "How do you know a small program is finished?", "opts": [
        {"t": "It does the task in the question, including the example, and the bad input.", "k": "best"},
        {"t": "It runs without an error message.", "k": "ok"},
        {"t": "It is more than fifty lines.", "k": "weak"},
        {"t": "A classmate said it looked fine.", "k": "weak"}
      ]}
    ],
    "Business": [
      {"q": "A shop's costs rose and sales did not. What do you look at first?", "opts": [
        {"t": "Which cost rose, and whether the price or the volume can cover it.", "k": "best"},
        {"t": "Say they should advertise more.", "k": "ok"},
        {"t": "Say the shop should close.", "k": "weak"},
        {"t": "Ignore the costs and talk about the brand.", "k": "weak"}
      ]},
      {"q": "The question asks for a recommendation. What belongs in it?", "opts": [
        {"t": "One action, the number that supports it, and the risk if they do nothing.", "k": "best"},
        {"t": "Three ideas with no pick.", "k": "ok"},
        {"t": "A history of the company.", "k": "weak"},
        {"t": "That it depends, with no suggestion.", "k": "weak"}
      ]},
      {"q": "Two figures in the case do not add up. What do you do?", "opts": [
        {"t": "Show the gap and answer from the figures that do reconcile.", "k": "best"},
        {"t": "Use the larger number.", "k": "ok"},
        {"t": "Average them.", "k": "weak"},
        {"t": "Drop the question.", "k": "weak"}
      ]}
    ],
    "MBA": [
      {"q": "A case has a falling margin and a growing team. What do you decide first?", "opts": [
        {"t": "Whether the extra people earn more than they cost, in the numbers given.", "k": "best"},
        {"t": "Recommend a hiring freeze because margin fell.", "k": "ok"},
        {"t": "Praise the culture and skip the margin.", "k": "weak"},
        {"t": "Fire the finance lead in the first paragraph.", "k": "weak"}
      ]},
      {"q": "They want a one-page plan. What is the spine of it?", "opts": [
        {"t": "The goal, the two moves, the cost, and how you will know it worked.", "k": "best"},
        {"t": "A vision sentence and a list of values.", "k": "ok"},
        {"t": "An org chart of every role.", "k": "weak"},
        {"t": "A quote from a famous chief executive.", "k": "weak"}
      ]},
      {"q": "How do you mark a strategy answer as done?", "opts": [
        {"t": "It chooses, it uses the case numbers, and it names what could go wrong.", "k": "best"},
        {"t": "It mentions several frameworks by name.", "k": "ok"},
        {"t": "It is longer than the other answers.", "k": "weak"},
        {"t": "It says the firm should be world class.", "k": "weak"}
      ]}
    ],
    "DBA": [
      {"q": "A research question is too wide for the paper. What do you do?", "opts": [
        {"t": "Narrow it to one setting, one outcome, and the data you actually have.", "k": "best"},
        {"t": "Keep it wide and promise a later study.", "k": "ok"},
        {"t": "Add three more industries.", "k": "weak"},
        {"t": "Drop the question and describe your career.", "k": "weak"}
      ]},
      {"q": "Two studies disagree. How do you use them?", "opts": [
        {"t": "Say how their samples differ and which one fits this question.", "k": "best"},
        {"t": "Cite the newer one and ignore the other.", "k": "ok"},
        {"t": "Average their conclusions.", "k": "weak"},
        {"t": "Say the literature is useless.", "k": "weak"}
      ]},
      {"q": "What has to be true before you call a finding supported?", "opts": [
        {"t": "The method matches the claim, and the result still holds if one assumption slips.", "k": "best"},
        {"t": "The result is statistically busy.", "k": "ok"},
        {"t": "A supervisor liked the paragraph.", "k": "weak"},
        {"t": "It confirms what you hoped.", "k": "weak"}
      ]}
    ],
    "MSc": [
      {"q": "An experiment result is the opposite of the hypothesis. What do you write?", "opts": [
        {"t": "Report the result, check the method, and say what the hypothesis got wrong.", "k": "best"},
        {"t": "Mention it briefly and move to a nicer chart.", "k": "ok"},
        {"t": "Run it again until it matches.", "k": "weak"},
        {"t": "Leave the result out.", "k": "weak"}
      ]},
      {"q": "A measurement has a wide spread. What do you do with it?", "opts": [
        {"t": "Show the spread, and do not claim a precision the data does not have.", "k": "best"},
        {"t": "Report the average only.", "k": "ok"},
        {"t": "Drop the odd points with no reason.", "k": "weak"},
        {"t": "Say the instrument was perfect.", "k": "weak"}
      ]},
      {"q": "How do you know a methods answer is enough?", "opts": [
        {"t": "Someone else could repeat the steps and get the same kind of result.", "k": "best"},
        {"t": "You named the lab.", "k": "ok"},
        {"t": "You used the longest words in the chapter.", "k": "weak"},
        {"t": "The diagram is in colour.", "k": "weak"}
      ]}
    ],
    "PhD": [
      {"q": "The contribution of the thesis is unclear. What do you state?", "opts": [
        {"t": "What was not known, what you did, and what a reader can now claim.", "k": "best"},
        {"t": "A longer literature review.", "k": "ok"},
        {"t": "That the topic is important to society.", "k": "weak"},
        {"t": "A list of every paper you read.", "k": "weak"}
      ]},
      {"q": "A reviewer says the sample is too small. How do you answer?", "opts": [
        {"t": "Say what the sample can support, and what it cannot.", "k": "best"},
        {"t": "Promise a bigger sample next year.", "k": "ok"},
        {"t": "Say sample size does not matter in this field.", "k": "weak"},
        {"t": "Attack the reviewer.", "k": "weak"}
      ]},
      {"q": "What has to be in the conclusion?", "opts": [
        {"t": "The claim, the limit of the evidence, and the one next question.", "k": "best"},
        {"t": "A repeat of the abstract.", "k": "ok"},
        {"t": "Thanks to the department.", "k": "weak"},
        {"t": "A new theory you did not test.", "k": "weak"}
      ]}
    ],
    "Tech": [
      {"q": "A build fails on the last step. What do you check first?", "opts": [
        {"t": "The error on that step, and the input the previous step handed it.", "k": "best"},
        {"t": "Start the whole build again.", "k": "ok"},
        {"t": "Skip the step and ship the rest.", "k": "weak"},
        {"t": "Change the spec so the failure is allowed.", "k": "weak"}
      ]},
      {"q": "You have a spec and a part that is slightly out of size. What do you do?", "opts": [
        {"t": "Stop, measure it, and see if the spec allows that gap.", "k": "best"},
        {"t": "File it down and keep going.", "k": "ok"},
        {"t": "Force it in.", "k": "weak"},
        {"t": "Tell nobody and use it.", "k": "weak"}
      ]},
      {"q": "How do you know a technical answer is finished?", "opts": [
        {"t": "The steps are in order, the units are right, and the result meets the spec.", "k": "best"},
        {"t": "There is a diagram.", "k": "ok"},
        {"t": "It uses every formula in the chapter.", "k": "weak"},
        {"t": "The number looks familiar.", "k": "weak"}
      ]}
    ],
    "MScEng": [
      {"q": "A design meets the load but fails the safety factor. What do you change?", "opts": [
        {"t": "The member that is over the limit, then check the safety factor again.", "k": "best"},
        {"t": "Note the gap and submit the design.", "k": "ok"},
        {"t": "Lower the safety factor in the report.", "k": "weak"},
        {"t": "Say safety factors are conservative and ignore it.", "k": "weak"}
      ]},
      {"q": "The site measure and the model disagree. What do you trust first?", "opts": [
        {"t": "Measure the site again, then see which model assumption was wrong.", "k": "best"},
        {"t": "Trust the model. The site can be messy.", "k": "ok"},
        {"t": "Average the two numbers.", "k": "weak"},
        {"t": "Pick the one that passes.", "k": "weak"}
      ]},
      {"q": "What has to be in the design note?", "opts": [
        {"t": "The load, the choice, the check, and what would make you redo it.", "k": "best"},
        {"t": "The software you used.", "k": "ok"},
        {"t": "A photo of the site.", "k": "weak"},
        {"t": "The budget of the whole company.", "k": "weak"}
      ]}
    ],
    "BBA": [
      {"q": "A customer will not pay, and the sale is already in the books. What do you do?", "opts": [
        {"t": "Leave the sale, chase the cash, and note the debt.", "k": "best"},
        {"t": "Delete the sale so the books look tidy.", "k": "weak"},
        {"t": "Wait a year and see.", "k": "ok"},
        {"t": "Ask them to pay a friend instead.", "k": "weak"}
      ]},
      {"q": "Two costs land in the same month. How do you show them?", "opts": [
        {"t": "In the month the work was done, with a note of what each one is.", "k": "best"},
        {"t": "Whenever the cash happens to leave.", "k": "ok"},
        {"t": "Only if the total is large.", "k": "weak"},
        {"t": "In a private note, not the books.", "k": "weak"}
      ]},
      {"q": "What does a margin tell you?", "opts": [
        {"t": "What is left from the sale after the direct cost.", "k": "best"},
        {"t": "How many staff you have.", "k": "weak"},
        {"t": "The cash in the drawer.", "k": "ok"},
        {"t": "The tax rate next year.", "k": "weak"}
      ]}
    ],
    "BBS": [
      {"q": "A receipt is missing. What do you file instead?", "opts": [
        {"t": "A note of who paid, when, and what for, marked as a copy.", "k": "best"},
        {"t": "Nothing. Skip the line.", "k": "weak"},
        {"t": "A round number you remember.", "k": "ok"},
        {"t": "Someone else's receipt.", "k": "weak"}
      ]},
      {"q": "Why keep a separate column for tax?", "opts": [
        {"t": "So the tax you owe is not mixed into the sale.", "k": "best"},
        {"t": "So the page looks longer.", "k": "weak"},
        {"t": "Only if the customer asks.", "k": "ok"},
        {"t": "Tax is optional in the books.", "k": "weak"}
      ]},
      {"q": "A trial balance does not balance. Where do you start?", "opts": [
        {"t": "The last entry, then the additions.", "k": "best"},
        {"t": "Add a plug number.", "k": "weak"},
        {"t": "Change the opening balance.", "k": "weak"},
        {"t": "Check the largest figures first.", "k": "ok"}
      ]}
    ],
    "ACCA": [
      {"q": "The profit and the cash are different. What do you reconcile?", "opts": [
        {"t": "The timing: what was earned, what was billed, and what was collected.", "k": "best"},
        {"t": "Pick the larger number and call it both.", "k": "weak"},
        {"t": "Ignore cash until the year end.", "k": "ok"},
        {"t": "Move profit into cash by journal.", "k": "weak"}
      ]},
      {"q": "A provision is needed. What makes it a provision?", "opts": [
        {"t": "A present obligation, a probable outflow, and an amount you can estimate.", "k": "best"},
        {"t": "A worry you might have a cost someday.", "k": "ok"},
        {"t": "A number that makes the profit look steadier.", "k": "weak"},
        {"t": "Whatever the manager asks you to book.", "k": "weak"}
      ]},
      {"q": "An entry has no source. What do you do before you post it?", "opts": [
        {"t": "Find the document or refuse the entry.", "k": "best"},
        {"t": "Post it and look later.", "k": "weak"},
        {"t": "Ask a colleague to remember it.", "k": "ok"},
        {"t": "Post it to a suspense account and leave it for years.", "k": "weak"}
      ]}
    ],
    "CA": [
      {"q": "You find last year's stock was overstated. What follows?", "opts": [
        {"t": "Correct the opening stock and say so in the note.", "k": "best"},
        {"t": "Fix it quietly inside this year's purchases.", "k": "weak"},
        {"t": "Mention it only if the auditor asks.", "k": "ok"},
        {"t": "Leave it. Last year is closed.", "k": "weak"}
      ]},
      {"q": "Related-party sales are at a strange price. What do you disclose?", "opts": [
        {"t": "Who the party is, the amount, and that the price is not arm's length.", "k": "best"},
        {"t": "The total sales only.", "k": "ok"},
        {"t": "Nothing, if the owner already knows.", "k": "weak"},
        {"t": "A footnote that says 'various'.", "k": "weak"}
      ]},
      {"q": "What is the point of an audit trail?", "opts": [
        {"t": "So a third person can get from the figure back to the document.", "k": "best"},
        {"t": "So the file is thick.", "k": "weak"},
        {"t": "So you can delete the source later.", "k": "weak"},
        {"t": "So the software has a log, even if nobody can read it.", "k": "ok"}
      ]}
    ],
    "CFA": [
      {"q": "A forecast assumes last year's growth forever. What do you test?", "opts": [
        {"t": "What the value does if growth slows, and say which assumption moves it.", "k": "best"},
        {"t": "Use a higher growth so the deal looks better.", "k": "weak"},
        {"t": "Average it with a guess.", "k": "ok"},
        {"t": "Drop the assumption from the note.", "k": "weak"}
      ]},
      {"q": "Two projects, one pot of cash. How do you choose?", "opts": [
        {"t": "The one with the better return against the risk, within the cash you have.", "k": "best"},
        {"t": "The one the loudest person wants.", "k": "weak"},
        {"t": "The bigger one.", "k": "ok"},
        {"t": "Both, and borrow the rest with no note.", "k": "weak"}
      ]},
      {"q": "What does a discount rate stand for?", "opts": [
        {"t": "The return you give up, and the risk, by waiting for the cash.", "k": "best"},
        {"t": "The inflation printed in the paper.", "k": "ok"},
        {"t": "A number that makes the project pass.", "k": "weak"},
        {"t": "The tax rate.", "k": "weak"}
      ]}
    ],
    "CIPD": [
      {"q": "A manager wants a person gone this week, with no notes. What do you say?", "opts": [
        {"t": "Write the facts, follow the steps, and do not skip the meeting.", "k": "best"},
        {"t": "Do it if the manager insists.", "k": "weak"},
        {"t": "Wait and hope it cools off, with no record.", "k": "ok"},
        {"t": "Tell the person to resign.", "k": "weak"}
      ]},
      {"q": "Pay bands overlap and two people doing the same work are far apart. What do you check?", "opts": [
        {"t": "The band, the reason for the gap, and whether it is fair.", "k": "best"},
        {"t": "Leave it. History is a reason.", "k": "weak"},
        {"t": "Cut the higher one with no talk.", "k": "weak"},
        {"t": "Ask them to sort it out.", "k": "ok"}
      ]},
      {"q": "What belongs in a role description?", "opts": [
        {"t": "The outcomes, the decisions they make, and who they answer to.", "k": "best"},
        {"t": "A list of every task you can think of.", "k": "ok"},
        {"t": "The salary only.", "k": "weak"},
        {"t": "The name of the last person who had it.", "k": "weak"}
      ]}
    ],
    "CLOUD": [
      {"q": "A service is down. What do you check first?", "opts": [
        {"t": "Whether it is the app, the network, or the account that cannot sign in.", "k": "best"},
        {"t": "Restart everything at once.", "k": "weak"},
        {"t": "Tell users to wait an hour.", "k": "ok"},
        {"t": "Turn off the logs so the alerts stop.", "k": "weak"}
      ]},
      {"q": "A key is in the code that was shared. What do you do?", "opts": [
        {"t": "Revoke the key, issue a new one, and take it out of the code.", "k": "best"},
        {"t": "Hope nobody saw it.", "k": "weak"},
        {"t": "Rename the file.", "k": "weak"},
        {"t": "Add a comment that says secret.", "k": "ok"}
      ]},
      {"q": "How do you know a backup is real?", "opts": [
        {"t": "You have restored it once, not just watched it copy.", "k": "best"},
        {"t": "The job said success.", "k": "ok"},
        {"t": "The disk is large.", "k": "weak"},
        {"t": "Someone set it up last year.", "k": "weak"}
      ]}
    ]
  }
};
