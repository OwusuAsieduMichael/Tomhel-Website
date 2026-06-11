export const siteConfig = {
  name: "Tomhel Preparatory School",
  shortName: "Tomhel",
  slogan: "Press On to Higher Grounds",
  description:
    "Recognized as the best private school in the Sekyere East District, Tomhel delivers quality education with academic excellence, character development, leadership, and a secure learning environment in Ghana.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://tomhel.edu.gh",
  phone: "024 424 2394 / 054 773 6790 / 054 773 6170",
  phoneHref: "+233244242394",
  phones: [
    { display: "024 424 2394", href: "+233244242394" },
    { display: "054 773 6790", href: "+233547736790" },
    { display: "054 773 6170", href: "+233547736170" },
  ] as const,
  email: "tomhelschool@yahoo.com",
  admissionsEmail: "tomhelschool@yahoo.com",
  poBox: "P.O. Box 151",
  address: "P.O. Box 151, Effiduasi, Ashanti Region, Ghana",
  addressLocality: "Effiduasi",
  addressRegion: "Ashanti",
  founded: "October 2003",
  foundingEnrollment: 15,
  currentEnrollment: "800+",
  officeHours: "Monday to Friday: 7:30 AM to 4:30 PM",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100077019686158",
    instagram: "https://instagram.com/tomhel",
    linkedin: "https://linkedin.com/company/tomhel",
  },
};

/** Local school photos — files live in public/IMGG/ */
export const schoolImages = {
  logo: "/IMGG/logo.jpg",
  hero: "/IMGG/hero-background.jpg",
  classroom: "/IMGG/CLASSROOM.jpg",
  ictLab: "/IMGG/ICT%20LAB.jpg",
  library: "/IMGG/LIBRARY.png",
  playground: "/IMGG/PLAYGROUND.jpg",
  schoolBus: "/IMGG/SCHOOL%20BUS.jpg",
  staffTeachers: "/IMGG/STaff%20Teachers.jpg",
  headmaster: "/IMGG/HEADMASTER.jpg",
  academicCoordinator: "/IMGG/ACADEMIC%20CORDINATOR.jpg",
  seniorTeacher: "/IMGG/SENIOR%20TEACHER.jpg",
  studentAffairs: "/IMGG/STUDENT.jpg",
  nsmqNews: "/IMGG/NSMQ-2022.jpg",
  newsHero: "/IMGG/UPDATE.jpg",
  contactHero: "/IMGG/CONTACT%20US.jpg",
  admissionsHero: "/IMGG/Admission.jpg",
  culture: "/IMGG/CULTURE.jpg",
  sectionBackground: "/IMGG/BACKKKOO.png",
  schoolVideo: "/IMGG/TOMHEL.mp4",
  blackStarsVideo: "/IMGG/TOMHEL%20BLACKSTARS.mp4",
  /** @deprecated use playground or classroom */
  kindergarten: "/IMGG/PLAYGROUND.jpg",
} as const;

/** Landing page hero — alternates every 8 seconds */
export const heroSlides = [
  { src: schoolImages.hero, alt: "Tomhel Preparatory School campus" },
  { src: schoolImages.classroom, alt: "Tomhel Preparatory School classroom learning environment" },
] as const;

export const staffSection = {
  eyebrow: "Our Staff",
  title: "Dedicated educators behind every learner",
  description:
    "Tomhel's teachers and support staff bring expertise, discipline, and genuine care to the classroom, guiding pupils from Creche through Junior High with the same commitment to excellence that defines our school.",
  image: schoolImages.staffTeachers,
} as const;

export const headmasterWelcome = {
  name: "Mr. Thomas Nyarko-Danquah",
  title: "Headmaster",
  image: schoolImages.headmaster,
  eyebrow: "Headmaster's Welcome",
  paragraphs: [
    "On behalf of the Board of Governors, staff, and the entire Tomhel family, I warmly welcome you to Tomhel Preparatory School.",
    "From our campus in Effiduasi, Ashanti Region, we are committed to providing quality education that nurtures academic excellence, moral character, and responsible leadership in every pupil entrusted to our care. Guided by our motto, \"Press On to Higher Grounds,\" we uphold discipline, integrity, and high standards in all that we do.",
    "Whether you are considering admission for your ward, seeking to partner with our school, or returning to our community, we invite you to join us in preparing confident learners for higher grounds in education and in life.",
  ],
  closing: "Press On to Higher Grounds.",
} as const;

