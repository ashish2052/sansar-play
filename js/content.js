// Sansar scripted content. Pure text, no AI on the path.
// Effects: H happiness, L health, S smarts, B looks, $ cash (base USD, scaled by country), R mother/father relationship.
// {40} in text = 40 base dollars in the player's currency. Conditions: job nojob school pet rich poor adult.
// sav = savings account % a year (credited monthly), fd = 1-year fixed deposit % a year.
export const COUNTRIES = {
  Nepal:{sym:'$',rate:133,price:.25,wage:.10,sav:4,fd:7,names:['Aarav','Sita','Bikash','Anita','Prabin','Sunita','Rohan','Maya'],last:['Shrestha','Gurung','Thapa','Rai','Sharma','Tamang'],mom:'Sunita',dad:'Ramesh'},
  USA:{sym:'$',rate:1,price:1,wage:1,sav:.6,fd:4.5,names:['Jordan','Emma','Liam','Olivia','Noah','Ava','Mason','Mia'],last:['Smith','Johnson','Brown','Davis','Miller','Wilson'],mom:'Karen',dad:'Mike'},
  UK:{sym:'$',rate:.8,price:1.05,wage:.85,sav:2.5,fd:4,names:['Oliver','Amelia','George','Isla','Harry','Poppy','Jack','Freya'],last:['Taylor','Evans','Clarke','Walker','Hughes','Patel'],mom:'Sarah',dad:'David'},
  India:{sym:'$',rate:84,price:.3,wage:.16,sav:3,fd:7,names:['Arjun','Priya','Rahul','Ananya','Vikram','Diya','Kabir','Meera'],last:['Sharma','Iyer','Singh','Reddy','Das','Khan'],mom:'Sunita',dad:'Rajesh'},
  Australia:{sym:'$',rate:1.5,price:1.1,wage:1,sav:2.5,fd:4.2,names:['Jack','Charlotte','Lachlan','Matilda','Cooper','Ruby','Noah','Zoe'],last:['Williams','Jones','Nguyen','Kelly','Ryan','Murphy'],mom:'Jenny',dad:'Craig'},
  Canada:{sym:'$',rate:1.38,price:1.05,wage:.95,sav:1.5,fd:4,names:['Liam','Chloe','Ethan','Zoe','Lucas','Maya','Owen','Nora'],last:['Tremblay','Roy','Wilson','Singh','Chen','Martin'],mom:'Linda',dad:'Paul'},
  Germany:{sym:'$',rate:.93,price:1,wage:.9,sav:1,fd:2.8,names:['Lukas','Emilia','Felix','Hannah','Jonas','Lina','Paul','Mia'],last:['Müller','Schmidt','Weber','Fischer','Wagner','Becker'],mom:'Petra',dad:'Stefan'},
  Brazil:{sym:'$',rate:5.2,price:.45,wage:.2,sav:6,fd:10,names:['Gabriel','Beatriz','Lucas','Julia','Rafael','Laura','Pedro','Sofia'],last:['Silva','Santos','Oliveira','Souza','Costa','Lima'],mom:'Ana',dad:'Carlos'}
};

