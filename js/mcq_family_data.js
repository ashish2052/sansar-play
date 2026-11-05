export const FAM = {
  "family": {
    "banking": [
      {"q": "The cash drawer is short by $20 at close. What do you do?", "opts": [
        {"t": "Recount, match the tape and the last drops, then call the supervisor before you lock up.", "k": "best"},
        {"t": "Recount twice, write $20 short on the close sheet, and lock the drawer.", "k": "ok"},
        {"t": "Drop $20 from your wallet in so the drawer matches, and tell them tomorrow.", "k": "weak"},
        {"t": "Post a $20 shortage to petty cash so the close looks clean.", "k": "weak"}
      ]},
      {"q": "A customer says the deposit was $500 and the slip shows $50. What do you do?", "opts": [
        {"t": "Stop, pull the slip and the count, and correct it with them still at the window.", "k": "best"},
        {"t": "Ask them to wait while you finish the queue, then look.", "k": "ok"},
        {"t": "Tell them the system number is the one that counts.", "k": "weak"},
        {"t": "Void it quietly and retype $500 with no second count.", "k": "weak"}
      ]},
      {"q": "The name on the cheque is not the name on the deposit slip. What do you do?", "opts": [
        {"t": "Do not accept it. Ask whose account it is and what the cheque is for.", "k": "best"},
        {"t": "Take it if they show an ID that is close to the name.", "k": "ok"},
        {"t": "Accept it so the line keeps moving.", "k": "weak"},
        {"t": "Put it in the drawer and fix the name later.", "k": "weak"}
      ]},
      {"q": "Someone wants cash from an account that is not in their name. What do you check?", "opts": [
        {"t": "ID, signing authority, and the account status, before any cash moves.", "k": "best"},
        {"t": "ID only, if they know the balance.", "k": "ok"},
        {"t": "Pay it if they are a regular face.", "k": "weak"},
        {"t": "Pay a small amount so they stop arguing.", "k": "weak"}
      ]},
      {"q": "The queue is long and the screen is slow. What do you do with the person in front of you?", "opts": [
        {"t": "Finish their transaction completely, then take the next person.", "k": "best"},
        {"t": "Do the cash part and ask them to come back for the receipt.", "k": "ok"},
        {"t": "Skip the ID step while the line is this long.", "k": "weak"},
        {"t": "Close your window until the screen catches up.", "k": "weak"}
      ]}
    ],
    "finance": [
      {"q": "The forecast is off the actual result by 15%. What do you do first?", "opts": [
        {"t": "Find which line moved, since when, and whether the driver is real or a bad input.", "k": "best"},
        {"t": "Flag the 15% and send the pack with a note that you are still looking.", "k": "ok"},
        {"t": "Smooth the forecast so the variance drops under 5%.", "k": "weak"},
        {"t": "Change the actual to the forecast and explain it as timing.", "k": "weak"}
      ]},
      {"q": "A large cost landed in the wrong month. How do you fix the story?", "opts": [
        {"t": "Move it to the right month, say what changed, and rerun the variance.", "k": "best"},
        {"t": "Leave it and mention the month in a footnote.", "k": "ok"},
        {"t": "Spread it across the year so no month looks bad.", "k": "weak"},
        {"t": "Drop it from this pack and pick it up next quarter.", "k": "weak"}
      ]},
      {"q": "A director asks you to make the forecast look stronger before the meeting. What do you change?", "opts": [
        {"t": "Nothing in the numbers. You show the case they want as a separate scenario.", "k": "best"},
        {"t": "Lift the growth a little and label it as optimistic.", "k": "ok"},
        {"t": "Use the higher case as the only forecast.", "k": "weak"},
        {"t": "Cut the cost lines until the margin looks right.", "k": "weak"}
      ]},
      {"q": "Two reports show different revenue for the same month. Where do you look?", "opts": [
        {"t": "The source, the filters, and the cut-off date on each report.", "k": "best"},
        {"t": "Send the one that matches last month's story.", "k": "ok"},
        {"t": "Average them and use the average.", "k": "weak"},
        {"t": "Pick the larger one so the team looks better.", "k": "weak"}
      ]},
      {"q": "A copied formula has been wrong for three months. What do you tell the meeting?", "opts": [
        {"t": "Which months are wrong, the corrected figures, and what you changed.", "k": "best"},
        {"t": "That a formula was off, and the new file is cleaner.", "k": "ok"},
        {"t": "Only the corrected month, so old decks stay as they were.", "k": "weak"},
        {"t": "Nothing, if the decision would have been the same.", "k": "weak"}
      ]}
    ],
    "nursing": [
      {"q": "Two patients need you at once. How do you choose?", "opts": [
        {"t": "Go to the one who is less stable, and tell the other when you will be back.", "k": "best"},
        {"t": "Call a colleague for one and stay with the other.", "k": "ok"},
        {"t": "Take the one who asked first so it stays fair.", "k": "weak"},
        {"t": "Split the hour in half so neither can say you ignored them.", "k": "weak"}
      ]},
      {"q": "A patient says the pain is worse than an hour ago. What do you do?", "opts": [
        {"t": "Check when it started, how bad it is, and the chart, then tell the doctor.", "k": "best"},
        {"t": "Recheck the last dose time and ask them to wait for the round.", "k": "ok"},
        {"t": "Give the next dose early because they are in pain.", "k": "weak"},
        {"t": "Tell them this pain is normal after the procedure.", "k": "weak"}
      ]},
      {"q": "The dose on the chart does not match the order. What do you give?", "opts": [
        {"t": "Nothing yet. You check the order with the doctor before any dose.", "k": "best"},
        {"t": "The smaller of the two amounts, and you write that you queried it.", "k": "ok"},
        {"t": "The chart dose, so the round stays on time.", "k": "weak"},
        {"t": "Whatever the patient says they had yesterday.", "k": "weak"}
      ]},
      {"q": "A visitor asks what is wrong with the patient. What do you say?", "opts": [
        {"t": "Nothing clinical, unless the patient has said this person may hear it.", "k": "best"},
        {"t": "That they are stable, and the doctor can say more.", "k": "ok"},
        {"t": "The diagnosis, if the visitor is family.", "k": "weak"},
        {"t": "Enough that they stop asking the desk.", "k": "weak"}
      ]},
      {"q": "The next shift asks what changed. What do you hand over?", "opts": [
        {"t": "Who changed, what you gave, and what they must watch in the next hour.", "k": "best"},
        {"t": "A short note that the ward was busy and the charts are updated.", "k": "ok"},
        {"t": "Tell them in the corridor and skip the written note.", "k": "weak"},
        {"t": "That everyone is fine if nobody called you back.", "k": "weak"}
      ]}
    ],
    "software": [
      {"q": "A bug is in production and users can see it. What do you do first?", "opts": [
        {"t": "Stop the bleeding, say who is hit, and reproduce it before you change more.", "k": "best"},
        {"t": "Roll back if that is safe, then look for the cause.", "k": "ok"},
        {"t": "Ship a quick patch and watch to see if the errors drop.", "k": "weak"},
        {"t": "Hide the button so users stop reaching the bug.", "k": "weak"}
      ]},
      {"q": "The fix sits on the path that takes payment. How do you ship it?", "opts": [
        {"t": "Cover that path with a check, ship small, and watch the payments.", "k": "best"},
        {"t": "Ship it to a few users first if you can.", "k": "ok"},
        {"t": "Ship it now. The bug is worse than a payment risk.", "k": "weak"},
        {"t": "Turn payments off until you are sure.", "k": "weak"}
      ]},
      {"q": "You cannot reproduce the bug on your machine. What do you trust?", "opts": [
        {"t": "The user's steps, the logs, and the version they actually ran.", "k": "best"},
        {"t": "Ask them for a screenshot and try once more.", "k": "ok"},
        {"t": "Close it. If you cannot see it, it is not real.", "k": "weak"},
        {"t": "Rewrite the screen so the old path is gone.", "k": "weak"}
      ]},
      {"q": "A teammate wants to ship without the failing check. What do you say?", "opts": [
        {"t": "No. Fix the check or show why that case cannot happen.", "k": "best"},
        {"t": "Ship if the failing case is rare and you write it down.", "k": "ok"},
        {"t": "Skip the check this once so the release goes out.", "k": "weak"},
        {"t": "Delete the check. It has been noisy all week.", "k": "weak"}
      ]},
      {"q": "Users say the page is slow after your change. What do you compare?", "opts": [
        {"t": "The same page before and after, on the same data, and the slow call.", "k": "best"},
        {"t": "Ask if their network is the problem first.", "k": "ok"},
        {"t": "Add a spinner so the wait feels shorter.", "k": "weak"},
        {"t": "Revert nothing until the next planned release.", "k": "weak"}
      ]}
    ],
    "retail": [
      {"q": "The till does not match the receipts by a small amount. What do you check first?", "opts": [
        {"t": "Recount the cash and match each receipt to the till line.", "k": "best"},
        {"t": "Count the notes again and see if the coins explain it.", "k": "ok"},
        {"t": "Close the till and let the next shift find it.", "k": "weak"},
        {"t": "Add a few dollars so the numbers match.", "k": "weak"}
      ]},
      {"q": "A customer says they were charged twice. What do you do?", "opts": [
        {"t": "Find both charges, show them, and refund the extra one.", "k": "best"},
        {"t": "Ask a supervisor before you refund, and keep the customer informed.", "k": "ok"},
        {"t": "Tell them the machine does not charge twice.", "k": "weak"},
        {"t": "Give them a free item and skip the refund record.", "k": "weak"}
      ]},
      {"q": "How do you close the till at the end of the shift?", "opts": [
        {"t": "Count the drawer, total the receipts, and write any difference.", "k": "best"},
        {"t": "Count the notes and leave the coin detail for the morning.", "k": "ok"},
        {"t": "Lock it. The morning shift counts.", "k": "weak"},
        {"t": "Take a small over home and explain it later.", "k": "weak"}
      ]},
      {"q": "A price on the shelf and the price on the till do not match. Which do you charge?", "opts": [
        {"t": "The shelf price, then fix the till so the next person is right.", "k": "best"},
        {"t": "Call a supervisor if the gap is large, and tell the customer.", "k": "ok"},
        {"t": "The till price. The shelf is only a guide.", "k": "weak"},
        {"t": "Whichever the customer argues for, so they leave happy.", "k": "weak"}
      ]},
      {"q": "The card machine fails in the middle of a sale. What do you do?", "opts": [
        {"t": "Stop, say the charge did not go through, and take another way to pay.", "k": "best"},
        {"t": "Ask them to wait and try the same card once more.", "k": "ok"},
        {"t": "Let them take the goods and pay next time.", "k": "weak"},
        {"t": "Run the card again until some approval appears.", "k": "weak"}
      ]}
    ],
    "cafe": [
      {"q": "The morning rush hits and the machine is slow. What do you do first?", "opts": [
        {"t": "Start the drinks already ordered and tell the line the wait.", "k": "best"},
        {"t": "Make the simple coffees first and call out the longer ones.", "k": "ok"},
        {"t": "Turn the machine off and on until it feels faster.", "k": "weak"},
        {"t": "Tell the line to come back in twenty minutes.", "k": "weak"}
      ]},
      {"q": "A customer wants a drink you have not made before. How do you handle it?", "opts": [
        {"t": "Read the recipe, make it once, and check it with them.", "k": "best"},
        {"t": "Offer the closest drink you already know how to make.", "k": "ok"},
        {"t": "Say the cafe does not do that drink.", "k": "weak"},
        {"t": "Guess the recipe and charge the specialty price.", "k": "weak"}
      ]},
      {"q": "What do you clean before you leave the counter?", "opts": [
        {"t": "The steam wand, the group head, and the counter people touch.", "k": "best"},
        {"t": "Wipe the counter and leave the machine for the next opener.", "k": "ok"},
        {"t": "Only the floor, if it looks dirty.", "k": "weak"},
        {"t": "Nothing. The night cleaner does the machine.", "k": "weak"}
      ]},
      {"q": "You are short of milk and the rush is still going. What do you do?", "opts": [
        {"t": "Say which drinks you can still make, and send someone for milk.", "k": "best"},
        {"t": "Stretch the milk with a little water in the jugs.", "k": "weak"},
        {"t": "Switch to black coffee only and announce it.", "k": "ok"},
        {"t": "Keep selling lattes until the jug is empty.", "k": "weak"}
      ]},
      {"q": "A drink goes out wrong and the customer is at the pass. What do you do?", "opts": [
        {"t": "Remake it now, and check the ticket against the cup.", "k": "best"},
        {"t": "Offer a different size if that is faster.", "k": "ok"},
        {"t": "Tell them it is what they ordered.", "k": "weak"},
        {"t": "Ask them to rejoin the queue.", "k": "weak"}
      ]}
    ],
    "office": [
      {"q": "Two files have the same name. How do you tell them apart?", "opts": [
        {"t": "Open both, check the date and the name inside, and label them.", "k": "best"},
        {"t": "Add today's date to the newer one and leave a note.", "k": "ok"},
        {"t": "Keep the thicker file and archive the other.", "k": "weak"},
        {"t": "Leave them. The owner will notice.", "k": "weak"}
      ]},
      {"q": "The phone rings while you are mid-file. What do you do?", "opts": [
        {"t": "Answer, take the name and the message, then go back to the same file.", "k": "best"},
        {"t": "Let it ring twice and call them back when the file is closed.", "k": "ok"},
        {"t": "Ignore it until the filing is finished.", "k": "weak"},
        {"t": "Pick up and ask them to call another desk.", "k": "weak"}
      ]},
      {"q": "How do you know a record is complete?", "opts": [
        {"t": "Every required field is filled and it matches the source paper.", "k": "best"},
        {"t": "The name and the date are there, so the rest can follow.", "k": "ok"},
        {"t": "The folder is thick enough to file.", "k": "weak"},
        {"t": "Nobody has asked for it, so it is complete.", "k": "weak"}
      ]},
      {"q": "A meeting in an hour needs a number you do not trust. What do you send?", "opts": [
        {"t": "The source, the number, and a line that says what is still unchecked.", "k": "best"},
        {"t": "The number with a verbal warning when you walk in.", "k": "ok"},
        {"t": "Last month's number, which you do trust.", "k": "weak"},
        {"t": "A round number that will not embarrass the slide.", "k": "weak"}
      ]},
      {"q": "Two managers want opposite things filed today. What do you do?", "opts": [
        {"t": "Write both requests, the deadline, and ask which one waits.", "k": "best"},
        {"t": "Do the one from the senior manager first.", "k": "ok"},
        {"t": "Do the shorter one so something is finished.", "k": "weak"},
        {"t": "File neither until they agree.", "k": "weak"}
      ]}
    ],
    "sales": [
      {"q": "A customer likes the product and then goes quiet. What do you say?", "opts": [
        {"t": "Ask which part they are unsure about, then answer that.", "k": "best"},
        {"t": "Restate the price and what is included, then wait.", "k": "ok"},
        {"t": "Tell them the offer ends today.", "k": "weak"},
        {"t": "Move on to an easier customer.", "k": "weak"}
      ]},
      {"q": "They say it costs too much. How do you answer?", "opts": [
        {"t": "Say what they get for the price, and offer a smaller option if one exists.", "k": "best"},
        {"t": "Ask what they expected to pay, then see if a real option fits.", "k": "ok"},
        {"t": "Cut the price until they stop objecting.", "k": "weak"},
        {"t": "Agree it is high and end the call.", "k": "weak"}
      ]},
      {"q": "How do you know a sale is actually closed?", "opts": [
        {"t": "They have paid or signed, and both of you know the next step.", "k": "best"},
        {"t": "They said yes and asked for a written quote.", "k": "ok"},
        {"t": "They took a brochure and smiled.", "k": "weak"},
        {"t": "You talked for a long time and they liked you.", "k": "weak"}
      ]},
      {"q": "A lead is warm and your manager wants it logged as won. What do you log?", "opts": [
        {"t": "The stage it is really at, and the next date you will talk.", "k": "best"},
        {"t": "Won, if they said they are very likely.", "k": "weak"},
        {"t": "A late stage, with a note that it is not signed.", "k": "ok"},
        {"t": "Won, so the week looks on target.", "k": "weak"}
      ]},
      {"q": "They ask for a feature you do not have. What do you say?", "opts": [
        {"t": "Say you do not have it, and what you do have that covers the need.", "k": "best"},
        {"t": "Promise to check with the product team and call back.", "k": "ok"},
        {"t": "Say it is on the roadmap for next month.", "k": "weak"},
        {"t": "Say yes, and hope they forget.", "k": "weak"}
      ]}
    ],
    "design": [
      {"q": "The brief is one sentence. What do you ask before you start?", "opts": [
        {"t": "Who it is for, what they must do with it, and the deadline.", "k": "best"},
        {"t": "Which colours they like and where it will be seen.", "k": "ok"},
        {"t": "Start three layouts and let them pick.", "k": "weak"},
        {"t": "Copy a known design and change the name.", "k": "weak"}
      ]},
      {"q": "They hate the first layout. What do you change?", "opts": [
        {"t": "Ask what failed, change that, and keep what still works.", "k": "best"},
        {"t": "Change the colours and the type and show it again.", "k": "ok"},
        {"t": "Start over with no brief so it feels new.", "k": "weak"},
        {"t": "Tell them the first one matches the brief.", "k": "weak"}
      ]},
      {"q": "How do you know a design is ready to show?", "opts": [
        {"t": "It matches the brief, the text is readable, and the file is the right size.", "k": "best"},
        {"t": "It looks right on your screen and the type is spelled.", "k": "ok"},
        {"t": "You have used the hours they paid for.", "k": "weak"},
        {"t": "A friend said it looked sharp.", "k": "weak"}
      ]},
      {"q": "The logo is unreadable at the size they will print. What do you do?", "opts": [
        {"t": "Show it at the real size and change it until it reads.", "k": "best"},
        {"t": "Send a larger version and note the risk.", "k": "ok"},
        {"t": "Ship it. They asked for that logo.", "k": "weak"},
        {"t": "Add a shadow so it looks heavier.", "k": "weak"}
      ]},
      {"q": "Two stakeholders want different directions. What do you put in front of them?", "opts": [
        {"t": "Both, against the brief, with what you recommend and why.", "k": "best"},
        {"t": "The one the senior person asked for.", "k": "ok"},
        {"t": "A mix of both so nobody loses.", "k": "weak"},
        {"t": "Your favourite, and hide the other.", "k": "weak"}
      ]}
    ],
    "medicine": [
      {"q": "A patient describes two symptoms. What do you ask next?", "opts": [
        {"t": "When each started, what makes it worse, and what else changed.", "k": "best"},
        {"t": "Which one is worse, then examine that first.", "k": "ok"},
        {"t": "Name the likely diagnosis so they feel heard.", "k": "weak"},
        {"t": "Tell them it is stress and book a later visit.", "k": "weak"}
      ]},
      {"q": "The first treatment has done nothing. What do you reconsider?", "opts": [
        {"t": "The diagnosis, the dose, and whether they actually took it.", "k": "best"},
        {"t": "Give it another week and review then.", "k": "ok"},
        {"t": "Double the dose the same day.", "k": "weak"},
        {"t": "Discharge them and blame poor compliance.", "k": "weak"}
      ]},
      {"q": "What has to be in the note before they leave?", "opts": [
        {"t": "What you found, what you decided, and what they should do next.", "k": "best"},
        {"t": "The diagnosis and the drug name.", "k": "ok"},
        {"t": "A short line, if you will remember the rest.", "k": "weak"},
        {"t": "Their job and who came with them.", "k": "weak"}
      ]},
      {"q": "A result is back and it is urgent. The clinic is full. What do you do?", "opts": [
        {"t": "Reach the patient now, say what it means, and arrange the next step.", "k": "best"},
        {"t": "Book them at the end of the day and mark it urgent.", "k": "ok"},
        {"t": "Wait for their next booked visit.", "k": "weak"},
        {"t": "Ask the nurse to mention it if they call.", "k": "weak"}
      ]},
      {"q": "The patient wants a treatment you think will not help. What do you say?", "opts": [
        {"t": "Why you do not recommend it, and what you do recommend instead.", "k": "best"},
        {"t": "That you can try it if they understand the limit.", "k": "ok"},
        {"t": "Prescribe it so the visit ends well.", "k": "weak"},
        {"t": "Refuse and end the consult.", "k": "weak"}
      ]}
    ],
    "support": [
      {"q": "A screen is blank and the user is waiting. What do you ask first?", "opts": [
        {"t": "Is the power on, and did it work before they changed anything?", "k": "best"},
        {"t": "Ask them to restart and stay on the line.", "k": "ok"},
        {"t": "Tell them the machine is too old to fix.", "k": "weak"},
        {"t": "Read the whole manual from the start.", "k": "weak"}
      ]},
      {"q": "It worked yesterday and fails today. Where do you start?", "opts": [
        {"t": "Ask what changed since yesterday, then test that one thing.", "k": "best"},
        {"t": "Reinstall the app they were using.", "k": "ok"},
        {"t": "Call it a virus and stop.", "k": "weak"},
        {"t": "Close the ticket as user error.", "k": "weak"}
      ]},
      {"q": "How do you write the fix so the next person can follow it?", "opts": [
        {"t": "What broke, what you changed, and how you checked the fix.", "k": "best"},
        {"t": "Fixed, the date, and the user's name.", "k": "ok"},
        {"t": "Tell them in chat and write nothing.", "k": "weak"},
        {"t": "Paste an old ticket that sounds similar.", "k": "weak"}
      ]},
      {"q": "The same ticket has come back three times. What do you change?", "opts": [
        {"t": "Read the old fixes, find what was never checked, and test that.", "k": "best"},
        {"t": "Escalate it with the three dates attached.", "k": "ok"},
        {"t": "Apply the same fix again, harder.", "k": "weak"},
        {"t": "Ask the user to stop reopening it.", "k": "weak"}
      ]},
      {"q": "A password reset is requested by chat, not by the account holder on the phone. What do you do?", "opts": [
        {"t": "Do not reset it until you have confirmed it is really them.", "k": "best"},
        {"t": "Reset it if the chat name matches the account.", "k": "ok"},
        {"t": "Reset it so they can get back to work.", "k": "weak"},
        {"t": "Send the current password so they can try it.", "k": "weak"}
      ]}
    ],
    "engineering": [
      {"q": "A measurement is a little out. Do you build on, or stop?", "opts": [
        {"t": "Stop, measure it again, and fix it before the next piece.", "k": "best"},
        {"t": "Mark it and keep going only if it is inside the tolerance.", "k": "ok"},
        {"t": "Build on. Small errors average out.", "k": "weak"},
        {"t": "Change the drawing so the measure looks right.", "k": "weak"}
      ]},
      {"q": "The plan and the site do not agree. What do you trust first?", "opts": [
        {"t": "Measure the site, then check which plan revision is current.", "k": "best"},
        {"t": "Trust the latest plan and note the site gap.", "k": "ok"},
        {"t": "Trust whoever is loudest on the site.", "k": "weak"},
        {"t": "Pick the easier one and hide the gap.", "k": "weak"}
      ]},
      {"q": "What do you check before you call a fault fixed?", "opts": [
        {"t": "The same measure that failed, taken again, against the spec.", "k": "best"},
        {"t": "That the crew says it looks right.", "k": "ok"},
        {"t": "That the shift is over and nobody is waiting.", "k": "weak"},
        {"t": "That the inspector is not on site today.", "k": "weak"}
      ]},
      {"q": "A part arrived that is close to the spec but not the spec. What do you do?", "opts": [
        {"t": "Hold it, compare it to the spec, and get a decision before it is built in.", "k": "best"},
        {"t": "Use it if the difference is only a millimetre.", "k": "ok"},
        {"t": "Use it. The job is already late.", "k": "weak"},
        {"t": "Cut it down on site and say nothing.", "k": "weak"}
      ]},
      {"q": "Someone could get hurt if this step is rushed. The schedule says today. What do you do?", "opts": [
        {"t": "Stop that step, say the hazard, and agree a safe way before you continue.", "k": "best"},
        {"t": "Add a warning and keep the crew moving slowly.", "k": "ok"},
        {"t": "Do it today and brief them after.", "k": "weak"},
        {"t": "Let the experienced people skip the check.", "k": "weak"}
      ]}
    ],
    "hr": [
      {"q": "A manager wants someone gone this week, and there are no notes. What do you do?", "opts": [
        {"t": "Stop the exit. Write the facts, follow the steps, and hold the meeting.", "k": "best"},
        {"t": "Ask the manager for the notes before you book anything.", "k": "ok"},
        {"t": "Process it if the manager will sign.", "k": "weak"},
        {"t": "Suggest the person resign so it stays quiet.", "k": "weak"}
      ]},
      {"q": "Two people do the same work and their pay is far apart. What do you check?", "opts": [
        {"t": "The band, the reason for the gap, and whether it is fair.", "k": "best"},
        {"t": "Ask the manager if the gap was intended.", "k": "ok"},
        {"t": "Leave it. History is a reason.", "k": "weak"},
        {"t": "Cut the higher pay with no conversation.", "k": "weak"}
      ]},
      {"q": "What belongs in a role description?", "opts": [
        {"t": "The outcomes, the decisions they make, and who they answer to.", "k": "best"},
        {"t": "The main tasks and the team name.", "k": "ok"},
        {"t": "The salary and the title only.", "k": "weak"},
        {"t": "The name of the last person in the seat.", "k": "weak"}
      ]},
      {"q": "An employee says a colleague is bullying them. What is your first step?", "opts": [
        {"t": "Hear the facts, dates and witnesses, and tell them what happens next.", "k": "best"},
        {"t": "Ask the manager to have a quiet word.", "k": "ok"},
        {"t": "Tell them to sort it out between themselves.", "k": "weak"},
        {"t": "Move the complainant so the noise stops.", "k": "weak"}
      ]},
      {"q": "A hiring manager wants to skip the interview because they know the candidate. What do you say?", "opts": [
        {"t": "The same questions and the same bar as everyone else.", "k": "best"},
        {"t": "A shorter interview, with the conflict noted.", "k": "ok"},
        {"t": "Hire them. A known person is safer.", "k": "weak"},
        {"t": "Skip the posting so nobody else applies.", "k": "weak"}
      ]}
    ],
    "hospitality": [
      {"q": "A table's food is late and they are angry. What do you do?", "opts": [
        {"t": "Apologise, find out where the order is, and tell them a real time.", "k": "best"},
        {"t": "Offer water and say the kitchen is busy.", "k": "ok"},
        {"t": "Tell them the kitchen is doing its best.", "k": "weak"},
        {"t": "Avoid the table until the food is up.", "k": "weak"}
      ]},
      {"q": "A guest says the bill is wrong. What do you check?", "opts": [
        {"t": "The order, the items on the bill, and any discount you promised.", "k": "best"},
        {"t": "Take an item off if they are sure.", "k": "ok"},
        {"t": "Say the system does not make that mistake.", "k": "weak"},
        {"t": "Split the difference so they pay and leave.", "k": "weak"}
      ]},
      {"q": "You are short one server on a full night. How do you cover the room?", "opts": [
        {"t": "Shrink the sections, tell the team, and keep the door honest about the wait.", "k": "best"},
        {"t": "Ask everyone to move faster and take extra tables.", "k": "ok"},
        {"t": "Seat every table and hope the food pace saves you.", "k": "weak"},
        {"t": "Close the kitchen early with no warning.", "k": "weak"}
      ]},
      {"q": "A guest wants a room that is not clean yet. What do you offer?", "opts": [
        {"t": "A real time, a place to wait, or another room that is actually ready.", "k": "best"},
        {"t": "Ask housekeeping to rush and seat them in the lobby.", "k": "ok"},
        {"t": "Give them the key and say the towels are coming.", "k": "weak"},
        {"t": "Tell them the booking starts later than it does.", "k": "weak"}
      ]},
      {"q": "How do you know a shift is ready to hand over?", "opts": [
        {"t": "Open tables, complaints, and what the next shift must finish are written down.", "k": "best"},
        {"t": "You tell the next supervisor the night was busy.", "k": "ok"},
        {"t": "The cash is in the drawer, so the rest can wait.", "k": "weak"},
        {"t": "You leave when your hours are done.", "k": "weak"}
      ]}
    ],
    "trades": [
      {"q": "The drawing and the wall in front of you do not match. What do you do?", "opts": [
        {"t": "Stop that cut, measure the wall, and ask which drawing is current.", "k": "best"},
        {"t": "Follow the wall and note the difference.", "k": "ok"},
        {"t": "Follow the drawing and force the wall.", "k": "weak"},
        {"t": "Cut it so it looks right and move on.", "k": "weak"}
      ]},
      {"q": "A tool is damaged at the start of the job. What do you do?", "opts": [
        {"t": "Tag it out, say so, and use a sound tool before you start.", "k": "best"},
        {"t": "Use it carefully if the job is small.", "k": "ok"},
        {"t": "Use it. Replacing it will lose the morning.", "k": "weak"},
        {"t": "Hide it in the van so nobody asks.", "k": "weak"}
      ]},
      {"q": "You are not sure the fix will hold. The client wants to pay and leave. What do you say?", "opts": [
        {"t": "That it is not finished, what is wrong, and when you will make it hold.", "k": "best"},
        {"t": "That you will come back tomorrow, and you do not take the pay yet.", "k": "ok"},
        {"t": "Take the pay and come back if they call.", "k": "weak"},
        {"t": "Say it is done. It looks fine.", "k": "weak"}
      ]},
      {"q": "An apprentice is about to do a step wrong. What do you do?", "opts": [
        {"t": "Stop them, show the step, and watch them do it once.", "k": "best"},
        {"t": "Let them finish and correct it after.", "k": "ok"},
        {"t": "Take the tool and do it yourself with no explanation.", "k": "weak"},
        {"t": "Let them learn from the mistake.", "k": "weak"}
      ]},
      {"q": "How do you leave a job so the next person can continue?", "opts": [
        {"t": "What is done, what is not, and which materials are still good.", "k": "best"},
        {"t": "A photo of the work and the time you left.", "k": "ok"},
        {"t": "Tools in the corner. They will see it.", "k": "weak"},
        {"t": "Nothing, if you will be back in the morning.", "k": "weak"}
      ]}
    ],
    "teaching": [
      {"q": "Half the class has not understood the example. What do you do?", "opts": [
        {"t": "Stop, find the step they lost, and teach that step again.", "k": "best"},
        {"t": "Give one more example and move on.", "k": "ok"},
        {"t": "Tell them to read it at home.", "k": "weak"},
        {"t": "Finish the plan so you stay on the timetable.", "k": "weak"}
      ]},
      {"q": "Two students need you while the rest are working. Who do you go to?", "opts": [
        {"t": "The one who is stuck and cannot continue, and tell the other you are coming.", "k": "best"},
        {"t": "The one who asked first, then the other.", "k": "ok"},
        {"t": "Whoever is loudest.", "k": "weak"},
        {"t": "Neither. They should ask a neighbour.", "k": "weak"}
      ]},
      {"q": "A parent wants a grade changed. What do you show them?", "opts": [
        {"t": "The work, the mark scheme, and what would have scored higher.", "k": "best"},
        {"t": "The grade and the class average.", "k": "ok"},
        {"t": "That grades are final and the talk is over.", "k": "weak"},
        {"t": "A higher grade so the meeting ends.", "k": "weak"}
      ]},
      {"q": "You suspect a student copied the homework. What do you do?", "opts": [
        {"t": "Ask them to explain the work, then decide from what they can show.", "k": "best"},
        {"t": "Mark it, and watch the next piece.", "k": "ok"},
        {"t": "Give zero with no conversation.", "k": "weak"},
        {"t": "Ignore it. Homework is only practice.", "k": "weak"}
      ]},
      {"q": "How do you know a lesson landed?", "opts": [
        {"t": "They can do a new question of the same kind without you.", "k": "best"},
        {"t": "They nodded and the board is copied down.", "k": "ok"},
        {"t": "You finished the slides.", "k": "weak"},
        {"t": "The room was quiet.", "k": "weak"}
      ]}
    ]
  },
  "map": {
    "cashier": "retail",
    "barista": "cafe",
    "clerk": "office",
    "sales": "sales",
    "designer": "design",
    "nurse": "nursing",
    "analyst": "finance",
    "doctor": "medicine",
    "jr-accounts": "finance",
    "support": "support",
    "engineer": "engineering",
    "dev": "software",
    "lead": "software",
    "teller": "banking",
    "bank-off": "banking",
    "rel-mgr": "banking",
    "branch-mgr": "banking",
    "region-mgr": "banking",
    "bank-dir": "banking",
    "fpa-asc": "finance",
    "fpa-an": "finance",
    "sr-fpa": "finance",
    "fpa-mgr": "finance",
    "fin-dir": "finance",
    "asst-acct": "finance",
    "acct": "finance",
    "sr-acct": "finance",
    "accts-mgr": "finance",
    "fin-ctrl": "finance",
    "cfo": "finance",
    "med-asst": "nursing",
    "med-nurse": "nursing",
    "sr-nurse": "nursing",
    "med-doc": "medicine",
    "consult": "medicine",
    "med-dir": "medicine",
    "it-sup": "support",
    "it-dev": "software",
    "sr-dev": "software",
    "tech-lead": "software",
    "eng-mgr": "software",
    "cto": "software",
    "hr-asst": "hr",
    "hr-off": "hr",
    "hr-mgr": "hr",
    "hr-dir": "hr",
    "chro": "hr",
    "ops-asst": "office",
    "ops-mgr": "office",
    "gm": "office",
    "coo": "office",
    "ceo": "office",
    "sales-asst": "sales",
    "mkt-exec": "sales",
    "sales-mgr": "sales",
    "mkt-mgr": "sales",
    "mkt-dir": "sales",
    "cmo": "sales",
    "teach-asst": "teaching",
    "teacher": "teaching",
    "sr-teach": "teaching",
    "hod": "teaching",
    "principal": "teaching",
    "edu-dir": "teaching",
    "server": "hospitality",
    "sup": "hospitality",
    "rest-mgr": "hospitality",
    "hotel-mgr": "hospitality",
    "hosp-gm": "hospitality",
    "hosp-dir": "hospitality",
    "apprentice": "trades",
    "tradesman": "trades",
    "sr-trade": "trades",
    "foreman": "trades",
    "site-mgr": "trades",
    "contractor": "trades"
  }
};
