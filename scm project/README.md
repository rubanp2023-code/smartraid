# SmartRaid - Ride Safe • Reach Faster 🚖

> **UI/UX Project Presentation & Interactive PC Ride Booking Portal**  
> A fast, safe, and intuitive ride-hailing experience designed specifically for desktop/PC interfaces, complete with real-time Leaflet maps, dynamic fare calculation, and emergency SOS integration.

---

## 📌 Project Overview

**SmartRaid** is a desktop-first ride booking web portal developed as an end-to-end UI/UX case study and prototype. The system features an 8-stage user journey with responsive layout transitions, micro-interactions, real-time map tracking, and safety-centric UX features.

---

## 🚀 Key Features

- **8-Stage User Flow**:
  1. **Login**: 2-column split PC screen with security verification.
  2. **Sign Up**: Frictionless user onboarding and registration.
  3. **Where To?**: Interactive location search with pickup and destination points.
  4. **Vehicle Selection**: Multiple ride tiers (Bike, Auto, Prime Sedan, SUV) with transparent pricing and ETA.
  5. **Payment Selection**: Multiple payment options (UPI, Cards, Net Banking, Cash) with coupon codes and fare breakdown.
  6. **Booking Confirmation**: Instant driver match, verified OTP, and vehicle details.
  7. **On the Way / Live Tracking**: Interactive **Leaflet.js** map simulation with live driver GPS movement and progress updates.
  8. **Feedback & Rating**: Multi-criteria driver and ride review system.
- **Safety First (SOS Integration)**:
  - Persistent emergency SOS quick-trigger with WhatsApp emergency contact notification.
- **Modern UI/UX Design System**:
  - Typography: Google Fonts (*Plus Jakarta Sans* & *Outfit*).
  - Modern card designs, glassmorphism accents, and accessible color hierarchy.
  - Interactive map integration via Leaflet.js & OpenStreetMap.

---

## 📁 Repository Structure

```text
├── srb/                                # Interactive Web Prototype
│   ├── index.html                      # Complete 8-screen desktop interface
│   ├── style.css                       # Design system, responsive layouts & animations
│   └── app.js                          # State machine, map tracking & event logic
├── SmartRaid_Final_Presentation  -  Repaired.pptx  # Slide presentation deck
├── SmartRaid_Project_Report.docx       # Full UI/UX project report
├── .gitignore                          # Git ignore rules
└── README.md                           # Project documentation
```

---

## 💻 How to Run the Prototype Locally

1. Clone or download this repository:
   ```bash
   git clone <repository-url>
   ```
2. Navigate to the `srb/` folder:
   ```bash
   cd srb
   ```
3. Open `index.html` in any modern web browser (Google Chrome, Microsoft Edge, Firefox, Brave):
   - Double click `index.html`, or
   - Use Live Server extension in VS Code.

---

## 🛠️ Built With

- **HTML5 & Vanilla CSS3** (Custom design tokens, Flexbox/Grid layouts, CSS variables)
- **Modern JavaScript (ES6+)**
- **Leaflet.js & OpenStreetMap** (Real-world map rendering & GPS simulation)
- **Font Awesome 6** (Icons)
- **Google Fonts** (Plus Jakarta Sans, Outfit)

---

## 📄 Documentation & Presentation

- **Report**: Refer to `SmartRaid_Project_Report.docx` for user personas, wireframes, user flow diagrams, and usability testing results.
- **Presentation**: Refer to `SmartRaid_Final_Presentation  -  Repaired.pptx` for the pitch deck and design presentation.