export const EVENTS = `
17-95||You find {40} in an old jacket.|H+2 $+40
17-95||A stranger smiles at you on the street. It makes your whole day.|H+3
17-95||You get food poisoning from a questionable street snack.|L-5 H-2
17-95||Heavy rain floods your street. You wade home with your shoes in your hand.|H-2 L-1
17-95||A stray dog follows you home. It looks very proud of itself.|H+2
17-95||You catch a cold and spend three days under a blanket.|L-4 H-1
17-95||Power cut in the evening. You eat dinner by candlelight and enjoy it.|H+2
17-95||Your phone screen cracks. Repair costs {45}.|H-2 $-45
17-95||You bump into an old school friend and talk for hours.|H+4
17-95||You oversleep and miss the bus. Everything feels slightly worse today.|H-2
17-95||Your neighbour brings you homemade food.|H+2 L+1
17-95||Someone pickpockets you in a crowded market. You lose {30}.|H-3 $-30
17-95||A street musician plays your favourite song. You stop and listen to all of it.|H+3
17-95||You finish a jigsaw puzzle at last. Tiny, quiet pride.|H+2 S+1
17-95||You fall asleep on the train and miss your stop by six stops.|H-1
17-95||You laugh so hard at a joke that you cry.|H+3
17-95||You discover a hidden viewpoint over the town. It becomes your thinking spot.|H+3
17-95||A bad haircut. You wear a cap for two weeks.|B-3 H-1
17-95||You sprain your ankle stepping off a kerb.|L-4 H-1
17-95||You learn to cook a new dish that actually tastes great.|H+3 S+1
17-95||A heatwave drains you. Everything takes twice the effort.|L-2 H-1
17-95||You get a surprise compliment on your style.|B+2 H+2
17-95||You are stuck in traffic for three hours and listen to a whole audiobook chapter.|S+1 H-1
17-95||Your best friend moves to another country. You promise to call every week.|H-4
17-95||You join a neighbourhood clean-up. People thank you warmly.|H+3
17-95||You read an article that changes how you think about money.|S+2
17-95||An unexpected tax refund arrives: {120}.|H+3 $+120
17-95||You lose your wallet. A kind stranger returns it, nothing missing.|H+2
17-95||You binge a whole series in one weekend. Zero regrets, slightly dry eyes.|H+2 L-1
17-95||A bout of insomnia keeps you up for a week.|L-3 H-2
17-95||You win a small raffle at a local fair: {60}.|H+3 $+60
17-95||You learn a few phrases in a new language and use them immediately.|S+2 H+1
17-95||A cousin's wedding. Great food, loud music, aching feet.|H+3 L-1
17-95||You cut your hand cooking. Dramatic, but fine.|L-2
17-95||You sleep eleven hours and wake up feeling brand new.|L+3 H+2
17-95||A viral video of you tripping gets thousands of views.|H-3 B-1
17-95||You adopt a new morning routine and stick with it.|L+3 H+2
17-95||Scammers call you pretending to be your bank. You hang up in time.|S+2
17-95||You get caught in a thunderstorm without an umbrella and dance in it anyway.|H+3
17-95||Your landlord raises the rent a little.|H-2 $-70
17-95||You donate blood. Free biscuits, a sticker, a warm feeling.|H+2 L+1
17-95||You get stuck in a lift with a stranger. You become friends.|H+3
17-95||You buy a second-hand bike and discover half the town on it.|L+3 H+2
17-95||A nasty flu goes around. You catch all of it.|L-6 H-2
17-95||You paint a wall in your room a bold colour. Best decision this year.|H+3
17-95||A long power nap changes your whole afternoon.|L+1 H+1
17-95||You overspend on a sale and regret the pile of things.|H-1 $-90
17-95||Someone you admire answers your message. You grin at your phone.|H+3
17-95||You walk everywhere for a month. Your legs thank you.|L+4 B+1
17-95||You lock yourself out and wait two hours for a spare key.|H-2
17-95||You get to see a spectacular sunrise from a rooftop.|H+4
17-95||A rumour about you goes round town. It is mostly nonsense.|H-3
17-95||Your favourite cafe closes. You hold a small funeral for the flat white.|H-2
17-95||An old photo album surfaces and you spend the evening smiling.|H+3
17-95||Mosquitoes feast on you all season.|L-2 H-1
17-95||You finally fix the leak that has been annoying you for a year.|H+2 $-35
17-95||You run a 5k for charity. Last place, loudest cheering.|L+3 H+3 B+1
17-95||You take up gardening. Basil wins.|H+2 L+1
17-95||A pigeon steals your lunch. You are not even angry. You are impressed.|H+1
17-95||You teach someone how to ride a bike. Both of you are beaming.|H+4
17-95||Your internet is down for a week. You read three books.|S+3 H-1
17-95||A broken tooth means an emergency dentist visit.|L-2 $-80
17-95||You rewatch your favourite film and notice things you missed.|H+2 S+1
17-95||You stay up all night to watch a meteor shower.|H+4 L-1
17-95||You volunteer to teach kids to code. They teach you patience.|H+4 S+1
17-95||A scam text promises a prize. You ignore it and feel clever.|S+1
17-95||You break a mirror. Superstition says seven years; you decide not to check.|H-1
17-95||You make a perfect cup of tea. Savour it.|H+2
17-95||The local football team wins the league. The whole town sings.|H+4
17-95||A stranger asks for directions and you actually know the way.|H+1
17-95||You get a speeding ticket. Fine: {55}.|H-3 $-55
17-95||You buy a houseplant. You name it. It survives.|H+2
17-95||A pothole eats your bicycle wheel.|H-2 $-25
17-95||You start journaling. Your head feels lighter.|H+3 S+1
17-95||You take a day trip to the coast and sit watching waves for an hour.|H+4 L+1
17-95||You wake with a stiff neck and can only look left for a week.|L-2
17-95||A small earthquake rattles the town. Everyone gathers outside and shares tea.|H+1
17-95||You get a surprise day off. You use it on absolutely nothing. Glorious.|H+4
17-95||You accidentally reply-all. Awkward week.|H-3
17-95||You find a beautiful second-hand jacket for almost nothing.|B+2 H+2 $-20
17-95||A tropical fruit stall opens near you. You become a regular.|L+2 H+1
17-95||You get a sunburn the colour of a tomato.|L-2 B-1
17-95||The neighbourhood throws a street party. You dance until midnight.|H+5 L+1
17-95||You fix someone's broken laptop for free. They never forget it.|H+3 S+1
17-95||Your jeans stop fitting. You blame the dryer.|B-2 H-1
17-95||You try a new hairstyle. It works.|B+3 H+2
17-95||You pass your driving test on the second attempt.|S+2 H+3
17-95||You hurt your back lifting something heavy.|L-4
17-95||A kind note is left on your door by an unknown neighbour.|H+3
17-95||You spend a rainy weekend learning to play the guitar.|S+2 H+2
17-95||Your bank charges a mystery fee.|H-2 $-18
17-95||You sleep badly on a long bus ride, but the view is worth it.|H+1 L-1
17-95||You take a cold shower every morning for a month. Weirdly effective.|L+3 H+1
17-95||You make a friend at the gym who actually keeps you going.|L+3 H+3
17-95||A friend asks you to be the best man or maid of honour.|H+4
17-95||You spill coffee on a stranger. They laugh. You exchange numbers.|H+3
17-95||A tiny lizard moves into your room. You call it Gary.|H+2
25-95|job|Your boss praises your work in front of the team.|H+4 S+1
25-95|job|A colleague takes credit for your idea. You seethe silently.|H-4
20-95|job|The office coffee machine breaks. Productivity collapses.|H-2
20-95|job|You get a small bonus: {200}.|H+4 $+200
20-95|job|A tough deadline keeps you at the office until midnight all week.|L-4 H-3 S+1
20-95|job|Your team wins a client. Pizza party!|H+4
20-95|job|A rude customer ruins your morning.|H-3
20-95|job|You are asked to train a new hire. They look up to you.|H+3 S+1
20-95|nojob|Months without work wear you down.|H-4 L-1
20-95|nojob|A friend offers a quick gig worth {150}.|H+2 $+150
20-95|nojob|You spend the year applying everywhere. A little rejection hurts.|H-3 S+1
17-40|school|An exam you barely studied for goes surprisingly well.|S+3 H+3
17-40|school|You pull an all-nighter before a deadline.|S+2 L-3
17-40|school|A professor takes interest in you and recommends a book.|S+3 H+2
17-40|school|Group project: you do all the work. Classic.|H-3 S+2
17-40|school|You win a small essay prize.|S+3 H+3 $+80
17-40|school|You join a study group and everyone passes.|S+3 H+2
17-30||Your first flat: the shower is a trickle and the walls are thin. You love it.|H+3
17-30||You fall for someone. It is thrilling and terrifying.|H+4 L-1
17-30||A breakup. You listen to sad songs for a week.|H-6 L-1
17-30||You cut your hair short and feel like a new person.|B+2 H+3
17-30||Your first festival. Mud, music, memories.|H+5 L-1 $-60
17-30||A road trip with friends, bad snacks, great stories.|H+5 $-70
30-95||A friend gets married. You catch yourself calculating your own life.|H-1 S+1
30-95||You start to notice grey hairs. You name each one.|B-2
30-95||A long weekend in the hills clears your head.|H+4 L+2 $-80
30-95||Your knees now predict the weather.|L-2
30-95||You realise you have been working too much and take a proper holiday.|H+5 L+2 $-200
40-95||Your doctor says your cholesterol is "a bit enthusiastic".|L-3 H-1
40-95||A midlife crisis. You buy an outrageous hat.|H+3 B-1 $-60
40-95||You mentor a younger person. They remind you of yourself.|H+4 S+1
50-95||Your knees creak. Your story count climbs.|L-2 S+1
50-95||Your grandkids-in-law call it "vintage". You glow.|H+3
50-95||You start walking every morning and the garden loves you.|L+3 H+2
60-95||You retire from something. It feels odd and a bit freeing.|H+3
60-95||Old friends gather for a long overdue reunion.|H+5
60-95||You write down your memories for the next generation.|H+4 S+2
60-95||A health scare makes you slow down.|L-5 H-2
70-95||You get slower, wiser, and a bit stubborn.|S+2 L-3
70-95||You teach the young ones an old card game and beat them all.|H+4
70-95||Doctor visits become your social calendar.|L-3 H-1
80-95||You outlive three of your doctors. Mixed feelings.|H+1 L-4
80-95||A great-grandchild falls asleep on your lap.|H+6
poor|poor|You skip meals to save money. It shows.|L-3 H-3
poor|poor|A friend quietly covers your rent this month.|H+2 $+80
rich|rich|An investment you forgot about pays out: {500}.|H+3 $+500
rich|rich|A friend asks to borrow {300}. You lend it with a sigh.|H-1 $-300
pet|pet|Your pet sits on your keyboard right before a deadline.|H+3
pet|pet|Your pet falls sick. The vet bill is {120}.|H-3 $-120
pet|pet|Your pet greets you at the door like a hero returning from war.|H+4
`.trim().split('\n').map(l => { const [ag, cond, text, fx] = l.split('|'); const [a, b] = ag.replace(/^(poor|rich|pet)$/, '17-95').split('-').map(Number); return { min: a, max: b, cond: cond || '', text, fx }; });