export const navigation = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Academics", href: "/academics" },
  { label: "Admissions", href: "/admissions" },
  { label: "Student Life", href: "/student-life" },
  { label: "Gallery", href: "/gallery" },
  { label: "News", href: "/news" },
  { label: "Contact", href: "/contact" },
];

export const pillars = [
  {
    title: "Academic Excellence",
    description:
      "Rigorous curriculum and dedicated educators ensure every student reaches their full academic potential.",
    icon: "GraduationCap",
  },
  {
    title: "Character Development",
    description:
      "We instill integrity, discipline, and moral values that shape responsible citizens and future leaders.",
    icon: "Heart",
  },
  {
    title: "Modern Learning",
    description:
      "Technology integrated classrooms and modern learning resources prepare students for a digital future.",
    icon: "Laptop",
  },
  {
    title: "Caring Community",
    description:
      "A supportive environment where every child is known, valued, and encouraged to thrive.",
    icon: "Users",
  },
];

export const stats = [
  { label: "Students", value: 800, suffix: "+" },
  { label: "Teachers", value: 45, suffix: "+" },
  { label: "Success Rate", value: 98, suffix: "%" },
  { label: "Years of Excellence", value: 20, suffix: "+" },
];

export const schoolHistory = {
  founders:
    "the Late Mrs Helena Nyarko Dankwa and her husband, Mr Thomas Nyarko Dankwa, with the support of their children and family",
  story: [
    `Tomhel Preparatory School was founded in ${siteConfig.founded} by the Late Mrs Helena Nyarko Dankwa and her husband, Mr Thomas Nyarko Dankwa, with the support of their children and family. What began as a humble beginning with just ${siteConfig.foundingEnrollment} pupils has grown into one of the most trusted names in private education in the Sekyere East District.`,
    `From Creche through Junior High School, Tomhel now serves more than ${siteConfig.currentEnrollment} students, recognized as the best private school in the district and committed to the same values of discipline, care, and excellence that shaped our earliest classrooms in Effiduasi.`,
    "Today, Tomhel continues to produce exceptional, world ready young people equipped not only for examinations, but for leadership, integrity, and success beyond the school gates.",
  ],
} as const;

export const vantageSection = {
  eyebrow: "The Tomhel Vantage",
  title: "Where recognition meets responsibility",
  intro:
    "Parents choose Tomhel because excellence here is proven, not promised. We combine district leading academic standards with a campus built for safety, transparency, and peace of mind.",
  recognition: {
    badge: "District Recognition",
    title: "Best Private School in the Sekyere East District",
    description:
      "Tomhel Preparatory School is recognized as the leading private school in the Sekyere East District, a distinction earned through consistent academic results, disciplined school culture, and the trust of families across Effiduasi and beyond.",
    icon: "Award",
  },
  security: {
    badge: "Campus Security",
    title: "CCTV monitoring across classrooms and key vantage points",
    description:
      "The safety of every pupil and staff member is a daily priority. Tomhel has installed comprehensive CCTV coverage throughout the school environment to support orderly operations and secure learning.",
    points: [
      "Classrooms monitored to uphold teaching standards and pupil welfare",
      "Corridors, entrances, and other vantage areas under continuous observation",
      "A visible commitment to security that reassures parents and strengthens school discipline",
    ],
    icon: "Cctv",
  },
  closing:
    "Excellence you can see. Security you can trust. That is the Tomhel advantage.",
} as const;

export const schoolVideo = {
  src: schoolImages.schoolVideo,
  poster: schoolImages.hero,
  eyebrow: "Campus Video",
  title: "See Tomhel in action",
  description:
    "Take a closer look at life at Tomhel Preparatory School: our classrooms, community, and the values that guide everything we do from Creche through Junior High.",
  highlights: [
    "A welcoming campus built for learning from early years to BECE preparation",
    "Dedicated teachers and staff committed to discipline, care, and excellence",
    "A school family rooted in Effiduasi with a proud record of alumni achievement",
  ],
  caption: "Official Tomhel Preparatory School video",
} as const;

