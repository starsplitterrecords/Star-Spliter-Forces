// The motif lexicon: transparent, rule-based keyword interpretation of doctrines.
// Each motif turns a ridiculous founding choice into a long-lived source of
// disputes, industries, heresies and headlines. Unknown custom doctrines fall back to a
// generic motif built from the doctrine's own key noun.
import type { DoctrineAttributes, DoctrineCategory, Motif } from '../engine/types';

export interface MotifDef extends Motif {
  match: RegExp;
  category?: DoctrineCategory;
  attr: Partial<DoctrineAttributes>;
}

type MDef = Omit<MotifDef, 'key' | 'incidents' | 'committee' | 'orgNoun' | 'showcase'> & {
  incidents: string[];
  committee?: string;
  orgNoun?: string;
  showcase?: string;
};

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function m(key: string, d: MDef): MotifDef {
  return {
    key,
    ...d,
    committee: d.committee ?? `Committee on ${cap(d.noun)} Compliance`,
    orgNoun: d.orgNoun ?? `Normal ${cap(d.plural)}`,
    showcase: d.showcase ?? `Grand ${cap(d.noun)} Demonstration`,
  };
}

export const MOTIFS: MotifDef[] = [
  m('hat', {
    match: /\b(hats?|caps?|berets?|bonnets?|fedoras?|headwear|sombreros?|top hats?|helmets?)\b/i,
    category: 'clothing', noun: 'hat', plural: 'hats', verb: 'wear oversized hats',
    heresy: 'baseball caps', purism: 'feathers are mandatory', radical: 'true hat devotion exists entirely within the mind',
    industry: 'millinery', shortage: 'ceremonial felt', measure: 'brim width', showcase: 'Hat Parade', dayName: 'International Hat Day',
    attr: { visibility: 90, appeal: 62, commerce: 80, ambiguity: 70 },
    incidents: [
      '{city} Theatre Patrons Petition Over Obstructed Views',
      'Wind Advisory Issued for {city}; {F} Urged to Hold Onto Their Principles',
      '{F} Denied Entry to {city} Tunnel Over Brim Clearance',
      'Local Doorframes Raised Six Inches in {city} "As a Courtesy"',
      'Millinery Apprenticeships in {country} Oversubscribed for First Time in a Century',
      'Hat Stand Shortage Reported Across {country}',
    ],
  }),
  m('spring', {
    match: /\b(springs?|bounc\w*|trampolin\w*|pogo|coil\w*|boing)\b/i,
    category: 'clothing', noun: 'spring', plural: 'springs', verb: 'wear springs on their shoes',
    heresy: 'trampolines', purism: 'only compression springs are authentic', radical: 'the journey itself is the spring',
    industry: 'footwear', shortage: 'replacement springs', measure: 'pedestrian altitude', showcase: 'Spring Jamboree', dayName: 'International Day of Bouncing',
    orgNoun: 'Grounded Footwear', committee: 'Commission on Ceremonial Elevation',
    attr: { visibility: 92, difficulty: 55, appeal: 58, commerce: 75, controversy: 45 },
    incidents: [
      '{f} Representative Accidentally Clears Security Barrier During {city} Opening Ceremony',
      '{city} Council Debates Height Restrictions for Ceremonial Jumping',
      'Local Officials Investigate Sudden Increase in Pedestrian Altitude',
      'Manufacturers Report Worldwide Shortage of Replacement Springs',
      'Ceiling Insurance Premiums Rise Sharply in {city}',
      '{city} Library Installs Padded Ceilings After Quiet Hours Prove Impossible',
    ],
  }),
  m('nap', {
    match: /\b(naps?|napping|sleep\w*|snooz\w*|siestas?|doz\w*|rest(ing)?)\b/i,
    category: 'hobby', noun: 'nap', plural: 'naps', verb: 'take mandatory afternoon naps',
    heresy: 'power naps', purism: 'a nap shorter than ninety minutes is merely blinking', radical: 'waking life is the nap',
    industry: 'pillow', shortage: 'regulation pillows', measure: 'nap duration', showcase: 'Mass Nap-In', dayName: 'International Napping Day',
    orgNoun: 'Wakeful Citizens', committee: 'Subcommittee on Horizontal Scheduling',
    attr: { visibility: 40, difficulty: 35, appeal: 85, commerce: 50, intensity: 30 },
    incidents: [
      'Productivity Committee Suspends Meeting After All Delegates Fall Asleep',
      'Emergency General Assembly in {city} Rescheduled for After Lunch',
      '{city} Commuter Rail Adds Quiet Car, Then Quieter Car, Then Bed Car',
      'Movement Achieves Victory in {city} by Refusing to Wake Up',
      'Alarm Clock Sales Plummet Across {country}',
      '{city} Mayor Found Asleep at Ribbon Cutting; Approval Rating Rises',
    ],
  }),
  m('weekday', {
    match: /\b(mondays?|tuesdays?|wednesdays?|thursdays?|fridays?|saturdays?|sundays?|weekdays?|weekends?)\b/i,
    category: 'principle', noun: 'Tuesday', plural: 'Tuesdays', verb: 'honor the superior day',
    heresy: 'long weekends', purism: 'the day begins at midnight sharp and not a second before', radical: 'every day is secretly the same day',
    industry: 'calendar', shortage: 'correctly printed calendars', measure: 'day superiority', showcase: 'Festival of the Superior Day', dayName: 'Superior Day',
    orgNoun: 'Calendar Neutrality', committee: 'Calendar Reform Directorate',
    attr: { visibility: 45, difficulty: 25, appeal: 70, ambiguity: 80, commerce: 40 },
    incidents: [
      '{city} Shops Report Unexplained Surge in Weekday-Specific Merchandise',
      'Calendar Printers in {country} Accused of Favoritism',
      '{F} in {city} Celebrate Day Early, Insist It "Counts"',
      'Meeting About Which Day Is Best Ends in Three-Way Tie',
    ],
  }),
  m('sock', {
    match: /\b(socks?|stockings?|hosiery)\b/i,
    category: 'clothing', noun: 'sock', plural: 'socks', verb: 'wear the correct socks',
    heresy: 'ankle socks', purism: 'socks must be knitted by hand', radical: 'the foot is the true sock',
    industry: 'hosiery', shortage: 'green dye', measure: 'sock height', showcase: 'Great Sock Exhibition', dayName: 'International Sock Day',
    attr: { visibility: 55, difficulty: 25, appeal: 72, commerce: 70, ambiguity: 65 },
    incidents: [
      'Laundromats in {city} Report Unusual Sorting Disputes',
      '{city} Airport Security Line Slowed by Ceremonial Sock Inspection',
      'Sock Manufacturers in {country} Unveil "Doctrinally Compliant" Line',
      'Lost-Sock Amnesty Declared in {city}',
    ],
  }),
  m('chair', {
    match: /\b(chairs?|seats?|stools?|thrones?|benches?|sofas?)\b/i,
    category: 'principle', noun: 'chair', plural: 'chairs', verb: 'sit in really tall chairs',
    heresy: 'bar stools', purism: 'a chair shorter than its sitter is an insult', radical: 'standing is merely a very tall chair',
    industry: 'furniture', shortage: 'industrial-length chair legs', measure: 'seat height', showcase: 'Elevated Seating Exposition',
    attr: { visibility: 70, difficulty: 60, appeal: 64, commerce: 78 },
    incidents: [
      '{city} Restaurant Installs Ladders "To Remain Competitive"',
      'Ceiling Fans Removed Across {city} Following Unfortunate Incidents',
      'Furniture Prices in {country} Rise With Seat Height',
      '{F} in {city} Unable to Reach Table, Declare Victory Anyway',
    ],
  }),
  m('soup', {
    match: /\b(soups?|broths?|stews?|chowders?|bisques?|gazpacho)\b/i,
    category: 'food', noun: 'soup', plural: 'soups', verb: 'communicate through soup',
    heresy: 'stews', purism: 'soup must be served at exactly the temperature of conversation', radical: 'all liquids are soup if you believe hard enough',
    industry: 'ladle', shortage: 'ladles', measure: 'broth density', showcase: 'Soup Kitchen of Truth',
    attr: { visibility: 40, appeal: 78, commerce: 60, ambiguity: 72 },
    incidents: [
      'Diplomatic Incident in {city} After Soup Misread as Insult',
      '{city} Spoon Shortage Enters Third Week',
      'Is Stew Soup? {city} Debate Runs Into Fourth Hour',
      'Linguists Struggle to Translate {city} Minestrone',
    ],
  }),
  m('potato', {
    match: /\b(potato\w*|mash\w*|spuds?|fries|tater\w*)\b/i,
    category: 'food', noun: 'mashed potato', plural: 'mashed potatoes', verb: 'eat mashed potatoes every day',
    heresy: 'potato salad', purism: 'lumps are a moral failing', radical: 'the potato was mashed before it was grown',
    industry: 'potato', shortage: 'potatoes', measure: 'mash consistency', showcase: 'Great Mash Feast',
    orgNoun: 'Whole Vegetables', committee: 'Bureau of Acceptable Lumps',
    attr: { visibility: 30, difficulty: 40, appeal: 76, commerce: 72 },
    incidents: [
      'Potato Futures Hit Record High as {F} Expand Into {country}',
      '{city} School Cafeterias Quietly Add Third Serving of Mash',
      'Gravy Diplomacy Fails in {city}; Talks to Resume After Dinner',
      'Farmers in {country} Report "Unprecedented" Demand for Russets',
    ],
  }),
  m('door', {
    match: /\b(doors?|doorways?|gates?|portals?)\b/i,
    category: 'principle', noun: 'door', plural: 'doors', verb: 'paint every door orange',
    heresy: 'peach-colored doors', purism: 'the paint must be applied clockwise', radical: 'an open doorway is the purest door',
    industry: 'paint', shortage: 'orange paint', measure: 'door saturation', showcase: 'Festival of Open Doors',
    attr: { visibility: 85, difficulty: 45, appeal: 60, commerce: 66 },
    incidents: [
      'Orange Paint Sells Out Across {country}',
      '{city} Historic District Committee Holds Emergency Session on Door Color',
      'Visitors to {city} Report Difficulty Finding Their Hotel; Every Door Is Orange',
      'Paint Manufacturers in {country} Introduce "Doctrinal Orange"',
    ],
  }),
  m('backward', {
    match: /\b(backwards?|reverse|in reverse|walk(ing)? back)\b/i,
    category: 'principle', noun: 'backward walk', plural: 'backward walks', verb: 'walk backward on Wednesdays',
    heresy: 'sideways walking', purism: 'one must also think backward', radical: 'everyone else is the one walking backward',
    industry: 'rear-view mirror', shortage: 'pocket mirrors', measure: 'reverse velocity', showcase: 'Great Retrograde Procession',
    attr: { visibility: 88, difficulty: 65, appeal: 50, controversy: 55 },
    incidents: [
      'Pedestrian Collisions in {city} Up 300%, All Very Polite',
      '{city} Installs Rear-Facing Crosswalk Signals',
      '{F} Arrive at {city} Rally Exactly Where They Started',
      'Wednesday Traffic in {city} Described as "Confusingly Graceful"',
    ],
  }),
  m('noon', {
    match: /\b(noon|morning|before lunch|clocks?|o'clock|punctual\w*)\b/i,
    category: 'principle', noun: 'noon', plural: 'noons', verb: 'refuse all importance before noon',
    heresy: 'brunch', purism: 'noon must be verified by sundial', radical: 'it is always just before noon somewhere',
    industry: 'sundial', shortage: 'sundials', measure: 'morning importance', showcase: 'Midday Awakening Ceremony',
    orgNoun: 'Morning People', committee: 'Office of Temporal Importance',
    attr: { visibility: 35, difficulty: 30, appeal: 82, ambiguity: 60 },
    incidents: [
      '{city} Stock Exchange Opening Delayed Indefinitely',
      'Morning News Program in {city} Replaced With Soothing Silence',
      'Sunrise Declared "Premature" by {city} Chapter',
      '{F} Schedule Urgent Meeting for 12:01',
    ],
  }),
  m('teeth', {
    match: /\b(teeth|tooth|brush\w*|dental|floss\w*)\b/i,
    category: 'hygiene', noun: 'toothbrush', plural: 'toothbrushes', verb: 'brush their teeth precisely once a week',
    heresy: 'mouthwash', purism: 'the brushing must occur on the same weekday', radical: 'the tongue is the true toothbrush',
    industry: 'dental', shortage: 'weekly-rated toothbrushes', measure: 'brushing frequency', showcase: 'Weekly Brushing Jubilee',
    orgNoun: 'Daily Brushing', committee: 'Dental Doctrine Panel',
    attr: { visibility: 20, difficulty: 30, appeal: 40, controversy: 60 },
    incidents: [
      'Dentists in {city} Form Support Group',
      '{city} Breath Mint Sales Surge, Analysts Puzzled',
      'Close-Talking Formally Discouraged at {city} Gatherings',
    ],
  }),
  m('bath', {
    match: /\b(bath\w*|showers?|soap|wash\w*|scent\w*|hygien\w*)\b/i,
    category: 'hygiene', noun: 'bath', plural: 'baths', verb: 'bathe precisely twice per day',
    heresy: 'showers', purism: 'the water must be lukewarm and unscented', radical: 'rain is a bath administered by the sky',
    industry: 'soap', shortage: 'unscented soap', measure: 'bathing precision', showcase: 'Great Communal Rinse',
    attr: { visibility: 25, difficulty: 45, appeal: 55 },
    incidents: [
      '{city} Water Utility Reports Suspiciously Regular Usage Spikes',
      'Unscented Soap Sells Out Across {country}',
      'Hotel Chains in {city} Remove All Fragrance "Just in Case"',
    ],
  }),
  m('sandwich', {
    match: /\b(sandwich\w*|bread|toast|loaf|loaves|bagels?)\b/i,
    category: 'food', noun: 'sandwich', plural: 'sandwiches', verb: 'never eat square sandwiches',
    heresy: 'wraps', purism: 'triangles must be equilateral', radical: 'a hot dog is the only honest sandwich',
    industry: 'bakery', shortage: 'triangular bread', measure: 'sandwich geometry', showcase: 'Geometric Picnic',
    attr: { visibility: 30, appeal: 70, commerce: 65, ambiguity: 75 },
    incidents: [
      '{city} Delis Retool for Non-Square Production',
      'Geometry Teachers in {city} Called as Expert Witnesses',
      'Is a Wrap a Sandwich? {city} Chapter Refuses to Say',
    ],
  }),
  m('dessert', {
    match: /\b(desserts?|cakes?|pies?|sweets?|ice cream|pudding|cookies?|pastr\w*)\b/i,
    category: 'food', noun: 'dessert', plural: 'desserts', verb: 'begin every meal with dessert',
    heresy: 'fruit plates', purism: 'dessert must also end the meal', radical: 'the entire meal is dessert',
    industry: 'confectionery', shortage: 'sprinkles', measure: 'dessert precedence', showcase: 'Inverted Banquet',
    attr: { visibility: 35, appeal: 90, commerce: 75 },
    incidents: [
      '{city} Restaurants Print Menus in Reverse',
      'Dentists in {country} Cautiously Optimistic About Business',
      'Vegetable Lobby in {country} Demands Equal Time',
    ],
  }),
  m('tower', {
    match: /\b(popsicle\w*|towers?|sticks?|build\w*|construct\w*|models?)\b/i,
    category: 'hobby', noun: 'popsicle-stick tower', plural: 'popsicle-stick towers', verb: 'build towers from popsicle sticks',
    heresy: 'toothpick towers', purism: 'glue is a crutch', radical: 'the tower already exists; we merely remove the air around it',
    industry: 'craft-stick', shortage: 'popsicle sticks', measure: 'tower height', showcase: 'Tower Raising Festival',
    attr: { visibility: 60, appeal: 74, commerce: 62, intensity: 70 },
    incidents: [
      'Popsicle Consumption in {city} Exceeds Freezer Capacity',
      '{city} Skyline Altered by Unpermitted Craft Structure',
      'Craft Stick Shortage Grips {country}; Ice Pops Sold "Stick Not Included"',
      'Building Inspectors in {city} Request Clearer Guidelines on Glue',
    ],
  }),
  m('handshake', {
    match: /\b(handshakes?|greet\w*|hugs?|bows?|salutes?|high.?fives?)\b/i,
    category: 'hobby', noun: 'handshake', plural: 'handshakes', verb: 'perform elaborate handshakes',
    heresy: 'fist bumps', purism: 'the handshake must have exactly forty-one steps', radical: 'a glance is a handshake of the soul',
    industry: 'hand cream', shortage: 'hand cream', measure: 'handshake duration', showcase: 'Mass Greeting Ceremony',
    attr: { visibility: 75, difficulty: 50, appeal: 68, intensity: 80 },
    incidents: [
      '{city} Business Meeting Fails to Begin After Ninety-Minute Greeting',
      'Diplomats in {city} Request Handshake Interpreters',
      'Wrist Injuries Rise Among {F} in {country}',
    ],
  }),
  m('rock', {
    match: /\b(rocks?|stones?|pebbles?|geolog\w*|minerals?)\b/i,
    category: 'hobby', noun: 'interesting rock', plural: 'interesting rocks', verb: 'collect interesting rocks',
    heresy: 'boring rocks', purism: 'a rock must be found, never bought', radical: 'the planet is one very large interesting rock',
    industry: 'pocket', shortage: 'sufficiently interesting rocks', measure: 'rock interest', showcase: 'Great Rock Show-and-Tell',
    attr: { visibility: 30, appeal: 66, commerce: 45 },
    incidents: [
      '{city} Beaches Report Sudden Pebble Deficit',
      'Geologists in {country} Overwhelmed by Requests for Second Opinions',
      'Trouser Pockets in {city} Reinforced Following Wave of Failures',
    ],
  }),
  m('cape', {
    match: /\b(capes?|cloaks?|robes?|ponchos?|scar(f|ves))\b/i,
    category: 'clothing', noun: 'cape', plural: 'capes', verb: 'wear capes on weekends',
    heresy: 'blankets worn as capes', purism: 'the cape must billow', radical: 'the wind is the true cape',
    industry: 'textile', shortage: 'billowing fabric', measure: 'billow', showcase: 'Cape Procession',
    attr: { visibility: 88, appeal: 70, commerce: 70 },
    incidents: [
      'Revolving Doors Banned in {city} Following Cape Incidents',
      '{city} Weekend Wind Forecast Now Includes "Billow Index"',
      'Dry Cleaners in {country} Report Record Weekends',
    ],
  }),
  m('kazoo', {
    match: /\b(kazoos?|accordions?|whistl\w*|harmonicas?|ukuleles?|bagpipes?|drums?|tubas?)\b/i,
    category: 'music', noun: 'kazoo', plural: 'kazoos', verb: 'play competitive kazoo',
    heresy: 'the comb-and-paper', purism: 'the kazoo must be played in unison', radical: 'humming is a kazoo without a kazoo',
    industry: 'kazoo', shortage: 'kazoo membranes', measure: 'buzz', showcase: 'Thousand-Kazoo Salute',
    attr: { visibility: 70, appeal: 66, commerce: 60, controversy: 50 },
    incidents: [
      'Noise Ordinance Revised in {city}; Exemption for "Sincere Buzzing"',
      '{city} Orchestra Adds Kazoo Section Under Protest',
      'Kazoo Membrane Shortage Silences {country}, Briefly',
    ],
  }),
  m('yachtrock', {
    match: /\byacht\s?rock\b/i,
    category: 'music', noun: 'yacht rock', plural: 'yacht rock ballads', verb: 'listen exclusively to yacht rock',
    heresy: 'soft rock', purism: 'the saxophone solo must never be skipped', radical: 'every boat is a yacht if the song is smooth enough',
    industry: 'boat shoe', shortage: 'boat shoes', measure: 'smoothness', showcase: 'Smooth Sailing Concert',
    orgNoun: 'Rough Music', committee: 'Committee on Acceptable Smoothness',
    attr: { visibility: 50, appeal: 72, commerce: 66 },
    incidents: [
      '{city} Radio Stations Report Unprecedented Smoothness',
      'Captain Hat Sales Surge Inland in {city}, Hundreds of Miles From Water',
      'Saxophone Repair Shops in {country} Booked Through Spring',
    ],
  }),
  m('kpop', {
    match: /\bk-?pop\b/i,
    category: 'music', noun: 'K-pop routine', plural: 'K-pop routines', verb: 'listen to K-pop',
    heresy: 'J-pop', purism: 'the choreography must be performed in full', radical: 'every movement is choreography',
    industry: 'lightstick', shortage: 'lightsticks', measure: 'synchronization', showcase: 'Synchronized Dance Rally',
    attr: { visibility: 75, appeal: 74, commerce: 80, intensity: 80 },
    incidents: [
      '{city} Commuters Perform Fully Synchronized Station Exit',
      'Lightstick Shortage Reported Across {country}',
      'Rehearsal Space in {city} Booked Solid Through Next Decade',
    ],
  }),
  m('folk', {
    match: /\b(folk|hippie|acoustic|banjos?|guitars?)\b/i,
    category: 'music', noun: 'folk song', plural: 'folk songs', verb: 'listen to hippie-dippy folk music',
    heresy: 'electric guitars', purism: 'the song must have at least eleven verses', radical: 'the silence between verses is the true song',
    industry: 'tambourine', shortage: 'tambourines', measure: 'verse count', showcase: 'Campfire Singalong',
    attr: { visibility: 45, appeal: 70, commerce: 40 },
    incidents: [
      '{city} Singalong Enters Its Third Day, Fourteenth Verse',
      'Tambourine Shortage Grips {country}',
      '{F} in {city} Accused of "Strumming Aggressively"',
    ],
  }),
  m('metal', {
    match: /\b(death metal|metal|heavy metal|thrash|hardcore)\b/i,
    category: 'music', noun: 'death metal anthem', plural: 'death metal anthems', verb: 'listen to death metal',
    heresy: 'melodic metal', purism: 'lyrics must be wholly unintelligible', radical: 'the scream is the only true lyric',
    industry: 'amplifier', shortage: 'amplifiers', measure: 'decibels', showcase: 'Mosh of Unity',
    attr: { visibility: 70, appeal: 50, controversy: 65, intensity: 85 },
    incidents: [
      '{city} Retirement Home Hosts First Mosh Pit, Reports "Excellent Cardio"',
      'Amplifier Shortage in {country} Forces {F} to Shout Unamplified',
      'Noise Complaint in {city} Withdrawn After Complainant Converts',
    ],
  }),
  m('polka', {
    match: /\bpolkas?\b/i,
    category: 'music', noun: 'polka', plural: 'polkas', verb: 'dance the polka',
    heresy: 'the waltz', purism: 'a polka must never stop, only pause', radical: 'the earth itself is polkaing around the sun',
    industry: 'accordion', shortage: 'accordions', measure: 'oompah', showcase: 'Grand Polka Gala',
    attr: { visibility: 65, appeal: 66 },
    incidents: [
      '{city} Accordion Rentals Exceed Supply',
      'Polka Breaks Out at {city} Town Hall; Agenda Postponed',
      'Waltz Advocates in {country} Accuse {F} of "Rhythmic Imperialism"',
    ],
  }),
  m('jazz', {
    match: /\b(jazz\w*|fusion|bebop|swing)\b/i,
    category: 'music', noun: 'jazz fusion solo', plural: 'jazz fusion solos', verb: 'listen to jazz fusion',
    heresy: 'smooth jazz', purism: 'the solo must exceed twelve minutes', radical: 'every wrong note is the right note',
    industry: 'fretless bass', shortage: 'fretless basses', measure: 'time signature', showcase: 'Improvised Convention',
    attr: { visibility: 40, appeal: 50, ambiguity: 85 },
    incidents: [
      '{city} Meeting Ends in an Unresolvable Key',
      'Odd Time Signatures Reported at {city} Bus Stops',
      'Fretless Bass Shortage Reported in {country}',
    ],
  }),
  m('synthwave', {
    match: /\b(synthwave|synth\w*|retrowave|80s|neon)\b/i,
    category: 'music', noun: 'synthwave track', plural: 'synthwave tracks', verb: 'listen to synthwave',
    heresy: 'vaporwave', purism: 'every sunset must be magenta', radical: 'the future was always 1986',
    industry: 'neon', shortage: 'neon tubing', measure: 'retro-futurism', showcase: 'Neon Sunset Drive',
    attr: { visibility: 60, appeal: 70, commerce: 70 },
    incidents: [
      '{city} Streetlights Quietly Switched to Magenta',
      'Sunglasses Worn at Night Across {city}; Optometrists Concerned',
      'Neon Tubing Shortage Darkens {country}',
    ],
  }),
  m('elevator', {
    match: /\b(elevator music|muzak|lounge music|easy listening)\b/i,
    category: 'music', noun: 'elevator melody', plural: 'elevator melodies', verb: 'listen to elevator music',
    heresy: 'hold music', purism: 'the music must be played in an actual elevator', radical: 'the elevator is a state of mind',
    industry: 'elevator', shortage: 'elevators', measure: 'blandness', showcase: 'Vertical Listening Session',
    attr: { visibility: 30, appeal: 62 },
    incidents: [
      '{city} Elevators Report Record Ridership, Few Destinations',
      'Hold Music Controversy Erupts in {city} Customer Service Sector',
      '{F} in {city} Ride Elevator Up and Down for Four Hours "For Reasons of Faith"',
    ],
  }),
  m('yurt', {
    match: /\b(yurts?|gers?)\b/i,
    category: 'housing', noun: 'yurt', plural: 'yurts', verb: 'live in yurts',
    heresy: 'circular office buildings', purism: 'a yurt must be collapsible within one afternoon', radical: 'the sky is the roof of one great yurt',
    industry: 'felt', shortage: 'yurt felt', measure: 'roundness', showcase: 'Great Yurt Raising',
    attr: { visibility: 70, difficulty: 70, appeal: 55, commerce: 65 },
    incidents: [
      'Zoning Board in {city} Struggles to Classify Circular Dwellings',
      '{city} Parking Lots Converted to Yurt Villages Overnight',
      'Felt Prices in {country} Reach Historic Highs',
    ],
  }),
  m('hut', {
    match: /\b(huts?|cabins?|shacks?|cottages?)\b/i,
    category: 'housing', noun: 'hut', plural: 'huts', verb: 'live in huts',
    heresy: 'bungalows', purism: 'a hut must have exactly one room', radical: 'every room is a hut inside a larger hut',
    industry: 'thatch', shortage: 'thatch', measure: 'hut humility', showcase: 'Hut Village Fair',
    attr: { visibility: 60, difficulty: 65, appeal: 50 },
    incidents: ['{city} Planning Office Receives 4,000 Hut Permit Applications', 'Thatch Imports Into {country} Double', '{city} Real Estate Agents Rebrand as "Hut Consultants"'],
  }),
  m('tent', {
    match: /\b(tents?|camping|campsites?|tarps?)\b/i,
    category: 'housing', noun: 'tent', plural: 'tents', verb: 'live in tents',
    heresy: 'campervans', purism: 'the tent must be pitched without instructions', radical: 'clouds are tents for the sky',
    industry: 'outdoor gear', shortage: 'tent pegs', measure: 'pitch tension', showcase: 'Great Encampment',
    attr: { visibility: 70, difficulty: 60, appeal: 58 },
    incidents: ['Tent Peg Shortage Reported Across {country}', '{city} Parks Fully Booked by {F}', 'Zipper Noise Complaint in {city} Escalates to Council'],
  }),
  m('treehouse', {
    match: /\b(treehouses?|trees?|forests?|canop\w*)\b/i,
    category: 'housing', noun: 'treehouse', plural: 'treehouses', verb: 'live in treehouses',
    heresy: 'tall porches', purism: 'a treehouse must touch no ground', radical: 'the tree is living in us',
    industry: 'rope ladder', shortage: 'rope ladders', measure: 'altitude', showcase: 'Canopy Convention',
    attr: { visibility: 72, difficulty: 72, appeal: 66 },
    incidents: ['Arborists in {city} Overwhelmed by Requests', 'Mail Delivery in {city} Now Requires Rope Ladder Certification', 'Tree Shortage Declared in {city}; Lampposts Under Consideration'],
  }),
  m('dome', {
    match: /\b(domes?|geodesic|igloos?|spheres?)\b/i,
    category: 'housing', noun: 'dome', plural: 'domes', verb: 'live in domes',
    heresy: 'arches', purism: 'a dome must be perfectly geodesic', radical: 'the sky is the original dome',
    industry: 'triangle', shortage: 'triangular panels', measure: 'curvature', showcase: 'Dome Raising Ceremony',
    attr: { visibility: 75, difficulty: 65, appeal: 60 },
    incidents: ['{city} Skyline Becoming "Uncomfortably Round"', 'Triangular Panel Shortage Hits {country}', 'Corner Shops in {city} Rename Themselves "Curve Shops"'],
  }),
  m('underground', {
    match: /\b(underground|bunkers?|caves?|caverns?|basements?|burrows?|tunnels?)\b/i,
    category: 'housing', noun: 'burrow', plural: 'burrows', verb: 'live underground',
    heresy: 'ground-floor apartments', purism: 'sunlight is a privilege, not a right', radical: 'the surface is merely a very high basement',
    industry: 'shovel', shortage: 'shovels', measure: 'depth', showcase: 'Subterranean Open House',
    attr: { visibility: 25, difficulty: 80, appeal: 45, controversy: 45 },
    incidents: ['{city} Geological Survey Reports "Unexpected Hollowness"', 'Shovel Shortage Reported in {country}', '{city} Street Partially Subsides; {F} Apologize Profusely'],
  }),
  m('green', {
    match: /\b(green|purple|orange|beige|blue|red|yellow|colou?rs?|paint\w*)\b/i,
    category: 'principle', noun: 'sacred color', plural: 'sacred colors', verb: 'honor the sacred color',
    heresy: 'neighboring shades', purism: 'the exact pigment must be certified', radical: 'all colors are the sacred color in poor lighting',
    industry: 'dye', shortage: 'certified pigment', measure: 'hue fidelity', showcase: 'Festival of the Sacred Hue',
    attr: { visibility: 80, appeal: 66, commerce: 70, ambiguity: 70 },
    incidents: ['Paint Swatch Dispute in {city} Requires Mediation', 'Dye Shortage Reported Across {country}', '{city} Sunset Officially Declared "Close Enough"'],
  }),
  m('walk', {
    match: /\b(walk\w*|journey|destination|stroll\w*|wander\w*|hik\w*|travel\w*)\b/i,
    category: 'principle', noun: 'journey', plural: 'journeys', verb: 'enjoy the journey more than the destination',
    heresy: 'shortcuts', purism: 'one must never actually arrive', radical: 'the destination is a journey that gave up',
    industry: 'map', shortage: 'scenic routes', measure: 'meander', showcase: 'Long Way Round March',
    orgNoun: 'Direct Routes', committee: 'Department of Scenic Detours',
    attr: { visibility: 45, appeal: 80, ambiguity: 75 },
    incidents: ['{city} Commute Times Triple; Satisfaction Reportedly Up', 'GPS Companies in {country} Add "Meander" Setting', '{F} in {city} Arrive Three Hours Late, Glowing'],
  }),
  m('noodle', {
    match: /\b(noodles?|pasta|spaghetti|ramen|udon)\b/i,
    category: 'food', noun: 'noodle', plural: 'noodles', verb: 'eat noodles at every meal',
    heresy: 'rice', purism: 'noodles must never be cut', radical: 'the universe is a single very long noodle',
    industry: 'noodle', shortage: 'long noodles', measure: 'noodle length', showcase: 'Endless Noodle Banquet',
    attr: { visibility: 30, appeal: 85, commerce: 70 },
    incidents: ['Scissors Banned From {city} Restaurants', 'Noodle Length Record Set in {city}; Still Ongoing', 'Rice Lobby in {country} Issues Strongly Worded Statement'],
  }),
  m('beard', {
    match: /\b(beards?|mustaches?|moustaches?|hair\w*|wigs?)\b/i,
    category: 'clothing', noun: 'mustache', plural: 'mustaches', verb: 'cultivate magnificent mustaches',
    heresy: 'stubble', purism: 'the mustache must be waxed at dawn', radical: 'a smile is a mustache of the spirit',
    industry: 'wax', shortage: 'mustache wax', measure: 'curl', showcase: 'Grand Grooming Pageant',
    attr: { visibility: 80, difficulty: 50, appeal: 55 },
    incidents: ['Mustache Wax Sells Out Across {country}', '{city} Barbers Report "Philosophical" Customers', 'Fake Mustache Controversy Rocks {city} Chapter'],
  }),
  m('dance', {
    match: /\b(danc\w*|disco|tango|ballet|twirl\w*|spin\w*)\b/i,
    category: 'hobby', noun: 'dance', plural: 'dances', verb: 'dance at every opportunity',
    heresy: 'swaying', purism: 'one may not stop dancing until the song admits defeat', radical: 'stillness is the hardest dance',
    industry: 'dance shoe', shortage: 'dance floors', measure: 'groove', showcase: 'Mass Dance-Off',
    attr: { visibility: 85, appeal: 78, intensity: 85 },
    incidents: ['{city} Crosswalks Now Traversed Exclusively by Dance', 'Dance Floor Shortage in {country}', '{city} Council Vote Delayed by Spontaneous Conga Line'],
  }),
  m('garden', {
    match: /\b(gardens?|plants?|flowers?|vegetables?|grow\w*|compost\w*)\b/i,
    category: 'hobby', noun: 'garden', plural: 'gardens', verb: 'tend extravagant gardens',
    heresy: 'artificial plants', purism: 'one must speak to the plants daily', radical: 'we are the garden, and the garden is gardening us',
    industry: 'seed', shortage: 'heirloom seeds', measure: 'verdancy', showcase: 'Great Seed Swap',
    attr: { visibility: 55, appeal: 82 },
    incidents: ['{city} Lawns Replaced Overnight', 'Seed Shortage Reported in {country}', 'Plant Conversations in {city} Grow "Heated"'],
  }),
  m('tea', {
    match: /\b(tea|coffee|espresso|latte|cocoa|kombucha)\b/i,
    category: 'food', noun: 'cup of tea', plural: 'cups of tea', verb: 'drink tea at the correct hour',
    heresy: 'iced tea', purism: 'the milk goes in second, always', radical: 'water is tea that has not yet decided',
    industry: 'kettle', shortage: 'kettles', measure: 'steep time', showcase: 'Great Ceremonial Steeping',
    attr: { visibility: 35, appeal: 80, commerce: 72, ambiguity: 70 },
    incidents: ['Milk-First Dispute Turns Ugly in {city}', 'Kettle Shortage Reported Across {country}', '{city} Office Productivity Pauses at Exactly 4:00'],
  }),
  m('cheese', {
    match: /\b(cheese\w*|cheddar|brie|gouda|dairy)\b/i,
    category: 'food', noun: 'cheese', plural: 'cheeses', verb: 'revere cheese',
    heresy: 'processed cheese slices', purism: 'cheese must be aged longer than its eater', radical: 'the moon is the first cheese',
    industry: 'dairy', shortage: 'aged cheddar', measure: 'pungency', showcase: 'Cheese Pilgrimage',
    attr: { visibility: 35, appeal: 78, commerce: 76 },
    incidents: ['{city} Cheese Cave Over Capacity', 'Pungency Complaint in {city} Dismissed as "Doctrinal"', 'Dairy Exports From {country} Surge'],
  }),
  m('umbrella', {
    match: /\b(umbrellas?|parasols?|rain\w*)\b/i,
    category: 'clothing', noun: 'umbrella', plural: 'umbrellas', verb: 'carry an umbrella at all times',
    heresy: 'hoods', purism: 'the umbrella must be open indoors', radical: 'clouds are umbrellas for the sun',
    industry: 'umbrella', shortage: 'umbrella ribs', measure: 'canopy span', showcase: 'Parade of Canopies',
    attr: { visibility: 80, appeal: 60, controversy: 40 },
    incidents: ['Indoor Umbrella Incidents Spike in {city}', 'Umbrella Rib Shortage in {country}', 'Sunny Day in {city} Fails to Deter Anyone'],
  }),
  m('silence', {
    match: /\b(silen\w*|quiet\w*|whisper\w*|hush\w*|mime)\b/i,
    category: 'principle', noun: 'silence', plural: 'silences', verb: 'observe solemn silences',
    heresy: 'whispering', purism: 'even thoughts should be quieter', radical: 'all speech is merely interrupted silence',
    industry: 'earplug', shortage: 'earplugs', measure: 'decibel restraint', showcase: 'Great Silent Assembly',
    attr: { visibility: 20, appeal: 55, ambiguity: 65 },
    incidents: ['{city} Rally Draws Thousands, Zero Decibels', 'Earplug Shortage Reported in {country}', 'Reporters in {city} Unable to Obtain Quote, Again'],
  }),
  m('pets', {
    match: /\b(cats?|dogs?|pets?|kittens?|puppies|hamsters?|goldfish)\b/i,
    category: 'principle', noun: 'pet', plural: 'pets', verb: 'consult their pets on important matters',
    heresy: 'houseplants as pets', purism: 'the pet has the final vote', radical: 'humans are the pets',
    industry: 'pet food', shortage: 'premium kibble', measure: 'pet authority', showcase: 'Pet Advisory Summit',
    attr: { visibility: 50, appeal: 85, commerce: 70 },
    incidents: ['{city} Council Meeting Chaired by Cat, Adjourned by Cat', 'Kibble Prices in {country} Rise', 'Dog Votes "No" on {city} Budget'],
  }),
  m('bicycle', {
    match: /\b(bicycles?|bikes?|cycl\w*|unicycles?|tricycles?|scooters?)\b/i,
    category: 'hobby', noun: 'bicycle', plural: 'bicycles', verb: 'ride bicycles everywhere',
    heresy: 'e-bikes', purism: 'the bicycle must have a bell, and the bell must be rung', radical: 'walking is cycling with fewer wheels',
    industry: 'bicycle', shortage: 'bicycle bells', measure: 'pedal cadence', showcase: 'Great Bell-Ringing Ride',
    attr: { visibility: 75, appeal: 74, commerce: 66 },
    incidents: ['{city} Bell Noise Reaches Symphonic Levels', 'Bicycle Bell Shortage Reported in {country}', 'Car Lane in {city} Quietly Becomes Bike Lane'],
  }),
  m('pancake', {
    match: /\b(pancakes?|waffles?|crepes?|syrup|breakfast)\b/i,
    category: 'food', noun: 'pancake', plural: 'pancakes', verb: 'eat pancakes for every meal',
    heresy: 'waffles', purism: 'pancakes must be stacked in prime numbers', radical: 'a pancake is a waffle that found peace',
    industry: 'syrup', shortage: 'maple syrup', measure: 'stack height', showcase: 'Great Stack-Off',
    attr: { visibility: 30, appeal: 86, commerce: 72 },
    incidents: ['Syrup Reserves in {country} Tapped', 'Waffle Partisans in {city} Picket Diner', '{city} Breakfast Extends Into Evening, Again'],
  }),
  m('glasses', {
    match: /\b(glasses|monocles?|spectacles|sunglasses|goggles)\b/i,
    category: 'clothing', noun: 'monocle', plural: 'monocles', verb: 'wear a monocle',
    heresy: 'reading glasses', purism: 'the monocle must be dropped in surprise at least daily', radical: 'the eye is a monocle for the soul',
    industry: 'optical', shortage: 'monocle chains', measure: 'astonishment', showcase: 'Grand Monocle Drop',
    attr: { visibility: 78, appeal: 58, commerce: 68 },
    incidents: ['Monocle Breakage in {city} Reaches Record High', 'Optical Shops in {country} Overwhelmed', 'Surprise Officially Mandatory at {city} Gatherings'],
  }),
];

export const GENERIC_INCIDENTS = [
  '{city} Residents Report Sudden Urge to {verb}',
  '{Noun} Sales Surge in {country}; Analysts Baffled',
  '{city} Council Debates Limits on {measure}',
  'Spokesperson Unable to Explain {noun} Doctrine Under Light Questioning',
  '{F} in {city} Accused of Excessive {Noun} Enthusiasm',
  '{industry} Industry in {country} Reports Record Quarter',
];

const STOP = new Set(
  'the a an and or of to in on at for with without by from is are be all every everyone everybody people should must shall always never only once twice daily day per each their our your its it this that these those more most less than into over under before after during not no yes do does very really truly deserve deserves important underappreciated form superior other others anything nothing something some any just much many we us they them he she you i my me were was been being as about which who whom what when where why how one'.split(
    ' ',
  ),
);

export function extractKeyNoun(text: string): string {
  const words = text
    .toLowerCase()
    .replace(/[^a-z\s'-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
  if (!words.length) return 'principle';
  // prefer the last meaningful word (often the object), break ties by length
  const last = words[words.length - 1];
  const longest = words.reduce((a, b) => (b.length > a.length ? b : a), words[0]);
  return last.length >= 4 ? last : longest;
}

function singularize(w: string): string {
  if (/ies$/.test(w)) return w.replace(/ies$/, 'y');
  if (/(ss|us)$/.test(w)) return w;
  if (/(ch|sh|x)es$/.test(w)) return w.replace(/es$/, '');
  if (/s$/.test(w)) return w.slice(0, -1);
  return w;
}
function pluralize(w: string): string {
  if (/(s|x|ch|sh)$/.test(w)) return `${w}es`;
  if (/[^aeiou]y$/.test(w)) return w.replace(/y$/, 'ies');
  return `${w}s`;
}

export function genericMotif(text: string): Motif {
  const raw = extractKeyNoun(text);
  const noun = singularize(raw);
  const plural = pluralize(noun);
  const N = cap(noun);
  return {
    key: `generic:${noun}`,
    noun,
    plural,
    verb: text.replace(/^(people|everyone|we)\s+(should|must)\s+(always\s+)?/i, '').replace(/[.!]+$/, '').toLowerCase() || `honor the ${noun}`,
    heresy: `${noun} substitutes`,
    purism: `only authentic, certified ${plural} count`,
    radical: `true ${noun} devotion exists entirely within the mind`,
    industry: noun,
    shortage: `authentic ${plural}`,
    measure: `${noun} intensity`,
    showcase: `Grand ${N} Demonstration`,
    orgNoun: `Ordinary ${cap(plural)}`,
    committee: `Committee on ${N} Compliance`,
    incidents: GENERIC_INCIDENTS,
    dayName: `International ${N} Day`,
  };
}

export function findMotif(text: string): MotifDef | undefined {
  // yacht rock / k-pop etc. must win over the generic 'rock' motif: check specific first
  const order = ['yachtrock', 'kpop', 'metal', 'elevator'];
  for (const k of order) {
    const mm = MOTIFS.find((x) => x.key === k)!;
    if (mm.match.test(text)) return mm;
  }
  return MOTIFS.find((x) => x.match.test(text));
}