// Choice events: label>>result>>effects, options split by ||
export const CHOICES = `
17-95||A stranger on the street offers you a "guaranteed" investment tip.|Ignore it>>You walk on. Probably wise.>>S+1||Invest {100}>>It was a scam. You learn the hard way.>>$-100 S+2 H-3||Ask your bank>>The bank confirms it is a scam. You feel clever.>>S+3 H+2
17-95||A friend invites you to a last-minute party tonight.|Go and dance>>Unforgettable night, sore feet.>>H+6 L-1 $-25||Stay home and rest>>You sleep like a baby.>>L+3 H+1||Go but leave early>>Best of both worlds.>>H+3 L+1
17-95||You find a stray kitten in the rain.|Adopt it>>You now have a tiny roommate with enormous opinions.>>H+6 $-40 @pet||Take it to a shelter>>You do the right thing. It is a little sad.>>H+2||Walk on>>You feel guilty for a week.>>H-3
17-95||Your phone buzzes: a flash sale on a gadget you do not need.|Buy it>>It is shiny. It is also {400}.>>H+4 $-400||Resist>>Your wallet thanks you.>>H+1 S+1
17-95||A neighbour asks you to look after their dog for a week.|Say yes>>Walks every day. You are fitter and happier.>>H+4 L+3||Say no>>They find someone else.>>H-1
17-95||You are offered a free weekend ticket to a food festival.|Go>>Delicious chaos.>>H+5 L-1||Pass>>Yawn.>>H-1
17-95||You see someone being bullied online.|Step in>>It gets awkward but it helps.>>H+3 S+1||Report quietly>>The post is removed.>>S+2||Scroll on>>You feel uneasy.>>H-2
17-95||You are invited to a community meeting about a new park.|Speak up>>Your idea wins support.>>S+3 H+3||Just listen>>You learn a lot.>>S+2||Skip it>>You hear about it later.>>H-1
17-95||Your friend wants you to co-sign a loan.|Sign>>It works out. Barely.>>H-3 $-120||Refuse politely>>They sulk, then understand.>>H-1 S+1
17-95||A street vendor offers you a mystery dish.|Eat it>>Surprisingly delicious!>>H+3 L+1||Eat it>>Regrets.>>L-4 H-1||Politely decline>>You eat plain bread.>>H-1
17-95||A hairdresser says "trust me, you need a change".|Trust them>>You look amazing.>>B+4 H+2||Trust them>>You look... memorable.>>B-3 H-2||Keep it>>Safe, if boring.>>H-0
17-95||You are offered a small shortcut at work: copy someone's report.|Do it>>You get away with it, but feel off.>>H-3 S-1||Refuse>>You do your own work.>>S+2 H+1
20-95|job|Your manager offers a week of unpaid training in your free time.|Do it>>You grow, if you are tired.>>S+4 H-2||Decline>>Nothing changes.>>H+1
20-95||You see a big concert ticket for {200}.|Buy>>The best night of the year.>>H+7 $-200||Skip>>You save the money.>>H+1
25-95||A relative offers you a family heirloom watch.|Accept>>It belongs on your wrist.>>H+4 B+2||Hand it to a sibling>>They are touched.>>H+3
25-95||You are invited to join a startup as a founding member.|Join>>Chaos, hope, and pizza.>>S+4 H+3 $-150||Join>>It collapses within months.>>S+3 H-4 $-300||Decline>>You wonder about it sometimes.>>H-1
30-95||You hear your old school is hosting a reunion.|Go>>A wave of nostalgia.>>H+5||Stay home>>You see the photos later and smile.>>H+1
`.trim().split('\n').map(l => { const p = l.split('|'); const [a, b] = p[0].split('-').map(Number); const opts = p.slice(3).join('|').replace(/^\|/, ''); return { min: a, max: b, cond: p[1] || '', prompt: p[2], opts: ('|' + p.slice(3).join('|')).split('||').map(s => s.replace(/^\|+/, '')).filter(Boolean).map(s => { const [label, res, fx] = s.split('>>'); return { label, res, fx }; }) }; });

// Activities: id|label|cost|effects|text  (cost in base $; chance results coded in life.js for lottery/gamble)
export const ACTIVITIES = `
meditate|Meditate|0|H+4 L+1|You sit in silence. Your mind settles.
read|Read a book|0|S+3 H+1|You lose yourself in a good book.
party|Go to a party|30|H+6 B+1 L-1|You dance until the music stops.
doctor|Visit the doctor|60|L+10|A check-up and a stern lecture about sleep.
lottery|Buy a lottery ticket|5|lottery|You scratch the card and hold your breath.
volunteer|Volunteer|0|H+4 S+1|You spend the day helping. It feels right.
hike|Go for a hike|0|L+3 H+3|Fresh air, tired legs, a great view.
course|Online course|20|S+4|You finish three modules and feel sharper.
art|Art class|25|S+2 H+3|Paint everywhere, including on you.
travel|Weekend trip|150|H+8 S+1|New streets, new tastes, new stories.
spa|Spa day|80|B+4 H+3 L+1|You emerge glowing.
makeover|Makeover|120|B+6|New look. Heads turn.
therapy|See a therapist|70|H+8|You talk it through. It helps more than expected.
cook|Cook a proper meal|8|L+2 H+1|Home cooking beats takeaway every time.
reflect|Quiet reflection|0|H+3 S+1|You think about where you are going.
games|Play video games|0|H+4 S-1|Just one more level. Forty levels later...
pet|Adopt a pet|100|H+5 @pet|A small creature now owns your heart.
date|Date night|40|H+5 B+1|Candlelight and clumsy small talk.
concert|Go to a concert|50|H+6|Your ears ring, your heart sings.
club|Join a club|10|S+2 H+2|New people, shared interests.
nap|Take a nap|0|L+1 H+1|Twenty minutes that fixes a whole day.
streetfood|Street food run|3|H+2 L-1|Greasy, glorious, worth it.
gig|Do a side gig|0|gig|You hustle for a few hours.
busk|Busk in the plaza|0|busk|You play for passers-by.
sell|Sell old stuff|0|sell|You clear out the cupboard and the cash arrives.
charity|Donate to charity|30|H+4|A small gift, a big feeling.
crypto|Gamble on a coin|100|crypto|You press confirm and look away.
dance|Take a dance class|20|L+2 B+2 H+3|You step on feet. Mostly your own.
trip|Visit a museum|12|S+3 H+1|Old things, new thoughts.
`.trim().split('\n').map(l => { const [id, label, cost, fx, text] = l.split('|'); return { id, label, cost: +cost, fx, text }; });