export const studentLifeVideo = {
  src: schoolImages.blackStarsVideo,
  poster: schoolImages.playground,
  eyebrow: "School Spirit",
  title: "Tomhel supports the Black Stars",
  description:
    "Tomhel Preparatory School proudly stands with Ghana's Black Stars as the nation celebrates qualification for the FIFA World Cup 2026. Our students and staff joined in the spirit of national pride, unity, and excellence on and off the field.",
  highlights: [
    "Celebrating Ghana's qualification for the FIFA World Cup 2026",
    "Students and staff showing patriotic school spirit",
    "Tomhel's commitment to sports, teamwork, and national pride",
  ],
  caption: "Tomhel Preparatory School celebrates the Black Stars' World Cup 2026 qualification",
  playLabel: "Play Black Stars World Cup celebration video",
} as const;

export const programs = [
  {
    title: "Creche",
    description:
      "A safe, nurturing start for our youngest learners with attentive care, early stimulation, and gentle routines.",
    image: schoolImages.playground,
    href: "/academics#creche",
  },
  {
    title: "Nursery",
    description:
      "Structured early learning that builds confidence, communication, and readiness for Kindergarten.",
    image: schoolImages.classroom,
    href: "/academics#nursery",
  },
  {
    title: "Kindergarten",
    description:
      "Play based learning that builds foundational literacy, numeracy, and social skills in a nurturing environment.",
    image: schoolImages.playground,
    href: "/academics#kindergarten",
  },
  {
    title: "Junior High School",
    description:
      "BECE focused preparation with strong subject mastery, leadership training, and career guidance.",
    image: schoolImages.ictLab,
    href: "/academics#jhs",
  },
];

export const facilities = [
  { title: "Classrooms", image: schoolImages.classroom },
  { title: "ICT Lab", image: schoolImages.ictLab },
  { title: "Library", image: schoolImages.library },
  { title: "Playground", image: schoolImages.playground },
];

export const testimonials = [
  {
    quote:
      "Tomhel has transformed our daughter's confidence and academic performance. The teachers genuinely care about every child.",
    author: "Mrs. Adwoa Mensah",
    role: "Parent",
  },
  {
    quote:
      "The teachers push us to do our best, and the BECE preparation here is excellent. I feel ready for the next chapter.",
    author: "Kwame Asante",
    role: "JHS Student",
  },
  {
    quote:
      "The foundation I received at Tomhel shaped my career as a Software/ML Engineer. Discipline, excellence, and community, values that last a lifetime.",
    author: "Michael Owusu Asiedu",
    role: "Alumni, Class of 2020",
  },
];

export const coreValues = [
  { title: "Excellence", description: "We pursue the highest standards in all we do." },
  { title: "Integrity", description: "Honesty and ethical conduct guide our community." },
  { title: "Innovation", description: "We embrace modern tools and creative approaches to learning." },
  { title: "Respect", description: "Every individual is treated with dignity and care." },
  { title: "Leadership", description: "We develop confident leaders who serve others." },
  { title: "Community", description: "Together we build a supportive, inclusive school family." },
];

export const leadership = [
  { name: headmasterWelcome.name, role: headmasterWelcome.title, image: headmasterWelcome.image },
  { name: "Mrs. Helena Adom", role: "Academic Coordinator", image: schoolImages.academicCoordinator },
  { name: "Mr. Kofi Annan", role: "Senior Teacher", image: schoolImages.seniorTeacher },
  { name: "Mrs. Ama Serwaa", role: "Student Affairs", image: schoolImages.studentAffairs },
];

