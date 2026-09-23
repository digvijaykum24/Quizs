/* QuizArena — sample data (questions, categories, leaderboard, badges) */
const DATA = (function () {
  const q = (t, opts, a) => ({ q: t, opts, a });

  const QUIZZES = [
    {
      id: 'science', title: 'Science Quiz', cat: 'Science', icon: '🔬', grad: 'var(--grad-science)',
      minutes: 15, difficulty: 'Easy / Medium / Hard', diffClass: 'mixed', lang: 'English', featured: true, cta: 'Start Quiz',
      questions: [
        q('What is the chemical symbol for Oxygen?', ['O', 'Ox', 'Og', 'Om'], 0),
        q('Which planet is known as the Red Planet?', ['Venus', 'Mars', 'Jupiter', 'Saturn'], 1),
        q('Which organelle is called the powerhouse of the cell?', ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi body'], 2),
        q('At sea level, water boils at what temperature?', ['90 °C', '100 °C', '110 °C', '120 °C'], 1),
        q('Which gas do plants absorb during photosynthesis?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2),
        q('The SI unit of electric current is the…', ['Volt', 'Ampere', 'Ohm', 'Watt'], 1),
        q('Which is the hardest naturally occurring substance?', ['Gold', 'Iron', 'Diamond', 'Quartz'], 2),
        q('The largest organ of the human body is the…', ['Liver', 'Skin', 'Heart', 'Lungs'], 1),
        q('The approximate speed of light in vacuum is…', ['3 × 10⁶ m/s', '3 × 10⁸ m/s', '3 × 10¹⁰ m/s', '3 × 10⁵ m/s'], 1),
        q('Which vitamin is produced when skin is exposed to sunlight?', ['Vitamin A', 'Vitamin B12', 'Vitamin C', 'Vitamin D'], 3),
        q('The pH value of pure water is…', ['5', '7', '9', '14'], 1),
        q("Newton's first law of motion is also known as the law of…", ['Gravitation', 'Inertia', 'Acceleration', 'Action and reaction'], 1),
        q('Which blood cells help the body fight infection?', ['Red blood cells', 'White blood cells', 'Platelets', 'Plasma'], 1),
        q('The chemical formula of common salt is…', ['NaCl', 'KCl', 'NaOH', 'HCl'], 0),
        q('Which metal is liquid at room temperature?', ['Sodium', 'Mercury', 'Aluminium', 'Zinc'], 1),
        q('How many bones are there in an adult human body?', ['196', '206', '216', '226'], 1),
        q('Atmospheric pressure is measured using a…', ['Thermometer', 'Barometer', 'Hygrometer', 'Anemometer'], 1),
        q("Which gas is most abundant in Earth's atmosphere?", ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Argon'], 1),
        q('Sound cannot travel through…', ['Air', 'Water', 'Steel', 'Vacuum'], 3),
        q('Photosynthesis mainly takes place in which part of a plant?', ['Root', 'Stem', 'Leaf', 'Flower'], 2)
      ]
    },
    {
      id: 'gk-hindi', title: 'GK Quiz in Hindi', cat: 'GK Hindi', icon: '🇮🇳', grad: 'var(--grad-hindi)', hindi: true,
      minutes: 20, difficulty: 'Medium', diffClass: 'medium', lang: 'हिंदी', featured: true, cta: 'Start Quiz',
      questions: [
        q('भारत की राजधानी क्या है?', ['मुंबई', 'नई दिल्ली', 'कोलकाता', 'चेन्नई'], 1),
        q('भारत का राष्ट्रीय पशु कौन सा है?', ['शेर', 'बाघ', 'हाथी', 'मोर'], 1),
        q('भारत का राष्ट्रीय पक्षी कौन सा है?', ['कबूतर', 'मोर', 'तोता', 'कौआ'], 1),
        q('भारत के पहले प्रधानमंत्री कौन थे?', ['महात्मा गांधी', 'जवाहरलाल नेहरू', 'सरदार पटेल', 'डॉ. राजेंद्र प्रसाद'], 1),
        q('राष्ट्रगान "जन गण मन" के रचयिता कौन हैं?', ['बंकिम चंद्र चटर्जी', 'रवींद्रनाथ टैगोर', 'सुभाष चंद्र बोस', 'मैथिलीशरण गुप्त'], 1),
        q('भारत की सबसे लंबी नदी कौन सी है?', ['गंगा', 'यमुना', 'ब्रह्मपुत्र', 'गोदावरी'], 0),
        q('भारतीय संविधान कब लागू हुआ?', ['15 अगस्त 1947', '26 जनवरी 1950', '26 नवंबर 1949', '2 अक्टूबर 1950'], 1),
        q('भारत के राष्ट्रपिता किसे कहा जाता है?', ['जवाहरलाल नेहरू', 'महात्मा गांधी', 'भगत सिंह', 'बी.आर. अंबेडकर'], 1),
        q('क्षेत्रफल की दृष्टि से भारत का सबसे बड़ा राज्य कौन सा है?', ['उत्तर प्रदेश', 'राजस्थान', 'महाराष्ट्र', 'मध्य प्रदेश'], 1),
        q('"भारत रत्न" किस प्रकार का सम्मान है?', ['खेल पुरस्कार', 'सर्वोच्च नागरिक सम्मान', 'सैन्य सम्मान', 'साहित्य पुरस्कार'], 1),
        q('ताजमहल का निर्माण किसने करवाया था?', ['अकबर', 'शाहजहाँ', 'औरंगज़ेब', 'हुमायूँ'], 1),
        q('भारत का राष्ट्रीय फूल कौन सा है?', ['गुलाब', 'कमल', 'सूरजमुखी', 'गेंदा'], 1),
        q('भारत की सबसे ऊँची चोटी कौन सी है?', ['माउंट एवरेस्ट', 'कंचनजंगा', 'नंदा देवी', 'धौलागिरि'], 1),
        q('"मिसाइल मैन ऑफ इंडिया" किसे कहा जाता है?', ['होमी भाभा', 'डॉ. ए.पी.जे. अब्दुल कलाम', 'विक्रम साराभाई', 'सी.वी. रमन'], 1),
        q('भारतीय रुपये के प्रतीक चिह्न (₹) को किसने डिज़ाइन किया?', ['उदय कुमार', 'रघुराम राजन', 'अमर्त्य सेन', 'नंदन नीलेकणि'], 0),
        q('भारत में कुल कितने राज्य हैं?', ['27', '28', '29', '30'], 1),
        q('"रामायण" के रचयिता कौन हैं?', ['तुलसीदास', 'वाल्मीकि', 'वेदव्यास', 'कालिदास'], 1),
        q('भारत का राष्ट्रीय फल कौन सा है?', ['केला', 'आम', 'सेब', 'अमरूद'], 1),
        q('कोणार्क का सूर्य मंदिर किस राज्य में स्थित है?', ['बिहार', 'ओडिशा', 'पश्चिम बंगाल', 'झारखंड'], 1),
        q('भारत की पहली महिला प्रधानमंत्री कौन थीं?', ['सरोजिनी नायडू', 'इंदिरा गांधी', 'प्रतिभा पाटिल', 'सुषमा स्वराज'], 1),
        q('भारत का राष्ट्रीय वृक्ष कौन सा है?', ['पीपल', 'बरगद', 'नीम', 'आम'], 1),
        q('"सत्यमेव जयते" कहाँ से लिया गया है?', ['ऋग्वेद', 'मुण्डकोपनिषद', 'भगवद्गीता', 'महाभारत'], 1),
        q('भारत में हरित क्रांति के जनक कौन हैं?', ['वर्गीज कुरियन', 'एम.एस. स्वामीनाथन', 'नॉर्मन बोरलॉग', 'सी. सुब्रमण्यम'], 1),
        q('भारतीय रिज़र्व बैंक की स्थापना किस वर्ष हुई थी?', ['1935', '1947', '1950', '1969'], 0),
        q('भारत का राष्ट्रीय जलीय जीव कौन सा है?', ['डॉल्फिन', 'मगरमच्छ', 'कछुआ', 'शार्क'], 0)
      ]
    },
    {
      id: 'maths', title: 'Maths Mock Test', cat: 'Mathematics', icon: '➗', grad: 'var(--grad-maths)',
      minutes: 30, difficulty: 'Multiple Levels', diffClass: 'hard', lang: 'English', featured: true, cta: 'Start Test',
      questions: [
        q('What is 15% of 200?', ['20', '25', '30', '35'], 2),
        q('12 × 12 = ?', ['124', '144', '154', '164'], 1),
        q('The square root of 169 is…', ['11', '12', '13', '14'], 2),
        q('LCM of 4 and 6 is…', ['8', '12', '24', '2'], 1),
        q('HCF of 36 and 48 is…', ['6', '12', '18', '24'], 1),
        q('Solve: 3x + 5 = 20', ['x = 3', 'x = 4', 'x = 5', 'x = 6'], 2),
        q('The average of 10, 20, 30, 40 and 50 is…', ['25', '30', '35', '40'], 1),
        q('7³ = ?', ['243', '343', '443', '49'], 1),
        q('Simple interest on ₹1,000 at 10% p.a. for 2 years is…', ['₹100', '₹200', '₹210', '₹220'], 1),
        q('A train covers 120 km in 2 hours. Its speed is…', ['50 km/h', '60 km/h', '70 km/h', '80 km/h'], 1),
        q('Perimeter of a square with side 8 cm is…', ['16 cm', '24 cm', '32 cm', '64 cm'], 2),
        q('Area of a rectangle with length 9 cm and breadth 5 cm is…', ['14 cm²', '28 cm²', '45 cm²', '90 cm²'], 2),
        q('0.25 written as a fraction is…', ['1/2', '1/3', '1/4', '1/5'], 2),
        q('Next number in the series 2, 6, 12, 20, … ?', ['28', '30', '32', '36'], 1),
        q('Sum of the interior angles of a triangle is…', ['90°', '180°', '270°', '360°'], 1),
        q('25% of 25% of 400 = ?', ['20', '25', '50', '100'], 1),
        q('An item bought for ₹80 is sold for ₹100. Profit percentage is…', ['20%', '25%', '30%', '40%'], 1),
        q('1/3 + 1/6 = ?', ['1/9', '2/9', '1/2', '2/3'], 2),
        q('The value of π (pi) is approximately…', ['2.14', '3.14', '4.14', '3.41'], 1),
        q('Which of these is a prime number?', ['21', '27', '29', '33'], 2),
        q('The ratio of 2 hours to 30 minutes is…', ['1 : 4', '2 : 1', '4 : 1', '1 : 15'], 2),
        q('Median of 3, 9, 7, 5, 11 is…', ['5', '7', '9', '11'], 1),
        q('2⁵ = ?', ['10', '16', '25', '32'], 3),
        q('A number divided by 5 gives quotient 8 and remainder 3. The number is…', ['40', '43', '45', '48'], 1),
        q('The area of a circle is given by…', ['2πr', 'πr²', 'πd', '4πr²'], 1),
        q('45 ÷ 0.5 = ?', ['22.5', '45', '90', '9'], 2),
        q('If x = 4, the value of x² − 3x + 2 is…', ['4', '6', '8', '10'], 1),
        q('Compound interest on ₹1,000 at 10% p.a. for 2 years is…', ['₹200', '₹210', '₹220', '₹230'], 1),
        q('The angle on a straight line measures…', ['90°', '180°', '270°', '360°'], 1),
        q('How many edges does a cube have?', ['6', '8', '10', '12'], 3)
      ]
    },
    {
      id: 'reasoning', title: 'Reasoning Quiz', cat: 'Reasoning', icon: '🧠', grad: 'var(--grad-reason)',
      minutes: 10, difficulty: 'Medium', diffClass: 'medium', lang: 'English', cta: 'Start Quiz',
      questions: [
        q('Find the next term: 3, 6, 11, 18, 27, ?', ['36', '38', '40', '42'], 1),
        q('If CAT is coded as 3-1-20, then DOG is coded as…', ['4-15-7', '4-14-7', '5-15-7', '4-15-8'], 0),
        q('Find the odd one out.', ['Apple', 'Banana', 'Carrot', 'Mango'], 2),
        q("A is B's brother. B is C's mother. How is A related to C?", ['Father', 'Uncle', 'Brother', 'Grandfather'], 1),
        q('Which letter is the mirror image of "b"?', ['p', 'q', 'd', 'b'], 2),
        q('If the 1st of a month is Monday, what day is the 15th?', ['Sunday', 'Monday', 'Tuesday', 'Wednesday'], 1),
        q('Complete the series: AZ, BY, CX, ?', ['DV', 'DW', 'EW', 'DX'], 1),
        q('Pointing to a photo, Ravi says, "He is the son of my father\'s only son." Who is in the photo?', ["Ravi's brother", "Ravi's son", "Ravi's nephew", "Ravi's father"], 1),
        q('Which number replaces the question mark: 4, 9, 16, 25, ?', ['30', '32', '36', '49'], 2),
        q('If "+" means "×", then 6 + 3 = ?', ['9', '18', '2', '3'], 1)
      ]
    },
    {
      id: 'geography', title: 'Geography Quiz', cat: 'Geography', icon: '🌍', grad: 'var(--grad-geo)',
      minutes: 10, difficulty: 'Easy', diffClass: 'easy', lang: 'English', cta: 'Start Quiz',
      questions: [
        q('Which is the largest continent by area?', ['Africa', 'Asia', 'Europe', 'North America'], 1),
        q('The longest river in the world is the…', ['Amazon', 'Nile', 'Ganga', 'Yangtze'], 1),
        q('The capital of Australia is…', ['Sydney', 'Melbourne', 'Canberra', 'Perth'], 2),
        q('The Tropic of Cancer passes through how many Indian states?', ['6', '7', '8', '9'], 2),
        q('Which is the largest ocean on Earth?', ['Atlantic', 'Indian', 'Arctic', 'Pacific'], 3),
        q('The Sahara Desert is located in…', ['Asia', 'Africa', 'Australia', 'South America'], 1),
        q('Which Indian state has the longest coastline?', ['Maharashtra', 'Tamil Nadu', 'Gujarat', 'Andhra Pradesh'], 2),
        q('Mount Everest lies in which country?', ['India', 'Nepal', 'Bhutan', 'China'], 1),
        q('The smallest country in the world is…', ['Monaco', 'Maldives', 'Vatican City', 'San Marino'], 2),
        q('The river Ganga originates from the…', ['Yamunotri Glacier', 'Gangotri Glacier', 'Siachen Glacier', 'Zemu Glacier'], 1)
      ]
    },
    {
      id: 'english', title: 'English Quiz', cat: 'English', icon: '📖', grad: 'var(--grad-eng)',
      minutes: 10, difficulty: 'Easy', diffClass: 'easy', lang: 'English', cta: 'Start Quiz',
      questions: [
        q('Choose the synonym of "Abundant".', ['Scarce', 'Plentiful', 'Rare', 'Little'], 1),
        q('Choose the antonym of "Brave".', ['Bold', 'Cowardly', 'Strong', 'Fearless'], 1),
        q('Select the correctly spelt word.', ['Recieve', 'Receive', 'Receve', 'Reciev'], 1),
        q('Fill in the blank: She ___ to school every day.', ['go', 'goes', 'going', 'gone'], 1),
        q('The plural of "Child" is…', ['Childs', 'Childes', 'Children', 'Childrens'], 2),
        q('The past tense of "Run" is…', ['Runned', 'Ran', 'Running', 'Runs'], 1),
        q('The idiom "a piece of cake" means…', ['Very tasty', 'Very easy', 'Very expensive', 'Very small'], 1),
        q('Which of these words is a noun?', ['Quickly', 'Happiness', 'Run', 'Beautiful'], 1),
        q('One word for "a person who writes books":', ['Editor', 'Author', 'Printer', 'Reader'], 1),
        q('Choose the grammatically correct sentence.', ["He don't like tea.", "He doesn't likes tea.", "He doesn't like tea.", 'He not like tea.'], 2)
      ]
    },
    {
      id: 'ssc-mock', title: 'SSC CGL Mock Test', cat: 'Competitive Exams', icon: '🏆', grad: 'var(--grad-exam)',
      minutes: 12, difficulty: 'Hard', diffClass: 'hard', lang: 'English', cta: 'Start Test',
      questions: [
        q('Who is known as the "Iron Man of India"?', ['Jawaharlal Nehru', 'Sardar Vallabhbhai Patel', 'Bhagat Singh', 'Subhas Chandra Bose'], 1),
        q('Which Article of the Indian Constitution deals with Equality before Law?', ['Article 12', 'Article 14', 'Article 19', 'Article 21'], 1),
        q('The currency of Japan is the…', ['Yuan', 'Won', 'Yen', 'Ringgit'], 2),
        q("First Indian to win an individual Olympic gold medal?", ['Neeraj Chopra', 'Abhinav Bindra', 'Rajyavardhan Rathore', 'Leander Paes'], 1),
        q('The Battle of Plassey was fought in the year…', ['1757', '1764', '1857', '1707'], 0),
        q('The headquarters of ISRO is located in…', ['Hyderabad', 'Thiruvananthapuram', 'Bengaluru', 'Sriharikota'], 2),
        q('Fundamental Duties were added to the Constitution by which amendment?', ['42nd', '44th', '52nd', '61st'], 0),
        q('"The Discovery of India" was written by…', ['Mahatma Gandhi', 'Jawaharlal Nehru', 'B. R. Ambedkar', 'Rabindranath Tagore'], 1),
        q('Which gas is commonly used in fire extinguishers?', ['Oxygen', 'Nitrogen', 'Carbon dioxide', 'Hydrogen'], 2),
        q('The Lok Sabha can have a maximum strength of…', ['545', '550', '552', '560'], 2)
      ]
    },
    {
      id: 'gk', title: 'General Knowledge', cat: 'General Knowledge', icon: '📚', grad: 'var(--grad-gk)',
      minutes: 10, difficulty: 'Medium', diffClass: 'medium', lang: 'English', cta: 'Start Quiz',
      questions: [
        q('Who was the first President of India?', ['Dr. Rajendra Prasad', 'Dr. S. Radhakrishnan', 'Zakir Husain', 'V. V. Giri'], 0),
        q('The national song of India is…', ['Jana Gana Mana', 'Vande Mataram', 'Sare Jahan Se Achha', 'Ae Mere Watan'], 1),
        q('Which is the largest democracy in the world?', ['USA', 'Brazil', 'India', 'Indonesia'], 2),
        q('The Red Fort is located in…', ['Agra', 'Delhi', 'Jaipur', 'Lucknow'], 1),
        q('Who invented the telephone?', ['Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Marconi'], 1),
        q('The Nobel Prize is awarded from which country?', ['Norway', 'Sweden', 'Switzerland', 'Denmark'], 1),
        q('The Indian Space Research Organisation was founded in…', ['1962', '1969', '1975', '1980'], 1),
        q('World Environment Day is celebrated on…', ['22 April', '5 June', '16 September', '1 December'], 1),
        q('The "Father of Computers" is…', ['Alan Turing', 'Charles Babbage', 'Bill Gates', 'Tim Berners-Lee'], 1),
        q('The Olympic Games are held every…', ['2 years', '3 years', '4 years', '5 years'], 2)
      ]
    }
  ];

  const CATEGORIES = [
    { id: 'science', name: 'Science', icon: '🔬', grad: 'var(--grad-science)', desc: 'Physics, Chemistry & Biology for classes 6–12.', quiz: 'science' },
    { id: 'maths', name: 'Mathematics', icon: '➗', grad: 'var(--grad-maths)', desc: 'Arithmetic, algebra, geometry & quantitative aptitude.', quiz: 'maths' },
    { id: 'gk-hindi', name: 'GK Hindi', icon: '🇮🇳', grad: 'var(--grad-hindi)', desc: 'हिंदी में सामान्य ज्ञान — भारत, इतिहास और संविधान।', quiz: 'gk-hindi' },
    { id: 'english', name: 'English', icon: '📖', grad: 'var(--grad-eng)', desc: 'Grammar, vocabulary, idioms & comprehension.', quiz: 'english' },
    { id: 'reasoning', name: 'Reasoning', icon: '🧠', grad: 'var(--grad-reason)', desc: 'Series, coding-decoding, puzzles & blood relations.', quiz: 'reasoning' },
    { id: 'geography', name: 'Geography', icon: '🌍', grad: 'var(--grad-geo)', desc: 'Indian & world geography, maps and climate.', quiz: 'geography' },
    { id: 'history', name: 'History', icon: '🏛️', grad: 'linear-gradient(135deg,#B45309,#F59E0B)', desc: 'Ancient, medieval and modern Indian history.', state: 'empty' },
    { id: 'computer', name: 'Computer', icon: '💻', grad: 'linear-gradient(135deg,#0F766E,#22D3EE)', desc: 'Basics, MS Office, internet & computer awareness.', state: 'empty' },
    { id: 'current', name: 'Current Affairs', icon: '📰', grad: 'linear-gradient(135deg,#DB2777,#F97316)', desc: 'Daily & monthly updates for all exams.', state: 'empty' },
    { id: 'exams', name: 'Competitive Exams', icon: '🏆', grad: 'var(--grad-exam)', desc: 'Full-length mocks for SSC, Banking, Railway & UPSC.', quiz: 'ssc-mock' }
  ];

  const BADGES = [
    { id: 'master', name: 'Quiz Master', icon: '🏆', grad: 'linear-gradient(135deg,#FDE68A,#F59E0B)', desc: 'Score 80%+ in 3 quizzes', check: s => s.high80 >= 3, progress: s => Math.min(s.high80 / 3, 1) },
    { id: 'streak', name: '7 Day Streak', icon: '🔥', grad: 'linear-gradient(135deg,#FB923C,#EF4444)', desc: 'Play 7 days in a row', check: s => s.streak >= 7, progress: s => Math.min(s.streak / 7, 1) },
    { id: 'speed', name: 'Speed Solver', icon: '⚡', grad: 'linear-gradient(135deg,#22D3EE,#3B82F6)', desc: 'Finish a quiz in under half the time', check: s => s.fast >= 1, progress: s => Math.min(s.fast, 1) },
    { id: 'champion', name: 'Knowledge Champion', icon: '🧠', grad: 'linear-gradient(135deg,#A78BFA,#7C3AED)', desc: 'Average 85%+ across 10 quizzes', check: s => s.total >= 10 && s.avg >= 85, progress: s => Math.min((s.total / 10) * (s.avg / 85), 1) },
    { id: 'perfect', name: 'Perfect Score', icon: '🎯', grad: 'linear-gradient(135deg,#4ADE80,#16A34A)', desc: 'Get 100% in any quiz', check: s => s.perfect >= 1, progress: s => Math.min(s.perfect, 1) },
    { id: 'fifty', name: '50 Quizzes Completed', icon: '📚', grad: 'linear-gradient(135deg,#F472B6,#EC4899)', desc: 'Complete 50 quizzes', check: s => s.total >= 50, progress: s => Math.min(s.total / 50, 1) }
  ];

  // stable ids on every base question so the admin panel can remove them
  QUIZZES.forEach(qz => qz.questions.forEach((qq, i) => { qq.id = `${qz.id}-${i + 1}`; }));

  /* ---------- accounts ---------- */
  // The one seeded account. Change these before going live (see README).
  const USERS = [
    { id: 'u-admin', name: 'Admin', email: 'admin@quizarena.com', password: 'admin123', role: 'admin', joined: '2026-01-10', sub: 'Platform admin', color: '#0F172A' }
  ];
  // A visitor who hasn't logged in plays as a guest: attempts stay in their browser and never reach the leaderboard.
  const GUEST = { id: 'guest', name: 'Guest', email: 'guest', role: 'guest', sub: 'Not logged in', color: '#64748B' };

  return { QUIZZES, CATEGORIES, BADGES, USERS, GUEST };
})();

export const { QUIZZES, CATEGORIES, BADGES, USERS, GUEST } = DATA;
/* Demo-mode only (browser-local backend). The hosted site keeps its real invite code in the
   database, where admins rotate it from Admin -> Settings. */
export const ADMIN_INVITE_CODE = 'QUIZ-ADMIN-2026';
export const byId = id => QUIZZES.find(q => q.id === id);
