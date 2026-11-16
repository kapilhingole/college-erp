const { PrismaClient } = require('../node_modules/@prisma/client');
process.env.DATABASE_URL = 'file:c:/Users/LENOVO/OneDrive/Desktop/College ERP/backend/prisma/erp.db';
const prisma = new PrismaClient();

// Course syllabus definitions with exact units, descriptions, and duration in hours
const syllabi = {
  em1: {
    name: 'Engineering Mathematics - I',
    units: [
      { title: 'Unit 1: System of Linear Equations', desc: 'Rank of a matrix, System of linear equations, Linear dependence and independence of vectors, Linear and orthogonal transformations, Application to engineering problems.', hours: 7 },
      { title: 'Unit 2: Eigen Values, Eigen Vectors & Diagonalization', desc: 'Eigen values and Eigen vectors, Cayley-Hamilton theorem, Diagonalization of a matrix, Reduction of quadratic forms to canonical form.', hours: 7 },
      { title: 'Unit 3: Differential Calculus', desc: "Rolle's theorem, Mean value theorems, Taylor's and Maclaurin's series expansions, Standard expansions, Indeterminate forms.", hours: 7 },
      { title: 'Unit 4: Partial Differentiation', desc: "Partial derivatives of first and higher orders, Euler's theorem on homogeneous functions, Partial derivative of composite functions, Implicit differentiation.", hours: 7 },
      { title: 'Unit 5: Applications of Partial Differentiation', desc: "Jacobians and applications, Errors and Approximations, Maxima and minima of two variables, Lagrange's undetermined multipliers.", hours: 7 },
      { title: 'Unit 6: Fourier Series & Harmonic Analysis', desc: "Definition, Dirichlet's conditions, Full range Fourier series, Half range Fourier series, Harmonic analysis.", hours: 7 }
    ]
  },
  chem: {
    name: 'Engineering Chemistry',
    units: [
      { title: 'Unit 1: Water Technology & Softening Processes', desc: 'Hardness, Alkalinity, Softening methods: Zeolite & Demineralization, Reverse Osmosis, Hardness calculations.', hours: 5 },
      { title: 'Unit 2: Instrumental Methods of Analysis', desc: 'Quantitative and Qualitative analysis, Colorimetry, pHmetry, Conductometry and Titrations.', hours: 5 },
      { title: 'Unit 3: Corrosion Science & Corrosion Prevention', desc: 'Dry and Wet corrosion, Hydrogen evolution & Oxygen absorption mechanisms, Cathodic protection and coatings.', hours: 4 },
      { title: 'Unit 4: Engineering Polymers & Nanomaterials', desc: 'Classification, Polymerization mechanisms, Thermoplastics vs Thermosetting, Conducting polymers, Biodegradable polymers.', hours: 5 },
      { title: 'Unit 5: Fuels and Combustion Calculations', desc: 'Calorific value (HCV, LCV), Proximate and Ultimate analysis of coal, Alternative fuels and flue gas analysis.', hours: 5 },
      { title: 'Unit 6: Advanced Materials & Nanotechnology', desc: 'Nanomaterials classification, Synthesis methods (Sol-Gel, CVD), Carbon nanotubes, Engineering applications.', hours: 4 }
    ]
  },
  beee: {
    name: 'Basic Electrical & Electronics Engineering',
    units: [
      { title: 'Unit 1: DC Circuits & Network Analysis', desc: "Charge, current, voltage, power, Ohm's Law, Kirchhoff's laws (KCL, KVL), Mesh and Nodal analysis, Thevenin's & Norton's theorems.", hours: 6 },
      { title: 'Unit 2: AC Circuits & Single/Three-Phase Power', desc: 'Phasor representation, Series & Parallel RLC circuits, Active/Reactive/Apparent power, Power factor improvement, 3-Phase balanced circuits.', hours: 7 },
      { title: 'Unit 3: Electrical Machines & Power Systems', desc: 'Single phase transformer: EMF equation, losses & efficiency, DC motor operation, 3-Phase Induction motor, Star rating energy conservation.', hours: 6 },
      { title: 'Unit 4: Semiconductor Diodes & Power Rectifiers', desc: 'PN Junction characteristics, Half-wave, Full-wave and Bridge rectifiers, Filter circuits, Zener diode voltage regulation.', hours: 7 },
      { title: 'Unit 5: Transistors, Amplifiers & Switching Circuits', desc: 'BJT operation, CE/CB/CC configurations, DC load line, CE amplifier operation, Introduction to MOSFET and power switching.', hours: 6 },
      { title: 'Unit 6: Digital Logic & Combinational Circuits', desc: "Number systems, Boolean algebra, De Morgan's laws, Logic gates, Half/Full adder, Multiplexers and Flip-Flops.", hours: 7 }
    ]
  },
  pslb: {
    name: 'Problem Solving and Logic Building',
    units: [
      { title: 'Unit 1: Problem Solving Logic & C Fundamentals', desc: 'Algorithms, Flowcharts, Structure of C program, Data types, Variables, Constants, Operators, Type casting.', hours: 4 },
      { title: 'Unit 2: Decision Control & Looping Constructs', desc: 'if-else, nested branching, switch-case, while, do-while, for loops, break and continue, Pattern generation logic.', hours: 4 },
      { title: 'Unit 3: Functions, Recursion & Modular Design', desc: 'Function definition & call, Parameter passing, Call by value, Scope and Storage classes, Recursion mechanisms.', hours: 5 },
      { title: 'Unit 4: 1D & 2D Arrays and Algorithms', desc: 'Array declaration, Linear & Binary search, Bubble & Selection sort, 2D arrays, Matrix operations.', hours: 4 },
      { title: 'Unit 5: Strings, Pointers & Memory Addresses', desc: 'String operations, Standard string library, Pointer concept, Address-of operator, Pointer arithmetic, Call by reference.', hours: 5 },
      { title: 'Unit 6: Structures, Unions & File Handling', desc: 'Structures and Unions, Array of structures, File handling: fopen, fclose, fprintf, fscanf, Text and Binary files.', hours: 5 }
    ]
  },
  wad: {
    name: 'Web Application Development',
    units: [
      { title: 'Unit 1: Web Architecture & HTML5 Standards', desc: 'Client-server architecture, HTTP/HTTPS, HTML document hierarchy, Semantic tags, Headings, Text formatting.', hours: 3 },
      { title: 'Unit 2: Lists, Hyperlinks & Multimedia Integration', desc: 'Ordered and unordered lists, Anchor tags, Relative & absolute paths, Responsive images, Audio and Video embedding.', hours: 2 },
      { title: 'Unit 3: Modern CSS Styling & Flexbox Layouts', desc: 'CSS Selectors, Box Model (Margin, Border, Padding), Flexbox layouts, Media queries for responsive design.', hours: 2 },
      { title: 'Unit 4: Tables, Interactive Forms & Input Validation', desc: 'HTML tables, colspan/rowspan, Form elements, Input types, Client-side form validation attributes.', hours: 2 },
      { title: 'Unit 5: JavaScript Essentials & DOM Manipulation', desc: 'JavaScript syntax, Variables, Event handling (click, change, submit), Dynamic DOM updates.', hours: 2 },
      { title: 'Unit 6: Web Hosting, Deployment & Version Control', desc: 'Web servers, DNS, Cloud hosting platforms (GitHub Pages / Render), Production deployment practices.', hours: 2 }
    ]
  },
  pdi: {
    name: 'Professional Development - I',
    units: [
      { title: 'Unit 1: Values, Self-Discipline & Personal Grooming', desc: 'Universal human values, Professional ethics, Hygiene, Grooming, Dress codes, Time management & Personal accountability.', hours: 14 },
      { title: 'Unit 2: Soft Skills Fundamentals & Personal Orientation', desc: 'Self-awareness, SWOT analysis, Emotional intelligence, Active listening, Non-verbal cues, Public speaking and overcoming stage fright.', hours: 14 },
      { title: 'Unit 3: Advanced Soft Skills & Social Dynamics', desc: 'Interpersonal communication, Teamwork, Conflict resolution, Empathy, Workplace etiquette and corporate cultural adaptation.', hours: 14 }
    ]
  },
  iks: {
    name: 'Indian Knowledge System & Financial Literacy',
    units: [
      { title: 'Unit 1: Foundations of Indian Knowledge System', desc: 'History and scope of IKS, Indian numeral system, Discovery of zero, Mathematical contributions of ancient scholars.', hours: 5 },
      { title: 'Unit 2: Engineering & Architectural Applications of IKS', desc: 'Ancient metallurgy, Iron extraction, Lost-wax casting, Vastushastra, Town planning, Temple architecture and Water irrigation.', hours: 5 },
      { title: 'Unit 3: Banking & Financial Fundamentals for Engineers', desc: 'Banking systems, RBI functions, Bank accounts, Digital payment infrastructure (UPI, NEFT), Credit vs Debit mechanisms.', hours: 4 },
      { title: 'Unit 4: Personal Budgeting & Financial Planning', desc: 'Budgeting principles (50/30/20), Emergency fund creation, Credit scores, Debt management and career goal financial planning.', hours: 5 },
      { title: 'Unit 5: Investment Strategies & Wealth Management', desc: 'Investment instruments: Mutual funds, SIPs, Equities, Fixed deposits, Risk-return tradeoff, Health and Life insurance.', hours: 5 },
      { title: 'Unit 6: Financial Compliance, Taxation & Cybersecurity', desc: 'Income tax fundamentals, PAN, Filing procedures, Tax deductions, Safeguarding against digital financial frauds.', hours: 4 }
    ]
  },
  liberal: {
    name: 'Liberal Learning - I',
    units: [
      { title: 'Module 1: Fundamentals of Artistic Expression', desc: 'Introduction to artistic discipline, Posture, Breathing and Foundation exercises.', hours: 2 },
      { title: 'Module 2: Rhythm, Beat & Timing Foundations', desc: 'Tempo control, Metronome practice, Rhythmic syncopation exercises.', hours: 2 },
      { title: 'Module 3: Notation Reading & Theoretical Concepts', desc: 'Basic scales, Melodic lines, Sight reading and Tablature interpretation.', hours: 2 },
      { title: 'Module 4: Technical Drills & Primary Execution', desc: 'Fingering techniques, Movement agility, Tone control and Precision.', hours: 2 },
      { title: 'Module 5: Pattern Progression & Transitional Dynamics', desc: 'Chord / Movement transitions, Velocity drills, Dynamic control.', hours: 2 },
      { title: 'Module 6: Repertoire Exploration & Practice Routines', desc: 'Structured study of classical and contemporary pieces, Methodical practice.', hours: 2 },
      { title: 'Module 7: Expression, Tone & Nuance Development', desc: 'Phrasing, Emotional nuance, Dynamic contrast, Artistic interpretation.', hours: 2 },
      { title: 'Module 8: Ear Training & Creative Improvisation', desc: 'Interval recognition, Melodic recall, Improvisation within standard frameworks.', hours: 2 },
      { title: 'Module 9: Solo Performance Preparation', desc: 'Solo repertoire polishing, Memory retention techniques, Stage composure.', hours: 2 },
      { title: 'Module 10: Ensemble Coordination & Collaborative Harmony', desc: 'Group dynamics, Listening to co-performers, Synchronized timing.', hours: 2 },
      { title: 'Module 11: Stage Craft, Presence & Performance Etiquette', desc: 'Handling stage equipment, Microphone etiquette, Engaging an audience.', hours: 2 },
      { title: 'Module 12: Creative Composition & Original Arranging', desc: 'Assembling independent musical or choreographic ideas into a coherent arrangement.', hours: 2 },
      { title: 'Module 13: Technical Polish & Rehearsal Run-throughs', desc: 'End-to-end rehearsal, Troubleshooting difficult transitions, Confidence building.', hours: 2 },
      { title: 'Module 14: Final Showcase Recital & Peer Critique', desc: 'Live performance demonstration, Constructive feedback evaluation and self-reflection.', hours: 2 }
    ]
  },
  physics: {
    name: 'Engineering Physics',
    units: [
      { title: 'Unit 1: Wave Optics & Thin Film Interference', desc: "Interference in thin films, Newton's rings, Anti-reflection coatings and engineering applications.", hours: 5 },
      { title: 'Unit 2: Diffraction, Polarization & Optical Instruments', desc: 'Fraunhofer diffraction, Diffraction grating, Polarization by reflection, Brewster law, Optical activity.', hours: 5 },
      { title: 'Unit 3: Lasers & Fiber Optic Communication', desc: 'Laser mechanisms, Population inversion, He-Ne laser, Semiconductor laser, Optical fiber transmission and attenuation.', hours: 4 },
      { title: 'Unit 4: Quantum Mechanics & Wave Equations', desc: "De Broglie hypothesis, Heisenberg uncertainty principle, Schrödinger's wave equation, 1D potential well.", hours: 5 },
      { title: 'Unit 5: Semiconductor Physics & Superconductivity', desc: 'Band theory, Hall effect, Superconductors, Meissner effect, Type-I and Type-II materials and applications.', hours: 5 },
      { title: 'Unit 6: Nanoscience & Advanced Engineering Materials', desc: 'Quantum confinement, Synthesis of nanomaterials, Carbon nanotubes, Graphene and sensor applications.', hours: 4 }
    ]
  },
  mechanics: {
    name: 'Engineering Mechanics',
    units: [
      { title: 'Unit 1: Resolution & Composition of Forces', desc: 'Force systems, Resultant of concurrent and non-concurrent force systems, Moment of a force, Varignon theorem.', hours: 5 },
      { title: 'Unit 2: Equilibrium of Coplanar Force Systems', desc: 'Free body diagrams, Conditions of equilibrium, Lami theorem, Support reactions for beams.', hours: 5 },
      { title: 'Unit 3: Kinematics of Particles & Projectile Motion', desc: 'Rectilinear motion, Uniform and accelerated motion, Projectile motion, Curvilinear motion in Cartesian and Polar coordinates.', hours: 5 },
      { title: 'Unit 4: Kinetics of Particles - Work-Energy & Impulse', desc: "Newton's second law, D'Alembert's principle, Work-energy principle, Law of conservation of momentum, Direct central impact.", hours: 5 },
      { title: 'Unit 5: Centroid, Center of Gravity & Moment of Inertia', desc: 'Centroid of composite plane figures, Parallel and Perpendicular axis theorems, Moment of inertia of standard sections.', hours: 4 },
      { title: 'Unit 6: Friction, Wedges & Ladder Equilibrium', desc: 'Laws of dry friction, Angle of friction and repose, Cone of friction, Equilibrium of wedges, ladders and belt friction.', hours: 4 }
    ]
  },
  graphics: {
    name: 'Engineering Graphics',
    units: [
      { title: 'Unit 1: Principles of Engineering Drawing & Lettering', desc: 'Drawing instruments, Sheet layout, Line conventions, Lettering and Dimensioning techniques as per BIS.', hours: 4 },
      { title: 'Unit 2: Engineering Curves & Geometric Constructions', desc: 'Conic sections (Ellipse, Parabola, Hyperbola), Involutes, Cycloidal curves and Spirals.', hours: 4 },
      { title: 'Unit 3: Orthographic Projections of Points, Lines & Planes', desc: 'First angle and Third angle projections, Projection of lines inclined to both planes, Projections of planes.', hours: 6 },
      { title: 'Unit 4: Isometric Projections & Solid Modeling', desc: 'Isometric scale, Isometric view vs projection of prisms, pyramids, cylinders and composite solids.', hours: 6 },
      { title: 'Unit 5: Development of Lateral Surfaces of Solids', desc: 'Parallel-line development and Radial-line development for prisms, cylinders, cones and pyramids.', hours: 4 },
      { title: 'Unit 6: Computer Aided Drafting (CAD) Practices', desc: 'CAD software interface, Draw commands, Modify commands, Dimensioning, Layer management and 2D drafting.', hours: 4 }
    ]
  },
  basicMath: {
    name: 'Basic Mathematics',
    units: [
      { title: 'Unit 1: Matrices, Determinants & System of Equations', desc: 'Operations on matrices, Determinants, Inverse of a matrix, Solution of simultaneous linear equations using Cramers rule.', hours: 4 },
      { title: 'Unit 2: Trigonometric Functions & Complex Numbers', desc: 'Compound angles, Multiple and Submultiple angles, Inverse trigonometric functions, Algebra of complex numbers.', hours: 4 },
      { title: 'Unit 3: Differential Calculus & Standard Derivatives', desc: 'Limits and Continuity, Derivatives of standard functions, Rules of differentiation, Chain rule, Product and Quotient rule.', hours: 4 },
      { title: 'Unit 4: Applications of Derivatives & Tangents/Normals', desc: 'Equations of tangent and normal, Velocity and Acceleration, Maxima and Minima of single variable functions.', hours: 4 },
      { title: 'Unit 5: Integral Calculus & Standard Integrals', desc: 'Indefinite integrals, Integration by substitution, by parts and partial fractions, Definite integrals and properties.', hours: 4 },
      { title: 'Unit 6: Fundamentals of Statistics & Probability', desc: 'Measures of central tendency (Mean, Median, Mode), Standard deviation, Basic probability rules.', hours: 4 }
    ]
  },
  commSkills: {
    name: 'Communication Skills',
    units: [
      { title: 'Unit 1: Communication Fundamentals & Active Listening', desc: 'Communication cycle, Barriers to communication, Types of communication, Active listening techniques.', hours: 4 },
      { title: 'Unit 2: Business Correspondence & Formal Writing', desc: 'Business letters, Email writing etiquette, Memorandum, Notice, Agenda and Minutes of meetings.', hours: 4 },
      { title: 'Unit 3: Spoken Communication & Presentation Skills', desc: 'Verbal communication, Pitch, Tone, Body language, Designing slide presentations and delivery.', hours: 4 },
      { title: 'Unit 4: Grammar, Vocabulary & Language Enhancement', desc: 'Common grammatical errors, Sentence structure, Vocabulary building, Phrasal verbs and idioms.', hours: 4 },
      { title: 'Unit 5: Interpersonal Dynamics & Group Discussion', desc: 'Group discussion strategies, Role plays, Conflict resolution, Emotional quotient in team discussions.', hours: 4 },
      { title: 'Unit 6: Professional Ethics in Communication', desc: 'Ethical communication, Plagiarism avoidance, Confidentiality, Cross-cultural communication sensitivity.', hours: 4 }
    ]
  },
  itProficiency: {
    name: 'IT Proficiency',
    units: [
      { title: 'Unit 1: Computer Hardware & Operating System Setup', desc: 'Hardware components, CPU, Memory, BIOS settings, Installation and configuration of Linux/Windows OS.', hours: 3 },
      { title: 'Unit 2: Advanced Word Processing & Spreadsheet Analytics', desc: 'Technical documentation formatting, Advanced Excel formulas (VLOOKUP, INDEX/MATCH), Pivot tables and charting.', hours: 3 },
      { title: 'Unit 3: Internet Technologies, Cybersecurity & Safety', desc: 'Networking basics, IP addresses, Secure browsing, Antivirus, Two-factor authentication, Phishing defense.', hours: 3 },
      { title: 'Unit 4: Version Control Systems - Git & GitHub Workflows', desc: 'Git initialization, staging, commit, push, pull, branching, merge conflict resolution, Pull Requests on GitHub.', hours: 3 },
      { title: 'Unit 5: Cloud Tools, Document Collaboration & Technical Presentation', desc: 'Google Workspace, Cloud storage management, Collaborative document editing, Creating technical slide decks.', hours: 3 }
    ]
  },
  dsa: {
    name: 'Data Structures & Algorithms',
    units: [
      { title: 'Unit 1: Stacks, Queues & Linear Data Structures', desc: 'Stack ADT, Infix to Postfix conversion, Queue ADT, Circular Queue, Priority Queue implementation.', hours: 6 },
      { title: 'Unit 2: Linked Lists & Dynamic Memory Allocation', desc: 'Singly linked list, Doubly linked list, Circular linked list, Polynomial representation using linked lists.', hours: 6 },
      { title: 'Unit 3: Trees & Binary Search Tree Traversal', desc: 'Binary tree representation, Inorder, Preorder, Postorder traversal, BST operations (Insert, Delete, Search), AVL trees.', hours: 6 },
      { title: 'Unit 4: Graph Representations & Shortest Path Algorithms', desc: 'Adjacency matrix and list, BFS and DFS traversals, Dijkstra algorithm, Prim and Kruskal MST algorithms.', hours: 6 },
      { title: 'Unit 5: Hashing Techniques & Hash Tables', desc: 'Hash functions, Collision resolution techniques (Linear probing, Quadratic probing, Chaining), Open addressing.', hours: 5 },
      { title: 'Unit 6: Algorithm Design & Asymptotic Complexity Analysis', desc: 'Big-O, Big-Omega, Theta notations, Divide-and-Conquer strategy, Sorting analysis (Quick sort, Merge sort).', hours: 5 }
    ]
  },
  oop: {
    name: 'Object Oriented Programming',
    units: [
      { title: 'Unit 1: Object-Oriented Paradigms & Class Modeling', desc: 'Encapsulation, Abstraction, Class and Object instantiation, Member functions, Access specifiers.', hours: 6 },
      { title: 'Unit 2: Constructors, Destructors & Function Overloading', desc: 'Default, Parameterized and Copy constructors, Destructors, Constructor overloading, this pointer.', hours: 6 },
      { title: 'Unit 3: Inheritance & Base-Derived Hierarchies', desc: 'Single, Multilevel, Multiple, Hierarchical and Hybrid inheritance, Virtual base class, Protected members.', hours: 6 },
      { title: 'Unit 4: Polymorphism, Virtual Functions & Interfaces', desc: 'Compile-time vs Run-time polymorphism, Function overriding, Pure virtual functions, Abstract classes.', hours: 6 },
      { title: 'Unit 5: Exception Handling & Robust Error Management', desc: 'try, catch, throw blocks, Multiple catch handlers, Standard exception classes, Custom exceptions.', hours: 6 },
      { title: 'Unit 6: File Streams, Templates & Standard Libraries', desc: 'File stream classes (ifstream, ofstream), Template functions and classes, Standard Template Library (vector, map).', hours: 6 }
    ]
  },
  dbms: {
    name: 'Database Management Systems',
    units: [
      { title: 'Unit 1: Database Architecture & ER Data Modeling', desc: 'Three-schema architecture, Data independence, Entity-Relationship diagrams, Extended ER features.', hours: 5 },
      { title: 'Unit 2: Relational Model & Relational Algebra', desc: 'Relational model concepts, Integrity constraints, Relational algebra operations (Select, Project, Join, Union).', hours: 5 },
      { title: 'Unit 3: Structured Query Language (SQL) Mastery', desc: 'DDL, DML, DCL, Subqueries, Complex joins, Aggregate functions, Views, Triggers and Stored procedures.', hours: 6 },
      { title: 'Unit 4: Relational Schema Normalization', desc: 'Functional dependencies, Normal forms: 1NF, 2NF, 3NF, BCNF, Lossless join and Dependency preservation.', hours: 6 },
      { title: 'Unit 5: Transaction Management & ACID Properties', desc: 'Transaction states, ACID properties, Serializability, Concurrency control protocols: Two-phase locking, Deadlocks.', hours: 5 },
      { title: 'Unit 6: Indexing, Storage Systems & NoSQL Overview', desc: 'Primary and Secondary indexing, B-Trees, B+ Trees, Introduction to NoSQL document stores (MongoDB).', hours: 5 }
    ]
  },
  circuits: {
    name: 'Electronic Circuits & Devices',
    units: [
      { title: 'Unit 1: Diode Applications & Power Regulators', desc: 'PN junction characteristics, Rectifier circuits, Ripple factor, Voltage regulator circuits, Zener diodes.', hours: 5 },
      { title: 'Unit 2: Bipolar Junction Transistor Biasing & Amplifiers', desc: 'BJT operation, Operating point (Q-point), Thermal runaway, Voltage divider bias, Small signal analysis.', hours: 5 },
      { title: 'Unit 3: Field Effect Transistors (FET & MOSFET)', desc: 'JFET characteristics, MOSFET (Enhancement & Depletion), Biasing of FET, High frequency response.', hours: 5 },
      { title: 'Unit 4: Feedback Amplifiers & Sinusoidal Oscillators', desc: 'Feedback topologies, Gain stabilization, Barkhausen criterion, RC phase shift, Hartley and Colpitts oscillators.', hours: 5 },
      { title: 'Unit 5: Operational Amplifiers & Linear Signal Circuits', desc: 'Ideal op-amp characteristics, Inverting and Non-inverting amplifiers, Summing amplifier, Integrator, Differentiator.', hours: 5 },
      { title: 'Unit 6: Non-Linear Op-Amp Circuits & Active Filters', desc: 'Comparators, Schmitt triggers, First-order and Second-order active Butterworth filters, Precision rectifiers.', hours: 5 }
    ]
  }
};