export const historyTimeline = [
  {
    year: "2003",
    title: "Foundation",
    description:
      "Founded in October by the Late Mrs Helena Nyarko Dankwa and Mr Thomas Nyarko Dankwa, with their children and family, Tomhel opened its doors to 15 pupils in Effiduasi with a vision for quality education.",
  },
  { year: "2013", title: "Primary Expansion", description: "Added full primary program serving grades 1 to 6." },
  { year: "2016", title: "JHS Launch", description: "Junior High School program launched with first BECE cohort." },
  { year: "2019", title: "ICT Integration", description: "Expanded digital learning tools and computer literacy across all grade levels." },
  {
    year: "2022",
    title: "NSMQ Alumni Success",
    description:
      "Former pupil Nana Afia Konadu-Yiadom Boadi qualified for the National Science and Maths Quiz representing Notre Dame Girls High School, the 8th Tomhel alumna to reach NSMQ at the SHS level.",
  },
  {
    year: "Today",
    title: "A Growing Legacy",
    description:
      "Tomhel now serves more than 800 students from Creche through JHS, producing exceptional and world ready graduates, and is recognized as the best private school in the Sekyere East District.",
  },
];

export const admissionSteps = [
  { step: 1, title: "Inquiry", description: "Contact admissions or visit our campus for an introductory tour." },
  { step: 2, title: "Application", description: "Complete the online application form with required documents." },
  { step: 3, title: "Assessment", description: "Student participates in age appropriate entrance assessment." },
  { step: 4, title: "Interview", description: "Brief meeting with parents and school administration." },
  { step: 5, title: "Enrollment", description: "Receive admission letter, pay fees, and begin orientation." },
];

export const admissionFaqs = [
  {
    question: "What age can my child start at Tomhel?",
    answer: "We admit pupils from Creche and Nursery through Junior High. Children entering Kindergarten 1 should be at least 4 years old by September 1st of the admission year.",
  },
  {
    question: "What documents are required for application?",
    answer: "Birth certificate, previous school report (if applicable), passport photos, and immunization records.",
  },
  {
    question: "Is there a waiting list?",
    answer: "Popular grade levels may have limited spaces. We maintain a waiting list and notify families when spots open.",
  },
  {
    question: "Do you offer financial aid?",
    answer: "Limited scholarship opportunities are available based on merit and need. Contact admissions for details.",
  },
  {
    question: "Can I schedule a campus tour?",
    answer: "Yes. Tours are available Monday through Friday. Book via our contact form or call the admissions office.",
  },
];

export const studentLifeCategories = [
  {
    title: "Sports",
    description: "Football, athletics, volleyball, and inter school competitions build teamwork and fitness.",
    image: schoolImages.playground,
  },
  {
    title: "Clubs",
    description: "Debate, robotics, art, music, and environmental clubs nurture diverse talents.",
    image: schoolImages.library,
  },
  {
    title: "Competitions",
    description: "Students excel in science fairs, spelling bees, and national academic contests.",
    image: schoolImages.classroom,
  },
  {
    title: "Excursions",
    description: "Educational trips to museums, historical sites, and science centers broaden horizons.",
    image: schoolImages.schoolBus,
  },
  {
    title: "Cultural Activities",
    description: "Traditional dance, drama, and heritage celebrations honor Ghanaian culture.",
    image: schoolImages.staffTeachers,
  },
];

export const galleryCategories = [
  {
    id: "campus",
    label: "Campus",
    images: [schoolImages.hero, schoolImages.schoolBus, schoolImages.playground],
  },
  {
    id: "academics",
    label: "Academics",
    images: [schoolImages.classroom, schoolImages.ictLab, schoolImages.library],
  },
  {
    id: "events",
    label: "Events",
    images: [schoolImages.staffTeachers, schoolImages.hero, schoolImages.classroom],
  },
  {
    id: "sports",
    label: "Sports",
    images: [schoolImages.playground, schoolImages.playground, schoolImages.hero],
  },
  {
    id: "graduation",
    label: "Graduation",
    images: [schoolImages.staffTeachers, schoolImages.classroom, schoolImages.library],
  },
];