export const JOBS = [
  { id: 'cashier', name: 'Cashier', sal: 22000, hours: 6, req: {}, company: 'meridian' },
  { id: 'barista', name: 'Barista', sal: 24000, hours: 4, req: { B: 25 }, company: 'meridian' },
  { id: 'clerk', name: 'Office Clerk', sal: 34000, hours: 8, req: { S: 35 }, company: 'meridian' },
  { id: 'sales', name: 'Sales Rep', sal: 42000, hours: 6, req: { S: 40, B: 40 }, company: 'meridian' },
  { id: 'designer', name: 'Designer', sal: 55000, hours: 7, req: { S: 45, deg: 'Arts' }, company: 'meridian' },
  { id: 'nurse', name: 'Nurse', sal: 62000, hours: 8, req: { S: 55, deg: 'Medicine' }, company: 'meridian' },
  { id: 'analyst', name: 'Analyst', sal: 68000, hours: 8, req: { S: 55, deg: 'Business' }, company: 'meridian' },
  { id: 'doctor', name: 'Doctor', sal: 150000, hours: 8, req: { S: 70, deg: 'Medicine', yrs: 2 }, company: 'meridian' },
  { id: 'jr-accounts', name: 'Junior accounts', sal: 22556, hours: 5, req: {}, company: 'meridian' },
  { id: 'support', name: 'IT Support', sal: 36000, hours: 6, req: { S: 40 }, company: 'northline' },
  { id: 'engineer', name: 'Engineer', sal: 85000, hours: 8, req: { S: 60, deg: 'Tech' }, company: 'northline' },
  { id: 'dev', name: 'Developer', sal: 78000, hours: 8, req: { S: 58, deg: 'IT' }, company: 'northline' },
  { id: 'lead', name: 'Engineering Lead', sal: 110000, hours: 8, req: { S: 70, deg: 'MScEng', yrs: 2 }, company: 'northline' }
];
// place is the door: town college, town IT college, or a school on the same ground.
// Ladder: school leaving -> bachelor -> master -> doctorate. needs = the level you must already hold.
export const COURSES = [
  { id: 'Arts', name: 'Arts', years: 3, fee: 6000, place: 'college', smarts: 40, level: 'bachelor', needs: 'school' },
  { id: 'Medicine', name: 'Medicine', years: 5, fee: 12000, place: 'college', smarts: 40, level: 'bachelor', needs: 'school' },
  { id: 'IT', name: 'BSc IT', years: 3, fee: 9000, place: 'itcollege', smarts: 40, level: 'bachelor', needs: 'school' },
  { id: 'Business', name: 'Business', years: 3, fee: 7000, place: 'som', smarts: 40, level: 'bachelor', needs: 'school' },
  { id: 'BBA', name: 'BBA', years: 3, fee: 7000, place: 'som', smarts: 40, level: 'bachelor', needs: 'school' },
  { id: 'BBS', name: 'BBS', years: 3, fee: 5000, place: 'som', smarts: 40, level: 'bachelor', needs: 'school' },
  { id: 'MBA', name: 'MBA', years: 2, fee: 14000, place: 'som', smarts: 55, level: 'master', needs: 'bachelor' },
  { id: 'DBA', name: 'DBA', years: 3, fee: 18000, place: 'som', smarts: 65, level: 'doctorate', needs: 'master' },
  { id: 'MSc', name: 'MSc', years: 2, fee: 12000, place: 'serd', smarts: 55, level: 'master', needs: 'bachelor' },
  { id: 'PhD', name: 'PhD', years: 3, fee: 15000, place: 'serd', smarts: 70, level: 'doctorate', needs: 'master' },
  { id: 'Tech', name: 'Technology', years: 3, fee: 8000, place: 'set', smarts: 40, level: 'bachelor', needs: 'school' },
  { id: 'MScEng', name: 'MSc Engineering', years: 2, fee: 13000, place: 'set', smarts: 60, level: 'master', needs: 'bachelor' },
  // Professional papers: MCQ, a fee, and study hours. A pass is a qualification, not a second bachelor's.
  { id: 'ACCA', name: 'ACCA', years: 2, fee: 4000, study: 40, place: 'som', smarts: 50, level: 'diploma', needs: 'bachelor', cert: true },
  { id: 'CA', name: 'CA', years: 3, fee: 5000, study: 60, place: 'som', smarts: 55, level: 'diploma', needs: 'bachelor', cert: true },
  { id: 'CFA', name: 'CFA', years: 2, fee: 4500, study: 50, place: 'som', smarts: 55, level: 'diploma', needs: 'bachelor', cert: true },
  { id: 'CIPD', name: 'CIPD', years: 1, fee: 2500, study: 30, place: 'som', smarts: 45, level: 'diploma', needs: 'bachelor', cert: true },
  { id: 'CLOUD', name: 'Cloud cert', years: 1, fee: 1500, study: 24, place: 'set', smarts: 40, level: 'diploma', needs: 'school', cert: true },
  { id: 'DATA', name: 'Data course', years: 1, fee: 2000, study: 20, place: 'set', smarts: 40, level: 'diploma', needs: 'bachelor', cert: true },
  { id: 'LLB', name: 'LLB', years: 3, fee: 9000, place: 'som', smarts: 45, level: 'bachelor', needs: 'school' },
  { id: 'BAR', name: 'Bar exam', years: 1, fee: 2500, study: 30, place: 'som', smarts: 50, level: 'diploma', needs: 'bachelor', cert: true },
  { id: 'PHARM', name: 'Pharmacy', years: 4, fee: 10000, place: 'serd', smarts: 45, level: 'bachelor', needs: 'school' },
  { id: 'ELEC', name: 'Electrician licence', years: 1, fee: 800, study: 16, place: 'set', smarts: 30, level: 'diploma', needs: 'school', cert: true },
  { id: 'PLUMB', name: 'Plumber licence', years: 1, fee: 800, study: 16, place: 'set', smarts: 30, level: 'diploma', needs: 'school', cert: true },
  { id: 'DRIVE', name: 'Driving licence', years: 1, fee: 400, study: 8, place: 'set', smarts: 25, level: 'diploma', needs: 'school', cert: true },
  { id: 'CHEF', name: 'Chef papers', years: 1, fee: 900, study: 16, place: 'som', smarts: 30, level: 'diploma', needs: 'school', cert: true },
  { id: 'PSC', name: 'Civil service exam', years: 1, fee: 200, study: 20, place: 'som', smarts: 45, level: 'diploma', needs: 'bachelor', cert: true },
  { id: 'NMC', name: 'Nursing council', years: 1, fee: 1500, study: 20, place: 'serd', smarts: 40, level: 'diploma', needs: 'bachelor', cert: true }
];
// Annual figures are base USD. A country's band is that range times its wage scale (life.js payBand).
// yrs = years in a listed previous post (or the rung below). deg = any one. must = every one. any = a degree or a paper.
// lead = project leads. cross = a sideways move. up = the next post when it is not the next title on this track.
const step = (id, name, sal, lo, hi, o = {}) => ({ id, name, sal, band: [lo, hi], ...o });
const DIR = { tier: 'director', perk: { bonus: 0.1, car: 3500, stress: 2 } };
const CX = { tier: 'c', perk: { bonus: 0.2, car: 8000, stress: 4 } };
export const TRACKS = [
  { id: 'accounting', name: 'Accounting', company: 'meridian', rungs: [
    step('asst-acct', 'Assistant Accountant', 28000, 24000, 34000, { deg: ['BBA', 'BBS', 'Business'] }),
    step('acct', 'Accountant', 40000, 34000, 48000, { yrs: 2, deg: ['BBA', 'BBS', 'Business'], cross: ['fpa-an'] }),
    step('sr-acct', 'Senior Accountant', 54000, 46000, 66000, { yrs: 2 }),
    step('accts-mgr', 'Accounts Manager', 74000, 62000, 90000, { yrs: 3, lead: 1 }),
    step('fin-ctrl', 'Financial Controller', 115000, 95000, 145000, { yrs: 4, any: ['MBA', 'ACCA', 'CA'], lead: 2, ...DIR }),
    step('cfo', 'CFO', 190000, 160000, 250000, { yrs: 6, from: ['fin-ctrl', 'fin-dir'], must: ['MBA'], exam: 'ACCA', lead: 3, up: 'ceo', ...CX })
  ] },
  { id: 'finance', name: 'Finance', company: 'meridian', rungs: [
    step('fpa-asc', 'FP&A Associate', 32000, 27000, 39000, { deg: ['BBA', 'BBS', 'Business'] }),
    step('fpa-an', 'Finance Analyst', 44000, 37000, 53000, { yrs: 2, from: ['fpa-asc', 'acct'], deg: ['BBA', 'BBS', 'Business'] }),
    step('sr-fpa', 'Senior Analyst', 60000, 50000, 74000, { yrs: 2 }),
    step('fpa-mgr', 'FP&A Manager', 82000, 68000, 100000, { yrs: 3, lead: 1 }),
    step('fin-dir', 'Finance Director', 125000, 100000, 155000, { yrs: 4, any: ['MBA', 'CFA'], lead: 2, up: 'cfo', ...DIR })
  ] },
  { id: 'hr', name: 'HR', company: 'meridian', rungs: [
    step('hr-asst', 'HR Assistant', 26000, 22000, 32000, {}),
    step('hr-off', 'HR Officer', 36000, 30000, 44000, { yrs: 2 }),
    step('hr-mgr', 'HR Manager', 52000, 44000, 64000, { yrs: 3, lead: 1 }),
    step('hr-dir', 'HR Director', 80000, 66000, 100000, { yrs: 4, any: ['MBA', 'CIPD'], lead: 2, ...DIR }),
    step('chro', 'CHRO', 145000, 120000, 180000, { yrs: 5, must: ['MBA'], exam: 'CIPD', lead: 3, up: 'ceo', ...CX })
  ] },
  { id: 'it', name: 'IT', company: 'northline', rungs: [
    step('it-sup', 'IT Support', 30000, 25000, 37000, { smarts: 35 }),
    step('it-dev', 'Developer', 50000, 42000, 62000, { yrs: 2, any: ['IT', 'Tech', 'CLOUD'] }),
    step('sr-dev', 'Senior Developer', 70000, 58000, 86000, { yrs: 3 }),
    step('tech-lead', 'Tech Lead', 90000, 75000, 110000, { yrs: 3, lead: 1 }),
    step('eng-mgr', 'Engineering Manager', 120000, 98000, 148000, { yrs: 3, lead: 2 }),
    step('cto', 'CTO', 185000, 150000, 240000, { yrs: 4, must: ['MBA'], exam: 'CLOUD', lead: 3, up: 'ceo', ...CX })
  ] },
  { id: 'ops', name: 'Operations', company: 'meridian', rungs: [
    step('ops-asst', 'Operations Assistant', 27000, 22000, 33000, {}),
    step('ops-mgr', 'Ops Manager', 48000, 40000, 60000, { yrs: 3, lead: 1 }),
    step('gm', 'General Manager', 82000, 68000, 102000, { yrs: 4, any: ['MBA'], lead: 2 }),
    step('coo', 'COO', 150000, 120000, 190000, { yrs: 5, must: ['MBA'], lead: 3, ...CX }),
    step('ceo', 'CEO', 230000, 180000, 320000, { yrs: 4, from: ['coo', 'cfo', 'cto', 'chro', 'cmo'], must: ['MBA'], lead: 3, tier: 'ceo', perk: { bonus: 0.25, car: 12000, stress: 5 } })
  ] },
  { id: 'sales', name: 'Sales and marketing', company: 'meridian', rungs: [
    step('sales-asst', 'Sales Assistant', 26000, 21000, 33000, {}),
    step('mkt-exec', 'Marketing Executive', 38000, 31000, 47000, { yrs: 2 }),
    step('sales-mgr', 'Sales Manager', 54000, 44000, 68000, { yrs: 2, lead: 1 }),
    step('mkt-mgr', 'Marketing Manager', 72000, 58000, 90000, { yrs: 3, lead: 1 }),
    step('mkt-dir', 'Marketing Director', 105000, 85000, 130000, { yrs: 3, any: ['MBA'], lead: 2, ...DIR }),
    step('cmo', 'CMO', 165000, 135000, 210000, { yrs: 4, must: ['MBA'], lead: 3, up: 'ceo', ...CX })
  ] },
  { id: 'medicine', name: 'Medicine', company: 'meridian', rungs: [
    step('med-asst', 'Medical Assistant', 24000, 20000, 30000, { smarts: 30 }),
    step('med-nurse', 'Nurse', 40000, 33000, 50000, { yrs: 2, smarts: 45 }),
    step('sr-nurse', 'Senior Nurse', 52000, 43000, 64000, { yrs: 3 }),
    step('med-doc', 'Doctor', 95000, 78000, 120000, { yrs: 2, deg: ['Medicine'] }),
    step('consult', 'Consultant', 135000, 110000, 165000, { yrs: 4, lead: 1 }),
    step('med-dir', 'Medical Director', 175000, 145000, 220000, { yrs: 4, any: ['MBA', 'Medicine'], lead: 2, ...DIR })
  ] },
  { id: 'teaching', name: 'Teaching', company: 'meridian', rungs: [
    step('teach-asst', 'Teaching Assistant', 22000, 18000, 28000, {}),
    step('teacher', 'Teacher', 34000, 28000, 42000, { yrs: 2, top: 'bachelor' }),
    step('sr-teach', 'Senior Teacher', 46000, 38000, 56000, { yrs: 3 }),
    step('hod', 'Head of Department', 62000, 50000, 76000, { yrs: 3, lead: 1 }),
    step('principal', 'Principal', 84000, 68000, 104000, { yrs: 4, lead: 2 }),
    step('edu-dir', 'Education Director', 115000, 92000, 145000, { yrs: 4, any: ['MBA'], lead: 2, ...DIR })
  ] },
  { id: 'banking', name: 'Banking', company: 'harbor', rungs: [
    step('teller', 'Bank Teller', 25000, 21000, 31000, {}),
    step('bank-off', 'Bank Officer', 38000, 31000, 47000, { yrs: 2, deg: ['BBA', 'BBS', 'Business'] }),
    step('rel-mgr', 'Relationship Manager', 56000, 46000, 70000, { yrs: 3 }),
    step('branch-mgr', 'Branch Manager', 78000, 64000, 96000, { yrs: 3, lead: 1 }),
    step('region-mgr', 'Regional Manager', 112000, 90000, 140000, { yrs: 4, lead: 2 }),
    step('bank-dir', 'Bank Director', 155000, 125000, 195000, { yrs: 4, any: ['MBA', 'CFA'], lead: 2, ...DIR })
  ] },
  { id: 'hospitality', name: 'Hospitality', company: 'harbor', rungs: [
    step('server', 'Waiter', 20000, 16000, 25000, {}),
    step('sup', 'Supervisor', 28000, 23000, 35000, { yrs: 2 }),
    step('rest-mgr', 'Restaurant Manager', 42000, 34000, 52000, { yrs: 2, lead: 1 }),
    step('hotel-mgr', 'Hotel Manager', 60000, 48000, 76000, { yrs: 3, lead: 1 }),
    step('hosp-gm', 'Hospitality Manager', 82000, 66000, 104000, { yrs: 3, lead: 2 }),
    step('hosp-dir', 'Hospitality Director', 115000, 92000, 145000, { yrs: 4, any: ['MBA'], lead: 2, ...DIR })
  ] },
  { id: 'trades', name: 'Trades', company: 'harbor', rungs: [
    step('apprentice', 'Apprentice', 18000, 15000, 23000, {}),
    step('tradesman', 'Tradesman', 28000, 23000, 35000, { yrs: 2 }),
    step('sr-trade', 'Senior Tradesman', 38000, 31000, 48000, { yrs: 2 }),
    step('foreman', 'Foreman', 52000, 42000, 65000, { yrs: 3, lead: 1 }),
    step('site-mgr', 'Site Manager', 70000, 56000, 88000, { yrs: 3, lead: 2 }),
    step('contractor', 'Contractor', 95000, 76000, 120000, { yrs: 4, lead: 2 })
  ] },
  { id: 'investment', name: 'Investment', company: 'meridian', rungs: [
    step('inv-asc', 'Investment Associate', 36000, 30000, 44000, { deg: ['BBA', 'BBS', 'Business'] }),
    step('port-an', 'Portfolio Analyst', 58000, 48000, 72000, { yrs: 2, any: ['CFA', 'MBA'] }),
    step('fund-mgr', 'Fund Manager', 98000, 80000, 125000, { yrs: 3, lead: 1, exam: 'CFA' }),
    step('cio', 'Chief Investment Officer', 175000, 145000, 220000, { yrs: 4, must: ['MBA'], exam: 'CFA', lead: 2, ...CX })
  ] },
  { id: 'invest-x', name: 'Investment', company: 'meridian', rungs: [
    step('inv-an', 'Investment Analyst', 72000, 60000, 90000, { both: ['BBA', 'MBA'], from: ['fpa-an', 'sr-fpa', 'fpa-mgr', 'fin-dir', 'acct', 'sr-acct', 'fin-ctrl'], yrs: 5 })
  ] },
  { id: 'insurance', name: 'Insurance', company: 'harbor', rungs: [
    step('claims', 'Claims Clerk', 26000, 21000, 32000, { smarts: 30 }),
    step('underwriter', 'Underwriter', 42000, 35000, 52000, { yrs: 2, deg: ['BBA', 'BBS', 'Business'] }),
    step('sr-under', 'Senior Underwriter', 60000, 50000, 74000, { yrs: 2 }),
    step('ins-mgr', 'Insurance Manager', 84000, 70000, 105000, { yrs: 3, lead: 1 }),
    step('chief-uw', 'Chief Underwriter', 130000, 105000, 165000, { yrs: 4, any: ['MBA', 'CFA'], lead: 2, ...DIR })
  ] },
  { id: 'audit', name: 'Audit and tax', company: 'meridian', rungs: [
    step('aud-asc', 'Audit Associate', 34000, 28000, 42000, { deg: ['BBA', 'BBS', 'Business'] }),
    step('aud-sr', 'Audit Senior', 52000, 43000, 64000, { yrs: 2, any: ['ACCA', 'CA'] }),
    step('aud-mgr', 'Audit Manager', 78000, 64000, 96000, { yrs: 3, exam: 'ACCA', lead: 1 }),
    step('tax-cons', 'Tax Consultant', 90000, 74000, 112000, { yrs: 3, exam: 'CA', lead: 1 }),
    step('aud-partner', 'Audit Partner', 160000, 130000, 210000, { yrs: 5, must: ['ACCA'], lead: 3, ...DIR })
  ] },
  { id: 'data', name: 'Data and AI', company: 'northline', rungs: [
    step('data-asst', 'Data Assistant', 32000, 26000, 40000, { smarts: 40 }),
    step('data-an', 'Data Analyst', 54000, 45000, 68000, { yrs: 2, any: ['DATA', 'IT', 'Tech'] }),
    step('ml-eng', 'Machine Learning Engineer', 92000, 76000, 115000, { yrs: 2, smarts: 65, any: ['DATA', 'IT', 'MSc'] }),
    step('head-data', 'Head of Data', 140000, 115000, 175000, { yrs: 4, lead: 2, any: ['MBA', 'MSc'], ...DIR })
  ] },
  { id: 'data-x', name: 'Data and AI', company: 'meridian', rungs: [
    step('fin-data', 'Finance Data Analyst', 64000, 53000, 80000, { deg: ['BBA', 'BBS', 'Business'], exam: 'DATA', from: ['acct', 'sr-acct', 'asst-acct', 'fpa-an'], yrs: 2 })
  ] },
  { id: 'product', name: 'Product', company: 'northline', rungs: [
    step('apm', 'Associate Product Manager', 40000, 33000, 50000, { smarts: 40 }),
    step('pm', 'Product Manager', 72000, 60000, 90000, { yrs: 2, lead: 1 }),
    step('cpo', 'Chief Product Officer', 170000, 140000, 215000, { yrs: 4, must: ['MBA'], lead: 3, ...CX })
  ] },
  { id: 'product-x', name: 'Product', company: 'northline', rungs: [
    step('fintech-pm', 'FinTech Product Manager', 115000, 95000, 145000, { any: ['IT', 'Tech', 'CLOUD'], from: ['acct', 'sr-acct', 'fpa-an', 'sr-fpa', 'fpa-mgr', 'fin-ctrl'], yrs: 3, port: 1 })
  ] },
  { id: 'marketing', name: 'Marketing', company: 'meridian', rungs: [
    step('mkt-coord', 'Marketing Coordinator', 30000, 25000, 38000, { smarts: 35 }),
    step('brand-exec', 'Brand Executive', 44000, 36000, 54000, { yrs: 2 }),
    step('growth-lead', 'Growth Lead', 68000, 56000, 84000, { yrs: 2, lead: 1, port: 2 }),
    step('brand-dir', 'Brand Director', 110000, 90000, 140000, { yrs: 4, any: ['MBA'], lead: 2, ...DIR })
  ] },
  { id: 'supply', name: 'Supply chain', company: 'meridian', rungs: [
    step('wh-clerk', 'Warehouse Clerk', 24000, 20000, 30000, {}),
    step('buyer', 'Buyer', 38000, 31000, 47000, { yrs: 2 }),
    step('supply-plan', 'Supply Planner', 52000, 43000, 65000, { yrs: 2, smarts: 45 }),
    step('sc-dir', 'Supply Chain Director', 105000, 86000, 132000, { yrs: 4, any: ['MBA'], lead: 2, ...DIR })
  ] },
  { id: 'nursing', name: 'Nursing', company: 'hospital', rungs: [
    step('ward-nurse', 'Ward Nurse', 38000, 31000, 47000, { deg: ['Medicine'], lic: 'NMC' }),
    step('charge-nurse', 'Charge Nurse', 52000, 43000, 64000, { yrs: 2, lead: 1 }),
    step('np', 'Nurse Practitioner', 74000, 61000, 92000, { yrs: 3, smarts: 55 }),
    step('don', 'Director of Nursing', 110000, 90000, 140000, { yrs: 4, lead: 2, ...DIR })
  ] },
  { id: 'pharmacy', name: 'Pharmacy', company: 'hospital', rungs: [
    step('pharm-tech', 'Pharmacy Technician', 28000, 23000, 35000, { smarts: 35 }),
    step('pharmacist', 'Pharmacist', 62000, 51000, 76000, { yrs: 1, deg: ['PHARM'] }),
    step('clin-pharm', 'Clinical Pharmacist', 84000, 70000, 105000, { yrs: 3 }),
    step('chief-pharm', 'Chief Pharmacist', 120000, 98000, 150000, { yrs: 4, lead: 2, ...DIR })
  ] },
  { id: 'health-x', name: 'Hospital leadership', company: 'hospital', rungs: [
    step('hosp-admin', 'Hospital Administrator', 150000, 125000, 190000, { deg: ['Medicine'], must: ['MBA'], from: ['med-doc', 'consult', 'med-dir'], yrs: 2, lead: 1, ...DIR })
  ] },
  { id: 'law', name: 'Law', company: 'meridian', rungs: [
    step('paralegal', 'Paralegal', 32000, 26000, 40000, { smarts: 40 }),
    step('lawyer', 'Lawyer', 70000, 58000, 88000, { yrs: 1, deg: ['LLB'], lic: 'BAR' }),
    step('sr-assoc', 'Senior Associate', 98000, 80000, 125000, { yrs: 3 }),
    step('law-partner', 'Law Partner', 160000, 130000, 210000, { yrs: 4, lead: 2, ...DIR }),
    step('gc', 'General Counsel', 190000, 155000, 240000, { yrs: 4, must: ['MBA'], lead: 2, ...CX })
  ] },
  { id: 'academia', name: 'Academia', company: 'ait', rungs: [
    step('lecturer', 'Lecturer', 36000, 30000, 45000, { top: 'master' }),
    step('sr-lect', 'Senior Lecturer', 52000, 43000, 65000, { yrs: 3 }),
    step('professor', 'Professor', 78000, 64000, 98000, { yrs: 4, top: 'doctorate', lead: 1 }),
    step('dean', 'Dean', 120000, 98000, 150000, { yrs: 4, lead: 2, ...DIR }),
    step('ait-faculty', 'AIT Faculty', 90000, 74000, 115000, { yrs: 3, from: ['professor', 'dean', 'sr-lect'], top: 'doctorate' })
  ] },
  { id: 'tourism', name: 'Tourism', company: 'harbor', rungs: [
    step('guide', 'Tour Guide', 22000, 18000, 28000, { looks: 30 }),
    step('travel-agent', 'Travel Agent', 30000, 25000, 38000, { yrs: 2 }),
    step('tour-off', 'Tourism Officer', 44000, 36000, 55000, { yrs: 2, deg: ['BBA', 'BBS', 'Business', 'Arts'] }),
    step('tour-dir', 'Tourism Director', 86000, 70000, 110000, { yrs: 4, any: ['MBA'], lead: 2, ...DIR })
  ] },
  { id: 'media', name: 'Media', company: 'press', rungs: [
    step('creator', 'Content Creator', 24000, 18000, 36000, { looks: 35, port: 1 }),
    step('journalist', 'Journalist', 36000, 30000, 46000, { yrs: 2, deg: ['Arts'] }),
    step('editor', 'Editor', 52000, 43000, 66000, { yrs: 3, port: 3 }),
    step('producer', 'Producer', 74000, 60000, 94000, { yrs: 3, lead: 1, port: 4 }),
    step('media-dir', 'Media Director', 115000, 94000, 145000, { yrs: 4, lead: 2, ...DIR })
  ] },
  { id: 'government', name: 'Civil service', company: 'civic', rungs: [
    step('gov-clerk', 'Government Clerk', 24000, 20000, 30000, { smarts: 35 }),
    step('gov-off', 'Government Officer', 38000, 31000, 48000, { yrs: 2, exam: 'PSC', top: 'bachelor' }),
    step('section-off', 'Section Officer', 52000, 43000, 65000, { yrs: 3, exam: 'PSC' }),
    step('under-sec', 'Under Secretary', 78000, 64000, 98000, { yrs: 4, lead: 1 }),
    step('secretary', 'Secretary', 120000, 98000, 155000, { yrs: 5, any: ['MBA'], lead: 2, ...DIR })
  ] },
  { id: 'ngo', name: 'Development', company: 'ngo', rungs: [
    step('field-off', 'Field Officer', 26000, 21000, 33000, {}),
    step('prog-off', 'Programme Officer', 40000, 33000, 50000, { yrs: 2, deg: ['BBA', 'BBS', 'Business', 'Arts'] }),
    step('prog-mgr', 'Programme Manager', 62000, 51000, 78000, { yrs: 3, lead: 1 }),
    step('country-dir', 'Country Director', 98000, 80000, 125000, { yrs: 4, any: ['MBA'], lead: 2, ...DIR })
  ] },
  { id: 'electrician', name: 'Electrician', company: 'harbor', rungs: [
    step('elec-app', 'Apprentice Electrician', 20000, 16000, 26000, {}),
    step('electrician', 'Electrician', 36000, 30000, 45000, { yrs: 2, lic: 'ELEC' }),
    step('master-elec', 'Master Electrician', 52000, 43000, 66000, { yrs: 4, lead: 1 })
  ] },
  { id: 'plumber', name: 'Plumber', company: 'harbor', rungs: [
    step('plumb-app', 'Apprentice Plumber', 20000, 16000, 26000, {}),
    step('plumber', 'Plumber', 36000, 30000, 45000, { yrs: 2, lic: 'PLUMB' }),
    step('master-plumb', 'Master Plumber', 52000, 43000, 66000, { yrs: 4, lead: 1 })
  ] },
  { id: 'driving', name: 'Driving', company: 'harbor', rungs: [
    step('driver', 'Driver', 22000, 18000, 28000, { lic: 'DRIVE' }),
    step('sr-driver', 'Senior Driver', 30000, 25000, 38000, { yrs: 3 }),
    step('fleet-mgr', 'Fleet Manager', 48000, 40000, 60000, { yrs: 3, lead: 1 })
  ] },
  { id: 'kitchen', name: 'Kitchen', company: 'harbor', rungs: [
    step('commis', 'Commis Chef', 20000, 16000, 26000, {}),
    step('chef', 'Chef', 34000, 28000, 43000, { yrs: 2, lic: 'CHEF' }),
    step('head-chef', 'Head Chef', 52000, 43000, 66000, { yrs: 3, lead: 1 }),
    step('exec-chef', 'Executive Chef', 78000, 64000, 98000, { yrs: 4, lead: 2 })
  ] },
  { id: 'venture', name: 'Entrepreneurship', company: 'firm', rungs: [
    step('founder', 'Founder', 28000, 18000, 60000, { from: ['asst-acct', 'it-dev', 'sales-asst', 'ops-asst', 'med-asst', 'cashier'], yrs: 2 }),
    step('startup-lead', 'Startup Lead', 64000, 40000, 110000, { yrs: 2, lead: 1, port: 1 }),
    step('md', 'Managing Director', 120000, 80000, 180000, { yrs: 3, any: ['MBA'], lead: 2, ...DIR }),
    step('chair', 'Chair', 180000, 120000, 260000, { yrs: 4, lead: 3, ...CX })
  ] }
];
export const COMPANIES = {
  meridian: { name: 'Meridian', place: 'work' },
  northline: { name: 'Northline', place: 'itco' },
  harbor: { name: 'Harbor', place: 'bank' },
  hospital: { name: 'City Hospital', place: 'hospital' },
  ait: { name: 'AIT', place: 'uni' },
  civic: { name: 'Town Hall', place: 'school' },
  press: { name: 'Sansar Press', place: 'work' },
  ngo: { name: 'Hill Trust', place: 'work' },
  firm: { name: 'Your firm', place: 'business' }
};
export const BUSINESSES = [
  { id: 'shop', name: 'Corner shop', cost: 500, daily: 45 },
  { id: 'cafe', name: 'Small cafe', cost: 900, daily: 80 }
];

export const NPCS = {
  cafe: { name: 'Marta', role: 'Cafe Manager', lines: [
    'Fresh coffee, fresh start. What can I get you?', 'The healthy plate is popular this year. Your body will thank you.',
    'We hire baristas now and then. Smile a lot, and you are halfway there.', 'Junk food is cheap, but the doctor is not.',
    'Everybody passes through my cafe sooner or later.', 'I opened this place with one table. Dream big, start small.'] },
  teacher: { name: 'Mr. Okoye', role: 'Teacher', lines: [
    'Knowledge compounds like interest. Start early.', 'A degree opens doors that a handshake alone cannot.',
    'Smarts grow when you read, study and ask questions. Mostly the questions.', 'Medicine takes five years. Worth it, if you can stay the course.',
    'I failed three exams once. Now I write them.', 'The library is free. The excuses are expensive.'] },
  trainer: { name: 'Coach Dev', role: 'Gym Trainer', lines: [
    'One more rep. No, really, just one more.', 'Health and looks both start with a boring routine.',
    'Do not skip leg day. The stairs remember.', 'I have seen people change their entire lives with thirty minutes a day.',
    'Sleep, water, weights. Repeat.', 'Pain is temporary. Regret is a subscription.'] }
};