// Map each faculty member (from the 40 official entries in Academic Load sheet)
// to their courses and exact load hours:
const facultyLoadRoster = [
  { empId: 'FAC-ZCOER-001', maxWeeklyHours: 4, syllabi: ['graphics'] },
  { empId: 'FAC-ZCOER-002', maxWeeklyHours: 16, syllabi: ['em1'] },
  { empId: 'FAC-ZCOER-003', maxWeeklyHours: 10, syllabi: ['pdi'] },
  { empId: 'FAC-ZCOER-004', maxWeeklyHours: 12, syllabi: ['mechanics'] },
  { empId: 'FAC-ZCOER-005', maxWeeklyHours: 20, syllabi: ['chem', 'pdi'] },
  { empId: 'FAC-ZCOER-006', maxWeeklyHours: 24, syllabi: ['circuits', 'beee'] },
  { empId: 'FAC-ZCOER-007', maxWeeklyHours: 18, syllabi: ['circuits'] },
  { empId: 'FAC-ZCOER-008', maxWeeklyHours: 19, syllabi: ['physics', 'pdi'] },
  { empId: 'FAC-ZCOER-009', maxWeeklyHours: 21, syllabi: ['circuits'] },
  { empId: 'FAC-ZCOER-010', maxWeeklyHours: 24, syllabi: ['beee', 'oop'] },
  { empId: 'FAC-ZCOER-011', maxWeeklyHours: 20, syllabi: ['dsa'] },
  { empId: 'FAC-ZCOER-012', maxWeeklyHours: 24, syllabi: ['beee'] },
  { empId: 'FAC-ZCOER-013', maxWeeklyHours: 26, syllabi: ['oop'] },
  { empId: 'FAC-ZCOER-014', maxWeeklyHours: 20, syllabi: ['dsa'] },
  { empId: 'FAC-ZCOER-015', maxWeeklyHours: 18, syllabi: ['circuits'] },
  { empId: 'FAC-ZCOER-016', maxWeeklyHours: 22, syllabi: ['dsa', 'beee'] },
  { empId: 'FAC-ZCOER-017', maxWeeklyHours: 20, syllabi: ['dsa'] },
  { empId: 'FAC-ZCOER-018', maxWeeklyHours: 22, syllabi: ['wad', 'itProficiency'] },
  { empId: 'FAC-ZCOER-019', maxWeeklyHours: 17, syllabi: ['pslb', 'dbms'] },
  { empId: 'FAC-ZCOER-020', maxWeeklyHours: 22, syllabi: ['dsa'] },
  { empId: 'FAC-ZCOER-021', maxWeeklyHours: 22, syllabi: ['dsa', 'oop'] },
  { empId: 'FAC-ZCOER-022', maxWeeklyHours: 24, syllabi: ['commSkills'] },
  { empId: 'FAC-ZCOER-023', maxWeeklyHours: 26, syllabi: ['oop'] },
  { empId: 'FAC-ZCOER-024', maxWeeklyHours: 21, syllabi: ['pslb', 'circuits'] },
  { empId: 'FAC-ZCOER-025', maxWeeklyHours: 16, syllabi: ['physics', 'commSkills'] },
  { empId: 'FAC-ZCOER-026', maxWeeklyHours: 16, syllabi: ['physics', 'commSkills'] },
  { empId: 'FAC-ZCOER-027', maxWeeklyHours: 25, syllabi: ['pslb'] },
  { empId: 'FAC-ZCOER-028', maxWeeklyHours: 20, syllabi: ['basicMath'] },
  { empId: 'FAC-ZCOER-029', maxWeeklyHours: 25, syllabi: ['circuits'] },
  { empId: 'FAC-ZCOER-030', maxWeeklyHours: 24, syllabi: ['liberal'] },
  { empId: 'FAC-ZCOER-031', maxWeeklyHours: 24, syllabi: ['physics'] },
  { empId: 'FAC-ZCOER-032', maxWeeklyHours: 20, syllabi: ['em1'] },
  { empId: 'FAC-ZCOER-033', maxWeeklyHours: 21, syllabi: ['wad'] },
  { empId: 'FAC-ZCOER-034', maxWeeklyHours: 23, syllabi: ['dsa'] },
  { empId: 'FAC-ZCOER-035', maxWeeklyHours: 22, syllabi: ['chem', 'iks'] },
  { empId: 'FAC-ZCOER-036', maxWeeklyHours: 22, syllabi: ['beee'] },
  { empId: 'FAC-ZCOER-037', maxWeeklyHours: 16, syllabi: ['em1'] },
  { empId: 'FAC-ZCOER-038', maxWeeklyHours: 16, syllabi: ['wad'] },
  { empId: 'FAC-ZCOER-039', maxWeeklyHours: 20, syllabi: ['basicMath'] },
  { empId: 'FAC-ZCOER-040', maxWeeklyHours: 19, syllabi: ['chem', 'itProficiency'] },
];