export const academicsData = [
  {
    id: "creche",
    title: "Creche",
    curriculum: "Gentle early years care with sensory play, language exposure, motor skill development, and secure routines for toddlers.",
    subjects: ["Early Stimulation", "Language & Songs", "Motor Skills", "Social Interaction", "Creative Play"],
    methodology: "Small group care, storytelling, music, guided play, and close parent communication.",
    assessments: "Daily observation, developmental milestones, and regular parent updates.",
  },
  {
    id: "nursery",
    title: "Nursery",
    curriculum: "Structured preschool programme preparing children for Kindergarten with phonics awareness, numeracy basics, and social skills.",
    subjects: ["Pre Literacy", "Pre Numeracy", "Creative Arts", "Physical Development", "Social Habits"],
    methodology: "Interactive lessons, hands on activities, circle time, and age appropriate routines.",
    assessments: "Continuous observation, portfolio work, and parent teacher conferences.",
  },
  {
    id: "kindergarten",
    title: "Kindergarten",
    curriculum: "Play based Ghana Early Childhood Education framework with phonics, numeracy, and social and emotional learning.",
    subjects: ["Literacy & Phonics", "Numeracy", "Creative Arts", "Physical Development", "Social Studies"],
    methodology: "Hands on activities, storytelling, sensory play, and small group instruction.",
    assessments: "Continuous observation, portfolio assessments, and parent teacher conferences.",
  },
  {
    id: "primary",
    title: "Primary (Grades 1 to 6)",
    curriculum: "GES aligned curriculum with enhanced STEM integration and reading comprehension focus.",
    subjects: ["English", "Mathematics", "Science", "Social Studies", "ICT", "Ghanaian Language", "RME", "Creative Arts"],
    methodology: "Differentiated instruction, project based learning, and collaborative group work.",
    assessments: "Continuous assessment, term examinations, and standardized progress tracking.",
  },
  {
    id: "jhs",
    title: "Junior High School (Grades 7 to 9)",
    curriculum: "Comprehensive GES JHS curriculum with intensive BECE preparation and leadership development.",
    subjects: ["English", "Mathematics", "Integrated Science", "Social Studies", "ICT", "French", "BDT", "RME"],
    methodology: "Exam focused coaching, mock tests, peer tutoring, and research projects.",
    assessments: "Weekly tests, term exams, BECE mock examinations, and detailed performance reviews.",
  },
];

export const fallbackNews = [
  {
    _id: "nsmq-2022",
    title: "Tomhel Alumna Qualifies for National Science and Maths Quiz",
    excerpt:
      "Management congratulates former pupil Nana Afia Konadu-Yiadom Boadi on her success in the NSMQ qualifying rounds while representing Notre Dame Girls High School.",
    category: "Achievements",
    publishedAt: "2022-04-26",
    slug: "nsmq-alumna-2022",
    image: schoolImages.nsmqNews,
    body: [
      "The Management of Tomhel Preparatory School extends warm congratulations to former pupil Nana Afia Konadu-Yiadom Boadi on her successful performance in the qualifying rounds of the National Science and Maths Quiz (NSMQ), where she represented Notre Dame Girls High School.",
      "Nana Afia is the second student from Tomhel Preparatory School to represent Notre Dame Girls High School in the National Science and Maths Quiz. Her elder sister, Abena Gyamfuah Boadi, was the first.",
      "She is also the eighth student from Tomhel Preparatory School to have represented their respective Senior High Schools in the National Science and Maths Quiz, a testament to the strong academic foundation built here in Effiduasi.",
      "The school management intends to publish a comprehensive list of all former students who have competed in the NSMQ on behalf of their Senior High Schools. We wish Nana Afia Konadu-Yiadom Boadi all the best as she presses on to higher grounds. God be with her.",
    ],
  },
  {
    _id: "2",
    title: "2025/2026 Admissions Now Open",
    excerpt: "Limited spaces available across all grade levels. Apply early to secure your child's place.",
    category: "Announcements",
    publishedAt: "2025-04-01",
    slug: "admissions-2025-2026",
    image: schoolImages.hero,
  },
  {
    _id: "3",
    title: "Annual Cultural Day Celebration",
    excerpt: "Students showcased Ghanaian heritage through dance, drama, and traditional attire.",
    category: "Events",
    publishedAt: "2025-03-20",
    slug: "cultural-day-2025",
    image: schoolImages.culture,
  },
];
