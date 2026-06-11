export const siteConfig = {
  name: "Tomhel Preparatory School",
  shortName: "Tomhel",
  slogan: "Press On to Higher Grounds",
  description:
    "Quality education nurturing academic excellence, character development, leadership, creativity, and lifelong learning in Ghana.",
  url: process.env.NEXT_PUBLIC_SITE_URL || "https://tomhel.edu.gh",
  phone: "024 424 2394",
  phoneHref: "+233244242394",
  email: "tomhelschool@yahoo.com",
  admissionsEmail: "tomhelschool@yahoo.com",
  poBox: "P.O. Box 151",
  address: "P.O. Box 151, Effiduasi, Ashanti Region, Ghana",
  addressLocality: "Effiduasi",
  addressRegion: "Ashanti",
  founded: "October 2003",
  officeHours: "Monday – Friday: 7:30 AM – 4:30 PM",
  social: {
    facebook: "https://www.facebook.com/profile.php?id=100077019686158",
    instagram: "https://instagram.com/tomhel",
    linkedin: "https://linkedin.com/company/tomhel",
  },
};

/** Local school photos — files live in public/IMGG/ */
export const schoolImages = {
  logo: "/IMGG/logo.jpg",
  hero: "/IMGG/HERO1.jpg",
  classroom: "/IMGG/CLASSROOM.jpg",
  ictLab: "/IMGG/ICT%20LAB.jpg",
  library: "/IMGG/LIBRARY.png",
  playground: "/IMGG/PLAYGROUND.jpg",
  schoolBus: "/IMGG/SCHOOL%20BUS.jpg",
  staffTeachers: "/IMGG/STaff%20Teachers.jpg",
  headmaster: "/IMGG/HEADMASTER.jpg",
  sectionBackground: "/IMGG/BACKKKOO.png",
  /** @deprecated use playground or classroom */
  kindergarten: "/IMGG/PLAYGROUND.jpg",
} as const;

/** Landing page hero — alternates every 8 seconds */
export const heroSlides = [
  { src: schoolImages.classroom, alt: "Tomhel Preparatory School classroom learning environment" },
  { src: "/IMGG/HERO1.jpg", alt: "Tomhel Preparatory School campus" },
] as const;

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
      "Technology-integrated classrooms and modern learning resources prepare students for a digital future.",
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
  { label: "Students", value: 850, suffix: "+" },
  { label: "Teachers", value: 45, suffix: "+" },
  { label: "Success Rate", value: 98, suffix: "%" },
  { label: "Years of Excellence", value: 20, suffix: "+" },
];

export const programs = [
  {
    title: "Kindergarten",
    description:
      "Play-based learning that builds foundational literacy, numeracy, and social skills in a nurturing environment.",
    image: schoolImages.playground,
    href: "/academics#kindergarten",
  },
  {
    title: "Primary",
    description:
      "Comprehensive primary education aligned with Ghana Education Service standards, fostering curiosity and critical thinking.",
    image: schoolImages.classroom,
    href: "/academics#primary",
  },
  {
    title: "Junior High School",
    description:
      "BECE-focused preparation with strong subject mastery, leadership training, and career guidance.",
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
      "The foundation I received at Tomhel shaped my career. Discipline, excellence, and community — values that last a lifetime.",
    author: "Dr. Efua Boateng",
    role: "Alumni, Class of 2015",
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
  { name: "Mrs. Helena Adom", role: "Academic Coordinator", image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&q=80" },
  { name: "Mr. Kofi Annan", role: "Senior Teacher", image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&q=80" },
  { name: "Mrs. Ama Serwaa", role: "Student Affairs", image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400&q=80" },
];

export const historyTimeline = [
  { year: "2003", title: "Foundation", description: "Tomhel Preparatory School was founded in October with a vision for excellence in Effiduasi." },
  { year: "2013", title: "Primary Expansion", description: "Added full primary program serving grades 1–6." },
  { year: "2016", title: "JHS Launch", description: "Junior High School program launched with first BECE cohort." },
  { year: "2019", title: "ICT Integration", description: "Expanded digital learning tools and computer literacy across all grade levels." },
  { year: "2022", title: "Modern Campus", description: "New ICT lab, library, and upgraded facilities completed." },
  { year: "2025", title: "Regional Recognition", description: "Recognized among leading preparatory schools in the Ashanti Region." },
];

export const admissionSteps = [
  { step: 1, title: "Inquiry", description: "Contact admissions or visit our campus for an introductory tour." },
  { step: 2, title: "Application", description: "Complete the online application form with required documents." },
  { step: 3, title: "Assessment", description: "Student participates in age-appropriate entrance assessment." },
  { step: 4, title: "Interview", description: "Brief meeting with parents and school administration." },
  { step: 5, title: "Enrollment", description: "Receive admission letter, pay fees, and begin orientation." },
];

export const admissionFaqs = [
  {
    question: "What age can my child start Kindergarten?",
    answer: "Children must be at least 4 years old by September 1st of the admission year for Kindergarten 1.",
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
    description: "Football, athletics, volleyball, and inter-school competitions build teamwork and fitness.",
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
    id: "kindergarten",
    title: "Kindergarten",
    curriculum: "Play-based Ghana Early Childhood Education framework with phonics, numeracy, and social-emotional learning.",
    subjects: ["Literacy & Phonics", "Numeracy", "Creative Arts", "Physical Development", "Social Studies"],
    methodology: "Hands-on activities, storytelling, sensory play, and small-group instruction.",
    assessments: "Continuous observation, portfolio assessments, and parent-teacher conferences.",
  },
  {
    id: "primary",
    title: "Primary (Grades 1–6)",
    curriculum: "GES-aligned curriculum with enhanced STEM integration and reading comprehension focus.",
    subjects: ["English", "Mathematics", "Science", "Social Studies", "ICT", "Ghanaian Language", "RME", "Creative Arts"],
    methodology: "Differentiated instruction, project-based learning, and collaborative group work.",
    assessments: "Continuous assessment, term examinations, and standardized progress tracking.",
  },
  {
    id: "jhs",
    title: "Junior High School (Grades 7–9)",
    curriculum: "Comprehensive GES JHS curriculum with intensive BECE preparation and leadership development.",
    subjects: ["English", "Mathematics", "Integrated Science", "Social Studies", "ICT", "French", "BDT", "RME"],
    methodology: "Exam-focused coaching, mock tests, peer tutoring, and research projects.",
    assessments: "Weekly tests, term exams, BECE mock examinations, and detailed performance reviews.",
  },
];

export const fallbackNews = [
  {
    _id: "1",
    title: "Tomhel Students Excel at Regional Science Fair",
    excerpt: "Our JHS team secured first place at the Ashanti Regional Science and Maths Quiz.",
    category: "Achievements",
    publishedAt: "2025-05-15",
    slug: "science-fair-2025",
    image: schoolImages.classroom,
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
    image: schoolImages.staffTeachers,
  },
];