async function main() {
  console.log('=== Starting FY B.Tech Syllabus & Academic Load Population ===');

  // Step 1: Clear existing syllabus topics and related tables to prevent dummy duplicate data
  console.log('Clearing existing dummy syllabus topics and audits...');
  await prisma.syllabusCompletionAudit.deleteMany({});
  await prisma.syllabusExtraLoad.deleteMany({});
  await prisma.syllabusTopic.deleteMany({});
  console.log('Cleared existing topics.');

  let totalTopicsCreated = 0;
  let totalFacultyUpdated = 0;

  for (const roster of facultyLoadRoster) {
    const faculty = await prisma.faculty.findUnique({
      where: { employeeId: roster.empId },
      include: { department: true }
    });

    if (!faculty) {
      console.warn(`Faculty with ID ${roster.empId} not found, skipping.`);
      continue;
    }

    // Update faculty teaching load (maxWeeklyHours) from authentic roster
    await prisma.faculty.update({
      where: { id: faculty.id },
      data: {
        maxWeeklyHours: roster.maxWeeklyHours,
        currentLoadHours: 0
      }
    });
    totalFacultyUpdated++;

    // Collect all units for this faculty member
    let orderIndex = 0;
    for (const syllabusKey of roster.syllabi) {
      const course = syllabi[syllabusKey];
      if (!course) continue;

      for (const unit of course.units) {
        await prisma.syllabusTopic.create({
          data: {
            facultyId: faculty.id,
            title: `${course.name} — ${unit.title}`,
            description: unit.desc,
            orderIndex: orderIndex++,
            allottedMinutes: unit.hours * 60, // Exactly unit hours converted to minutes
            status: 'PENDING'
          }
        });
        totalTopicsCreated++;
      }
    }

    console.log(`Updated ${faculty.firstName} ${faculty.lastName} (${roster.empId}): Load = ${roster.maxWeeklyHours} hrs, Topics = ${orderIndex}`);
  }

  console.log(`\n========================================`);
  console.log(`SUCCESSFULLY POPULATED!`);
  console.log(`Total Faculty Members Updated: ${totalFacultyUpdated}`);
  console.log(`Total Authentic Syllabus Topics Created: ${totalTopicsCreated}`);
  console.log(`========================================`);
}

main()
  .catch((e) => {
    console.error('Population error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

module.exports = { syllabi, facultyLoadRoster };
